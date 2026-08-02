import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "@policy-brain/database";
import type { AppEnv } from "../types.js";
import { ok, err, audit } from "../lib/response.js";
import { requireAuth, requireFolderAccess } from "../middleware/auth.js";

export const policyRoutes = new Hono<AppEnv>();

policyRoutes.use("*", requireAuth);

const createPolicySchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  folderId: z.string(),
});

policyRoutes.get("/", async (c) => {
  const user = c.get("user")!;
  const status = c.req.query("status");

  const policies = await prisma.policy.findMany({
    where: {
      organizationId: user.organizationId,
      ...(status ? { status: status as never } : {}),
    },
    include: {
      folder: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      _count: { select: { rules: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return ok(c, policies);
});

policyRoutes.post("/", async (c) => {
  const user = c.get("user")!;
  const body = await c.req.json();
  const parsed = createPolicySchema.safeParse(body);
  if (!parsed.success) {
    return err(c, "VALIDATION_ERROR", parsed.error.message);
  }

  const hasAccess = await requireFolderAccess(c, parsed.data.folderId, "WRITE");
  if (!hasAccess) {
    return err(c, "FORBIDDEN", "No write access to folder", 403);
  }

  const policy = await prisma.policy.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      folderId: parsed.data.folderId,
      organizationId: user.organizationId,
      createdById: user.id,
    },
    include: {
      folder: { select: { id: true, name: true } },
      rules: true,
    },
  });

  await audit(
    user.organizationId,
    user.id,
    "policy.created",
    "policy",
    policy.id,
    c.get("correlationId")
  );

  return ok(c, policy, 201);
});

policyRoutes.get("/:id", async (c) => {
  const user = c.get("user")!;
  const policy = await prisma.policy.findFirst({
    where: { id: c.req.param("id"), organizationId: user.organizationId },
    include: {
      folder: true,
      rules: { include: { versions: { orderBy: { version: "desc" }, take: 3 } } },
      comments: { include: { author: { select: { id: true, name: true } } } },
      approvals: { include: { approver: { select: { id: true, name: true } } } },
    },
  });

  if (!policy) {
    return err(c, "NOT_FOUND", "Policy not found", 404);
  }

  const hasAccess = await requireFolderAccess(c, policy.folderId);
  if (!hasAccess) {
    return err(c, "FORBIDDEN", "No access to policy folder", 403);
  }

  return ok(c, policy);
});

policyRoutes.patch("/:id", async (c) => {
  const user = c.get("user")!;
  const policyId = c.req.param("id");
  const existing = await prisma.policy.findFirst({
    where: { id: policyId, organizationId: user.organizationId },
  });

  if (!existing) {
    return err(c, "NOT_FOUND", "Policy not found", 404);
  }

  const hasAccess = await requireFolderAccess(c, existing.folderId, "WRITE");
  if (!hasAccess) {
    return err(c, "FORBIDDEN", "No write access", 403);
  }

  const body = await c.req.json();
  const updateSchema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    status: z
      .enum(["DRAFT", "IN_REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED"])
      .optional(),
  });
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return err(c, "VALIDATION_ERROR", parsed.error.message);
  }

  const policy = await prisma.policy.update({
    where: { id: policyId },
    data: {
      ...parsed.data,
      version: parsed.data.status ? existing.version + 1 : existing.version,
    },
  });

  await audit(
    user.organizationId,
    user.id,
    "policy.updated",
    "policy",
    policy.id,
    c.get("correlationId"),
    { changes: parsed.data }
  );

  return ok(c, policy);
});
