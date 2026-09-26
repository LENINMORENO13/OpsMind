import type {
  Monitor,
  MonitorInput,
  ResolveIncidentInput,
  ResolveIncidentResult,
} from "./types";

const TOKEN_KEY = "opsmind_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

interface Envelope<T> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, { ...init, headers });

  if (res.status === 401) {
    clearToken();
    if (!window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    throw new ApiError("No autorizado", 401);
  }

  const body = (await res.json().catch(() => null)) as Envelope<T> | null;

  if (!res.ok || !body?.success) {
    const message =
      body?.message ?? body?.error ?? `Error ${res.status} al consultar la API`;
    throw new ApiError(message, res.status);
  }

  return body.data as T;
}

export async function createMonitor(input: MonitorInput): Promise<Monitor> {
  return apiFetch<Monitor>("/api/v1/monitors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function updateMonitor(
  id: number,
  input: Partial<MonitorInput>,
): Promise<Monitor> {
  return apiFetch<Monitor>(`/api/v1/monitors/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function deleteMonitor(id: number): Promise<Monitor> {
  return apiFetch<Monitor>(`/api/v1/monitors/${id}`, {
    method: "DELETE",
  });
}

export async function resolveIncident(
  id: number,
  input: ResolveIncidentInput,
): Promise<ResolveIncidentResult> {
  return apiFetch<ResolveIncidentResult>(`/api/v1/incidents/${id}/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function login(email: string, password: string): Promise<void> {
  const res = await fetch("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const body = (await res.json().catch(() => null)) as Envelope<string> | null;

  if (!res.ok || !body?.success || typeof body.data !== "string") {
    const message =
      body?.error ?? body?.message ?? "Credenciales inválidas";
    throw new ApiError(message, res.status);
  }

  setToken(body.data);
}

export function logout(): void {
  clearToken();
  window.location.href = "/login";
}