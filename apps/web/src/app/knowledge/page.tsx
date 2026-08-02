"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { api, getFolders, startWorkflow, type Folder } from "@/lib/api";

interface KnowledgeSource {
  id: string;
  title: string;
  fileName: string;
  status: string;
  _count: { objects: number };
}

export default function KnowledgePage() {
  const router = useRouter();
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    Promise.all([
      api<KnowledgeSource[]>("/knowledge/sources"),
      getFolders(),
    ])
      .then(([s, f]) => {
        setSources(s);
        setFolders(f);
      })
      .catch(() => router.push("/login"));
  }, [router]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const folderId = folders[0]?.id;
    if (!file || !folderId) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folderId", folderId);
    formData.append("title", file.name);

    const token = localStorage.getItem("pb_token");
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/v1/knowledge/sources`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      }
    );
    const json = await res.json();
    if (res.ok) {
      const source = json.data as KnowledgeSource;
      await startWorkflow("DOCUMENT_INGESTION", { sourceId: source.id });
      const updated = await api<KnowledgeSource[]>("/knowledge/sources");
      setSources(updated);
    }
    setUploading(false);
  }

  return (
    <AppShell>
      <div className="p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy">Knowledge Brain</h1>
            <p className="text-slate-500">Sources, extracted objects, and retrieval layer</p>
          </div>
          <label className="cursor-pointer rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-light">
            {uploading ? "Uploading…" : "Upload Document"}
            <input type="file" className="hidden" accept=".pdf,.docx,.txt" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>

        <div className="mt-6 grid gap-4">
          {sources.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5">
              <div>
                <div className="font-medium">{s.title}</div>
                <div className="text-sm text-slate-500">{s.fileName}</div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-slate-500">{s._count.objects} objects</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{s.status}</span>
              </div>
            </div>
          ))}
          {sources.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-400">
              Upload a policy document to start knowledge extraction
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
