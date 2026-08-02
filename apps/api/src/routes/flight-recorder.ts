import { Hono } from "hono";
import type { AppEnv } from "../types.js";
import { ok } from "../lib/response.js";
import { requireAuth } from "../middleware/auth.js";
import { getFlightRecords } from "../lib/flight-recorder.js";

export const flightRoutes = new Hono<AppEnv>();
flightRoutes.use("*", requireAuth);

flightRoutes.get("/", async (c) => {
  const user = c.get("user")!;
  const workflowId = c.req.query("workflowId");
  const correlationId = c.req.query("correlationId");

  const records = await getFlightRecords(user.organizationId, {
    workflowId: workflowId ?? undefined,
    correlationId: correlationId ?? undefined,
  });

  return ok(c, records);
});
