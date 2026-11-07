import {
  createAiChatPost,
  loadBackendCareerContext,
  verifyBackendSession,
} from "@/lib/server/ai-chat-security.mjs";
import { generateCareerAnswer } from "@/lib/server/ai";
import { rateLimit } from "@/lib/server/http";

export const dynamic = "force-dynamic";

const backendBaseUrl =
  process.env.BACKEND_API_URL ?? "http://127.0.0.1:4000/api/v1";

/**
 * AI chat uses the established backend JWT guard as its authentication
 * authority. The backend verifies the bearer token and every context request
 * goes through owner-scoped Nest endpoints; this route does not query a DB.
 */
export const POST = createAiChatPost({
  verifySession: (request) =>
    verifyBackendSession(request, { baseUrl: backendBaseUrl }),
  loadContext: (request, principal) =>
    loadBackendCareerContext(request, principal, { baseUrl: backendBaseUrl }),
  rateLimit,
  generateAnswer: generateCareerAnswer,
});
