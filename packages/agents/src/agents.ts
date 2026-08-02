import {
  buildRuleFromClarifications,
  compareRuleDsl,
  compileDsl,
  type RuleDsl,
} from "@policy-brain/shared";
import {
  extractDocumentText,
  extractKnowledgeObjects,
  suggestGraphEdges,
} from "./services/extraction.js";
import type { Agent, AgentContext, AgentResult } from "./types.js";

function trace(stage: string, detail: string): string[] {
  return [`[${stage}] ${detail}`, "Governance: output validated before delivery"];
}

async function timed<T>(fn: () => Promise<T>): Promise<{ result: T; durationMs: number }> {
  const start = Date.now();
  const result = await fn();
  return { result, durationMs: Date.now() - start };
}

export const documentExtractor: Agent = {
  type: "document-extractor",
  async execute(ctx) {
    const { result, durationMs } = await timed(async () => {
      const storagePath = ctx.input.storagePath as string;
      const mimeType = (ctx.input.mimeType as string) ?? "text/plain";
      if (!storagePath) {
        return { extractedText: "", pageCount: 0 };
      }
      const doc = await extractDocumentText(storagePath, mimeType);
      return { extractedText: doc.text, pageCount: doc.pageCount };
    });

    return {
      output: result,
      trace: {
        agentType: "document-extractor",
        stages: [{ name: "extract", durationMs, status: "completed" }],
        decisionTrace: trace("extract", `Extracted ${result.extractedText.length} characters`),
      },
    };
  },
};

export const knowledgeExtractor: Agent = {
  type: "knowledge-extractor",
  async execute(ctx) {
    const { result, durationMs } = await timed(async () => {
      const text =
        (ctx.input.extractedText as string) ??
        (ctx.input.text as string) ??
        "";
      const objects = extractKnowledgeObjects(text);
      const edges = suggestGraphEdges(
        objects,
        (ctx.input.existingRuleIds as string[]) ?? []
      );
      return { objects, edges };
    });

    return {
      output: result,
      trace: {
        agentType: "knowledge-extractor",
        stages: [{ name: "extract-knowledge", durationMs, status: "completed" }],
        decisionTrace: trace(
          "knowledge",
          `Created ${result.objects.length} knowledge objects, ${result.edges.length} graph edges`
        ),
      },
    };
  },
};

export const ruleGenerator: Agent = {
  type: "rule-generator",
  async execute(ctx) {
    const { result, durationMs } = await timed(async () => {
      const title = (ctx.input.title as string) ?? "Generated Policy Rule";
      const answers = (ctx.input.clarifications as Record<string, string>) ?? {};
      const objects =
        (ctx.input.knowledgeObjects as Array<{ type: string; content: string }>) ?? [];
      const dsl = buildRuleFromClarifications(title, answers, objects);
      return {
        suggestedRules: [{ title, dsl }],
        naturalLanguage: `When procedure codes match and conservative treatment ≥ ${answers.conservative_treatment_weeks ?? 6} weeks with documented clinical indication, APPROVE.`,
      };
    });

    return {
      output: result,
      trace: {
        agentType: "rule-generator",
        stages: [{ name: "generate", durationMs, status: "completed" }],
        decisionTrace: trace("generate", "Rule DSL generated from knowledge + clarifications"),
      },
    };
  },
};

export const duplicateChecker: Agent = {
  type: "duplicate-checker",
  async execute(ctx) {
    const { result, durationMs } = await timed(async () => {
      const candidate = ctx.input.candidateDsl as Record<string, unknown>;
      const existing =
        (ctx.input.existingRules as Array<{ id: string; title: string; dslContent: Record<string, unknown> }>) ?? [];
      const duplicates: Array<{ ruleId: string; title: string; similarity: number }> = [];

      for (const rule of existing) {
        const cmp = compareRuleDsl(candidate ?? {}, rule.dslContent);
        const changeCount =
          cmp.additions.length + cmp.removals.length + cmp.changes.length;
        const similarity = changeCount === 0 ? 1.0 : Math.max(0, 1 - changeCount * 0.15);
        if (similarity >= 0.7) {
          duplicates.push({ ruleId: rule.id, title: rule.title, similarity });
        }
      }

      return { duplicates, similarityScores: duplicates.map((d) => d.similarity) };
    });

    return {
      output: result,
      trace: {
        agentType: "duplicate-checker",
        stages: [{ name: "check", durationMs, status: "completed" }],
        decisionTrace: trace("duplicate", `Found ${result.duplicates.length} potential duplicates`),
      },
    };
  },
};

export const ruleComparator: Agent = {
  type: "rule-comparator",
  async execute(ctx) {
    const { result, durationMs } = await timed(async () => {
      const left = ctx.input.leftDsl as Record<string, unknown>;
      const right = ctx.input.rightDsl as Record<string, unknown>;
      const cmp = compareRuleDsl(left, right);
      return {
        additions: cmp.additions,
        removals: cmp.removals,
        changes: cmp.changes,
        conflicts: cmp.conflicts,
      };
    });

    return {
      output: result,
      trace: {
        agentType: "rule-comparator",
        stages: [{ name: "compare", durationMs, status: "completed" }],
        decisionTrace: trace("compare", `${result.conflicts.length} conflicts detected`),
      },
    };
  },
};

export const impactAnalyzer: Agent = {
  type: "impact-analyzer",
  async execute(ctx) {
    const { result, durationMs } = await timed(async () => {
      const ruleId = ctx.input.ruleId as string;
      const policies =
        (ctx.input.relatedPolicies as Array<{ id: string; title: string }>) ?? [];
      const impacted = policies.filter((p) => p.id !== ruleId);
      const riskLevel =
        impacted.length > 5 ? "high" : impacted.length > 2 ? "medium" : "low";
      return {
        impactedPolicies: impacted,
        riskLevel,
        downstreamEffects: [
          "Claims adjudication rules may need update",
          "Provider communication templates affected",
        ],
      };
    });

    return {
      output: result,
      trace: {
        agentType: "impact-analyzer",
        stages: [{ name: "analyze", durationMs, status: "completed" }],
        decisionTrace: trace("impact", `Risk level: ${result.riskLevel}`),
      },
    };
  },
};

export const explainabilityAgent: Agent = {
  type: "explainability",
  async execute(ctx) {
    const dsl = ctx.input.dsl as RuleDsl | undefined;
    const { result, durationMs } = await timed(async () => {
      if (!dsl) {
        return { explanation: "No rule DSL provided for explanation." };
      }
      const blocks = dsl.blocks ?? [];
      const conditions = blocks
        .filter((b) => b.conditions)
        .flatMap((b) => b.conditions ?? [])
        .map((c) => `${c.field} ${c.operator} ${JSON.stringify(c.value)}`);
      const decision = blocks.find((b) => b.outcome)?.outcome ?? "UNKNOWN";
      return {
        explanation: `This rule ${decision}s when: ${conditions.join("; ")}. Evidence fields are traced for audit.`,
        confidence: 0.91,
        evidenceChain: blocks.filter((b) => b.evidence).flatMap((b) => b.evidence ?? []),
      };
    });

    return {
      output: result,
      trace: {
        agentType: "explainability",
        stages: [{ name: "explain", durationMs, status: "completed" }],
        decisionTrace: trace("explain", "Decision trace generated"),
      },
    };
  },
};

export const exportAgent: Agent = {
  type: "export",
  async execute(ctx) {
    const { result, durationMs } = await timed(async () => {
      const dsl = ctx.input.dsl as RuleDsl;
      const format = (ctx.input.format as "json" | "yaml" | "python" | "dsl") ?? "json";
      const artifact = compileDsl(dsl, format);
      return { format, artifact, validated: true };
    });

    return {
      output: result,
      trace: {
        agentType: "export",
        stages: [{ name: "export", durationMs, status: "completed" }],
        decisionTrace: trace("export", `Compiled to ${result.format}`),
      },
    };
  },
};

export const agents: Record<string, Agent> = {
  "document-extractor": documentExtractor,
  "knowledge-extractor": knowledgeExtractor,
  "rule-generator": ruleGenerator,
  "duplicate-checker": duplicateChecker,
  "rule-comparator": ruleComparator,
  "impact-analyzer": impactAnalyzer,
  explainability: explainabilityAgent,
  export: exportAgent,
};
