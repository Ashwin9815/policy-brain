"use client";

import type { RuleBlock } from "@policy-brain/shared";
import {
  COMMON_FIELDS,
  DECISION_OUTCOMES,
  OPERATORS,
  getBlockConfig,
} from "./block-config";

interface BlockInspectorProps {
  block: RuleBlock;
  blockIndex: number;
  onChange: (block: RuleBlock) => void;
}

export function BlockInspector({ block, blockIndex, onChange }: BlockInspectorProps) {
  const config = getBlockConfig(block.type);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Block {blockIndex + 1}
        </div>
        <h3 className={`text-lg font-bold ${config.color}`}>{config.label}</h3>
        <p className="text-xs text-slate-500">{config.description}</p>
      </div>

      {(block.type === "condition" ||
        block.type === "eligibility" ||
        block.type === "exception") && (
        <>
          <div>
            <label className="text-xs font-medium text-slate-600">Logic</label>
            <div className="mt-1 flex gap-2">
              {(["AND", "OR"] as const).map((logic) => (
                <button
                  key={logic}
                  type="button"
                  onClick={() => onChange({ ...block, logic })}
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
                    (block.logic ?? "AND") === logic
                      ? "bg-navy text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {logic}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-medium text-slate-600">Conditions</label>
            {(block.conditions ?? []).map((c, ci) => (
              <div key={ci} className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <select
                  value={c.field}
                  onChange={(e) => updateCondition(block, onChange, ci, { field: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                >
                  <option value="">Select field…</option>
                  {COMMON_FIELDS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                <select
                  value={c.operator}
                  onChange={(e) => updateCondition(block, onChange, ci, { operator: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                >
                  {OPERATORS.map((op) => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>
                {c.operator !== "exists" && (
                  <input
                    value={String(c.value ?? "")}
                    onChange={(e) => updateCondition(block, onChange, ci, { value: e.target.value })}
                    placeholder="Value"
                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  />
                )}
                <button
                  type="button"
                  onClick={() => removeCondition(block, onChange, ci)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Remove condition
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...block,
                  conditions: [...(block.conditions ?? []), { field: "", operator: "==", value: "" }],
                })
              }
              className="w-full rounded-lg border border-dashed border-slate-300 py-2 text-sm text-accent hover:border-accent"
            >
              + Add condition
            </button>
          </div>
        </>
      )}

      {block.type === "decision" && (
        <div>
          <label className="text-xs font-medium text-slate-600">Outcome</label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {DECISION_OUTCOMES.map((outcome) => (
              <button
                key={outcome}
                type="button"
                onClick={() => onChange({ ...block, outcome })}
                className={`rounded-xl py-3 text-sm font-bold ${
                  block.outcome === outcome
                    ? outcome === "APPROVE"
                      ? "bg-emerald-600 text-white"
                      : outcome === "DENY"
                        ? "bg-red-600 text-white"
                        : "bg-navy text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {outcome}
              </button>
            ))}
          </div>
        </div>
      )}

      {block.type === "evidence" && (
        <div>
          <label className="text-xs font-medium text-slate-600">Evidence fields</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {COMMON_FIELDS.map((field) => {
              const selected = block.evidence?.includes(field);
              return (
                <button
                  key={field}
                  type="button"
                  onClick={() => {
                    const evidence = block.evidence ?? [];
                    onChange({
                      ...block,
                      evidence: selected
                        ? evidence.filter((e) => e !== field)
                        : [...evidence, field],
                    });
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    selected
                      ? "bg-violet-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {field}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {block.type === "metadata" && (
        <p className="text-sm text-slate-500">
          Metadata is inherited from the rule header. Edit the rule name in policy settings.
        </p>
      )}
    </div>
  );
}

function updateCondition(
  block: RuleBlock,
  onChange: (b: RuleBlock) => void,
  index: number,
  patch: Partial<{ field: string; operator: string; value: unknown }>
) {
  const conditions = [...(block.conditions ?? [])];
  conditions[index] = { ...conditions[index]!, ...patch };
  onChange({ ...block, conditions });
}

function removeCondition(block: RuleBlock, onChange: (b: RuleBlock) => void, index: number) {
  onChange({
    ...block,
    conditions: (block.conditions ?? []).filter((_, i) => i !== index),
  });
}
