"use client";

import { useEffect, useState } from "react";
import { getFlightRecords, type FlightRecord } from "@/lib/api";

export function FlightRecorderPanel({ workflowId }: { workflowId?: string }) {
  const [records, setRecords] = useState<FlightRecord[]>([]);

  useEffect(() => {
    getFlightRecords(workflowId).then(setRecords).catch(() => {});
  }, [workflowId]);

  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-500">
        Flight Recorder — every workflow stage with timing, agent, and decision trace (SDD §27).
      </p>
      {records.map((r) => (
        <div key={r.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium">{r.stage}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs ${
              r.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
            }`}>
              {r.status}
            </span>
          </div>
          <div className="mt-1 flex gap-4 text-xs text-slate-500">
            {r.agentType && <span>Agent: {r.agentType}</span>}
            <span>{r.durationMs}ms</span>
            {r.tokenUsage > 0 && <span>{r.tokenUsage} tokens</span>}
          </div>
          {r.trace?.decisionTrace && (
            <ul className="mt-2 space-y-1 text-xs text-slate-600">
              {r.trace.decisionTrace.map((t, i) => (
                <li key={i}>→ {t}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
      {records.length === 0 && (
        <p className="text-sm text-slate-400">No flight records yet. Run a workflow to see traces.</p>
      )}
    </div>
  );
}
