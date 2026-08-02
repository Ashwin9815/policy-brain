import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { authRoutes } from "./routes/auth.js";
import { folderRoutes } from "./routes/folders.js";
import { policyRoutes } from "./routes/policies.js";
import { ruleRoutes } from "./routes/rules.js";
import { knowledgeRoutes } from "./routes/knowledge.js";
import { workflowRoutes } from "./routes/workflows.js";
import { agentRoutes } from "./routes/agents.js";
import { searchRoutes } from "./routes/search.js";
import { healthRoutes } from "./routes/health.js";
import { composerRoutes } from "./routes/composer.js";
import { commentRoutes } from "./routes/comments.js";
import { approvalRoutes } from "./routes/approvals.js";
import { exportRoutes } from "./routes/exports.js";
import { compareRoutes } from "./routes/compare.js";
import { adminRoutes } from "./routes/admin.js";
import { flightRoutes } from "./routes/flight-recorder.js";
import { notificationRoutes, onboardingRoutes } from "./routes/notifications.js";
import type { AppEnv } from "./types.js";

const app = new Hono<AppEnv>();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: process.env.API_CORS_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  })
);

app.use("*", async (c, next) => {
  const correlationId =
    c.req.header("x-correlation-id") ?? crypto.randomUUID();
  c.set("correlationId", correlationId);
  c.header("x-correlation-id", correlationId);
  await next();
});

const v1 = new Hono<AppEnv>();
v1.route("/health", healthRoutes);
v1.route("/auth", authRoutes);
v1.route("/folders", folderRoutes);
v1.route("/policies", policyRoutes);
v1.route("/rules", ruleRoutes);
v1.route("/knowledge", knowledgeRoutes);
v1.route("/workflows", workflowRoutes);
v1.route("/agents", agentRoutes);
v1.route("/search", searchRoutes);
v1.route("/composer", composerRoutes);
v1.route("/comments", commentRoutes);
v1.route("/approvals", approvalRoutes);
v1.route("/exports", exportRoutes);
v1.route("/compare", compareRoutes);
v1.route("/admin", adminRoutes);
v1.route("/flight-recorder", flightRoutes);
v1.route("/notifications", notificationRoutes);
v1.route("/onboarding", onboardingRoutes);

app.route("/v1", v1);

app.notFound((c) =>
  c.json(
    {
      error: { code: "NOT_FOUND", message: "Endpoint not found" },
      meta: { timestamp: new Date().toISOString() },
    },
    404
  )
);

app.onError((err, c) => {
  console.error(err);
  return c.json(
    {
      error: { code: "INTERNAL_ERROR", message: err.message },
      meta: {
        correlationId: c.get("correlationId"),
        timestamp: new Date().toISOString(),
      },
    },
    500
  );
});

const port = Number(process.env.API_PORT ?? 3001);

console.log(`Policy Brain API listening on http://localhost:${port}`);

serve({ fetch: app.fetch, port });

export default app;
