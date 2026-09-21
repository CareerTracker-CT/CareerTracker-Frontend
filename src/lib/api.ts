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

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("ct_access_token");
    if (token) {
      config.headers.set?.("Authorization", `Bearer ${token}`);
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      // Session expiry is handled centrally rather than per screen.
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ct:session-expired"));
      }
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
