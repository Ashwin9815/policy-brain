import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "@policy-brain/database";
import type { AppEnv } from "../types.js";
import { ok, err, audit } from "../lib/response.js";
import { requireAuth } from "../middleware/auth.js";

export const commentRoutes = new Hono<AppEnv>();
commentRoutes.use("*", requireAuth);

const createSchema = z.object({
  content: z.string().min(1),
  type: z
    .enum(["QUESTION", "SUGGESTION", "ISSUE", "REQUEST", "APPROVAL_NOTE", "EVIDENCE"])
    .default("SUGGESTION"),
  policyId: z.string().optional(),
  ruleId: z.string().optional(),
  parentId: z.string().optional(),
  mentions: z.array(z.string()).default([]),
});

commentRoutes.get("/", async (c) => {
  const user = c.get("user")!;
  const policyId = c.req.query("policyId");
  const ruleId = c.req.query("ruleId");

  const comments = await prisma.comment.findMany({
    where: {
      ...(policyId ? { policyId } : {}),
      ...(ruleId ? { ruleId } : {}),
      author: { organizationId: user.organizationId },
    },
    include: {
      author: { select: { id: true, name: true, email: true } },
      replies: {
        include: { author: { select: { id: true, name: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return ok(c, comments.filter((cm) => !cm.parentId));
});

commentRoutes.post("/", async (c) => {
  const user = c.get("user")!;
  const body = await c.req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return err(c, "VALIDATION_ERROR", parsed.error.message);

  const comment = await prisma.comment.create({
    data: {
      ...parsed.data,
      authorId: user.id,
    },
    include: { author: { select: { id: true, name: true } } },
  });

  for (const mentionId of parsed.data.mentions) {
    await prisma.notification.create({
      data: {
        userId: mentionId,
        type: "mention",
        title: "You were mentioned",
        message: `${user.name} mentioned you in a comment`,
        link: parsed.data.policyId ? `/policies/${parsed.data.policyId}` : undefined,
      },
    });
  }

  await audit(
    user.organizationId,
    user.id,
    "comment.created",
    "comment",
    comment.id,
    c.get("correlationId")
  );

  return ok(c, comment, 201);
});

commentRoutes.patch("/:id/resolve", async (c) => {
  const user = c.get("user")!;
  const comment = await prisma.comment.update({
    where: { id: c.req.param("id") },
    data: { resolved: true },
  });
  return ok(c, comment);
});
