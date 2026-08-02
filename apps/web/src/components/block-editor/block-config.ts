import type { RuleBlock } from "@policy-brain/shared";

export type BlockType = RuleBlock["type"];

export const BLOCK_PALETTE: Array<{
  type: BlockType;
  label: string;
  description: string;
  color: string;
  border: string;
  bg: string;
  icon: string;
}> = [
  {
    type: "metadata",
    label: "Metadata",
    description: "Rule name, version, and policy context",
    color: "text-slate-700",
    border: "border-slate-300",
    bg: "bg-slate-50",
    icon: "Tag",
  },
  {
    type: "eligibility",
    label: "Eligibility",
    description: "Who or what this rule applies to",
    color: "text-blue-800",
    border: "border-blue-300",
    bg: "bg-blue-50",
    icon: "Users",
  },
  {
    type: "condition",
    label: "Condition",
    description: "Requirements that must be satisfied",
    color: "text-amber-800",
    border: "border-amber-300",
    bg: "bg-amber-50",
    icon: "Filter",
  },
  {
    type: "exception",
    label: "Exception",
    description: "Overrides that bypass normal logic",
    color: "text-orange-800",
    border: "border-orange-300",
    bg: "bg-orange-50",
    icon: "AlertTriangle",
  },
  {
    type: "decision",
    label: "Decision",
    description: "Final outcome when logic matches",
    color: "text-emerald-800",
    border: "border-emerald-400",
    bg: "bg-emerald-50",
    icon: "CheckCircle",
  },
  {
    type: "evidence",
    label: "Evidence",
    description: "Fields traced for audit and explainability",
    color: "text-violet-800",
    border: "border-violet-300",
    bg: "bg-violet-50",
    icon: "FileText",
  },
];

export const OPERATORS = [
  { value: "==", label: "equals" },
  { value: "!=", label: "not equals" },
  { value: ">=", label: "≥" },
  { value: "<=", label: "≤" },
  { value: ">", label: ">" },
  { value: "<", label: "<" },
  { value: "in", label: "in list" },
  { value: "exists", label: "exists" },
];

export const DECISION_OUTCOMES = ["APPROVE", "DENY", "REVIEW", "PEND"];

export const COMMON_FIELDS = [
  "procedure_code",
  "patient_age",
  "conservative_treatment_weeks",
  "clinical_indication",
  "emergency",
  "authorization_type",
  "provider_specialty",
  "diagnosis_code",
];

export function getBlockConfig(type: BlockType) {
  return BLOCK_PALETTE.find((b) => b.type === type) ?? BLOCK_PALETTE[0]!;
}

export function createDefaultBlock(type: BlockType): RuleBlock {
  switch (type) {
    case "metadata":
      return { type: "metadata" };
    case "decision":
      return { type: "decision", outcome: "APPROVE" };
    case "evidence":
      return { type: "evidence", evidence: [] };
    case "exception":
      return { type: "exception", logic: "OR", conditions: [] };
    default:
      return { type, logic: "AND", conditions: [] };
  }
}

export function summarizeBlock(block: RuleBlock): string {
  switch (block.type) {
    case "decision":
      return block.outcome ? `→ ${block.outcome}` : "Set outcome";
    case "evidence":
      return block.evidence?.length
        ? `${block.evidence.length} evidence field(s)`
        : "Add evidence fields";
    case "metadata":
      return "Policy metadata";
    default:
      if (!block.conditions?.length) return "No conditions — click to edit";
      return block.conditions
        .map((c) => `${c.field} ${c.operator} ${JSON.stringify(c.value)}`)
        .join(` ${block.logic ?? "AND"} `);
  }
}
