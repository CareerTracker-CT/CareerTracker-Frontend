import { NextResponse } from "next/server";
import type { ApiFailure, ApiSuccess } from "@/types";

/** Consistent success envelope for the versioned REST API. */
export function ok<T>(data: T, meta?: Record<string, unknown>, status = 200) {
  const body: ApiSuccess<T> = meta ? { success: true, data, meta } : { success: true, data };
  return NextResponse.json(body, { status });
}

/** Consistent error envelope — never leaks stack traces or internals. */
export function fail(
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  const body: ApiFailure = {
    success: false,
    error: details === undefined ? { code, message } : { code, message, details },
  };
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export const errors = {
  validation: (message: string, details?: unknown) =>
    fail(400, "VALIDATION_ERROR", message, details),
  unauthorized: (message = "Your session has expired. Please sign in again.") =>
    fail(401, "UNAUTHORIZED", message),
  forbidden: (message = "You do not have access to this resource.") =>
    fail(403, "FORBIDDEN", message),
  notFound: (message = "We could not find what you were looking for.") =>
    fail(404, "NOT_FOUND", message),
  conflict: (message: string) => fail(409, "CONFLICT", message),
  tooLarge: (message = "That file is too large. The maximum size is 10 MB.") =>
    fail(413, "PAYLOAD_TOO_LARGE", message),
  unsupportedMedia: (message = "That file type is not supported.") =>
    fail(415, "UNSUPPORTED_MEDIA_TYPE", message),
  rateLimited: (message = "Too many requests. Please wait a moment and try again.") =>
    fail(429, "RATE_LIMITED", message),
  internal: (message = "Something went wrong on our side. Please try again.") =>
    fail(500, "INTERNAL_ERROR", message),
  unavailable: (message: string) => fail(503, "SERVICE_UNAVAILABLE", message),
};

/** Minimal in-memory token bucket used for API rate limiting. */
const buckets = new Map<string, { tokens: number; updatedAt: number }>();

export function rateLimit(key: string, limit = 30, windowMs = 60_000) {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { tokens: limit, updatedAt: now };
  const elapsed = now - bucket.updatedAt;
  bucket.tokens = Math.min(limit, bucket.tokens + (elapsed / windowMs) * limit);
  bucket.updatedAt = now;

  if (bucket.tokens < 1) {
    buckets.set(key, bucket);
    return false;
  }

  bucket.tokens -= 1;
  buckets.set(key, bucket);
  return true;
}
