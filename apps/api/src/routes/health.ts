import { Hono } from "hono";
import type { AppEnv } from "../types.js";
import { ok } from "../lib/response.js";

export const healthRoutes = new Hono<AppEnv>();

healthRoutes.get("/", (c) =>
  ok(c, {
    status: "healthy",
    service: "policy-brain-api",
    version: "0.1.0",
  })
);
