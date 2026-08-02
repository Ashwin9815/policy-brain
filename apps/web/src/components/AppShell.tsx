"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken } from "@/lib/api";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/policies", label: "Policies" },
  { href: "/knowledge", label: "Knowledge" },
  { href: "/workflows", label: "Workflows" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  function logout() {
    clearToken();
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 flex-col border-r border-slate-200 bg-navy text-white">
        <div className="border-b border-white/10 px-5 py-5">
          <div className="text-lg font-bold">Policy Brain</div>
          <div className="text-xs text-white/60">AI Policy Compiler</div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm transition ${
                pathname.startsWith(item.href)
                  ? "bg-white/15 font-semibold"
                  : "text-white/80 hover:bg-white/10"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <button
          onClick={logout}
          className="m-3 rounded-lg border border-white/20 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
        >
          Sign out
        </button>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
