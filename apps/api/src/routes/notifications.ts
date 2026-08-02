import { Hono } from "hono";
import { prisma } from "@policy-brain/database";
import type { AppEnv } from "../types.js";
import { ok, err } from "../lib/response.js";
import { requireAuth } from "../middleware/auth.js";

export const notificationRoutes = new Hono<AppEnv>();
notificationRoutes.use("*", requireAuth);

notificationRoutes.get("/", async (c) => {
  const user = c.get("user")!;
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return ok(c, notifications);
});

notificationRoutes.patch("/:id/read", async (c) => {
  const user = c.get("user")!;
  await prisma.notification.updateMany({
    where: { id: c.req.param("id"), userId: user.id },
    data: { read: true },
  });
  return ok(c, { success: true });
});

notificationRoutes.post("/read-all", async (c) => {
  const user = c.get("user")!;
  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });
  return ok(c, { success: true });
});

export const onboardingRoutes = new Hono<AppEnv>();
onboardingRoutes.use("*", requireAuth);

onboardingRoutes.get("/status", async (c) => {
  const user = c.get("user")!;
  const settings = await prisma.organizationSettings.upsert({
    where: { organizationId: user.organizationId },
    update: {},
    create: { organizationId: user.organizationId },
  });

  const folderCount = await prisma.folder.count({
    where: { organizationId: user.organizationId },
  });
  const policyCount = await prisma.policy.count({
    where: { organizationId: user.organizationId },
  });

  return ok(c, {
    completed: settings.onboardingCompleted,
    steps: [
      { id: "org", done: true, label: "Organization created" },
      { id: "folder", done: folderCount > 0, label: "Create a policy folder" },
      { id: "policy", done: policyCount > 0, label: "Create or generate a policy" },
      { id: "settings", done: !!settings.byokApiKey, label: "Configure AI settings (optional)" },
    ],
  });
});

onboardingRoutes.post("/complete", async (c) => {
  const user = c.get("user")!;
  await prisma.organizationSettings.upsert({
    where: { organizationId: user.organizationId },
    update: { onboardingCompleted: true },
    create: { organizationId: user.organizationId, onboardingCompleted: true },
  });
  return ok(c, { completed: true });
});
