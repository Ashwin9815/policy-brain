"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getAdminUsers, getAdminSettings, getFolders, type AdminUser, type OrgSettings, type Folder } from "@/lib/api";

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tab, setTab] = useState<"users" | "settings" | "folders">("users");

  useEffect(() => {
    Promise.all([getAdminUsers(), getAdminSettings(), getFolders()])
      .then(([u, s, f]) => { setUsers(u); setSettings(s); setFolders(f); })
      .catch(() => router.push("/login"));
  }, [router]);

  return (
    <AppShell>
      <div className="p-8">
        <h1 className="text-2xl font-bold text-navy">Administration</h1>
        <p className="text-slate-500">Users, RBAC, AI settings, and organization configuration</p>

        <div className="mt-6 flex gap-2">
          {(["users", "settings", "folders"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-2 text-sm font-medium capitalize ${
                tab === t ? "bg-navy text-white" : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "users" && (
          <table className="mt-6 w-full rounded-xl border border-slate-200 bg-white text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-slate-100">
                  <td className="px-5 py-3 font-medium">{u.name}</td>
                  <td className="px-5 py-3 text-slate-600">{u.email}</td>
                  <td className="px-5 py-3"><span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{u.role}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === "settings" && settings && (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              { label: "MFA Required", value: settings.mfaRequired ? "Yes" : "No" },
              { label: "Onboarding Complete", value: settings.onboardingCompleted ? "Yes" : "No" },
              { label: "Monthly Token Budget", value: settings.tokenBudgetMonthly.toLocaleString() },
              { label: "Confidence Threshold", value: `${(settings.confidenceThreshold * 100).toFixed(0)}%` },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="text-sm text-slate-500">{s.label}</div>
                <div className="mt-1 text-lg font-semibold">{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {tab === "folders" && (
          <div className="mt-6 space-y-2">
            {folders.map((f) => (
              <div key={f.id} className="flex justify-between rounded-xl border border-slate-200 bg-white p-4">
                <div>
                  <div className="font-medium">{f.name}</div>
                  <div className="text-sm text-slate-500">{f.description}</div>
                </div>
                <div className="text-sm text-slate-500">
                  {f._count?.policies ?? 0} policies · {f._count?.sources ?? 0} sources
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
