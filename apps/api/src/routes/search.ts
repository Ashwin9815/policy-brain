import { Hono } from "hono";
import { prisma } from "@policy-brain/database";
import type { AppEnv } from "../types.js";
import { ok } from "../lib/response.js";
import { requireAuth } from "../middleware/auth.js";

export const searchRoutes = new Hono<AppEnv>();

searchRoutes.use("*", requireAuth);

searchRoutes.get("/", async (c) => {
  const user = c.get("user")!;
  const q = c.req.query("q") ?? "";
  const type = c.req.query("type") ?? "all";

  if (!q.trim()) {
    return ok(c, { policies: [], rules: [], knowledge: [] });
  }

  const results: {
    policies: unknown[];
    rules: unknown[];
    knowledge: unknown[];
  } = { policies: [], rules: [], knowledge: [] };

  if (type === "all" || type === "policies") {
    results.policies = await prisma.policy.findMany({
      where: {
        organizationId: user.organizationId,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 20,
      select: { id: true, title: true, status: true, version: true },
    });
  }

  if (type === "all" || type === "rules") {
    results.rules = await prisma.rule.findMany({
      where: {
        policy: { organizationId: user.organizationId },
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 20,
      select: { id: true, title: true, status: true, policyId: true },
    });
  }

  if (type === "all" || type === "knowledge") {
    results.knowledge = await prisma.knowledgeObject.findMany({
      where: {
        source: { organizationId: user.organizationId },
        content: { contains: q, mode: "insensitive" },
      },
      take: 20,
      select: { id: true, type: true, content: true, confidence: true },
    });
  }

  return ok(c, results);
});
