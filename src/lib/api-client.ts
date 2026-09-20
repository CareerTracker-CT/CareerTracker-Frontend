import axios from "axios";
import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { apiErrorCopy, ApiErrorCode, type ApiFailure, type ApiResponse } from "./api-envelope";

export interface ApiClientOptions {
  /** Base URL for the versioned API. Defaults to the same-origin proxy. */
  baseUrl?: string;
  /** Called when the server reports the session is no longer valid. */
  onSessionExpired?: () => void;
  /** Default timeout in milliseconds. */
  timeoutMs?: number;
}

/**
 * Typed Axios transport for the CareerTracker REST API.
 *
 * Responsibilities:
 * - attach the access token to every request
 * - retry transient network failures once (never 4xx responses)
 * - unwrap the `{ success, data }` envelope into plain values
 * - map error codes to user-facing copy without leaking internals
 */
export function createApiClient(options: ApiClientOptions = {}): AxiosInstance {
  const {
    baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1",
    onSessionExpired,
    timeoutMs = 20_000,
  } = options;

  const client = axios.create({
    baseURL: baseUrl,
    timeout: timeoutMs,
    withCredentials: true,
    headers: { "Content-Type": "application/json" },
  });

  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const token = window.localStorage.getItem("ct_access_token");
      if (token) {
        config.headers.set?.("Authorization", `Bearer ${token}`);
      }
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<ApiResponse<unknown>>) => {
      const status = error.response?.status;

      if (status === 401) {
        onSessionExpired?.();
      }

      // One retry for transient network/server failures only.
      const config = error.config as
        | (InternalAxiosRequestConfig & { _retry?: boolean })
        | undefined;

      if (
        config &&
        !config._retry &&
        (status === undefined || status >= 500 || status === 429)
      ) {
        config._retry = true;
        await new Promise((resolve) => setTimeout(resolve, 600));
        return client.request(config);
      }

      return Promise.reject(normaliseError(error));
    },
  );

  return client;
}

export interface NormalisedApiError {
  code: string;
  message: string;
  status?: number;
  details?: unknown;
}

function normaliseError(error: AxiosError<ApiResponse<unknown>>): NormalisedApiError {
  const payload = error.response?.data;

  if (payload && payload.success === false) {
    return {
      code: payload.error.code,
      message: payload.error.message,
      status: error.response?.status,
      details: payload.error.details,
    };
  }

  const status = error.response?.status;
  const code =
    status === 401
      ? ApiErrorCode.UNAUTHORIZED
      : status === 403
        ? ApiErrorCode.FORBIDDEN
        : status === 404
          ? ApiErrorCode.NOT_FOUND
          : status === 429
            ? ApiErrorCode.RATE_LIMITED
            : ApiErrorCode.INTERNAL_ERROR;

  return {
    code,
    message: apiErrorCopy[code],
    status,
  };
}

/** Unwraps the success envelope, throwing a readable error otherwise. */
export async function requestData<T>(
  client: AxiosInstance,
  path: string,
): Promise<T> {
  const { data } = await client.get<ApiResponse<T>>(path);

  if (!data.success) {
    throw new Error(data.error.message);
  }

  return data.data;
}

export const apiClient = createApiClient();
