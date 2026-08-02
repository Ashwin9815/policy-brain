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

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/v1${path}`, {
    ...options,
    headers,
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message ?? "API request failed");
  }
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

export async function getFolders() {
  return api<Folder[]>("/folders");
}

export async function getWorkflows() {
  return api<Workflow[]>("/workflows");
}

export async function startWorkflow(type: string, input: Record<string, unknown> = {}) {
  return api<Workflow>("/workflows", {
    method: "POST",
    body: JSON.stringify({ type, input }),
  });
}

export async function search(q: string) {
  return api<SearchResults>(`/search?q=${encodeURIComponent(q)}`);
}

export interface Policy {
  id: string;
  title: string;
  description?: string;
  status: string;
  version: number;
  folder: { id: string; name: string };
  _count: { rules: number };
  updatedAt: string;
}

export interface PolicyDetail extends Policy {
  rules: Rule[];
  comments: Array<{ id: string; content: string; author: { name: string } }>;
}

export interface Rule {
  id: string;
  title: string;
  description?: string;
  status: string;
  dslContent: Record<string, unknown>;
  versions?: Array<{ version: number; changeNote?: string }>;
}

export interface Folder {
  id: string;
  name: string;
  description?: string;
  _count: { policies: number; sources: number };
}

export interface Workflow {
  id: string;
  type: string;
  status: string;
  correlationId: string;
  createdAt: string;
}

export interface SearchResults {
  policies: Array<{ id: string; title: string; status: string }>;
  rules: Array<{ id: string; title: string; status: string }>;
  knowledge: Array<{ id: string; type: string; content: string }>;
}
