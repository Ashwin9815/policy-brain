"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { KnowledgeGraphView } from "@/components/KnowledgeGraphView";
import { getKnowledgeGraph } from "@/lib/api";

export default function KnowledgeGraphPage() {
  const router = useRouter();
  const [stats, setStats] = useState({ nodes: 0, edges: 0 });

  useEffect(() => {
    getKnowledgeGraph()
      .then((g) => setStats({ nodes: g.nodes.length, edges: g.edges.length }))
      .catch(() => router.push("/login"));
  }, [router]);

  return (
    <AppShell>
      <div className="p-8">
        <h1 className="text-2xl font-bold text-navy">Knowledge Graph</h1>
        <p className="text-slate-500">
          Dynamic relationships between knowledge objects and rules — {stats.nodes} nodes, {stats.edges} edges
        </p>
        <div className="mt-6">
          <KnowledgeGraphView />
        </div>
      </div>
    </AppShell>
  );
}
