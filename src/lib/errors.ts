/**
 * Extract the backend's own error copy from an axios error envelope
 * ({ success, error: { code, message } }), else fall back to a safe generic.
 */
export function describeError(error: unknown, fallback: string): string {
  const response = (
    error as { response?: { data?: { error?: { message?: string } } } }
  )?.response;
  const serverMessage = response?.data?.error?.message;
  return serverMessage ?? fallback;
}
