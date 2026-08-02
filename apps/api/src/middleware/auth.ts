import type { Context, Next } from "hono";
import type { AppEnv } from "../types.js";
import { prisma } from "@policy-brain/database";
import { err } from "../lib/response.js";

export async function requireAuth(c: Context<AppEnv>, next: Next) {
  const authHeader = c.req.header("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return err(c, "UNAUTHORIZED", "Authentication required", 401);
  }

  const token = authHeader.slice(7);
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    return err(c, "UNAUTHORIZED", "Invalid or expired session", 401);
  }

  c.set("user", {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    organizationId: session.user.organizationId,
  });
  c.set("sessionToken", token);

  await next();
}

export async function requireFolderAccess(
  c: Context<AppEnv>,
  folderId: string,
  minLevel: "READ" | "WRITE" | "ADMIN" = "READ"
): Promise<boolean> {
  const user = c.get("user");
  if (!user) return false;

  if (user.role === "ADMIN") return true;

  const permission = await prisma.folderPermission.findUnique({
    where: { folderId_userId: { folderId, userId: user.id } },
  });

  if (!permission) return false;

  const levels = { READ: 1, WRITE: 2, ADMIN: 3 };
  return levels[permission.permission] >= levels[minLevel];
}
