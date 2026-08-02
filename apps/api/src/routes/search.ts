import { Hono } from "hono";
import { prisma } from "@policy-brain/database";
import { dslToNaturalLanguage, validateRuleDsl, type RuleDsl } from "@policy-brain/shared";
import type { AppEnv } from "../types.js";
import { ok } from "../lib/response.js";
import { requireAuth } from "../middleware/auth.js";

export const searchRoutes = new Hono<AppEnv>();

searchRoutes.use("*", requireAuth);

function scoreMatch(text: string, query: string): number {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  if (lower === q) return 1;
  if (lower.includes(q)) return 0.8;
  const words = q.split(/\s+/);
  const matched = words.filter((w) => lower.includes(w)).length;
  return matched / words.length * 0.6;
}

searchRoutes.get("/", async (c) => {
  const user = c.get("user")!;
  const q = c.req.query("q") ?? "";
  const mode = c.req.query("mode") ?? "hybrid";

  if (!q.trim()) {
    return ok(c, { policies: [], rules: [], knowledge: [], conversations: [] });
  }

  const [policies, rules, knowledge] = await Promise.all([
    prisma.policy.findMany({
      where: {
        organizationId: user.organizationId,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 20,
    }),
    prisma.rule.findMany({
      where: {
        policy: { organizationId: user.organizationId },
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 20,
      include: { policy: { select: { title: true } } },
    }),
    prisma.knowledgeObject.findMany({
      where: {
        source: { organizationId: user.organizationId },
        content: { contains: q, mode: "insensitive" },
      },
      take: 20,
      include: { source: { select: { title: true } } },
    }),
  ]);

  const enrich = <T extends { id: string }>(
    items: T[],
    getText: (item: T) => string,
    type: string
  ) =>
    items
      .map((item) => ({
        ...item,
        type,
        relevance: scoreMatch(getText(item), q),
        evidence: getText(item).slice(0, 120),
      }))
      .sort((a, b) => b.relevance - a.relevance);

  const results = {
    policies: enrich(policies, (p) => `${p.title} ${p.description ?? ""}`, "policy"),
    rules: enrich(
      rules,
      (r) => {
        try {
          return `${r.title} ${dslToNaturalLanguage(r.dslContent as RuleDsl)}`;
        } catch {
          return r.title;
        }
      },
      "rule"
    ),
    knowledge: enrich(knowledge, (k) => k.content, "knowledge"),
    mode,
    query: q,
  };

  if (mode === "semantic" || mode === "hybrid") {
    for (const item of results.rules) {
      if (item.relevance < 0.5) item.relevance += 0.15;
    }
    results.rules.sort((a, b) => b.relevance - a.relevance);
  }

  return ok(c, results);
});
