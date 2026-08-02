"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { BlockEditor } from "@/components/BlockEditor";
import { CommentsPanel } from "@/components/CommentsPanel";
import { ApprovalsPanel } from "@/components/ApprovalsPanel";
import { FlightRecorderPanel } from "@/components/FlightRecorderPanel";
import { ExportDialog } from "@/components/ExportDialog";
import {
  getPolicy,
  getComments,
  getApprovals,
  updateRule,
  updatePolicy,
  type PolicyDetail,
  type Rule,
  type Comment,
  type Approval,
} from "@/lib/api";
import type { RuleDsl } from "@policy-brain/shared";

const TABS = ["Canvas", "Rules", "Comments", "Approvals", "Versions", "Trace"] as const;

export default function PolicyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [policy, setPolicy] = useState<PolicyDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Canvas");
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);
  const [editingDsl, setEditingDsl] = useState<RuleDsl | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    Promise.all([getPolicy(id), getComments(id), getApprovals(id)])
      .then(([p, c, a]) => {
        setPolicy(p);
        setComments(c);
        setApprovals(a);
        if (p.rules?.[0] && !selectedRule) {
          setSelectedRule(p.rules[0]);
          setEditingDsl(p.rules[0].dslContent as RuleDsl);
        }
      })
      .catch(() => router.push("/login"));
  }, [id, router, selectedRule]);

  useEffect(() => { load(); }, [load]);

  async function handleSaveRule() {
    if (!selectedRule || !editingDsl) return;
    setSaving(true);
    await updateRule(selectedRule.id, { dslContent: editingDsl, changeNote: "Block editor save" });
    load();
    setSaving(false);
  }

  async function handlePublish() {
    await updatePolicy(id, { status: "PUBLISHED" });
    load();
  }

  if (!policy) {
    return <div className="flex h-screen items-center justify-center text-slate-500">Loading…</div>;
  }

  return (
    <AppShell>
      <div className="p-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm text-slate-500">{policy.folder?.name}</div>
            <h1 className="text-2xl font-bold text-navy">{policy.title}</h1>
            {policy.description && <p className="mt-2 text-slate-600">{policy.description}</p>}
            <div className="mt-3 flex gap-2">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{policy.status}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">v{policy.version}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {policy.status === "DRAFT" && (
              <button onClick={handlePublish} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
                Publish
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 flex gap-1 border-b border-slate-200">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium ${
                tab === t ? "border-b-2 border-accent text-accent" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "Canvas" && (
            <div className="grid grid-cols-4 gap-6">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-600">Rules</h3>
                {policy.rules?.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => { setSelectedRule(r); setEditingDsl(r.dslContent as RuleDsl); }}
                    className={`block w-full rounded-lg border p-3 text-left text-sm ${
                      selectedRule?.id === r.id ? "border-accent bg-blue-50" : "border-slate-200 bg-white"
                    }`}
                  >
                    {r.title}
                  </button>
                ))}
              </div>
              <div className="col-span-3">
                {selectedRule && editingDsl ? (
                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="font-semibold text-navy">Live Policy Canvas — {selectedRule.title}</h2>
                      <ExportDialog ruleId={selectedRule.id} ruleTitle={selectedRule.title} />
                    </div>
                    <BlockEditor
                      dsl={editingDsl}
                      onChange={setEditingDsl}
                      onSave={handleSaveRule}
                      saving={saving}
                    />
                  </div>
                ) : (
                  <p className="text-slate-400">Select a rule to edit</p>
                )}
              </div>
            </div>
          )}

          {tab === "Rules" && (
            <div className="space-y-4">
              {policy.rules?.map((rule) => (
                <div key={rule.id} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex justify-between">
                    <h3 className="font-semibold">{rule.title}</h3>
                    <ExportDialog ruleId={rule.id} ruleTitle={rule.title} />
                  </div>
                  <pre className="mt-3 max-h-48 overflow-auto rounded bg-slate-50 p-3 text-xs">
                    {JSON.stringify(rule.dslContent, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}

          {tab === "Comments" && (
            <CommentsPanel policyId={id} comments={comments} onUpdate={load} />
          )}

          {tab === "Approvals" && (
            <ApprovalsPanel policyId={id} approvals={approvals} onUpdate={load} canApprove />
          )}

          {tab === "Versions" && (
            <div className="space-y-3">
              {policy.rules?.flatMap((r) =>
                (r.versions ?? [{ version: r.version, changeNote: "Current", createdAt: "" }]).map((v) => (
                  <div key={`${r.id}-${v.version}`} className="flex justify-between rounded-lg border border-slate-200 bg-white p-4 text-sm">
                    <span>{r.title} — v{v.version}</span>
                    <span className="text-slate-500">{v.changeNote}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "Trace" && <FlightRecorderPanel />}
        </div>
      </div>
    </AppShell>
  );
}
