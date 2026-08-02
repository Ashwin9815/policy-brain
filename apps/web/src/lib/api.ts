const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("pb_token");
}

export function setToken(token: string) {
  localStorage.setItem("pb_token", token);
}

export function clearToken() {
  localStorage.removeItem("pb_token");
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/v1${path}`, { ...options, headers });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? "API request failed");
  return json.data as T;
}

export async function login(email: string, password: string) {
  const data = await api<{ token: string; user: AuthUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  return data;
}

export async function getMe() {
  return api<AuthUser>("/auth/me");
}

export async function getPolicies() {
  return api<Policy[]>("/policies");
}

export async function getPolicy(id: string) {
  return api<PolicyDetail>(`/policies/${id}`);
}

export async function updatePolicy(id: string, data: Partial<Policy>) {
  return api<Policy>(`/policies/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function getFolders() {
  return api<Folder[]>("/folders");
}

export async function getWorkflows() {
  return api<Workflow[]>("/workflows");
}

export async function startWorkflow(type: string, input: Record<string, unknown> = {}) {
  return api<Workflow>("/workflows", { method: "POST", body: JSON.stringify({ type, input }) });
}

export async function search(q: string, mode = "hybrid") {
  return api<SearchResults>(`/search?q=${encodeURIComponent(q)}&mode=${mode}`);
}

export async function getComments(policyId: string) {
  return api<Comment[]>(`/comments?policyId=${policyId}`);
}

export async function postComment(data: {
  content: string;
  type?: string;
  policyId?: string;
  ruleId?: string;
  mentions?: string[];
}) {
  return api<Comment>("/comments", { method: "POST", body: JSON.stringify(data) });
}

export async function getApprovals(policyId: string) {
  return api<Approval[]>(`/approvals?policyId=${policyId}`);
}

export async function requestApproval(policyId: string) {
  return api<Approval>("/approvals", { method: "POST", body: JSON.stringify({ policyId }) });
}

export async function decideApproval(id: string, status: "APPROVED" | "REJECTED", note?: string) {
  return api<Approval>(`/approvals/${id}/decide`, {
    method: "POST",
    body: JSON.stringify({ status, note }),
  });
}

export async function exportRule(ruleId: string, format: string) {
  return api<{ record: unknown; artifact: string }>("/exports", {
    method: "POST",
    body: JSON.stringify({ ruleId, format }),
  });
}

export async function compareRules(leftRuleId: string, rightRuleId: string) {
  return api<CompareResult>("/compare/rules", {
    method: "POST",
    body: JSON.stringify({ leftRuleId, rightRuleId }),
  });
}

export async function updateRule(id: string, data: Record<string, unknown>) {
  return api<Rule>(`/rules/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function getKnowledgeGraph() {
  return api<{ nodes: GraphNode[]; edges: GraphEdge[] }>("/knowledge/graph");
}

export async function getFlightRecords(workflowId?: string) {
  const q = workflowId ? `?workflowId=${workflowId}` : "";
  return api<FlightRecord[]>(`/flight-recorder${q}`);
}

export async function getNotifications() {
  return api<Notification[]>("/notifications");
}

export async function getAdminUsers() {
  return api<AdminUser[]>("/admin/users");
}

export async function getAdminSettings() {
  return api<OrgSettings>("/admin/settings");
}

export async function createComposerSession(folderId: string, title?: string) {
  return api<ComposerSession>("/composer/sessions", {
    method: "POST",
    body: JSON.stringify({ folderId, title }),
  });
}

export async function uploadComposerSource(sessionId: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  const token = getToken();
  const res = await fetch(`${API_URL}/v1/composer/sessions/${sessionId}/sources`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message);
  return json.data;
}

export async function extractComposer(sessionId: string) {
  return api<{ session: ComposerSession; questions: ClarificationQuestion[]; knowledgeObjects: unknown[] }>(
    `/composer/sessions/${sessionId}/extract`,
    { method: "POST", body: "{}" }
  );
}

export async function clarifyComposer(sessionId: string, answers: Record<string, string>) {
  return api<{ session: ComposerSession }>(`/composer/sessions/${sessionId}/clarify`, {
    method: "POST",
    body: JSON.stringify({ answers }),
  });
}

export async function generateComposer(sessionId: string) {
  return api<{ session: ComposerSession; generatedRules: unknown[]; explanation: unknown }>(
    `/composer/sessions/${sessionId}/generate`,
    { method: "POST", body: "{}" }
  );
}

export async function finalizeComposer(sessionId: string) {
  return api<{ session: ComposerSession; policy: Policy }>(`/composer/sessions/${sessionId}/finalize`, {
    method: "POST",
    body: "{}",
  });
}

export interface Policy {
  id: string;
  title: string;
  description?: string;
  status: string;
  version: number;
  folder: { id: string; name: string };
  _count?: { rules: number };
  updatedAt: string;
}

export interface PolicyDetail extends Policy {
  rules: Rule[];
  comments?: Comment[];
  approvals?: Approval[];
}

export interface Rule {
  id: string;
  title: string;
  description?: string;
  status: string;
  dslContent: Record<string, unknown>;
  version: number;
  versions?: Array<{ version: number; changeNote?: string; createdAt: string }>;
}

export interface Folder {
  id: string;
  name: string;
  description?: string;
  _count?: { policies: number; sources: number };
}

export interface Workflow {
  id: string;
  type: string;
  status: string;
  correlationId: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  content: string;
  type: string;
  resolved: boolean;
  author: { id: string; name: string };
  replies?: Comment[];
  createdAt: string;
}

export interface Approval {
  id: string;
  status: string;
  note?: string;
  approver: { id: string; name: string };
  createdAt: string;
}

export interface SearchResults {
  policies: Array<Policy & { relevance: number; evidence: string }>;
  rules: Array<Rule & { relevance: number; evidence: string }>;
  knowledge: Array<{ id: string; content: string; type: string; relevance: number }>;
}

export interface CompareResult {
  left: { id: string; title: string; version: number };
  right: { id: string; title: string; version: number };
  comparison: { additions: unknown[]; removals: unknown[]; changes: unknown[]; conflicts: string[] };
  diff: { lines: Array<{ type: string; content: string }>; summary: { additions: number; removals: number } };
}

export interface GraphNode {
  id: string;
  type: string;
  label: string;
  objectType?: string;
  confidence?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
}

export interface FlightRecord {
  id: string;
  stage: string;
  agentType?: string;
  status: string;
  durationMs: number;
  tokenUsage: number;
  createdAt: string;
  trace?: { decisionTrace?: string[] };
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  link?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface OrgSettings {
  mfaRequired: boolean;
  onboardingCompleted: boolean;
  tokenBudgetMonthly: number;
  confidenceThreshold: number;
}

export interface ComposerSession {
  id: string;
  stage: string;
  title?: string;
  sourceIds: string[];
  clarifications: ClarificationQuestion[];
  generatedRules: unknown[];
  policyId?: string;
}

export interface ClarificationQuestion {
  id: string;
  question: string;
  field: string;
  suggestedAnswer?: string;
  options?: string[];
  required: boolean;
}
