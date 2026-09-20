/**
 * Shared REST envelope types.
 * Mirrors `backend/src/common/interceptors/response.interceptor.ts` and
 * `backend/src/common/filters/all-exceptions.filter.ts`.
 */

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiFailure {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    correlationId?: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

/** Canonical error codes surfaced by the API. */
export const ApiErrorCode = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE",
  UNSUPPORTED_MEDIA_TYPE: "UNSUPPORTED_MEDIA_TYPE",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
} as const;

export type ApiErrorCodeValue = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

/** Human, actionable copy for each code — never shown as raw internals. */
export const apiErrorCopy: Record<ApiErrorCodeValue, string> = {
  VALIDATION_ERROR: "Please check the highlighted fields and try again.",
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
  FORBIDDEN: "You don't have access to this area yet.",
  NOT_FOUND: "We couldn't find what you were looking for.",
  CONFLICT: "That change conflicts with existing data. Refresh and try again.",
  PAYLOAD_TOO_LARGE: "That file is too large. The maximum size is 10 MB.",
  UNSUPPORTED_MEDIA_TYPE: "That file type isn't supported.",
  RATE_LIMITED: "Too many requests. Please wait a moment and try again.",
  INTERNAL_ERROR: "Something went wrong on our side. Please try again.",
  SERVICE_UNAVAILABLE: "This service is temporarily unavailable. Please try again shortly.",
};
