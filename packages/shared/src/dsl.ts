import { z } from "zod";

export const RuleBlockSchema = z.object({
  type: z.enum([
    "metadata",
    "eligibility",
    "condition",
    "exception",
    "decision",
    "evidence",
  ]),
  logic: z.enum(["AND", "OR"]).optional(),
  conditions: z
    .array(
      z.object({
        field: z.string(),
        operator: z.string(),
        value: z.unknown(),
      })
    )
    .optional(),
  outcome: z.string().optional(),
  evidence: z.array(z.string()).optional(),
});

export const RuleDslSchema = z.object({
  metadata: z.object({
    name: z.string(),
    version: z.number().int().positive(),
    description: z.string().optional(),
  }),
  blocks: z.array(RuleBlockSchema).min(1),
});

export type RuleDsl = z.infer<typeof RuleDslSchema>;
export type RuleBlock = z.infer<typeof RuleBlockSchema>;

export function validateRuleDsl(input: unknown): {
  success: boolean;
  data?: RuleDsl;
  errors?: string[];
} {
  const result = RuleDslSchema.safeParse(input);
  if (result.success) {
    const circular = detectCircularLogic(result.data);
    if (circular) {
      return { success: false, errors: [circular] };
    }
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
  };
}

function detectCircularLogic(dsl: RuleDsl): string | null {
  const decisionBlocks = dsl.blocks.filter((b) => b.type === "decision");
  if (decisionBlocks.length === 0) {
    return "Rule must contain at least one decision block";
  }
  return null;
}

export function dslToNaturalLanguage(dsl: RuleDsl): string {
  const lines: string[] = [`Rule: ${dsl.metadata.name} (v${dsl.metadata.version})`];
  for (const block of dsl.blocks) {
    if (block.type === "condition" && block.conditions) {
      const parts = block.conditions.map(
        (c) => `${c.field} ${c.operator} ${JSON.stringify(c.value)}`
      );
      lines.push(`When ${parts.join(` ${block.logic ?? "AND"} `)}`);
    }
    if (block.type === "decision" && block.outcome) {
      lines.push(`Then ${block.outcome}`);
    }
  }
  return lines.join("\n");
}
