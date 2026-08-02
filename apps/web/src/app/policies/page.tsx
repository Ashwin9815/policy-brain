"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { getPolicies, type Policy } from "@/lib/api";

const statusColors: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  IN_REVIEW: "bg-amber-100 text-amber-800",
  APPROVED: "bg-blue-100 text-blue-800",
  PUBLISHED: "bg-emerald-100 text-emerald-800",
  ARCHIVED: "bg-gray-100 text-gray-600",
};

export default function PoliciesPage() {
  const router = useRouter();
  const [policies, setPolicies] = useState<Policy[]>([]);

  useEffect(() => {
    getPolicies()
      .then(setPolicies)
      .catch(() => router.push("/login"));
  }, [router]);

  return (
    <AppShell>
      <div className="p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy">Policies</h1>
            <p className="text-slate-500">Governed policy documents and rules</p>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-5 py-3 font-medium">Title</th>
                <th className="px-5 py-3 font-medium">Folder</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Rules</th>
                <th className="px-5 py-3 font-medium">Version</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <Link href={`/policies/${p.id}`} className="font-medium text-accent hover:underline">
                      {p.title}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{p.folder?.name}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[p.status] ?? ""}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{p._count?.rules ?? 0}</td>
                  <td className="px-5 py-3 text-slate-600">v{p.version}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {policies.length === 0 && (
            <div className="px-5 py-10 text-center text-slate-400">No policies found</div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
