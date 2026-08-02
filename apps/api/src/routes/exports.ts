import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "@policy-brain/database";
import { validateRuleDsl, type RuleDsl } from "@policy-brain/shared";
import { orchestrator } from "@policy-brain/agents";
import type { AppEnv } from "../types.js";
import { ok, err, audit } from "../lib/response.js";
import { requireAuth } from "../middleware/auth.js";

export const exportRoutes = new Hono<AppEnv>();
exportRoutes.use("*", requireAuth);

exportRoutes.get("/", async (c) => {
  const user = c.get("user")!;
  const records = await prisma.exportRecord.findMany({
    where: { organizationId: user.organizationId },
    include: { rule: { select: { id: true, title: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return ok(c, records);
});

exportRoutes.post("/", async (c) => {
  const user = c.get("user")!;
  const body = await c.req.json();
  const parsed = z
    .object({
      ruleId: z.string(),
      format: z.enum(["json", "yaml", "python", "dsl"]),
    })
    .safeParse(body);
  if (!parsed.success) return err(c, "VALIDATION_ERROR", parsed.error.message);

  const rule = await prisma.rule.findFirst({
    where: { id: parsed.data.ruleId, policy: { organizationId: user.organizationId } },
  });
  if (!rule) return err(c, "NOT_FOUND", "Rule not found", 404);

  const validation = validateRuleDsl(rule.dslContent);
  if (!validation.success) {
    return err(c, "VALIDATION_ERROR", validation.errors?.join("; ") ?? "Invalid DSL");
  }

  const correlationId = c.get("correlationId");
  const result = await orchestrator.invokeAgent("export", {
    workflowId: "export",
    correlationId,
    organizationId: user.organizationId,
    input: { dsl: validation.data as RuleDsl, format: parsed.data.format },
  });

  const artifact = (result.output as { artifact: string }).artifact;

  const record = await prisma.exportRecord.create({
    data: {
      organizationId: user.organizationId,
      ruleId: rule.id,
      userId: user.id,
      format: parsed.data.format,
      artifact,
      validation: { valid: true, errors: [] },
      correlationId,
    },
  });

  await audit(
    user.organizationId,
    user.id,
    "rule.exported",
    "rule",
    rule.id,
    correlationId,
    { format: parsed.data.format }
  );

  return ok(c, { record, artifact });
});
