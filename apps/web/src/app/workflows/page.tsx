"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getWorkflows, startWorkflow, type Workflow } from "@/lib/api";

export default function WorkflowsPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [starting, setStarting] = useState(false);

  function load() {
    getWorkflows().then(setWorkflows).catch(() => router.push("/login"));
  }

  useEffect(() => { load(); }, [router]);

  async function handleStart(type: string) {
    setStarting(true);
    await startWorkflow(type, {});
    load();
    setStarting(false);
  }

  return (
    <AppShell>
      <div className="p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy">Workflows</h1>
            <p className="text-slate-500">Event-driven multi-agent pipelines with checkpoint recovery</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {["RULE_GENERATION", "DUPLICATE_CHECK", "IMPACT_ANALYSIS", "EXPORT"].map((type) => (
            <button
              key={type}
              onClick={() => handleStart(type)}
              disabled={starting}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              Start {type.replace(/_/g, " ")}
            </button>
          ))}
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Correlation ID</th>
                <th className="px-5 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {workflows.map((w) => (
                <tr key={w.id} className="border-b border-slate-100">
                  <td className="px-5 py-3 font-medium">{w.type.replace(/_/g, " ")}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      w.status === "COMPLETED" ? "bg-emerald-100 text-emerald-800" :
                      w.status === "FAILED" ? "bg-red-100 text-red-800" :
                      w.status === "RUNNING" ? "bg-blue-100 text-blue-800" :
                      "bg-slate-100 text-slate-700"
                    }`}>
                      {w.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">{w.correlationId.slice(0, 8)}…</td>
                  <td className="px-5 py-3 text-slate-500">{new Date(w.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {workflows.length === 0 && (
            <div className="px-5 py-10 text-center text-slate-400">No workflows yet</div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
