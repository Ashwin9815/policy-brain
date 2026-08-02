"use client";

import { requestApproval, decideApproval, type Approval } from "@/lib/api";

export function ApprovalsPanel({
  policyId,
  approvals,
  onUpdate,
  canApprove,
}: {
  policyId: string;
  approvals: Approval[];
  onUpdate: () => void;
  canApprove?: boolean;
}) {
  async function handleRequest() {
    await requestApproval(policyId);
    onUpdate();
  }

  async function handleDecide(id: string, status: "APPROVED" | "REJECTED") {
    const note = prompt(status === "APPROVED" ? "Approval note (optional):" : "Rejection reason:");
    await decideApproval(id, status, note ?? undefined);
    onUpdate();
  }

  return (
    <div className="space-y-4">
      <button
        onClick={handleRequest}
        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
      >
        Request Approval
      </button>

      <div className="space-y-2">
        {approvals.map((a) => (
          <div key={a.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
            <div>
              <div className="text-sm font-medium">{a.approver.name}</div>
              <div className="text-xs text-slate-500">{new Date(a.createdAt).toLocaleString()}</div>
              {a.note && <div className="mt-1 text-sm text-slate-600">{a.note}</div>}
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                a.status === "APPROVED" ? "bg-emerald-100 text-emerald-800" :
                a.status === "REJECTED" ? "bg-red-100 text-red-800" :
                "bg-amber-100 text-amber-800"
              }`}>
                {a.status}
              </span>
              {canApprove && a.status === "PENDING" && (
                <>
                  <button onClick={() => handleDecide(a.id, "APPROVED")} className="text-xs text-emerald-600 hover:underline">Approve</button>
                  <button onClick={() => handleDecide(a.id, "REJECTED")} className="text-xs text-red-600 hover:underline">Reject</button>
                </>
              )}
            </div>
          </div>
        ))}
        {approvals.length === 0 && (
          <p className="text-sm text-slate-400">No approval requests yet.</p>
        )}
      </div>
    </div>
  );
}
