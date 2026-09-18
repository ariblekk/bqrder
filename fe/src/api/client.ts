import type { AuthData, Envelope } from "./types";

export const BASE =
  import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";
const AUTH_KEY = "qrdigo_auth";
const BRANCH_KEY = "qrdigo_branch";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function saveAuth(a: AuthData) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(a));
}
export function loadAuth(): AuthData | null {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
  } catch {
    return null;
  }
}
export function clearAuth() {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(BRANCH_KEY);
}

export function getBranchId(): number | null {
  const b = localStorage.getItem(BRANCH_KEY);
  return b ? Number(b) : null;
}
export function setBranchId(id: number | null) {
  if (id) localStorage.setItem(BRANCH_KEY, String(id));
  else localStorage.removeItem(BRANCH_KEY);
}

async function refreshToken(): Promise<boolean> {
  const auth = loadAuth();
  if (!auth?.refresh_token) return false;
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: auth.refresh_token }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.data) return false;
    saveAuth(body.data as AuthData);
    return true;
  } catch {
    return false;
  }
}

export async function api<T = unknown>(
  path: string,
  opts: RequestInit = {},
  retried = false,
): Promise<T> {
  const auth = loadAuth();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (auth) headers.Authorization = `Bearer ${auth.access_token}`;
  const branch = getBranchId();
  const url = `${BASE}${path}${branch ? (path.includes("?") ? "&" : "?") + `branch_id=${branch}` : ""}`;

  const res = await fetch(url, { ...opts, headers });
  const body = await res.json().catch(() => null);
  if (res.status === 401 && !retried && (await refreshToken())) {
    return api(path, opts, true);
  }
  if (!res.ok)
    throw new ApiError(
      res.status,
      body?.message || res.statusText || "Request failed",
    );
  return body as T;
}

export const get = <T>(path: string) => api<Envelope<T>>(path);
export const post = <T>(path: string, data?: unknown) =>
  api<Envelope<T>>(path, {
    method: "POST",
    body: data != null ? JSON.stringify(data) : undefined,
  });
export const put = <T>(path: string, data?: unknown) =>
  api<Envelope<T>>(path, {
    method: "PUT",
    body: data != null ? JSON.stringify(data) : undefined,
  });
export const del = <T>(path: string) =>
  api<Envelope<T>>(path, { method: "DELETE" });

export async function upload<T = unknown>(
  path: string,
  file: Blob,
): Promise<T> {
  const auth = loadAuth();
  const headers: Record<string, string> = {};
  if (auth) headers.Authorization = `Bearer ${auth.access_token}`;
  const branch = getBranchId();
  const url = `${BASE}${path}${branch ? `?branch_id=${branch}` : ""}`;
  const form = new FormData();
  form.append("image", file);
  const res = await fetch(url, { method: "POST", headers, body: form });
  const body = await res.json().catch(() => null);
  if (!res.ok)
    throw new ApiError(
      res.status,
      body?.message || res.statusText || "Upload failed",
    );
  return body as T;
}
