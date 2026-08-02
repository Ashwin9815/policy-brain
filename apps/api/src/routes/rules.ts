import { Hono } from "hono";
import { z } from "zod";
import { prisma, type Prisma } from "@policy-brain/database";
import { validateRuleDsl } from "@policy-brain/shared";
import type { AppEnv } from "../types.js";
import { ok, err, audit } from "../lib/response.js";
import { requireAuth, requireFolderAccess } from "../middleware/auth.js";

export const ruleRoutes = new Hono<AppEnv>();

ruleRoutes.use("*", requireAuth);

const createRuleSchema = z.object({
  policyId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  dslContent: z.record(z.unknown()),
});

ruleRoutes.get("/", async (c) => {
  const user = c.get("user")!;
  const policyId = c.req.query("policyId");

  const rules = await prisma.rule.findMany({
    where: {
      ...(policyId ? { policyId } : {}),
      policy: { organizationId: user.organizationId },
    },
    include: {
      policy: { select: { id: true, title: true, folderId: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return ok(c, rules);
});

ruleRoutes.post("/", async (c) => {
  const user = c.get("user")!;
  const body = await c.req.json();
  const parsed = createRuleSchema.safeParse(body);
  if (!parsed.success) {
    return err(c, "VALIDATION_ERROR", parsed.error.message);
  }

  const validation = validateRuleDsl(parsed.data.dslContent);
  if (!validation.success) {
    return err(
      c,
      "DSL_VALIDATION_ERROR",
      validation.errors?.join("; ") ?? "Invalid DSL"
    );
  }

  const policy = await prisma.policy.findFirst({
    where: { id: parsed.data.policyId, organizationId: user.organizationId },
  });
  if (!policy) {
    return err(c, "NOT_FOUND", "Policy not found", 404);
  }

  const hasAccess = await requireFolderAccess(c, policy.folderId, "WRITE");
  if (!hasAccess) {
    return err(c, "FORBIDDEN", "No write access", 403);
  }

  const rule = await prisma.rule.create({
    data: {
      policyId: parsed.data.policyId,
      title: parsed.data.title,
      description: parsed.data.description,
      dslContent: validation.data as object,
      createdById: user.id,
      versions: {
        create: {
          version: 1,
          dslContent: validation.data as object,
          changeNote: "Initial version",
        },
      },
    },
  });

  await audit(
    user.organizationId,
    user.id,
    "rule.created",
    "rule",
    rule.id,
    c.get("correlationId")
  );

  return ok(c, rule, 201);
});

ruleRoutes.get("/:id", async (c) => {
  const user = c.get("user")!;
  const rule = await prisma.rule.findFirst({
    where: {
      id: c.req.param("id"),
      policy: { organizationId: user.organizationId },
    },
    include: {
      versions: { orderBy: { version: "desc" } },
      policy: { select: { id: true, title: true, folderId: true } },
    },
  });

  if (!rule) {
    return err(c, "NOT_FOUND", "Rule not found", 404);
  }

  const hasAccess = await requireFolderAccess(c, rule.policy.folderId);
  if (!hasAccess) {
    return err(c, "FORBIDDEN", "No access", 403);
  }

  return ok(c, rule);
});

ruleRoutes.post("/:id/validate", async (c) => {
  const body = await c.req.json();
  const validation = validateRuleDsl(body.dslContent);
  if (!validation.success) {
    return ok(c, { valid: false, errors: validation.errors });
  }
  return ok(c, { valid: true, data: validation.data });
});

ruleRoutes.put("/:id", async (c) => {
  const user = c.get("user")!;
  const body = await c.req.json();
  const parsed = z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      dslContent: z.record(z.unknown()).optional(),
      changeNote: z.string().optional(),
    })
    .safeParse(body);
  if (!parsed.success) return err(c, "VALIDATION_ERROR", parsed.error.message);

  const existing = await prisma.rule.findFirst({
    where: {
      id: c.req.param("id"),
      policy: { organizationId: user.organizationId },
    },
    include: { policy: true },
  });
  if (!existing) return err(c, "NOT_FOUND", "Rule not found", 404);

  const hasAccess = await requireFolderAccess(c, existing.policy.folderId, "WRITE");
  if (!hasAccess) return err(c, "FORBIDDEN", "No write access", 403);

  let dslContent: Prisma.InputJsonValue = existing.dslContent as Prisma.InputJsonValue;
  if (parsed.data.dslContent) {
    const validation = validateRuleDsl(parsed.data.dslContent);
    if (!validation.success) {
      return err(c, "DSL_VALIDATION_ERROR", validation.errors?.join("; ") ?? "Invalid DSL");
    }
    dslContent = validation.data as Prisma.InputJsonValue;
  }

  const newVersion = existing.version + 1;
  const rule = await prisma.rule.update({
    where: { id: existing.id },
    data: {
      title: parsed.data.title ?? existing.title,
      description: parsed.data.description ?? existing.description,
      dslContent,
      version: parsed.data.dslContent ? newVersion : existing.version,
      ...(parsed.data.dslContent
        ? {
            versions: {
              create: {
                version: newVersion,
                dslContent,
                changeNote: parsed.data.changeNote ?? "Block editor update",
              },
            },
          }
        : {}),
    },
  });

  await audit(user.organizationId, user.id, "rule.updated", "rule", rule.id, c.get("correlationId"));
  return ok(c, rule);
});
