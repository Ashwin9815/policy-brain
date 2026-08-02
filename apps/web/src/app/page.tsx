import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-navy-light to-accent-dark">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 text-center text-white">
        <div className="mb-6 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-sm backdrop-blur">
          AI proposes · Humans approve
        </div>
        <h1 className="mb-4 text-5xl font-bold tracking-tight">Policy Brain</h1>
        <p className="mb-10 max-w-2xl text-lg text-white/80">
          Transform healthcare policy documents into governed, versioned, explainable
          business rules with multi-agent AI orchestration.
        </p>
        <div className="flex gap-4">
          <Link
            href="/login"
            className="rounded-lg bg-white px-6 py-3 font-semibold text-navy shadow-lg transition hover:bg-slate-100"
          >
            Sign in
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-white/30 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
          >
            Dashboard
          </Link>
        </div>
        <div className="mt-16 grid w-full max-w-3xl grid-cols-3 gap-4 text-left text-sm">
          {[
            { title: "Knowledge Brain", desc: "Canonical memory for sources & extracted objects" },
            { title: "Policy Compiler", desc: "Multi-agent rule generation with human gates" },
            { title: "Governance", desc: "RBAC, audit trails, versioned decision traces" },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <div className="mb-1 font-semibold">{f.title}</div>
              <div className="text-white/70">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
