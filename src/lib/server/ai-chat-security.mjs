const MAX_BODY_BYTES = 16 * 1024;

export class BackendUnauthorizedError extends Error {}

function json(status, body) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function failure(status, code, message) {
  return json(status, { success: false, error: { code, message } });
}

async function readBoundedJson(request) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return { tooLarge: true };
  }

  if (!request.body) return { value: null };
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        return { tooLarge: true };
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  try {
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { value: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return { value: null };
  }
}

function bearerToken(request) {
  const value = request.headers.get("authorization");
  const match = value?.match(/^Bearer ([^\s]+)$/i);
  return match?.[1] ?? null;
}

function apiUrl(baseUrl, path) {
  return `${baseUrl.replace(/\/+$/, "")}/${path}`;
}

async function getApiData(fetchImpl, baseUrl, token, path, signal) {
  const response = await fetchImpl(apiUrl(baseUrl, path), {
    method: "GET",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
    signal,
  });

  if (response.status === 401 || response.status === 403) {
    throw new BackendUnauthorizedError();
  }
  if (!response.ok) throw new Error("Backend request failed");

  const payload = await response.json();
  if (!payload?.success || payload.data === undefined) {
    throw new Error("Backend returned an invalid response");
  }
  return payload.data;
}

/** Ask Nest to verify the existing access JWT and derive the principal there. */
export async function verifyBackendSession(
  request,
  { baseUrl, fetchImpl = fetch } = {},
) {
  const token = bearerToken(request);
  if (!token) return null;

  let data;
  try {
    data = await getApiData(
      fetchImpl,
      baseUrl,
      token,
      "profile",
      AbortSignal.timeout(5_000),
    );
  } catch (error) {
    if (error instanceof BackendUnauthorizedError) return null;
    throw error;
  }
  const id = data?.user?.id;
  if (typeof id !== "string" || id.length === 0) {
    throw new Error("Backend returned no authenticated principal");
  }

  // The backend JWT guard validates signature and expiry. Confirm its `sid`
  // still names an active device session too, so a revoked but not-yet-expired
  // access token cannot continue to spend AI resources.
  let sessions;
  try {
    sessions = await getApiData(
      fetchImpl,
      baseUrl,
      token,
      "auth/sessions",
      AbortSignal.timeout(5_000),
    );
  } catch (error) {
    if (error instanceof BackendUnauthorizedError) return null;
    throw error;
  }
  if (!Array.isArray(sessions) || !sessions.some((session) => session.isCurrent === true)) {
    return null;
  }

  return { id, token };
}

/** All student data is fetched through Nest routes scoped to the verified JWT. */
export async function loadBackendCareerContext(
  _request,
  principal,
  { baseUrl, fetchImpl = fetch } = {},
) {
  const signal = AbortSignal.timeout(8_000);
  const [dashboard, skills, tasks, resumes] = await Promise.all([
    getApiData(fetchImpl, baseUrl, principal.token, "dashboard", signal),
    getApiData(fetchImpl, baseUrl, principal.token, "skills", signal),
    getApiData(fetchImpl, baseUrl, principal.token, "roadmap", signal),
    getApiData(fetchImpl, baseUrl, principal.token, "resumes", signal),
  ]);

  const current = resumes.find((resume) => resume.isCurrent) ?? resumes[0];
  const resumeSummary = current
    ? `ATS score ${current.atsScore}/100, keyword coverage ${current.keywordCoverage}%, ${current.quantifiedImpactCount} quantified achievement(s), ${current.findings.filter((finding) => finding.severity === "HIGH").length} high-severity finding(s).`
    : "No resume has been uploaded yet.";

  return { dashboard, skills, tasks, resumeSummary };
}

/** Route policy kept dependency-injected so its security ordering is testable. */
export function createAiChatPost({
  verifySession,
  loadContext,
  rateLimit,
  generateAnswer,
}) {
  return async function POST(request) {
    const parsedBody = await readBoundedJson(request);
    if (parsedBody.tooLarge) {
      return failure(413, "PAYLOAD_TOO_LARGE", "This message is too large.");
    }

    const message = parsedBody.value?.message;
    if (typeof message !== "string" || message.trim().length < 2 || message.length > 2_000) {
      return failure(400, "VALIDATION_ERROR", "Please enter a question of at least two characters.");
    }

    let principal;
    try {
      principal = await verifySession(request);
    } catch (error) {
      if (error instanceof BackendUnauthorizedError) principal = null;
      else return failure(503, "SERVICE_UNAVAILABLE", "The career assistant is temporarily unavailable. Please try again.");
    }
    if (!principal) {
      return failure(401, "UNAUTHORIZED", "Please sign in again to use the career assistant.");
    }

    if (!rateLimit(`ai-chat:${principal.id}`, 20)) {
      return failure(429, "RATE_LIMITED", "Too many requests. Please wait a moment and try again.");
    }

    try {
      const context = await loadContext(request, principal);
      const result = await generateAnswer(message.trim(), context);
      return json(200, {
        success: true,
        data: result,
        meta: {
          provider: result.provider,
          model: result.model,
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof BackendUnauthorizedError) {
        return failure(401, "UNAUTHORIZED", "Please sign in again to use the career assistant.");
      }
      return failure(503, "SERVICE_UNAVAILABLE", "The career assistant is temporarily unavailable. Please try again.");
    }
  };
}
