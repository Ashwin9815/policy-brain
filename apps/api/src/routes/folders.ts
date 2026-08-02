import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "@policy-brain/database";
import type { AppEnv } from "../types.js";
import { ok, err, audit } from "../lib/response.js";
import { requireAuth, requireFolderAccess } from "../middleware/auth.js";

export const folderRoutes = new Hono<AppEnv>();

folderRoutes.use("*", requireAuth);

const createFolderSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  parentId: z.string().optional(),
});

folderRoutes.get("/", async (c) => {
  const user = c.get("user")!;
  const folders = await prisma.folder.findMany({
    where: { organizationId: user.organizationId },
    include: {
      _count: { select: { policies: true, sources: true } },
      permissions: { where: { userId: user.id } },
    },
    orderBy: { name: "asc" },
  });
  return ok(c, folders);
});

folderRoutes.post("/", async (c) => {
  const user = c.get("user")!;
  const body = await c.req.json();
  const parsed = createFolderSchema.safeParse(body);
  if (!parsed.success) {
    return err(c, "VALIDATION_ERROR", parsed.error.message);
  }

  if (parsed.data.parentId) {
    const hasAccess = await requireFolderAccess(c, parsed.data.parentId, "WRITE");
    if (!hasAccess) {
      return err(c, "FORBIDDEN", "No access to parent folder", 403);
    }
  }

  const folder = await prisma.folder.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      parentId: parsed.data.parentId,
      organizationId: user.organizationId,
    },
  });

  await prisma.folderPermission.create({
    data: {
      folderId: folder.id,
      userId: user.id,
      permission: "ADMIN",
    },
  });

  await audit(
    user.organizationId,
    user.id,
    "folder.created",
    "folder",
    folder.id,
    c.get("correlationId")
  );

  return ok(c, folder, 201);
});

folderRoutes.get("/:id", async (c) => {
  const user = c.get("user")!;
  const folderId = c.req.param("id");
  const hasAccess = await requireFolderAccess(c, folderId);
  if (!hasAccess) {
    return err(c, "FORBIDDEN", "No access to folder", 403);
  }

  const folder = await prisma.folder.findFirst({
    where: { id: folderId, organizationId: user.organizationId },
    include: {
      children: true,
      policies: { select: { id: true, title: true, status: true, version: true } },
      sources: { select: { id: true, title: true, status: true } },
    },
  });

  if (!folder) {
    return err(c, "NOT_FOUND", "Folder not found", 404);
  }

  return ok(c, folder);
});
