import { Hono } from "hono";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@policy-brain/database";
import type { AppEnv } from "../types.js";
import { ok, err } from "../lib/response.js";
import { requireAuth } from "../middleware/auth.js";

export const adminRoutes = new Hono<AppEnv>();
adminRoutes.use("*", requireAuth);

adminRoutes.get("/users", async (c) => {
  const user = c.get("user")!;
  if (user.role !== "ADMIN") return err(c, "FORBIDDEN", "Admin only", 403);

  const users = await prisma.user.findMany({
    where: { organizationId: user.organizationId },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
    orderBy: { name: "asc" },
  });
  return ok(c, users);
});

adminRoutes.post("/users", async (c) => {
  const user = c.get("user")!;
  if (user.role !== "ADMIN") return err(c, "FORBIDDEN", "Admin only", 403);

  const body = await c.req.json();
  const parsed = z
    .object({
      email: z.string().email(),
      name: z.string(),
      password: z.string().min(8),
      role: z.enum(["ADMIN", "MEMBER", "REVIEWER", "VIEWER"]).default("MEMBER"),
    })
    .safeParse(body);
  if (!parsed.success) return err(c, "VALIDATION_ERROR", parsed.error.message);

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const newUser = await prisma.user.create({
    data: {
      ...parsed.data,
      passwordHash,
      organizationId: user.organizationId,
    },
    select: { id: true, email: true, name: true, role: true },
  });

  return ok(c, newUser, 201);
});

adminRoutes.get("/settings", async (c) => {
  const user = c.get("user")!;
  const settings = await prisma.organizationSettings.upsert({
    where: { organizationId: user.organizationId },
    update: {},
    create: { organizationId: user.organizationId },
  });
  return ok(c, {
    ...settings,
    byokApiKey: settings.byokApiKey ? "••••••••" : null,
  });
});

adminRoutes.patch("/settings", async (c) => {
  const user = c.get("user")!;
  if (user.role !== "ADMIN") return err(c, "FORBIDDEN", "Admin only", 403);

  const body = await c.req.json();
  const settings = await prisma.organizationSettings.upsert({
    where: { organizationId: user.organizationId },
    update: body,
    create: { organizationId: user.organizationId, ...body },
  });
  return ok(c, settings);
});

adminRoutes.post("/folder-permissions", async (c) => {
  const user = c.get("user")!;
  if (user.role !== "ADMIN") return err(c, "FORBIDDEN", "Admin only", 403);

  const body = await c.req.json();
  const parsed = z
    .object({
      folderId: z.string(),
      userId: z.string(),
      permission: z.enum(["READ", "WRITE", "ADMIN"]),
    })
    .safeParse(body);
  if (!parsed.success) return err(c, "VALIDATION_ERROR", parsed.error.message);

  const perm = await prisma.folderPermission.upsert({
    where: {
      folderId_userId: {
        folderId: parsed.data.folderId,
        userId: parsed.data.userId,
      },
    },
    update: { permission: parsed.data.permission },
    create: parsed.data,
  });

  return ok(c, perm);
});
