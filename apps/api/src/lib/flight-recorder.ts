import { prisma } from "@policy-brain/database";
import type { Prisma } from "@policy-brain/database";

export async function recordFlight(data: {
  organizationId: string;
  workflowId?: string;
  correlationId: string;
  stage: string;
  agentType?: string;
  model?: string;
  promptVersion?: string;
  tokenUsage?: number;
  status: string;
  durationMs: number;
  input?: Prisma.InputJsonValue;
  output?: Prisma.InputJsonValue;
  trace?: Prisma.InputJsonValue;
}) {
  await prisma.flightRecord.create({ data });
}

export async function getFlightRecords(
  organizationId: string,
  filters?: { workflowId?: string; correlationId?: string }
) {
  return prisma.flightRecord.findMany({
    where: {
      organizationId,
      ...(filters?.workflowId ? { workflowId: filters.workflowId } : {}),
      ...(filters?.correlationId ? { correlationId: filters.correlationId } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
}
