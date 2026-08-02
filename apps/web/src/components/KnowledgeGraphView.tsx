"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { getKnowledgeGraph, type GraphNode, type GraphEdge } from "@/lib/api";

export function KnowledgeGraphView() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getKnowledgeGraph();
      setNodes(
        data.nodes.map((n: GraphNode, i: number) => ({
          id: n.id,
          position: { x: (i % 5) * 220, y: Math.floor(i / 5) * 120 },
          data: {
            label: (
              <div>
                <div className="text-xs font-bold text-slate-500">{n.type}</div>
                <div className="text-sm">{n.label}</div>
                {n.confidence && (
                  <div className="text-xs text-emerald-600">{(n.confidence * 100).toFixed(0)}%</div>
                )}
              </div>
            ),
          },
          style: {
            background: n.type === "rule" ? "#dbeafe" : "#f0fdf4",
            border: n.type === "rule" ? "2px solid #3b82f6" : "2px solid #22c55e",
            borderRadius: 8,
            padding: 8,
            width: 180,
          },
        }))
      );
      setEdges(
        data.edges
          .filter((e: GraphEdge) => e.source && e.target)
          .map((e: GraphEdge) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            label: e.relation,
            animated: true,
          }))
      );
    } finally {
      setLoading(false);
    }
  }, [setNodes, setEdges]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex h-96 items-center justify-center text-slate-400">Loading graph…</div>;

  return (
    <div className="h-[600px] rounded-xl border border-slate-200 bg-white">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
