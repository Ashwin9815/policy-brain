import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "@policy-brain/database";
import { compareRuleDsl, diffJson } from "@policy-brain/shared";
import { orchestrator } from "@policy-brain/agents";
import type { AppEnv } from "../types.js";
import { ok, err } from "../lib/response.js";
import { requireAuth } from "../middleware/auth.js";

export const compareRoutes = new Hono<AppEnv>();
compareRoutes.use("*", requireAuth);

compareRoutes.post("/rules", async (c) => {
  const user = c.get("user")!;
  const body = await c.req.json();
  const parsed = z
    .object({ leftRuleId: z.string(), rightRuleId: z.string() })
    .safeParse(body);
  if (!parsed.success) return err(c, "VALIDATION_ERROR", parsed.error.message);

  const [left, right] = await Promise.all([
    prisma.rule.findFirst({
      where: { id: parsed.data.leftRuleId, policy: { organizationId: user.organizationId } },
    }),
    prisma.rule.findFirst({
      where: { id: parsed.data.rightRuleId, policy: { organizationId: user.organizationId } },
    }),
  ]);

  if (!left || !right) return err(c, "NOT_FOUND", "Rule not found", 404);

  const leftDsl = left.dslContent as Record<string, unknown>;
  const rightDsl = right.dslContent as Record<string, unknown>;

  const comparison = compareRuleDsl(leftDsl, rightDsl);
  const diff = diffJson(leftDsl, rightDsl);

  const correlationId = c.get("correlationId");
  const agentResult = await orchestrator.invokeAgent("rule-comparator", {
    workflowId: "compare",
    correlationId,
    organizationId: user.organizationId,
    input: { leftDsl, rightDsl },
  });

  return ok(c, {
    left: { id: left.id, title: left.title, version: left.version },
    right: { id: right.id, title: right.title, version: right.version },
    comparison,
    diff,
    agentAnalysis: agentResult.output,
  });
});

compareRoutes.get("/policy/:id/versions", async (c) => {
  const user = c.get("user")!;
  const versions = await prisma.policyVersion.findMany({
    where: {
      policyId: c.req.param("id"),
      organizationId: user.organizationId,
    },
    orderBy: { version: "desc" },
  });
  return ok(c, versions);
});

compareRoutes.post("/policy-versions", async (c) => {
  const user = c.get("user")!;
  const body = await c.req.json();
  const parsed = z
    .object({ leftVersionId: z.string(), rightVersionId: z.string() })
    .safeParse(body);
  if (!parsed.success) return err(c, "VALIDATION_ERROR", parsed.error.message);

  const [left, right] = await Promise.all([
    prisma.policyVersion.findFirst({
      where: { id: parsed.data.leftVersionId, organizationId: user.organizationId },
    }),
    prisma.policyVersion.findFirst({
      where: { id: parsed.data.rightVersionId, organizationId: user.organizationId },
    }),
  ]);

  if (!left || !right) return err(c, "NOT_FOUND", "Version not found", 404);

  const diff = diffJson(left.snapshot, right.snapshot);
  return ok(c, { left, right, diff });
});
