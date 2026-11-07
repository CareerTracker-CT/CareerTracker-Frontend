# SEC-001 — Secure AI Chat Access and Safe Message Rendering

**Status:** PARTIAL — source, automated regressions, production build, and mocked browser UI verified; live authorization and two-account isolation pending  
**Date:** 2026-11-04  
**Repository:** `CareerTracker-Frontend`  
**Base branch / commit:** `main` / `3a11e7cfd44ef3a28eb9df011fe16bf44a327274`  
**Related backend repository:** `CareerTracker-Backend`, branch `main`, HEAD `149fbc67a78fe9eb98a2c7bcbea025cbb80b57ca`; FND-001 changed its `package.json` build script only.

## 1. Problem and verified root cause

The Next.js `POST /api/v1/ai/chat` route previously accepted any caller, generated answers from frontend Drizzle queries that always selected or created a fixed demo student, and could invoke the configured OpenAI provider. The authenticated assistant page used bare `fetch`, so it did not attach the application access JWT or use the shared API client's refresh handling. Assistant text was inserted with `dangerouslySetInnerHTML` after only replacing `**bold**` markers, leaving markup from an untrusted model response active.

The earlier audit identified these source paths, and the SEC-001 baseline recheck found both unchanged at frontend HEAD `3a11e7cfd44ef3a28eb9df011fe16bf44a327274`. Backend HEAD remained `149fbc67a78fe9eb98a2c7bcbea025cbb80b57ca`. FND-001 added a Prisma `prebuild` hook and the backend build passes. During final review, the frontend provider fallback was also changed to avoid logging raw provider exception messages. The previously untracked backend audit/template documents were preserved. No fetch, branch operation, commit, or push was performed.

## 2. Intended behavior and after state

- The assistant uses the shared Axios API client, which attaches the existing in-memory bearer access token and handles refresh/expiry responses.
- Before chat context or AI is accessed, the Next route asks the Nest backend's protected `GET /profile` endpoint to verify the JWT and derive the user ID, then checks `GET /auth/sessions` to confirm that the current device session remains active. Missing, invalid, expired, or revoked credentials fail closed.
- The route then applies the existing in-memory limiter keyed by the backend-verified user ID and fetches dashboard, skills, roadmap, and resume context only through protected Nest endpoints using that same bearer token. It does not accept or use a client-supplied user ID and does not query Drizzle or invoke the demo seed.
- Message bodies are limited to 16 KiB and message strings to 2,000 characters. A provider completion failure uses the existing deterministic grounded fallback (`degraded: true`); unexpected context/route failures return a generic no-store 503.
- Model output is tokenized into paragraphs, simple bullet lists, and `**bold**` spans, then rendered as React text and elements. HTML-like text and URLs remain inert text; there is no unsafe HTML sink or Markdown/HTML dependency.

The backend routes already derive ownership from their JWT guard (`req.user.id`) and service calls. The exact authenticated API calls are `/profile`, `/auth/sessions`, `/dashboard`, `/skills`, `/roadmap`, and `/resumes`; no request parameter selects another student. This keeps the existing Prisma/Drizzle architecture intact while avoiding Drizzle in this request path. The session-list check also closes the backend guard's access-token revocation window for this billable AI route without altering other APIs.

### Evidence level and backend auth trace

- **Source inspection:** frontend login exchanges Firebase credentials at Nest and stores the returned access token in memory; the shared Axios client sends it as a bearer. Nest `JwtAuthGuard` uses `JwtService.verifyAsync` with configured issuer and audience; the JWT library also enforces its `exp` claim. It derives `req.user.id` from the verified `sub`. Session tokens carry `sid`.
- **Active-session nuance:** `JwtAuthGuard` itself verifies JWT validity but does not query session state. The AI route additionally calls guarded `GET /auth/sessions`; `AuthSessionsService.listActive` filters by the authenticated `userId`, `revokedAt: null`, and `expiresAt > now`, and the route requires the current row (`isCurrent === true`). Revocation stamps `revokedAt`. Thus the AI operation denies a revoked-but-unexpired token at its extra session check. This was source-inspected and mock-tested, not verified against a live DB.
- **Owner scoping:** protected Nest controllers pass only `req.user.id` into profile, dashboard, skills, roadmap, and resume service calls. The inspected services query by `userId`; resume reads also exclude soft-deleted rows. This is source evidence, not live cross-account evidence.
- **Identity spoofing:** the Next route reads the bearer token and uses only the principal returned by `/profile`. It constructs fixed context paths and does not read user identity from body, query, or `X-User-Id`. The test supplies a different body/query/header identity and asserts fixed endpoint paths and the authenticated bearer. No real second account was available.
- **Mocked regression evidence:** actual route-policy/helper/rendering code is exercised with mocked Nest and provider responses. Rejected auth requests do not reach context or generation in these tests.
- **Live integration evidence:** none. PostgreSQL, Nest, and approved synthetic accounts were unavailable, as detailed below.

## 3. API contract

| Method and path | Auth / ownership | Request | Response |
|---|---|---|---|
| `POST /api/v1/ai/chat` | Requires `Authorization: Bearer <existing app access JWT>`; verified by backend `GET /profile` and active-session check through `GET /auth/sessions` before context/provider use | JSON `{message: string}`; 2–2,000 characters; request body max 16 KiB | Existing `{success:true,data:{answer,provider,model,groundedIn,followUps,degraded},meta}` envelope. 401 for missing/invalid/expired/revoked session, 400 for invalid body, 413 for oversized body, 429 for per-user local limit. Provider completion failure returns the existing grounded fallback; unexpected context/route failure returns a generic no-store 503. |

The chat endpoint is implemented by Next, not Nest; the incoming token is validated by calling the established Nest guard rather than reimplementing JWT verification. `BACKEND_API_URL` is used with the existing local fallback `http://127.0.0.1:4000/api/v1`. Backend context responses are no-store requests. AI provider availability/fallback behavior remains in the existing service.

## 4. Files changed

| File | Repository | Change |
|---|---|---|
| `src/app/api/v1/ai/chat/route.ts` | Frontend | Verify existing session, load owner-scoped context via Nest API, rate limit by verified principal, invoke provider only after checks. |
| `src/lib/server/ai-chat-security.mjs` and `.d.mts` | Frontend | Bounded body parsing, backend authentication/context helpers, and dependency-injected route policy. |
| `src/lib/server/ai/index.ts` | Frontend | Accept already-authorized context; remove direct Drizzle/demo loading and log only provider ID on provider failure. |
| `src/app/assistant/page.tsx` | Frontend | Use shared Axios client and safe message-content component. |
| `src/lib/assistant-format.mjs` and `.d.mts` | Frontend | Parse only paragraphs, bullets, and simple bold markers into text tokens. |
| `src/lib/assistant-message-content.mjs` and `.d.mts` | Frontend | Render text tokens with React elements; no HTML parsing/injection. |
| `test/sec-001-ai-chat.test.mjs` | Frontend | Nine focused Node built-in regression tests covering bearer handling, active sessions, spoofed body/query/header identity, limits, and safe rendering. |
| `docs/API_CONTRACT.md` | Frontend | Update AI route authentication, limits, ownership, response and safe-rendering contract. |
| `docs/implementation/SEC-001-ai-chat-security.md` | Frontend | This implementation record. |
| `src/app/layout.tsx`, `src/app/globals.css` | Frontend | Use existing local/system font fallbacks so production builds do not fetch Google Fonts; separate record: [FND-002](FND-002-offline-frontend-build.md). |
| `docs/screenshots/sec-001/*.png` | Frontend | Genuine Chrome captures using synthetic API fixtures for authenticated UI, safe response rendering, and generic error state. |

No backend source, schema, migrations, or lockfile changed. Backend `package.json` has the separate FND-001 `prebuild` change. The audit report and template under the backend repository were preserved.

## 5. Security and privacy

- **Authentication:** Uses app JWT through backend `JwtAuthGuard`; missing/expired/invalid token is denied. No new login/session mechanism and no client user ID trust.
- **Data isolation:** Context calls contain no student IDs in paths or queries; Nest receives the same bearer token on every request and scopes data to its verified principal.
- **Provider protection:** Authentication and per-principal in-memory rate limit happen before dashboard/context retrieval and provider invocation. The existing provider service falls back to a deterministic grounded response; unexpected route failures return a generic 503. Provider failure logs contain only a stable provider ID, not raw exception text. Body size and message length are bounded.
- **Rendering:** The renderer creates React text nodes, `<strong>`, `<p>`, `<ul>`, and `<li>` nodes from parsed plain text. It does not create links or HTML from model output. React escapes markup-like text.
- **Logging:** The route does not log prompts, profiles, model output, or tokens. Provider fallback logs only provider ID; it omits exception text.
- **Rate-limit scope:** `rateLimit` is a process-local in-memory token bucket. This route uses 20 tokens per verified principal and replenishes over the default 60-second window. State resets on process restart and is not shared across instances; it is not a durable spend quota. A shared limiter/usage budget is a deployment limitation.

## 6. Tests added

`test/sec-001-ai-chat.test.mjs` covers:

1. Missing bearer token makes no backend request and cannot reach context/provider.
2. Invalid and expired backend sessions (401/403) fail before context/provider.
3. A revoked session fails even if its bearer JWT has not reached expiry.
4. Valid backend-verified student context is loaded from authenticated endpoints; body and query `userId` values for another student are ignored and no other-user path is constructed.
5. Unauthorized route request is rejected before provider invocation.
6. Per-user rate-limit denial happens before context/provider.
7. Bodies above 16 KiB, messages above 2,000 characters, malformed JSON, and too-short messages are rejected.
8. Markup-like model output, raw HTML anchors, and Markdown `javascript:` link syntax stay inert under actual `react-dom/server` rendering; bold and bullet formatting remains.
9. An unexpected answer-generator rejection returns a generic service error without exception details. The concrete provider adapter handles provider failures by returning its grounded fallback and logs no raw exception text.

These are isolated unit/regression tests with mocked backend/provider responses. They exercise the route policy and concrete fetch/format/render helpers, but mock Nest's response to `/profile`, `/auth/sessions`, and the context endpoints. They verify bearer forwarding, session-list gating, fixed endpoint selection, and route ordering; they do not exercise a live Nest guard, real database, Firebase, or a paid AI provider. They do not prove two-account isolation against a real service.

## 7. Verification

| Command | Result |
|---|---|
| `node --test test/sec-001-ai-chat.test.mjs` | Attempted; Node's test runner failed to spawn a subprocess (`EPERM`) under this sandbox. |
| `node --test --test-isolation=none test/sec-001-ai-chat.test.mjs` | **Exit 0:** 9 tests passed, 0 failed. Covers auth ordering, mocked session revocation, fixed owner-scoped requests despite body/query/header identity spoofing, request bounds, rate-limit ordering, generic unexpected-generator error response, and actual React server rendering. |
| `npm run typecheck` | **Exit 0.** |
| `npm run lint` | **Exit 0.** |
| `npm run build` in normal sandbox after font fallback change | **Exit 1:** compile succeeded; Next TypeScript worker spawn failed with Windows `EPERM`. |
| Approved `npm run build` after font fallback change | **Exit 0:** compile, TypeScript, static page generation, and optimization completed. The separate font/build fix is recorded in [FND-002](FND-002-offline-frontend-build.md). |
| Local production Next route smoke, with `OPENAI_API_KEY` empty and `BACKEND_API_URL=http://127.0.0.1:9/api/v1` | **Exit 0:** no-auth `POST /api/v1/ai/chat` returned 401; body/query/header identity spoofing without a bearer returned 401; 17,000-byte request returned 413; synthetic bearer with unreachable local backend returned generic 503. This confirms the concrete Next route is selected instead of a rewrite and fails closed; it does not verify Nest. |
| Chrome 156 CDP UI smoke with intercepted synthetic APIs | **Exit 0:** authenticated UI rendered; hostile response remained text with no injected script/image/JavaScript link; bold formatting worked; mocked 503 displayed generic error. Three screenshots captured below. |
| Backend `npm run prisma:generate` | **Exit 0:** generated Prisma 6.19.3 client. |
| Backend `npx --no-install prisma validate` | **Exit 0:** schema valid. Prisma reports the existing `package.json#prisma` deprecation warning for Prisma 7. |
| Backend `npm run build` | **Exit 0:** prebuild generated Prisma; Nest compilation succeeded. See `D:\CareerTracker\CareerTracker-Backend\docs\implementation\FND-001-backend-build-reproducibility.md`. |
| Backend `npm test -- --runInBand --passWithNoTests` | **Exit 0:** Jest found no tests. |
| Backend `npm run lint` | **Exit 1:** `eslint` executable is unavailable in the installed backend dependencies. |
| Local environment checks | PostgreSQL service, server binary, Docker, and Podman unavailable; loopback PostgreSQL port 5432 and Nest port 4000 refused connections. No database, Nest, Firebase, or external provider request was sent; only the local Next handler was smoke-tested. |

The generated Prisma client blocker is resolved for local builds by the backend `prebuild` hook. No migration, seed, account, real student data, paid provider, or production request was used. The backend build success proves compilation only; it does not prove runtime/database readiness.

## 8. Browser screenshots

Chrome 156 was installed; Playwright, Puppeteer, and Selenium packages were not. I used Chrome's local DevTools Protocol against the actual production Next app on `127.0.0.1:3000`, with synthetic API responses intercepted in the browser. The local frontend process had `OPENAI_API_KEY` empty and `BACKEND_API_URL` pointed at the deliberately unreachable loopback port 9. No request reached Nest, PostgreSQL, Firebase, or a paid provider. The mocked refresh/profile/dashboard responses let the frontend render its authenticated UI with the synthetic name `Synthetic Student`; this is **UI evidence only**, not real authentication/session evidence.

Verification environment: Windows, Node.js 24.22.0, npm 11.19.1; both repositories had installed `node_modules`. Frontend and backend `.env` files exist. The backend database URL resolved to a loopback host on port 5432, but no PostgreSQL process/service was listening. The backend environment has AI/Firebase credential variables configured; no values were displayed or used. The frontend test process used synthetic endpoints and an empty provider key.

The mocked AI response included script markup, an event-handler image, a raw JavaScript anchor, Markdown `javascript:` link syntax, special characters, bold text, and bullets. Browser DOM checks found no injected script execution, `<img src="x">`, or JavaScript anchor. The hostile strings remained text; bold formatting rendered. A separate mocked 503 displayed the frontend's generic error alert.

| Image (relative link) | State demonstrated |
|---|---|
| [authenticated-assistant.png](../screenshots/sec-001/authenticated-assistant.png) | Running assistant UI after synthetic mock refresh/profile responses; no actual account or backend session. |
| [safe-synthetic-response.png](../screenshots/sec-001/safe-synthetic-response.png) | Actual rendered synthetic response; hostile markup is visible as text, with bold/list formatting preserved. |
| [assistant-error-state.png](../screenshots/sec-001/assistant-error-state.png) | Running assistant displays the generic error alert after a mocked 503. |

These are genuine screenshots of the running application, but their API behavior is mocked. They do not satisfy live authentication or two-account isolation acceptance criteria.

## 9. Known limitations and follow-up work

- Live integration with Nest `GET /profile`, `/auth/sessions`, `/dashboard`, `/skills`, `/roadmap`, and `/resumes` is not runtime-verified. The backend compiles, but this machine has no PostgreSQL service/binary/container runtime, no active local database, and no authorized synthetic accounts. The repository has no backend integration test suite or disposable database harness. The backend `seed.ts` fixture was not run because it writes to a database and is not a two-account isolated test setup.
- Two-user isolation and real expired/revoked-session enforcement are not verified against a live backend. Automated tests use synthetic mocked Nest responses and do not count as live integration evidence. To close this gap, provide an isolated disposable PostgreSQL service/schema and two pre-provisioned synthetic accounts, then run the manual procedure below.
- Browser captures use mocked API responses. They verify the real frontend components in Chrome, not the live login exchange, backend auth guard, session table, or AI endpoint.
- Rate limits are per-process memory and reset on restart; a later cost-control slice should choose a shared limiter and usage budget based on deployment needs.
- AI answers still use the existing prompt/provider policy and may fall back to the rule engine. This slice does not add persistence, provider evaluation, or resume analysis.
- On session expiry the Axios interceptor refreshes once and then triggers the existing central sign-out event; browser behavior is not verified.

## 10. Rollback considerations

Code-only rollback is possible by reverting this frontend slice. No database writes or schema changes are introduced by the slice. Reverting would restore the previously unauthenticated demo-context route and unsafe rendering; it should not be deployed as a security rollback without separately disabling the AI route.

## 11. Reviewer checklist

- [ ] Confirm `BACKEND_API_URL` points at the expected versioned Nest API root in each deployment.
- [ ] Start an isolated local Nest/PostgreSQL test environment and use two already-authorized synthetic accounts; verify both identities' own dashboard, skills, roadmap, and resume context only.
- [ ] Against that environment, verify missing, invalid, expired, and revoked credentials; query/body identity manipulation; malformed and oversized requests; and generic provider failure behavior.
- [x] In Chrome, inspect inert `<script>`, event-attribute, image-tag, raw-anchor, and Markdown `javascript:` output; confirm bold/list formatting with synthetic fixture data.
- [x] Capture genuine frontend screenshots for synthetic authenticated UI, safe rendering, and mocked error state; these are not live backend evidence.
- [ ] Repeat browser verification against the isolated backend with two pre-provisioned synthetic accounts.
- [x] Re-run frontend regression, typecheck, lint, and production build; verify backend Prisma generation and compilation.

### Manual live verification procedure

1. Start only an isolated development PostgreSQL database and the backend against a dedicated test schema; use two pre-provisioned synthetic student accounts authorized for testing. Do not use seed/demo or real student accounts.
2. Start the frontend with `BACKEND_API_URL` pointing at that local Nest API. Authenticate each account through the normal application login flow.
3. Send `POST /api/v1/ai/chat` as Student A and Student B. Compare each response context with that account's own `/dashboard`, `/skills`, `/roadmap`, and `/resumes`; confirm no cross-account values appear.
4. Repeat with no token, invalid token, expired token, revoked current session, and body/query/header identity set to the other account (including `X-User-Id`). Confirm 401, no context/provider request on denied auth, and no cross-user data.
5. Send malformed JSON, a body above 16 KiB, and a message above 2,000 characters; confirm 400/413. Mock a provider completion failure and confirm the grounded fallback is returned as degraded, with no provider exception detail in response or log. Separately test an unexpected generator/context failure for generic 503 behavior.
6. In a supported browser, capture authenticated assistant, synthetic hostile-format response, and unauthorized/error state screenshots. Confirm tags and URL-shaped content remain inert.

This procedure is pending prerequisites; it is not a claim that these live checks passed.

**Final SEC-001 status: PARTIAL.** Source inspection and automated regression evidence pass; live authorization, two-account isolation, and screenshot criteria remain outstanding.

No implementation commit or PR exists yet; changes are uncommitted in the frontend repository. Backend code changes are limited to the `prebuild` script; backend audit and template docs remain preserved.
