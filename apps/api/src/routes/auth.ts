import { Hono } from "hono";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@policy-brain/database";
import type { AppEnv } from "../types.js";
import { ok, err, audit } from "../lib/response.js";
import { requireAuth } from "../middleware/auth.js";

export const authRoutes = new Hono<AppEnv>();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  organizationName: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRoutes.post("/register", async (c) => {
  const body = await c.req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return err(c, "VALIDATION_ERROR", parsed.error.message);
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return err(c, "CONFLICT", "Email already registered", 409);
  }

  const slug = parsed.data.organizationName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  const org = await prisma.organization.create({
    data: {
      name: parsed.data.organizationName,
      slug: `${slug}-${Date.now()}`,
    },
  });

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash,
      role: "ADMIN",
      organizationId: org.id,
    },
  });

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: { userId: user.id, token, expiresAt },
  });

  await audit(org.id, user.id, "user.registered", "user", user.id, c.get("correlationId"));

  return ok(
    c,
    {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: org.id,
      },
    },
    201
  );
});

authRoutes.post("/login", async (c) => {
  const body = await c.req.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return err(c, "VALIDATION_ERROR", parsed.error.message);
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (!user?.passwordHash) {
    return err(c, "UNAUTHORIZED", "Invalid credentials", 401);
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    return err(c, "UNAUTHORIZED", "Invalid credentials", 401);
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: { userId: user.id, token, expiresAt },
  });

  await audit(
    user.organizationId,
    user.id,
    "user.login",
    "user",
    user.id,
    c.get("correlationId")
  );

  return ok(c, {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
    },
  });
});

authRoutes.get("/me", requireAuth, async (c) => {
  return ok(c, c.get("user"));
});

authRoutes.post("/logout", requireAuth, async (c) => {
  const token = c.get("sessionToken");
  if (token) {
    await prisma.session.delete({ where: { token } }).catch(() => {});
  }
  const user = c.get("user")!;
  await audit(
    user.organizationId,
    user.id,
    "user.logout",
    "user",
    user.id,
    c.get("correlationId")
  );
  return ok(c, { success: true });
});
