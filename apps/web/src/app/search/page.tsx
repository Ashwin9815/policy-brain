"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { search, type SearchResults } from "@/lib/api";

export default function SearchPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [mode, setMode] = useState("hybrid");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    try {
      const r = await search(q, mode);
      setResults(r);
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl p-8">
        <h1 className="text-2xl font-bold text-navy">Search</h1>
        <p className="text-slate-500">Keyword, semantic, and hybrid search across policies, rules, and knowledge</p>

        <form onSubmit={handleSearch} className="mt-6 flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search policies, rules, knowledge objects…"
            className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm"
          />
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="hybrid">Hybrid</option>
            <option value="keyword">Keyword</option>
            <option value="semantic">Semantic</option>
          </select>
          <button type="submit" disabled={loading} className="rounded-xl bg-navy px-6 py-3 text-sm font-semibold text-white">
            Search
          </button>
        </form>

        {results && (
          <div className="mt-8 space-y-6">
            {[
              { key: "policies", label: "Policies", items: results.policies },
              { key: "rules", label: "Rules", items: results.rules },
              { key: "knowledge", label: "Knowledge", items: results.knowledge },
            ].map(({ key, label, items }) => (
              items.length > 0 && (
                <section key={key}>
                  <h2 className="font-semibold text-navy">{label}</h2>
                  <div className="mt-2 space-y-2">
                    {items.map((item: { id: string; title?: string; content?: string; relevance: number; evidence?: string }) => (
                      <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4">
                        <div className="flex justify-between">
                          <span className="font-medium">{item.title ?? item.content?.slice(0, 80)}</span>
                          <span className="text-xs text-slate-400">{(item.relevance * 100).toFixed(0)}% match</span>
                        </div>
                        {item.evidence && <p className="mt-1 text-sm text-slate-500">{item.evidence}</p>}
                      </div>
                    ))}
                  </div>
                </section>
              )
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
