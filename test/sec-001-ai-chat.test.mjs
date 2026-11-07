import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BackendUnauthorizedError,
  createAiChatPost,
  loadBackendCareerContext,
  verifyBackendSession,
} from "../src/lib/server/ai-chat-security.mjs";
import { formatAssistantMessage } from "../src/lib/assistant-format.mjs";
import { AssistantMessageContent } from "../src/lib/assistant-message-content.mjs";

const bearerRequest = (body = { message: "What should I focus on?" }, token = "valid-a") =>
  new Request("http://localhost/api/v1/ai/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

const ok = (data) => Response.json({ success: true, data });

function routeWith(overrides = {}) {
  const calls = { verify: 0, context: 0, generate: 0 };
  const route = createAiChatPost({
    verifySession: async () => {
      calls.verify += 1;
      return { id: "student-a", token: "verified-a" };
    },
    loadContext: async () => {
      calls.context += 1;
      return { dashboard: { user: { id: "student-a" } }, skills: [], tasks: [], resumeSummary: "none" };
    },
    rateLimit: () => true,
    generateAnswer: async () => {
      calls.generate += 1;
      return {
        answer: "**Focus on SQL.**",
        provider: "mock",
        model: "test",
        groundedIn: [],
        followUps: [],
        degraded: false,
      };
    },
    ...overrides,
  });
  return { route, calls };
}

test("missing bearer authentication cannot read context or invoke AI", async () => {
  let backendCalls = 0;
  const principal = await verifyBackendSession(
    new Request("http://localhost/api/v1/ai/chat"),
    { baseUrl: "http://backend/api/v1", fetchImpl: async () => { backendCalls += 1; } },
  );
  assert.equal(principal, null);
  assert.equal(backendCalls, 0);

  const { route, calls } = routeWith({ verifySession: async () => null });
  const response = await route(bearerRequest());
  assert.equal(response.status, 401);
  assert.equal(calls.context, 0);
  assert.equal(calls.generate, 0);
});

test("invalid and expired backend sessions fail before context and provider", async () => {
  for (const status of [401, 403]) {
    const principal = await verifyBackendSession(bearerRequest(), {
      baseUrl: "http://backend/api/v1",
      fetchImpl: async () => new Response(null, { status }),
    });
    assert.equal(principal, null);
  }

  const { route, calls } = routeWith({
    verifySession: async () => { throw new BackendUnauthorizedError(); },
  });
  const response = await route(bearerRequest());
  assert.equal(response.status, 401);
  assert.equal(calls.context, 0);
  assert.equal(calls.generate, 0);
});

test("a revoked device session fails even while its access JWT is still accepted", async () => {
  let apiCall = 0;
  const principal = await verifyBackendSession(bearerRequest(), {
    baseUrl: "http://backend/api/v1",
    fetchImpl: async () => {
      apiCall += 1;
      return apiCall === 1
        ? ok({ user: { id: "student-a" } })
        : ok([{ id: "another-session", isCurrent: false }]);
    },
  });
  assert.equal(principal, null);
  assert.equal(apiCall, 2);
});

test("valid access uses the backend-verified principal and authenticated API context", async () => {
  const paths = [];
  const calls = [];
  const responses = {
    profile: { user: { id: "student-a" } },
    sessions: [{ id: "session-a", isCurrent: true }],
    dashboard: { user: { id: "student-a" }, readiness: { overall: 72 } },
    skills: [{ name: "TypeScript" }],
    roadmap: [{ title: "Build a project" }],
    resumes: [],
  };
  const fetchImpl = async (url, options) => {
    paths.push(new URL(url).pathname);
    calls.push(options);
    return ok(responses[new URL(url).pathname.split("/").at(-1)]);
  };

  const request = new Request(
    "http://localhost/api/v1/ai/chat?userId=student-b",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer valid-a",
        "X-User-Id": "student-b",
      },
      body: JSON.stringify({ message: "How should I focus?", userId: "student-b" }),
    },
  );
  const principal = await verifyBackendSession(request, {
    baseUrl: "http://backend/api/v1",
    fetchImpl,
  });
  assert.deepEqual(principal, { id: "student-a", token: "valid-a" });

  const context = await loadBackendCareerContext(request, principal, {
    baseUrl: "http://backend/api/v1",
    fetchImpl,
  });
  assert.deepEqual(paths, [
    "/api/v1/profile",
    "/api/v1/auth/sessions",
    "/api/v1/dashboard",
    "/api/v1/skills",
    "/api/v1/roadmap",
    "/api/v1/resumes",
  ]);
  assert.ok(calls.every((call) => call.headers.Authorization === "Bearer valid-a"));
  assert.ok(paths.every((path) => !path.includes("student-b")));
  assert.equal(context.dashboard.user.id, "student-a");
});

test("unauthorized requests are rejected before provider invocation", async () => {
  const { route, calls } = routeWith({ verifySession: async () => null });
  const response = await route(bearerRequest());
  assert.equal(response.status, 401);
  assert.equal(calls.generate, 0);
});

test("rate limits are keyed by the verified principal before context or AI", async () => {
  let attemptedKey;
  const { route, calls } = routeWith({
    rateLimit: (key) => { attemptedKey = key; return false; },
  });
  const response = await route(bearerRequest());
  assert.equal(response.status, 429);
  assert.equal(attemptedKey, "ai-chat:student-a");
  assert.equal(calls.context, 0);
  assert.equal(calls.generate, 0);
});

test("oversized or invalid message bodies are rejected", async () => {
  const { route, calls } = routeWith();
  const oversized = new Request("http://localhost/api/v1/ai/chat", {
    method: "POST",
    headers: { Authorization: "Bearer valid-a" },
    body: "x".repeat(20_000),
  });
  assert.equal((await route(oversized)).status, 413);
  assert.equal((await route(bearerRequest({ message: "x" }))).status, 400);
  assert.equal((await route(bearerRequest({ message: "x".repeat(2_001) }))).status, 400);
  assert.equal((await route(new Request("http://localhost/api/v1/ai/chat", {
    method: "POST",
    headers: { Authorization: "Bearer valid-a" },
    body: "{invalid json",
  }))).status, 400);
  assert.equal(calls.generate, 0);
});

test("markup-like model text remains plain text while bold and bullets are preserved", () => {
  const blocks = formatAssistantMessage(
    "Use **TypeScript** safely.\n\n- Build **one project**\n- Review results\n\n<img src=x onerror=alert(1)> <script>alert(2)</script> javascript:alert(3)",
  );
  assert.equal(blocks[0].kind, "paragraph");
  assert.deepEqual(blocks[0].segments, [
    { text: "Use ", bold: false },
    { text: "TypeScript", bold: true },
    { text: " safely.", bold: false },
  ]);
  assert.equal(blocks[1].kind, "list");
  assert.deepEqual(blocks[1].items[0], [
    { text: "Build ", bold: false },
    { text: "one project", bold: true },
  ]);
  assert.equal(blocks[2].kind, "paragraph");
  assert.ok(blocks[2].segments.every((segment) => !segment.bold));
  assert.match(blocks[2].segments[0].text, /<script>/);
  assert.match(blocks[2].segments[0].text, /onerror/);
  assert.match(blocks[2].segments[0].text, /javascript:/);

  const rendered = renderToStaticMarkup(
    AssistantMessageContent({
      content: "**Safe emphasis**\n\n<img src=x onerror=alert(1)> <script>alert(2)</script> <a href=\"javascript:alert(3)\">click</a> [unsafe](javascript:alert(4))",
    }),
  );
  assert.match(rendered, /<strong[^>]*>Safe emphasis<\/strong>/);
  assert.match(rendered, /&lt;img/);
  assert.match(rendered, /&lt;script&gt;/);
  assert.match(rendered, /&lt;a href=&quot;javascript:alert\(3\)&quot;&gt;click&lt;\/a&gt;/);
  assert.match(rendered, /\[unsafe\]\(javascript:alert\(4\)\)/);
  assert.doesNotMatch(rendered, /<img|<script|<[^>]+\bonerror=|<a\b/i);
});

test("unexpected answer-generator failures return a generic service error without sensitive details", async () => {
  const { route, calls } = routeWith({
    generateAnswer: async () => { calls.generate += 1; throw new Error("secret provider response"); },
  });
  const response = await route(bearerRequest());
  const payload = await response.json();
  assert.equal(response.status, 503);
  assert.equal(payload.error.message.includes("secret provider response"), false);
  assert.equal(calls.generate, 1);
});
