import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "@policy-brain/database";
import type { Prisma } from "@policy-brain/database";
import {
  generateClarificationQuestions,
  validateRuleDsl,
} from "@policy-brain/shared";
import { orchestrator } from "@policy-brain/agents";
import { extractDocumentText, extractKnowledgeObjects } from "@policy-brain/agents";
import type { AppEnv } from "../types.js";
import { ok, err, audit } from "../lib/response.js";
import { requireAuth, requireFolderAccess } from "../middleware/auth.js";
import { recordFlight } from "../lib/flight-recorder.js";

export const composerRoutes = new Hono<AppEnv>();

composerRoutes.use("*", requireAuth);

composerRoutes.post("/sessions", async (c) => {
  const user = c.get("user")!;
  const body = await c.req.json();
  const parsed = z
    .object({ folderId: z.string(), title: z.string().optional() })
    .safeParse(body);
  if (!parsed.success) return err(c, "VALIDATION_ERROR", parsed.error.message);

  const hasAccess = await requireFolderAccess(c, parsed.data.folderId, "WRITE");
  if (!hasAccess) return err(c, "FORBIDDEN", "No write access", 403);

  const session = await prisma.composerSession.create({
    data: {
      organizationId: user.organizationId,
      userId: user.id,
      folderId: parsed.data.folderId,
      title: parsed.data.title,
      stage: "UPLOAD",
    },
  });

  return ok(c, session, 201);
});

composerRoutes.get("/sessions/:id", async (c) => {
  const user = c.get("user")!;
  const session = await prisma.composerSession.findFirst({
    where: { id: c.req.param("id"), organizationId: user.organizationId },
    include: {
      folder: { select: { id: true, name: true } },
      policy: { include: { rules: true } },
    },
  });
  if (!session) return err(c, "NOT_FOUND", "Session not found", 404);
  return ok(c, session);
});

composerRoutes.post("/sessions/:id/extract", async (c) => {
  const user = c.get("user")!;
  const session = await prisma.composerSession.findFirst({
    where: { id: c.req.param("id"), organizationId: user.organizationId },
  });
  if (!session) return err(c, "NOT_FOUND", "Session not found", 404);

  const sources = await prisma.knowledgeSource.findMany({
    where: { id: { in: session.sourceIds } },
  });

  const allObjects: Array<{ type: string; content: string; confidence: number }> = [];
  const correlationId = c.get("correlationId");

  for (const source of sources) {
    const start = Date.now();
    let text = source.extractedText ?? "";
    if (!text && source.storagePath) {
      const extracted = await extractDocumentText(source.storagePath, source.mimeType);
      text = extracted.text;
      await prisma.knowledgeSource.update({
        where: { id: source.id },
        data: { extractedText: text, status: "EXTRACTED" },
      });
    }

    const objects = extractKnowledgeObjects(text);
    for (const obj of objects) {
      const ko = await prisma.knowledgeObject.create({
        data: {
          sourceId: source.id,
          type: obj.type,
          content: obj.content,
          confidence: obj.confidence,
          metadata: { tags: obj.tags },
        },
      });
      allObjects.push({ type: ko.type, content: ko.content, confidence: ko.confidence });
    }

    await recordFlight({
      organizationId: user.organizationId,
      correlationId,
      stage: "extract",
      agentType: "knowledge-extractor",
      status: "completed",
      durationMs: Date.now() - start,
      output: { objectCount: objects.length },
    });
  }

  const questions = generateClarificationQuestions(allObjects);

  const updated = await prisma.composerSession.update({
    where: { id: session.id },
    data: {
      stage: "CLARIFY",
      clarifications: questions as unknown as Prisma.InputJsonValue,
      metadata: { extractedObjectCount: allObjects.length },
    },
  });

  return ok(c, { session: updated, questions, knowledgeObjects: allObjects });
});

composerRoutes.post("/sessions/:id/clarify", async (c) => {
  const user = c.get("user")!;
  const body = await c.req.json();
  const parsed = z.object({ answers: z.record(z.string()) }).safeParse(body);
  if (!parsed.success) return err(c, "VALIDATION_ERROR", parsed.error.message);

  const session = await prisma.composerSession.findFirst({
    where: { id: c.req.param("id"), organizationId: user.organizationId },
  });
  if (!session) return err(c, "NOT_FOUND", "Session not found", 404);

  const questions = session.clarifications as Array<{ id: string; question: string }>;
  const answered = { ...parsed.data.answers };

  const updated = await prisma.composerSession.update({
    where: { id: session.id },
    data: {
      metadata: { ...(session.metadata as object), answers: answered },
      stage: "GENERATE",
    },
  });

  return ok(c, {
    session: updated,
    allAnswered: questions.every((q) => answered[q.id] || answered[q.id.replace(/_/g, "-")]),
  });
});

composerRoutes.post("/sessions/:id/generate", async (c) => {
  const user = c.get("user")!;
  const session = await prisma.composerSession.findFirst({
    where: { id: c.req.param("id"), organizationId: user.organizationId },
  });
  if (!session) return err(c, "NOT_FOUND", "Session not found", 404);

  const metadata = session.metadata as { answers?: Record<string, string> };
  const answers = metadata.answers ?? {};

  const objects = await prisma.knowledgeObject.findMany({
    where: { sourceId: { in: session.sourceIds } },
    take: 50,
  });

  const existingRules = await prisma.rule.findMany({
    where: { policy: { organizationId: user.organizationId } },
    select: { id: true, title: true, dslContent: true },
  });

  const correlationId = c.get("correlationId");
  const genResult = await orchestrator.invokeAgent("rule-generator", {
    workflowId: session.id,
    correlationId,
    organizationId: user.organizationId,
    input: {
      title: session.title ?? "Generated Policy Rule",
      clarifications: answers,
      knowledgeObjects: objects,
    },
  });

  const candidateDsl = (
    genResult.output.suggestedRules as Array<{ dsl: unknown }>
  )[0]?.dsl;

  const dupResult = await orchestrator.invokeAgent("duplicate-checker", {
    workflowId: session.id,
    correlationId,
    organizationId: user.organizationId,
    input: {
      candidateDsl,
      existingRules: existingRules.map((r) => ({
        id: r.id,
        title: r.title,
        dslContent: r.dslContent as Record<string, unknown>,
      })),
    },
  });

  const explainResult = await orchestrator.invokeAgent("explainability", {
    workflowId: session.id,
    correlationId,
    organizationId: user.organizationId,
    input: { dsl: candidateDsl },
  });

  const generatedRules = genResult.output.suggestedRules;

  const updated = await prisma.composerSession.update({
    where: { id: session.id },
    data: {
      stage: "REVIEW",
      generatedRules: generatedRules as object[],
      metadata: {
        ...metadata,
        duplicates: dupResult.output,
        explanation: explainResult.output,
      } as Prisma.InputJsonValue,
    },
  });

  await recordFlight({
    organizationId: user.organizationId,
    correlationId,
    stage: "generate",
    agentType: "rule-generator",
    status: "completed",
    durationMs: 0,
    output: { ruleCount: (generatedRules as unknown[]).length },
  });

  return ok(c, {
    session: updated,
    generatedRules,
    duplicates: dupResult.output,
    explanation: explainResult.output,
  });
});

composerRoutes.post("/sessions/:id/finalize", async (c) => {
  const user = c.get("user")!;
  const session = await prisma.composerSession.findFirst({
    where: { id: c.req.param("id"), organizationId: user.organizationId },
  });
  if (!session) return err(c, "NOT_FOUND", "Session not found", 404);

  const rules = session.generatedRules as Array<{
    title: string;
    dsl: unknown;
  }>;
  if (!rules?.length) return err(c, "INVALID_STATE", "No generated rules to finalize");

  const policy = await prisma.policy.create({
    data: {
      title: session.title ?? "AI Generated Policy",
      description: "Created via AI Policy Composer",
      folderId: session.folderId,
      organizationId: user.organizationId,
      createdById: user.id,
      status: "DRAFT",
    },
  });

  for (const r of rules) {
    const validation = validateRuleDsl(r.dsl);
    if (!validation.success) continue;
    await prisma.rule.create({
      data: {
        policyId: policy.id,
        title: r.title,
        dslContent: validation.data as object,
        createdById: user.id,
        versions: {
          create: {
            version: 1,
            dslContent: validation.data as object,
            changeNote: "AI Composer initial generation",
          },
        },
      },
    });
  }

  const updated = await prisma.composerSession.update({
    where: { id: session.id },
    data: { stage: "COMPLETE", policyId: policy.id },
  });

  await audit(
    user.organizationId,
    user.id,
    "composer.finalized",
    "policy",
    policy.id,
    c.get("correlationId")
  );

  return ok(c, { session: updated, policy });
});

composerRoutes.post("/sessions/:id/sources", async (c) => {
  const user = c.get("user")!;
  const session = await prisma.composerSession.findFirst({
    where: { id: c.req.param("id"), organizationId: user.organizationId },
  });
  if (!session) return err(c, "NOT_FOUND", "Session not found", 404);

  const formData = await c.req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return err(c, "VALIDATION_ERROR", "file required");

  const { writeFile, mkdir } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const UPLOAD_DIR = join(process.cwd(), "uploads");
  await mkdir(UPLOAD_DIR, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  const storagePath = join(UPLOAD_DIR, `${Date.now()}-${file.name}`);
  await writeFile(storagePath, buffer);

  const source = await prisma.knowledgeSource.create({
    data: {
      title: file.name,
      fileName: file.name,
      mimeType: file.type || "text/plain",
      fileSize: buffer.length,
      storagePath,
      folderId: session.folderId,
      organizationId: user.organizationId,
    },
  });

  await prisma.composerSession.update({
    where: { id: session.id },
    data: { sourceIds: { push: source.id }, stage: "EXTRACT" },
  });

  return ok(c, source, 201);
});
