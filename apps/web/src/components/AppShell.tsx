"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearToken, getNotifications, type Notification } from "@/lib/api";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/composer", label: "AI Composer" },
  { href: "/policies", label: "Policies" },
  { href: "/knowledge", label: "Knowledge" },
  { href: "/knowledge/graph", label: "Knowledge Graph" },
  { href: "/workflows", label: "Workflows" },
  { href: "/search", label: "Search" },
  { href: "/compare", label: "Compare" },
  { href: "/admin", label: "Administration" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    getNotifications().then(setNotifications).catch(() => {});
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  function logout() {
    clearToken();
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 flex-col border-r border-slate-200 bg-navy text-white">
        <div className="border-b border-white/10 px-5 py-5">
          <div className="text-lg font-bold">Policy Brain</div>
          <div className="text-xs text-white/60">AI Policy Compiler</div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm transition ${
                pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
                  ? "bg-white/15 font-semibold"
                  : "text-white/80 hover:bg-white/10"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          {unread > 0 && (
            <div className="mb-2 rounded-lg bg-accent/20 px-3 py-2 text-xs">
              {unread} unread notification{unread > 1 ? "s" : ""}
            </div>
          )}
          <button
            onClick={logout}
            className="w-full rounded-lg border border-white/20 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-slate-50">{children}</main>
    </div>
  );
}
