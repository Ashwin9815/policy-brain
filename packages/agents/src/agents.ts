import type { Agent, AgentContext, AgentResult } from "./types.js";

function stubAgent(type: string, output: Record<string, unknown>): Agent {
  return {
    type: type as Agent["type"],
    async execute(ctx: AgentContext): Promise<AgentResult> {
      const start = Date.now();
      await new Promise((r) => setTimeout(r, 50));
      return {
        output,
        trace: {
          agentType: type,
          stages: [
            {
              name: "execute",
              durationMs: Date.now() - start,
              status: "completed",
            },
          ],
          decisionTrace: [
            `Agent ${type} processed workflow ${ctx.workflowId}`,
            "AI proposes — human approval required before production",
          ],
        },
      };
    },
  };
}

export const documentExtractor = stubAgent("document-extractor", {
  extractedText: "Sample extracted policy text from uploaded document.",
  pageCount: 12,
});

export const knowledgeExtractor = stubAgent("knowledge-extractor", {
  objects: [
    {
      type: "policy_fragment",
      content: "MRI requires 6 weeks conservative treatment",
      confidence: 0.92,
    },
    {
      type: "procedure_code",
      content: "CPT 70551-70553 — MRI brain",
      confidence: 0.98,
    },
  ],
});

export const ruleGenerator = stubAgent("rule-generator", {
  suggestedRules: [
    {
      title: "MRI Conservative Treatment Requirement",
      dsl: {
        metadata: { name: "MRI Conservative Treatment Requirement", version: 1 },
        blocks: [
          {
            type: "condition",
            logic: "AND",
            conditions: [
              { field: "conservative_treatment_weeks", operator: ">=", value: 6 },
            ],
          },
          { type: "decision", outcome: "APPROVE" },
        ],
      },
    },
  ],
});

export const duplicateChecker = stubAgent("duplicate-checker", {
  duplicates: [],
  similarityScores: [],
});

export const ruleComparator = stubAgent("rule-comparator", {
  additions: [],
  removals: [],
  conflicts: [],
});

export const impactAnalyzer = stubAgent("impact-analyzer", {
  impactedPolicies: [],
  riskLevel: "low",
});

export const explainabilityAgent = stubAgent("explainability", {
  explanation:
    "This rule approves MRI when conservative treatment of 6+ weeks is documented, aligning with medical necessity guidelines.",
});

export const exportAgent = stubAgent("export", {
  format: "json",
  artifact: { rules: [] },
});

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
