export interface ClarificationQuestion {
  id: string;
  question: string;
  field: string;
  suggestedAnswer?: string;
  options?: string[];
  required: boolean;
}

export function generateClarificationQuestions(
  knowledgeObjects: Array<{ type: string; content: string }>
): ClarificationQuestion[] {
  const questions: ClarificationQuestion[] = [];
  const text = knowledgeObjects.map((o) => o.content).join(" ").toLowerCase();

  if (text.match(/mri|imaging|7055/)) {
    questions.push({
      id: "procedure_scope",
      question: "Which procedure codes should this policy cover?",
      field: "procedure_code",
      suggestedAnswer: "70551, 70552, 70553",
      options: ["70551-70553 (MRI brain)", "72141-72158 (MRI spine)", "Custom range"],
      required: true,
    });
    questions.push({
      id: "conservative_treatment",
      question: "How many weeks of conservative treatment are required before approval?",
      field: "conservative_treatment_weeks",
      suggestedAnswer: "6",
      options: ["4", "6", "8", "12"],
      required: true,
    });
  }

  if (text.match(/prior auth|authorization/)) {
    questions.push({
      id: "auth_type",
      question: "Is this a prior authorization or retrospective review policy?",
      field: "authorization_type",
      options: ["Prior Authorization", "Retrospective Review", "Both"],
      required: true,
    });
  }

  if (text.match(/age|pediatric|adult|65/)) {
    questions.push({
      id: "age_restriction",
      question: "Are there age restrictions for this policy?",
      field: "patient_age",
      options: ["No restriction", "Adults only (18+)", "Pediatric only (<18)", "Custom"],
      required: false,
    });
  }

  if (questions.length === 0) {
    questions.push({
      id: "policy_intent",
      question: "What is the primary decision this policy should make?",
      field: "decision_intent",
      suggestedAnswer: "APPROVE when medical necessity is documented",
      required: true,
    });
    questions.push({
      id: "denial_criteria",
      question: "What conditions should result in denial?",
      field: "denial_criteria",
      suggestedAnswer: "Missing clinical indication or incomplete documentation",
      required: true,
    });
  }

  return questions;
}

export function buildRuleFromClarifications(
  title: string,
  answers: Record<string, string>,
  knowledgeObjects: Array<{ type: string; content: string }>
) {
  const procedureCodes = (answers.procedure_code ?? "70551, 70552, 70553")
    .split(",")
    .map((s) => s.trim());
  const weeks = parseInt(answers.conservative_treatment_weeks ?? "6", 10);

  return {
    metadata: {
      name: title,
      version: 1,
      description: `Generated from ${knowledgeObjects.length} knowledge objects`,
    },
    blocks: [
      {
        type: "metadata",
        conditions: [{ field: "policy_type", operator: "==", value: answers.authorization_type ?? "Prior Authorization" }],
      },
      {
        type: "eligibility",
        conditions: [{ field: "procedure_code", operator: "in", value: procedureCodes }],
      },
      {
        type: "condition",
        logic: "AND",
        conditions: [
          { field: "conservative_treatment_weeks", operator: ">=", value: weeks },
          { field: "clinical_indication", operator: "exists", value: true },
        ],
      },
      {
        type: "exception",
        logic: "OR",
        conditions: [{ field: "emergency", operator: "==", value: true }],
      },
      {
        type: "decision",
        outcome: "APPROVE",
        evidence: ["clinical_indication", "conservative_treatment_weeks", "procedure_code"],
      },
      {
        type: "evidence",
        evidence: knowledgeObjects.slice(0, 3).map((o) => o.content),
      },
    ],
  };
}
