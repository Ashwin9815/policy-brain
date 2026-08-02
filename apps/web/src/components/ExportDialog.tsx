"use client";

import { useState } from "react";
import { exportRule } from "@/lib/api";

export function ExportDialog({ ruleId, ruleTitle }: { ruleId: string; ruleTitle: string }) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState("json");
  const [artifact, setArtifact] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const result = await exportRule(ruleId, format);
      setArtifact(result.artifact);
    } finally {
      setLoading(false);
    }
  }

  function download() {
    const blob = new Blob([artifact], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ruleTitle.replace(/\s+/g, "_")}.${format === "python" ? "py" : format}`;
    a.click();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
      >
        Export
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-navy">Export Rule</h3>
            <p className="mt-1 text-sm text-slate-500">{ruleTitle}</p>
            <div className="mt-4 flex gap-2">
              {["json", "yaml", "python", "dsl"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium uppercase ${
                    format === f ? "bg-navy text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <button
              onClick={handleExport}
              disabled={loading}
              className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? "Validating & compiling…" : "Generate Export"}
            </button>
            {artifact && (
              <>
                <pre className="mt-4 max-h-64 overflow-auto rounded-lg bg-slate-900 p-4 text-xs text-green-400">
                  {artifact}
                </pre>
                <button onClick={download} className="mt-2 text-sm text-accent hover:underline">
                  Download file
                </button>
              </>
            )}
            <button onClick={() => setOpen(false)} className="mt-4 block text-sm text-slate-500 hover:underline">
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
