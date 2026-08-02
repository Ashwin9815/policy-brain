import { Hono } from "hono";
import { z } from "zod";
import { orchestrator } from "@policy-brain/agents";
import { AGENT_TYPES } from "@policy-brain/shared";
import type { AppEnv } from "../types.js";
import { ok, err, audit } from "../lib/response.js";
import { requireAuth } from "../middleware/auth.js";

export const agentRoutes = new Hono<AppEnv>();

agentRoutes.use("*", requireAuth);

agentRoutes.get("/", (c) => ok(c, { agents: AGENT_TYPES }));

const invokeSchema = z.object({
  input: z.record(z.unknown()).default({}),
});

agentRoutes.post("/:type/invoke", async (c) => {
  const user = c.get("user")!;
  const agentType = c.req.param("type") as (typeof AGENT_TYPES)[number];

  if (!AGENT_TYPES.includes(agentType)) {
    return err(c, "NOT_FOUND", `Unknown agent: ${agentType}`, 404);
  }

  const body = await c.req.json();
  const parsed = invokeSchema.safeParse(body);
  if (!parsed.success) {
    return err(c, "VALIDATION_ERROR", parsed.error.message);
  }

  const correlationId = c.get("correlationId");
  const result = await orchestrator.invokeAgent(agentType, {
    workflowId: "direct-invoke",
    correlationId,
    organizationId: user.organizationId,
    input: parsed.data.input,
  });

  await audit(
    user.organizationId,
    user.id,
    "agent.invoked",
    "agent",
    agentType,
    correlationId
  );

  return ok(c, result);
});
