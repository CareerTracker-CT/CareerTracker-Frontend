import axios, { InternalAxiosRequestConfig } from "axios";
import type { ApiResponse } from "@/types";

/**
 * Axios instance for the versioned REST API.
 * The frontend never talks to the database directly — all data flows through
 * /api/v1, which mirrors the NestJS controller contract in `backend/`.
 */
export const api = axios.create({
  baseURL: "/api/v1",
  timeout: 20_000,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

/**
 * The access token lives in memory only. The authoritative session is the
 * backend's httpOnly `ct_refresh` cookie: on boot (and on any 401) we exchange
 * it for a fresh access token via POST /auth/refresh. Nothing token-shaped is
 * ever written to localStorage or sessionStorage.
 */
let accessToken: string | null = null;
let lastRefreshAt = 0;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

interface AuthRequestConfig extends InternalAxiosRequestConfig {
  _ctToken?: string | null;
  _ctRetry?: boolean;
}

/** Bare client for /auth/refresh so the retry cycle cannot recurse onto itself. */
const refreshClient = axios.create({
  baseURL: "/api/v1",
  timeout: 20_000,
  withCredentials: true,
});

let refreshing: Promise<string | null> | null = null;

/**
 * Exchange the httpOnly refresh cookie for a fresh access token.
 * Single-flight: every 401 gets awaited on the same in-flight rotation, since
 * the backend allows only one valid refresh token (jti) per user.
 */
export function refreshSession(): Promise<string | null> {
  if (accessToken && Date.now() - lastRefreshAt < 5_000) {
    return Promise.resolve(accessToken);
  }
  if (!refreshing) {
    refreshing = refreshClient
      .post<ApiResponse<{ accessToken?: string }>>("/auth/refresh")
      .then((res) => {
        if (!res.data.success) return null;
        const token = res.data.data.accessToken ?? null;
        accessToken = token;
        lastRefreshAt = Date.now();
        return token;
      })
      .catch(() => {
        accessToken = null;
        return null;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

/** Same-site backend pages stay exempt; everything else must echo the token. */
function readCsrfCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )ct_csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

api.interceptors.request.use((config) => {
  const cfg = config as AuthRequestConfig;
  cfg._ctToken = accessToken;
  if (accessToken) {
    config.headers.set?.("Authorization", `Bearer ${accessToken}`);
  }
  // CSRF double-submit: the backend expects the ct_csrf cookie value echoed
  // in this header on every unsafe method outside /api/v1/auth/*.
  const method = (config.method ?? "get").toLowerCase();
  if (method !== "get" && method !== "head" && method !== "options") {
    const csrfToken = readCsrfCookie();
    if (csrfToken) {
      config.headers.set("X-CSRF-Token", csrfToken);
    }
  }
  return config;
});

/** Endpoints that must never trigger the refresh-and-retry cycle. */
const UNRETRYABLE = ["/auth/refresh", "/auth/login", "/auth/firebase"];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const cfg = error?.config as AuthRequestConfig | undefined;
    const status: number | undefined = error?.response?.status;
    const url: string = cfg?.url ?? "";

    if (status === 401 && cfg && !cfg._ctRetry && !UNRETRYABLE.some((p) => url.includes(p))) {
      cfg._ctRetry = true;
      let token = accessToken;
      // Skip a second rotation if the token already changed since this request
      // was sent — a retry with the current token is enough.
      if (token === (cfg._ctToken ?? null)) {
        token = await refreshSession();
      }
      if (token) {
        cfg.headers.set?.("Authorization", `Bearer ${token}`);
        return api(cfg);
      }
    }

    // Session expiry is handled centrally rather than per screen.
    if (status === 401 && !url.includes("/auth/refresh") && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ct:session-expired"));
    }
    return Promise.reject(error);
  },
);

/** Unwrap the { success, data } envelope, throwing a readable error otherwise. */
export async function requestData<T>(path: string): Promise<T> {
  const { data } = await api.get<ApiResponse<T>>(path);
  if (!data.success) {
    throw new Error(data.error.message);
  }
  return data.data;
}

export async function requestPut<T>(path: string, body: unknown): Promise<T> {
  const { data } = await api.put<ApiResponse<T>>(path, body);
  if (!data.success) {
    throw new Error(data.error.message);
  }
  return data.data;
}
