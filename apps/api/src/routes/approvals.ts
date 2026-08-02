import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "@policy-brain/database";
import type { AppEnv } from "../types.js";
import { ok, err, audit } from "../lib/response.js";
import { requireAuth } from "../middleware/auth.js";

export const approvalRoutes = new Hono<AppEnv>();
approvalRoutes.use("*", requireAuth);

approvalRoutes.get("/", async (c) => {
  const user = c.get("user")!;
  const policyId = c.req.query("policyId");

  const approvals = await prisma.approval.findMany({
    where: {
      ...(policyId ? { policyId } : {}),
      policy: { organizationId: user.organizationId },
    },
    include: {
      approver: { select: { id: true, name: true } },
      policy: { select: { id: true, title: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return ok(c, approvals);
});

approvalRoutes.post("/", async (c) => {
  const user = c.get("user")!;
  const body = await c.req.json();
  const parsed = z
    .object({ policyId: z.string(), approverId: z.string().optional() })
    .safeParse(body);
  if (!parsed.success) return err(c, "VALIDATION_ERROR", parsed.error.message);

  const approval = await prisma.approval.create({
    data: {
      policyId: parsed.data.policyId,
      approverId: parsed.data.approverId ?? user.id,
    },
    include: { approver: { select: { id: true, name: true } } },
  });

  await prisma.policy.update({
    where: { id: parsed.data.policyId },
    data: { status: "IN_REVIEW" },
  });

  return ok(c, approval, 201);
});

approvalRoutes.post("/:id/decide", async (c) => {
  const user = c.get("user")!;
  const body = await c.req.json();
  const parsed = z
    .object({
      status: z.enum(["APPROVED", "REJECTED"]),
      note: z.string().optional(),
    })
    .safeParse(body);
  if (!parsed.success) return err(c, "VALIDATION_ERROR", parsed.error.message);

  const approval = await prisma.approval.update({
    where: { id: c.req.param("id") },
    data: {
      status: parsed.data.status,
      note: parsed.data.note,
      decidedAt: new Date(),
    },
    include: { policy: true },
  });

  if (parsed.data.status === "APPROVED") {
    const policy = approval.policy;
    const rules = await prisma.rule.findMany({ where: { policyId: policy.id } });

    await prisma.policy.update({
      where: { id: policy.id },
      data: { status: "APPROVED", version: policy.version + 1 },
    });

    await prisma.policyVersion.create({
      data: {
        policyId: policy.id,
        organizationId: user.organizationId,
        version: policy.version + 1,
        title: policy.title,
        description: policy.description,
        status: "APPROVED",
        snapshot: { rules } as object,
        changeNote: parsed.data.note ?? "Approved via workflow",
        createdById: user.id,
      },
    });

    await prisma.notification.create({
      data: {
        userId: policy.createdById,
        type: "approval",
        title: "Policy approved",
        message: `"${policy.title}" was approved`,
        link: `/policies/${policy.id}`,
      },
    });
  }

  await audit(
    user.organizationId,
    user.id,
    `approval.${parsed.data.status.toLowerCase()}`,
    "approval",
    approval.id,
    c.get("correlationId")
  );

  return ok(c, approval);
});
