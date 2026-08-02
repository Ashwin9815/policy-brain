"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getPolicy, type PolicyDetail } from "@/lib/api";

export default function PolicyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [policy, setPolicy] = useState<PolicyDetail | null>(null);

  useEffect(() => {
    getPolicy(id)
      .then(setPolicy)
      .catch(() => router.push("/login"));
  }, [id, router]);

  if (!policy) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        Loading…
      </div>
    );
  }

  return (
    <AppShell>
      <div className="p-8">
        <div className="mb-6">
          <div className="text-sm text-slate-500">{policy.folder?.name}</div>
          <h1 className="text-2xl font-bold text-navy">{policy.title}</h1>
          {policy.description && (
            <p className="mt-2 text-slate-600">{policy.description}</p>
          )}
          <div className="mt-3 flex gap-2 text-sm">
            <span className="rounded-full bg-slate-100 px-2 py-0.5">{policy.status}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5">v{policy.version}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-navy">Rules ({policy.rules?.length ?? 0})</h2>
            <div className="mt-4 space-y-3">
              {policy.rules?.map((rule) => (
                <div key={rule.id} className="rounded-lg border border-slate-100 p-4">
                  <div className="font-medium">{rule.title}</div>
                  {rule.description && (
                    <p className="mt-1 text-sm text-slate-500">{rule.description}</p>
                  )}
                  <div className="mt-2 flex gap-2 text-xs">
                    <span className="rounded bg-slate-100 px-2 py-0.5">{rule.status}</span>
                  </div>
                  <pre className="mt-3 max-h-48 overflow-auto rounded bg-slate-50 p-3 text-xs text-slate-700">
                    {JSON.stringify(rule.dslContent, null, 2)}
                  </pre>
                </div>
              ))}
              {!policy.rules?.length && (
                <p className="text-sm text-slate-400">No rules yet. Start a rule generation workflow.</p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-navy">Live Policy Canvas</h2>
            <p className="mt-2 text-sm text-slate-500">
              Visual block editor and knowledge graph will render here.
              Rules are stored in the canonical internal DSL per SDD §23.
            </p>
            {policy.rules?.[0] && (
              <div className="mt-4 space-y-2">
                {(policy.rules[0].dslContent as { blocks?: Array<{ type: string; outcome?: string }> }).blocks?.map(
                  (block, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-lg border border-accent/20 bg-blue-50 px-4 py-3"
                    >
                      <span className="rounded bg-accent px-2 py-0.5 text-xs font-medium text-white">
                        {block.type}
                      </span>
                      {block.outcome && (
                        <span className="text-sm text-slate-700">→ {block.outcome}</span>
                      )}
                    </div>
                  )
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
