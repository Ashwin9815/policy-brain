import { Hono } from "hono";
import { z } from "zod";
import { prisma, type Prisma } from "@policy-brain/database";
import { orchestrator, extractDocumentText } from "@policy-brain/agents";
import type { AppEnv } from "../types.js";
import { ok, err, audit } from "../lib/response.js";
import { requireAuth } from "../middleware/auth.js";
import { recordFlight } from "../lib/flight-recorder.js";

export const workflowRoutes = new Hono<AppEnv>();

workflowRoutes.use("*", requireAuth);

const startWorkflowSchema = z.object({
  type: z.enum([
    "DOCUMENT_INGESTION",
    "RULE_GENERATION",
    "DUPLICATE_CHECK",
    "RULE_COMPARISON",
    "IMPACT_ANALYSIS",
    "EXPORT",
  ]),
  input: z.record(z.unknown()).default({}),
});

workflowRoutes.get("/", async (c) => {
  const user = c.get("user")!;
  const workflows = await prisma.workflow.findMany({
    where: { organizationId: user.organizationId },
    include: { _count: { select: { executions: true, checkpoints: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return ok(c, workflows);
});

workflowRoutes.post("/", async (c) => {
  const user = c.get("user")!;
  const body = await c.req.json();
  const parsed = startWorkflowSchema.safeParse(body);
  if (!parsed.success) {
    return err(c, "VALIDATION_ERROR", parsed.error.message);
  }

  const correlationId = c.get("correlationId");

  const workflow = await prisma.workflow.create({
    data: {
      type: parsed.data.type,
      input: parsed.data.input as Prisma.InputJsonValue,
      organizationId: user.organizationId,
      correlationId,
      status: "RUNNING",
    },
  });

  // Run orchestrator asynchronously (in-process for MVP)
  runWorkflowAsync(workflow.id, parsed.data.type, {
    workflowId: workflow.id,
    correlationId,
    organizationId: user.organizationId,
    input: parsed.data.input,
  }).catch(console.error);

  await audit(
    user.organizationId,
    user.id,
    "workflow.started",
    "workflow",
    workflow.id,
    correlationId,
    { type: parsed.data.type }
  );

  return ok(c, workflow, 202);
});

workflowRoutes.get("/:id", async (c) => {
  const user = c.get("user")!;
  const workflow = await prisma.workflow.findFirst({
    where: { id: c.req.param("id"), organizationId: user.organizationId },
    include: {
      checkpoints: { orderBy: { createdAt: "asc" } },
      executions: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!workflow) {
    return err(c, "NOT_FOUND", "Workflow not found", 404);
  }

  return ok(c, workflow);
});

workflowRoutes.post("/:id/resume", async (c) => {
  const user = c.get("user")!;
  const workflow = await prisma.workflow.findFirst({
    where: { id: c.req.param("id"), organizationId: user.organizationId },
  });

  if (!workflow) {
    return err(c, "NOT_FOUND", "Workflow not found", 404);
  }

  if (workflow.status !== "PAUSED" && workflow.status !== "FAILED") {
    return err(c, "INVALID_STATE", "Workflow cannot be resumed");
  }

  await prisma.workflow.update({
    where: { id: workflow.id },
    data: { status: "RUNNING" },
  });

  runWorkflowAsync(workflow.id, workflow.type, {
    workflowId: workflow.id,
    correlationId: workflow.correlationId,
    organizationId: workflow.organizationId,
    input: workflow.input as Record<string, unknown>,
  }).catch(console.error);

  return ok(c, { resumed: true, workflowId: workflow.id });
});

async function runWorkflowAsync(
  workflowId: string,
  workflowType: string,
  ctx: {
    workflowId: string;
    correlationId: string;
    organizationId: string;
    input: Record<string, unknown>;
  }
) {
  try {
    const enrichedInput = { ...ctx.input };

    if (workflowType === "DOCUMENT_INGESTION" && ctx.input.sourceId) {
      const source = await prisma.knowledgeSource.findUnique({
        where: { id: ctx.input.sourceId as string },
      });
      if (source) {
        const extracted = await extractDocumentText(source.storagePath, source.mimeType);
        enrichedInput.storagePath = source.storagePath;
        enrichedInput.mimeType = source.mimeType;
        enrichedInput.extractedText = extracted.text;
        await prisma.knowledgeSource.update({
          where: { id: source.id },
          data: { extractedText: extracted.text, status: "PROCESSING" },
        });
      }
    }

    if (workflowType === "RULE_GENERATION") {
      const rules = await prisma.rule.findMany({
        where: { policy: { organizationId: ctx.organizationId } },
        select: { id: true, title: true, dslContent: true },
      });
      enrichedInput.existingRules = rules;
    }

    const runCtx = { ...ctx, input: enrichedInput };
    const startTime = Date.now();

    const { results, stages } = await orchestrator.runWorkflow(
      workflowType,
      runCtx,
      {
        onStageComplete: async (stage, result) => {
          await prisma.workflowCheckpoint.create({
            data: { workflowId, stage, state: result.output as object },
          });
          await recordFlight({
            organizationId: ctx.organizationId,
            workflowId,
            correlationId: ctx.correlationId,
            stage,
            agentType: result.trace.agentType,
            status: "completed",
            durationMs: result.trace.stages[0]?.durationMs ?? 0,
            output: result.output as Prisma.InputJsonValue,
            trace: result.trace as Prisma.InputJsonValue,
          });
        },
      }
    );

    for (let i = 0; i < results.length; i++) {
      const result = results[i]!;
      await prisma.agentExecution.create({
        data: {
          workflowId,
          agentType: stages[i] ?? "unknown",
          status: "COMPLETED",
          input: enrichedInput as Prisma.InputJsonValue,
          output: result.output as object,
          trace: result.trace as object,
          startedAt: new Date(),
          completedAt: new Date(),
        },
      });
    }

    const finalOutput = results[results.length - 1]?.output ?? {};

    await prisma.workflow.update({
      where: { id: workflowId },
      data: { status: "COMPLETED", output: finalOutput as object },
    });

    if (workflowType === "DOCUMENT_INGESTION") {
      const knowledgeResult = results.find((r) =>
        Array.isArray((r.output as { objects?: unknown }).objects)
      );
      const sourceId = ctx.input.sourceId as string | undefined;
      if (sourceId && knowledgeResult) {
        const output = knowledgeResult.output as {
          objects: Array<{ type: string; content: string; confidence: number; tags?: string[] }>;
          edges?: Array<{ fromIndex: number; toIndex?: number; relation: string }>;
        };
        const createdIds: string[] = [];
        for (const obj of output.objects) {
          const ko = await prisma.knowledgeObject.create({
            data: {
              sourceId,
              type: obj.type,
              content: obj.content,
              confidence: obj.confidence,
              metadata: { tags: obj.tags ?? [] },
            },
          });
          createdIds.push(ko.id);
        }
        for (const edge of output.edges ?? []) {
          if (edge.toIndex !== undefined && createdIds[edge.fromIndex] && createdIds[edge.toIndex]) {
            await prisma.knowledgeGraphEdge.create({
              data: {
                organizationId: ctx.organizationId,
                fromObjectId: createdIds[edge.fromIndex],
                toObjectId: createdIds[edge.toIndex],
                relation: edge.relation,
              },
            });
          }
        }
        await prisma.knowledgeSource.update({
          where: { id: sourceId },
          data: { status: "EXTRACTED" },
        });
      }
    }

    await recordFlight({
      organizationId: ctx.organizationId,
      workflowId,
      correlationId: ctx.correlationId,
      stage: "complete",
      status: "completed",
      durationMs: Date.now() - startTime,
      output: finalOutput as Prisma.InputJsonValue,
    });
  } catch (error) {
    await prisma.workflow.update({
      where: { id: workflowId },
      data: { status: "FAILED", output: { error: String(error) } },
    });
    await recordFlight({
      organizationId: ctx.organizationId,
      workflowId,
      correlationId: ctx.correlationId,
      stage: "error",
      status: "failed",
      durationMs: 0,
      output: { error: String(error) },
    });
  }
}
