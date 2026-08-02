export const AGENT_TYPES = [
  "document-extractor",
  "knowledge-extractor",
  "rule-generator",
  "duplicate-checker",
  "rule-comparator",
  "impact-analyzer",
  "explainability",
  "export",
] as const;

export type AgentType = (typeof AGENT_TYPES)[number];

export const API_VERSION = "v1";

export const WORKFLOW_STAGES: Record<string, string[]> = {
  DOCUMENT_INGESTION: [
    "upload",
    "extract",
    "knowledge-objects",
    "complete",
  ],
  RULE_GENERATION: [
    "context-assembly",
    "clarification",
    "generation",
    "validation",
    "complete",
  ],
};
