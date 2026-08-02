import type { Context } from "hono";
import type { Prisma } from "@policy-brain/database";
import type { AppEnv } from "../types.js";

export function ok<T>(c: Context<AppEnv>, data: T, status = 200) {
  return c.json(
    {
      data,
      meta: {
        correlationId: c.get("correlationId"),
        timestamp: new Date().toISOString(),
      },
    },
    status as 200
  );
}

export function err(
  c: Context<AppEnv>,
  code: string,
  message: string,
  status: 400 | 401 | 403 | 404 | 409 | 500 = 400
) {
  return c.json(
    {
      error: { code, message },
      meta: {
        correlationId: c.get("correlationId"),
        timestamp: new Date().toISOString(),
      },
    },
    status
  );
}

import { prisma } from "@policy-brain/database";

export async function audit(
  organizationId: string,
  userId: string | undefined,
  action: string,
  resourceType: string,
  resourceId: string,
  correlationId?: string,
  metadata: Prisma.InputJsonValue = {}
) {
  await prisma.auditEvent.create({
    data: {
      organizationId,
      userId,
      action,
      resourceType,
      resourceId,
      correlationId,
      metadata,
    },
  });
}
