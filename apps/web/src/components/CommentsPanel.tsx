"use client";

import { useState } from "react";
import { postComment, type Comment } from "@/lib/api";

const COMMENT_TYPES = ["QUESTION", "SUGGESTION", "ISSUE", "REQUEST", "APPROVAL_NOTE", "EVIDENCE"];

export function CommentsPanel({
  policyId,
  comments,
  onUpdate,
}: {
  policyId: string;
  comments: Comment[];
  onUpdate: () => void;
}) {
  const [content, setContent] = useState("");
  const [type, setType] = useState("SUGGESTION");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    await postComment({ content, type, policyId });
    setContent("");
    onUpdate();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="space-y-2">
        <div className="flex gap-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
          >
            {COMMENT_TYPES.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a comment… Use @name to mention reviewers"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          rows={3}
        />
        <button type="submit" className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white">
          Post Comment
        </button>
      </form>

      <div className="space-y-3">
        {comments.map((c) => (
          <div
            key={c.id}
            className={`rounded-lg border p-3 ${c.resolved ? "border-slate-100 bg-slate-50 opacity-60" : "border-slate-200 bg-white"}`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium text-slate-700">{c.author.name}</span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5">{c.type}</span>
            </div>
            <p className="mt-1 text-sm">{c.content}</p>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-sm text-slate-400">No comments yet. Start a review discussion.</p>
        )}
      </div>
    </div>
  );
}
