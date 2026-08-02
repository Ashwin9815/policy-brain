"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import {
  createComposerSession,
  uploadComposerSource,
  extractComposer,
  clarifyComposer,
  generateComposer,
  finalizeComposer,
  getFolders,
  type ClarificationQuestion,
  type Folder,
} from "@/lib/api";

const STEPS = ["Upload", "Extract", "Clarify", "Generate", "Review", "Publish"];

export default function ComposerPage() {
  const router = useRouter();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("New Policy from Documents");
  const [folderId, setFolderId] = useState("");
  const [questions, setQuestions] = useState<ClarificationQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [generatedRules, setGeneratedRules] = useState<Array<{ title: string; dsl: unknown }>>([]);
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState(false);
  const [objectCount, setObjectCount] = useState(0);

  useEffect(() => {
    getFolders().then((f) => {
      setFolders(f);
      if (f[0]) setFolderId(f[0].id);
    }).catch(() => router.push("/login"));
  }, [router]);

  async function startSession() {
    setLoading(true);
    const session = await createComposerSession(folderId, title);
    setSessionId(session.id);
    setStep(0);
    setLoading(false);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !sessionId) return;
    setLoading(true);
    await uploadComposerSource(sessionId, file);
    setStep(1);
    setLoading(false);
  }

  async function handleExtract() {
    if (!sessionId) return;
    setLoading(true);
    const result = await extractComposer(sessionId);
    setQuestions(result.questions);
    setObjectCount(result.knowledgeObjects.length);
    for (const q of result.questions) {
      if (q.suggestedAnswer) setAnswers((a) => ({ ...a, [q.id]: q.suggestedAnswer! }));
    }
    setStep(2);
    setLoading(false);
  }

  async function handleClarify() {
    if (!sessionId) return;
    setLoading(true);
    await clarifyComposer(sessionId, answers);
    setStep(3);
    setLoading(false);
  }

  async function handleGenerate() {
    if (!sessionId) return;
    setLoading(true);
    const result = await generateComposer(sessionId);
    setGeneratedRules(result.generatedRules as Array<{ title: string; dsl: unknown }>);
    setExplanation((result.explanation as { explanation?: string })?.explanation ?? "");
    setStep(4);
    setLoading(false);
  }

  async function handleFinalize() {
    if (!sessionId) return;
    setLoading(true);
    const result = await finalizeComposer(sessionId);
    setStep(5);
    setLoading(false);
    router.push(`/policies/${result.policy.id}`);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl p-8">
        <h1 className="text-2xl font-bold text-navy">AI Policy Composer</h1>
        <p className="mt-1 text-slate-500">
          Upload documents → extract knowledge → clarify → generate rules → human review
        </p>

        <div className="mt-6 flex gap-2">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`flex-1 rounded-lg py-2 text-center text-xs font-medium ${
                i <= step ? "bg-accent text-white" : "bg-slate-200 text-slate-500"
              }`}
            >
              {s}
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
          {!sessionId && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Policy Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Folder</label>
                <select
                  value={folderId}
                  onChange={(e) => setFolderId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={startSession}
                disabled={loading || !folderId}
                className="rounded-lg bg-navy px-6 py-2.5 font-semibold text-white disabled:opacity-50"
              >
                Start Composer Session
              </button>
            </div>
          )}

          {sessionId && step === 0 && (
            <div>
              <h2 className="font-semibold">Upload Source Documents</h2>
              <p className="mt-1 text-sm text-slate-500">PDF, DOCX, or TXT policy documents</p>
              <label className="mt-4 flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-slate-300 p-10 hover:border-accent">
                <span className="text-sm font-medium text-accent">Choose file to upload</span>
                <input type="file" className="hidden" accept=".txt,.md,.pdf,.docx" onChange={handleUpload} />
              </label>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="font-semibold">Extract Knowledge</h2>
              <p className="mt-1 text-sm text-slate-500">AI will extract knowledge objects from your document</p>
              <button onClick={handleExtract} disabled={loading} className="mt-4 rounded-lg bg-navy px-6 py-2.5 font-semibold text-white">
                {loading ? "Extracting…" : "Run Extraction"}
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="font-semibold">Clarification Questions</h2>
              <p className="mt-1 text-sm text-slate-500">{objectCount} knowledge objects extracted. Answer to refine rule generation.</p>
              <div className="mt-4 space-y-4">
                {questions.map((q) => (
                  <div key={q.id} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                    <label className="text-sm font-medium">{q.question}</label>
                    {q.options ? (
                      <select
                        value={answers[q.id] ?? ""}
                        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                        className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      >
                        <option value="">Select…</option>
                        {q.options.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input
                        value={answers[q.id] ?? ""}
                        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                        className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    )}
                  </div>
                ))}
              </div>
              <button onClick={handleClarify} disabled={loading} className="mt-4 rounded-lg bg-navy px-6 py-2.5 font-semibold text-white">
                Continue to Generation
              </button>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="font-semibold">Generate Draft Rules</h2>
              <p className="mt-1 text-sm text-slate-500">Multi-agent pipeline: Rule Generator → Duplicate Checker → Explainability</p>
              <button onClick={handleGenerate} disabled={loading} className="mt-4 rounded-lg bg-navy px-6 py-2.5 font-semibold text-white">
                {loading ? "Generating…" : "Generate Rules"}
              </button>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="font-semibold">Review Generated Rules</h2>
              {explanation && (
                <div className="mt-3 rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
                  <strong>Explainability:</strong> {explanation}
                </div>
              )}
              {generatedRules.map((r, i) => (
                <pre key={i} className="mt-4 max-h-48 overflow-auto rounded-lg bg-slate-900 p-4 text-xs text-green-400">
                  {JSON.stringify(r.dsl, null, 2)}
                </pre>
              ))}
              <p className="mt-4 text-sm text-amber-700">AI proposes — you approve. Rules will be saved as DRAFT.</p>
              <button onClick={handleFinalize} disabled={loading} className="mt-4 rounded-lg bg-emerald-600 px-6 py-2.5 font-semibold text-white">
                {loading ? "Publishing…" : "Create Policy & Rules"}
              </button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
