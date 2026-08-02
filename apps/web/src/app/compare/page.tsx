"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getPolicies, compareRules, type Policy, type Rule, type CompareResult } from "@/lib/api";

export default function ComparePage() {
  const router = useRouter();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [leftId, setLeftId] = useState("");
  const [rightId, setRightId] = useState("");
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getPolicies().then((p) => {
      setPolicies(p);
      const allRules = p.flatMap(() => []);
      setRules(allRules);
    }).catch(() => router.push("/login"));
    import("@/lib/api").then(({ api }) =>
      api<Rule[]>("/rules").then(setRules).catch(() => {})
    );
  }, [router]);

  async function handleCompare() {
    if (!leftId || !rightId) return;
    setLoading(true);
    const r = await compareRules(leftId, rightId);
    setResult(r);
    setLoading(false);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl p-8">
        <h1 className="text-2xl font-bold text-navy">Compare Rules</h1>
        <p className="text-slate-500">Git-style diff with AI conflict detection (Journey 2)</p>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <select value={leftId} onChange={(e) => setLeftId(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">Select left rule…</option>
            {rules.map((r) => <option key={r.id} value={r.id}>{r.title} (v{r.version})</option>)}
          </select>
          <select value={rightId} onChange={(e) => setRightId(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">Select right rule…</option>
            {rules.map((r) => <option key={r.id} value={r.id}>{r.title} (v{r.version})</option>)}
          </select>
        </div>

        <button onClick={handleCompare} disabled={loading || !leftId || !rightId} className="mt-4 rounded-lg bg-navy px-6 py-2.5 font-semibold text-white disabled:opacity-50">
          {loading ? "Comparing…" : "Compare Rules"}
        </button>

        {result && (
          <div className="mt-8 space-y-6">
            <div className="flex gap-4 text-sm">
              <span className="rounded bg-slate-100 px-3 py-1">+{result.diff.summary.additions} additions</span>
              <span className="rounded bg-slate-100 px-3 py-1">-{result.diff.summary.removals} removals</span>
              {result.comparison.conflicts.length > 0 && (
                <span className="rounded bg-red-100 px-3 py-1 text-red-700">{result.comparison.conflicts.length} conflicts</span>
              )}
            </div>

            {result.comparison.conflicts.map((c, i) => (
              <div key={i} className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{c}</div>
            ))}

            <div className="overflow-hidden rounded-xl border border-slate-200 font-mono text-xs">
              {result.diff.lines.map((line, i) => (
                <div
                  key={i}
                  className={`px-4 py-0.5 ${
                    line.type === "add" ? "bg-emerald-50 text-emerald-800" :
                    line.type === "remove" ? "bg-red-50 text-red-800" :
                    "bg-white text-slate-600"
                  }`}
                >
                  {line.type === "add" ? "+" : line.type === "remove" ? "-" : " "} {line.content}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
