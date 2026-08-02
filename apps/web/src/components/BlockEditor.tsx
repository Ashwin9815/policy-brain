"use client";

import { useState } from "react";
import { dslToNaturalLanguage, type RuleDsl, type RuleBlock } from "@policy-brain/shared";

interface BlockEditorProps {
  dsl: RuleDsl;
  onChange: (dsl: RuleDsl) => void;
  onSave: () => void;
  saving?: boolean;
}

const BLOCK_TYPES = ["metadata", "eligibility", "condition", "exception", "decision", "evidence"];

export function BlockEditor({ dsl, onChange, onSave, saving }: BlockEditorProps) {
  const [view, setView] = useState<"visual" | "natural" | "json">("visual");

  function updateBlock(index: number, block: RuleBlock) {
    const blocks = [...dsl.blocks];
    blocks[index] = block;
    onChange({ ...dsl, blocks });
  }

  function addBlock() {
    onChange({
      ...dsl,
      blocks: [...dsl.blocks, { type: "condition", logic: "AND", conditions: [] }],
    });
  }

  function removeBlock(index: number) {
    onChange({ ...dsl, blocks: dsl.blocks.filter((_, i) => i !== index) });
  }

  function moveBlock(index: number, dir: -1 | 1) {
    const blocks = [...dsl.blocks];
    const target = index + dir;
    if (target < 0 || target >= blocks.length) return;
    [blocks[index], blocks[target]] = [blocks[target]!, blocks[index]!];
    onChange({ ...dsl, blocks });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {(["visual", "natural", "json"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-md px-3 py-1 text-xs font-medium capitalize ${
                view === v ? "bg-navy text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {v === "natural" ? "Natural Language" : v}
            </button>
          ))}
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Rule"}
        </button>
      </div>

      {view === "visual" && (
        <div className="space-y-3">
          {dsl.blocks.map((block, i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-accent px-2 py-0.5 text-xs font-bold text-white">
                    {block.type}
                  </span>
                  <select
                    value={block.type}
                    onChange={(e) => updateBlock(i, { ...block, type: e.target.value as RuleBlock["type"] })}
                    className="rounded border border-slate-200 px-2 py-1 text-xs"
                  >
                    {BLOCK_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => moveBlock(i, -1)} className="rounded px-2 py-1 text-xs hover:bg-slate-100">↑</button>
                  <button onClick={() => moveBlock(i, 1)} className="rounded px-2 py-1 text-xs hover:bg-slate-100">↓</button>
                  <button onClick={() => removeBlock(i)} className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50">✕</button>
                </div>
              </div>

              {block.type === "decision" && (
                <input
                  value={block.outcome ?? ""}
                  onChange={(e) => updateBlock(i, { ...block, outcome: e.target.value })}
                  placeholder="Decision outcome (APPROVE, DENY, REVIEW)"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              )}

              {(block.type === "condition" || block.type === "eligibility") && (
                <div className="space-y-2">
                  <select
                    value={block.logic ?? "AND"}
                    onChange={(e) => updateBlock(i, { ...block, logic: e.target.value as "AND" | "OR" })}
                    className="rounded border border-slate-200 px-2 py-1 text-xs"
                  >
                    <option value="AND">AND</option>
                    <option value="OR">OR</option>
                  </select>
                  {(block.conditions ?? []).map((c, ci) => (
                    <div key={ci} className="flex gap-2">
                      <input
                        value={c.field}
                        onChange={(e) => {
                          const conditions = [...(block.conditions ?? [])];
                          conditions[ci] = { ...c, field: e.target.value };
                          updateBlock(i, { ...block, conditions });
                        }}
                        placeholder="field"
                        className="flex-1 rounded border border-slate-200 px-2 py-1 text-sm"
                      />
                      <input
                        value={c.operator}
                        onChange={(e) => {
                          const conditions = [...(block.conditions ?? [])];
                          conditions[ci] = { ...c, operator: e.target.value };
                          updateBlock(i, { ...block, conditions });
                        }}
                        placeholder="operator"
                        className="w-20 rounded border border-slate-200 px-2 py-1 text-sm"
                      />
                      <input
                        value={String(c.value)}
                        onChange={(e) => {
                          const conditions = [...(block.conditions ?? [])];
                          conditions[ci] = { ...c, value: e.target.value };
                          updateBlock(i, { ...block, conditions });
                        }}
                        placeholder="value"
                        className="flex-1 rounded border border-slate-200 px-2 py-1 text-sm"
                      />
                    </div>
                  ))}
                  <button
                    onClick={() =>
                      updateBlock(i, {
                        ...block,
                        conditions: [...(block.conditions ?? []), { field: "", operator: "==", value: "" }],
                      })
                    }
                    className="text-xs text-accent hover:underline"
                  >
                    + Add condition
                  </button>
                </div>
              )}
            </div>
          ))}
          <button
            onClick={addBlock}
            className="w-full rounded-xl border-2 border-dashed border-slate-300 py-3 text-sm text-slate-500 hover:border-accent hover:text-accent"
          >
            + Add Block
          </button>
        </div>
      )}

      {view === "natural" && (
        <pre className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          {dslToNaturalLanguage(dsl)}
        </pre>
      )}

      {view === "json" && (
        <pre className="max-h-96 overflow-auto rounded-xl border border-slate-200 bg-slate-900 p-4 text-xs text-green-400">
          {JSON.stringify(dsl, null, 2)}
        </pre>
      )}
    </div>
  );
}
