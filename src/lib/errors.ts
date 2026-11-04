/**
 * Extract the backend's own error copy from an axios error envelope
 * ({ success, error: { code, message } }), else fall back to a safe generic.
 * ValidationPipe rejections arrive as a message array, so strings are joined.
 */
export function describeError(error: unknown, fallback: string): string {
  const response = (
    error as { response?: { data?: { error?: { message?: unknown } } } }
  )?.response;
  const serverMessage = response?.data?.error?.message;

  if (Array.isArray(serverMessage)) {
    const joined = serverMessage
      .filter((line): line is string => typeof line === "string")
      .join(" ");
    return joined || fallback;
  }

  return typeof serverMessage === "string" && serverMessage.trim().length > 0
    ? serverMessage
    : fallback;
}

