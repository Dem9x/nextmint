const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type ApiError = Error & { status?: number; details?: unknown };

export function getStoredToken() {
  return typeof window !== "undefined" ? localStorage.getItem("nexmint_token") : null;
}

export function setStoredToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem("nexmint_token", token);
  else localStorage.removeItem("nexmint_token");
}

export async function apiClient<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init.headers
    }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (response.status === 401) setStoredToken(null);
    const error = new Error(body.error ?? "Request failed") as ApiError;
    error.status = response.status;
    error.details = body.details;
    throw error;
  }
  return response.json() as Promise<T>;
}
