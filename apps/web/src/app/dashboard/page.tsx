"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getMe, getPolicies, getWorkflows, type AuthUser, type Policy, type Workflow } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);

  useEffect(() => {
    Promise.all([getMe(), getPolicies(), getWorkflows()])
      .then(([u, p, w]) => {
        setUser(u);
        setPolicies(p);
        setWorkflows(w);
      })
      .catch(() => router.push("/login"));
  }, [router]);

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        Loading…
      </div>
    );
  }

  return (
    <AppShell>
      <div className="p-8">
        <h1 className="text-2xl font-bold text-navy">Dashboard</h1>
        <p className="mt-1 text-slate-500">Welcome back, {user.name}</p>

        <div className="mt-8 grid grid-cols-3 gap-4">
          {[
            { label: "Policies", value: policies.length, color: "bg-blue-50 text-blue-700" },
            { label: "Draft Rules", value: policies.filter((p) => p.status === "DRAFT").length, color: "bg-amber-50 text-amber-700" },
            { label: "Workflows", value: workflows.length, color: "bg-emerald-50 text-emerald-700" },
          ].map((stat) => (
            <div key={stat.label} className={`rounded-xl p-5 ${stat.color}`}>
              <div className="text-3xl font-bold">{stat.value}</div>
              <div className="text-sm font-medium">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-6">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-navy">Recent Policies</h2>
            <ul className="mt-3 space-y-2">
              {policies.slice(0, 5).map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <span>{p.title}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {p.status}
                  </span>
                </li>
              ))}
              {policies.length === 0 && (
                <li className="text-sm text-slate-400">No policies yet</li>
              )}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-navy">Recent Workflows</h2>
            <ul className="mt-3 space-y-2">
              {workflows.slice(0, 5).map((w) => (
                <li key={w.id} className="flex items-center justify-between text-sm">
                  <span>{w.type.replace(/_/g, " ")}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {w.status}
                  </span>
                </li>
              ))}
              {workflows.length === 0 && (
                <li className="text-sm text-slate-400">No workflows yet</li>
              )}
            </ul>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
