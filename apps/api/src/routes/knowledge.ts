import { Hono } from "hono";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "@policy-brain/database";
import type { AppEnv } from "../types.js";
import { ok, err, audit } from "../lib/response.js";
import { requireAuth, requireFolderAccess } from "../middleware/auth.js";

export const knowledgeRoutes = new Hono<AppEnv>();

knowledgeRoutes.use("*", requireAuth);

const UPLOAD_DIR = join(process.cwd(), "uploads");

knowledgeRoutes.get("/sources", async (c) => {
  const user = c.get("user")!;
  const sources = await prisma.knowledgeSource.findMany({
    where: { organizationId: user.organizationId },
    include: { _count: { select: { objects: true } } },
    orderBy: { createdAt: "desc" },
  });
  return ok(c, sources);
});

knowledgeRoutes.post("/sources", async (c) => {
  const user = c.get("user")!;
  const formData = await c.req.formData();
  const file = formData.get("file") as File | null;
  const folderId = formData.get("folderId") as string | null;
  const title = (formData.get("title") as string) || file?.name || "Untitled";

  if (!file || !folderId) {
    return err(c, "VALIDATION_ERROR", "file and folderId are required");
  }

  const hasAccess = await requireFolderAccess(c, folderId, "WRITE");
  if (!hasAccess) {
    return err(c, "FORBIDDEN", "No write access to folder", 403);
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  const storagePath = join(UPLOAD_DIR, `${Date.now()}-${file.name}`);
  await writeFile(storagePath, buffer);

  const source = await prisma.knowledgeSource.create({
    data: {
      title,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      fileSize: buffer.length,
      storagePath,
      folderId,
      organizationId: user.organizationId,
      status: "PENDING",
    },
  });

  await audit(
    user.organizationId,
    user.id,
    "knowledge.source.uploaded",
    "knowledge_source",
    source.id,
    c.get("correlationId")
  );

  return ok(c, source, 201);
});

knowledgeRoutes.get("/sources/:id", async (c) => {
  const user = c.get("user")!;
  const source = await prisma.knowledgeSource.findFirst({
    where: { id: c.req.param("id"), organizationId: user.organizationId },
    include: { objects: true, folder: true },
  });

  if (!source) {
    return err(c, "NOT_FOUND", "Source not found", 404);
  }

  const hasAccess = await requireFolderAccess(c, source.folderId);
  if (!hasAccess) {
    return err(c, "FORBIDDEN", "No access", 403);
  }

  return ok(c, source);
});

knowledgeRoutes.get("/objects", async (c) => {
  const user = c.get("user")!;
  const sourceId = c.req.query("sourceId");

  const objects = await prisma.knowledgeObject.findMany({
    where: {
      ...(sourceId ? { sourceId } : {}),
      source: { organizationId: user.organizationId },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return ok(c, objects);
});
