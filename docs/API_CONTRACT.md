# 📜 API Contract Specification — CareerTracker REST API v1

This document specifies the exact JSON request/response envelope schemas, HTTP status codes, authorization mechanisms, and endpoint signatures for the CareerTracker API (`/api/v1`).

---

## 1. Global Transport Protocol & Envelopes

All API requests and responses utilize versioned JSON payloads under `/api/v1/*`.

### Success Response Envelope
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

### Error Response Envelope
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email address provided.",
    "details": [
      { "field": "email", "issue": "must be a valid email" }
    ]
  }
}
```

---

## 2. Standard HTTP Status Codes

| Code | Status | Meaning |
| :--- | :--- | :--- |
| `200` | **OK** | Request completed successfully. |
| `201` | **Created** | Resource created successfully. |
| `400` | **Bad Request** | Validation failed or invalid payload syntax. |
| `401` | **Unauthorized** | Missing, invalid, or expired access token. |
| `403` | **Forbidden** | Insufficient permissions for resource. |
| `404` | **Not Found** | Resource or endpoint does not exist. |
| `409` | **Conflict** | Resource state conflict (e.g., duplicate email). |
| `413` | **Payload Too Large** | Upload exceeds 10 MB limit. |
| `429` | **Too Many Requests** | Rate limit quota exceeded. |
| `500` | **Internal Server Error** | Unexpected backend server error. |
| `503` | **Service Unavailable** | AI or database service temporarily offline. |

---

## 3. Endpoints Contract Reference

### 🔐 Authentication (`/api/v1/auth`)

#### `POST /api/v1/auth/register`
- **Request Body**:
  ```json
  {
    "fullName": "Jane Doe",
    "email": "jane@university.edu",
    "password": "SecurePassword123!"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "e4e27b08-28a2-4e25-b7f4-1c8b16f1e429",
        "fullName": "Jane Doe",
        "email": "jane@university.edu",
        "role": "STUDENT"
      }
    }
  }
  ```

#### `POST /api/v1/auth/login`
- **Request Body**:
  ```json
  {
    "email": "jane@university.edu",
    "password": "SecurePassword123!",
    "rememberMe": true
  }
  ```
- **Response `200 OK`** (Sets `HttpOnly` cookie `ct_refresh`):
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
      "expiresIn": 900
    }
  }
  ```

#### `POST /api/v1/auth/refresh`
- **Headers**: Reads `ct_refresh` cookie automatically.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
      "expiresIn": 900
    }
  }
  ```

#### `POST /api/v1/auth/logout`
- **Auth**: optional. Accepts the `Authorization: Bearer` header, the `ct_access_token` cookie, or the
  `ct_refresh` cookie alone — so sign-out keeps working after the access token expires. Never fails
  for an expired/malformed credential. Revokes **only the calling device's** session row.
- **Response `200 OK`**: Clears both `ct_refresh` and `ct_access_token` cookies.
  ```json
  {
    "success": true,
    "data": { "status": "SIGNED_OUT" }
  }
  ```

#### `GET /api/v1/auth/sessions`
- **Auth**: required (Bearer or access cookie).
- **Device detection**: the row whose refresh cookie `{ sid }` matches the presented `ct_refresh`
  cookie is flagged `isCurrent`; without a cookie the access token's `sid` claim is used.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "f18a51c9-...",
        "device": "Windows · Chrome 141",
        "deviceKind": "desktop",
        "ipAddress": "127.0.0.1",
        "rememberMe": false,
        "createdAt": "2026-11-04T09:20:00.000Z",
        "lastUsedAt": "2026-11-04T09:41:12.000Z",
        "expiresAt": "2026-11-11T09:20:00.000Z",
        "isCurrent": true
      }
    ]
  }
  ```

#### `DELETE /api/v1/auth/sessions/:id`
- **Auth**: required; may only target your own sessions.
- **Response `200 OK`** (unknown id or another user's id → `404 SESSION_NOT_FOUND`; revoking an
  already-revoked session is idempotent):
  ```json
  {
    "success": true,
    "data": { "id": "f18a51c9-...", "status": "revoked" }
  }
  ```
- **Effect**: the revoked device's refresh cookie is dead immediately (its next `refresh` returns
  `401 SESSION_EXPIRED`); its *access token* remains valid until its own expiry (≤15 min).

#### Multi-device rotation rules
- Every login creates one `auth_sessions` row; refresh **rotation** keeps the same row (identity:
  the `sid` claim) and only swaps `jti` + `lastUsedAt`, so concurrent devices never invalidate
  each other. `expiresAt` is absolute — rotation never extends it.
- Presenting a stale `jti` (replay) is rejected with `401`; if the last rotation happened more than
  60 seconds ago the device row is **revoked outright** as an attack signal.
- Registering a new device does **not** sign out any other device.
- Each rotation re-stamps the row's device metadata (`device`, `deviceKind`, `ipAddress`) from the
  current request's `User-Agent`/IP, so labels track the client actually using the session (emulation
  toggles, browser updates, synced cookies). An unparseable UA (API clients) never overwrites a
  known label.

#### CSRF (`X-CSRF-Token`)
- A non-httpOnly `ct_csrf` cookie is issued on browser-facing GET responses and login/refresh.
- Every unsafe method (`POST`/`PUT`/`PATCH`/`DELETE`) **outside `/api/v1/auth/*`** must echo the
  `ct_csrf` cookie value in the `X-CSRF-Token` header; missing or wrong values get `403 CSRF_TOKEN_MISSING`.
- The entire `/auth/*` prefix is exempt — `/auth/login`, `/auth/firebase`, `/auth/refresh`,
  `/auth/logout`, `/auth/sessions` — the refresh cookie is same-site strict, so these requests
  cannot be forged cross-origin.

---

### 👤 Profile & User (`/api/v1/profile`)

#### `GET /api/v1/profile`
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "id": "b3f6d7a1-...",
      "college": "Stanford University",
      "degree": "B.S.",
      "branch": "Computer Science",
      "academicYear": "2025-2026",
      "semester": 7,
      "cgpa": 3.85,
      "targetRole": "Full Stack Developer",
      "targetCompany": "Google",
      "preferredStack": ["TypeScript", "Next.js", "PostgreSQL", "NestJS"],
      "studyHoursPerDay": 3.5,
      "placementTimelineMonths": 6
    }
  }
  ```

#### `PUT /api/v1/profile`
- **Request Body**: Partial update object matching profile schema.
- **Response `200 OK`**: Updated profile object.

---

### 📄 Resume System (`/api/v1/resumes`)

#### `GET /api/v1/resumes/limits`
- **Authentication**: Bearer access JWT and the active, unrevoked application session belonging to that JWT.
- **Response `200 OK`**: `{ success: true, data: { maxDocumentBytes, maxPastedJobDescriptionCharacters, maxPastedJobDescriptionBytes } }`. File bytes are the current server-configured value (at least 1 MiB and at most 5 MiB); pasted JD limits are 40,000 Unicode code points and 160,000 UTF-8 bytes.
- **Caching**: `Cache-Control: no-store, private`; the frontend keeps the limits in component memory only.
- **Authority**: the server checks actual file bytes and pasted text on every extraction/analyze request. If this limits request is unavailable, the UI uses the protocol maximum for local guidance and displays the server's authoritative validation error on submit.

#### `POST /api/v1/resumes/extract` (RES-001)
- **Authentication**: Bearer access JWT plus an active, unrevoked session belonging to that JWT's user. Requests are rate limited and bounded by a process-local concurrency cap.
- **Content-Type**: `multipart/form-data`; the browser must set the multipart boundary.
- **Fields**: `resume` (one PDF or DOCX, required, no larger than the current `GET /resumes/limits` value); and exactly one of `jobDescriptionText` (plain text, at most 40,000 Unicode code points and 160,000 UTF-8 bytes) or `jobDescriptionFile` (one PDF or DOCX, no larger than the current server limit). The two job-description sources cannot be combined. Extracted document text is capped at 100,000 characters; PDFs at 40 pages.
- **Response `200 OK`**: the usual `{ success: true, data }` envelope with `resume` and `jobDescription`, each containing `{ kind, format, text, characterCount, status, warnings }`. No score or analysis is produced.
- **File validation**: extension and detected content signature must agree. Browser-provided MIME is only a hint and may be empty or generic; the backend does not trust MIME or extension without checking the bytes.
- **Errors**: `400` invalid/missing fields, `401` missing/invalid/expired/revoked session, `413` configured file, page, expanded archive, or text limit exceeded (the response includes the active limit), `415` unsupported extension, signature mismatch, or macro document, `422` malformed, protected, empty, or unreadable document, `429` rate limit, `503` extraction capacity reached. Successful responses use `Cache-Control: no-store`.
- **Privacy**: files are handled in memory only and are neither persisted nor sent to an AI provider. The endpoint does not create a resume record. The frontend holds the preview in component memory only.

#### `POST /api/v1/resumes/analyze` (RES-002A, RES-002B, RES-002-H2, RES-002C, RES-002D-A, RES-002D-B, and RES-002D-C)
- **Authentication**: Bearer access JWT and an active, unrevoked session belonging to that JWT's user.
- **Content-Type**: `multipart/form-data`; the browser must set the multipart boundary.
- **Fields**: same source fields and parser limits as `/resumes/extract`: `resume` (one PDF/DOCX) and exactly one of `jobDescriptionText` or `jobDescriptionFile`. An optional `jobRoleId` (server-issued role token, at most 64 characters) selects one position detected in this same document. The active per-file byte and pasted text limits are returned by `GET /resumes/limits`; extracted text is capped at 100,000 characters per document and PDFs at 40 pages. Pasted length counts Unicode code points on both frontend and backend, with a separate UTF-8 byte ceiling. The multipart parser permits two text fields (JD text plus optional role token) and still rejects unknown fields.
- **Behavior**: reparses the submitted original documents with the RES-001 `DocumentExtractionService`, then performs deterministic, in-process matching. Client-submitted extracted text is not accepted. The endpoint does not write to the database, log document contents, call an AI provider, or send content to a third party.
- **Response `200 OK`**: `{ success: true, data }`, where `data` contains separate `jobMatch` and `atsReadability` sections. `jobMatch` contains `engineVersion`, `taxonomyVersion`, `rubricVersion`, `coveragePolicyVersion`, `interpretationVersion`, `roleSegmentationVersion`, `roleScope`, `score` (0-100 or `null`), `scoreUnavailableReason` when needed, `requirementCoverage`, `requirements`, per-requirement `findings` with JD and resume excerpts/evidence explanations, `matchedSkills`, `partiallySupportedSkills`, `requirementsNotDemonstrated`, `preferredSkillGaps`, `hardEligibilityConcerns`, `learningOutcomes`, and `limitations`. Requirements and review items may carry `purpose` and `sectionHeading`. `requirementCoverage` contains a `status` (`complete`, `partial`, or `none_detected`), counts of evaluated, candidate, review-needed, unsupported, ambiguous and training-outcome quantities, `excludedStatementCount`, a seven-way `statementCounts` histogram, and `items` classified as `unrecognized` or `ambiguous` with priority, original JD excerpt, explanation, recognized `concepts`, source purpose, and possible mandatory qualification flag. Counts are not confidence percentages. `atsReadability` contains `assessmentVersion`, `rubricVersion`, `status` (`partial` or `insufficient`), `score` (`null` until a validated numeric rubric is available), `scoreUnavailableReason`, `qualitativeSummary` (`text_extracted`, `text_extracted_with_findings`, or `insufficient_evidence`), `coveragePercent`, evidence-backed `checks`, and `limitations`.
- **Evidence classes**: `demonstrated`, `explicit`, `related`, `insufficient`, `not_found`, and `uncertain`. Related technologies never count as exact matches; a skill mention does not prove proficiency. “Not found” means not demonstrated in the supplied resume.
- **H2 matching rules**: relevant applied evidence in the same Experience/Projects clause takes precedence over learning-only mentions; otherwise an explicit skill mention takes precedence over learning-only evidence. Supporting excerpts are retained and deduplicated. Credential phrases are excluded from technical-skill extraction unless the JD independently asks for the skill. Certification and license qualifications carry their own credential type and required/preferred priority.
- **Multi-role selection (RES-002D-B, RES-002D-C)**: deterministic server-side detection runs before matching. Zero or one detected position keeps the existing whole-document analysis with `jobMatch.roleScope.mode = "single"`; `roleScope.positionStatus` is `identified` when a title was recognized and `no_title` otherwise. Two or more confidently bounded positions, or unresolved boundaries, return `{ jobMatch: null, atsReadability, roleSelection }`; no aggregate score is returned and no position is chosen automatically. `roleSelection` contains `version`, `required`, `ambiguous`, `uncertainty`, `signals`, `detectedRoleCount`, `truncated`, `canAnalyze`, `guidance`, `roles[]` and an optional `shared` summary. Each role has a server-issued `id` token, `title`, `index`, source `excerpt`, `confidence` (`high`/`low`), `requirementHintCount` and `selectable`. `uncertainty` is `none`, `possible_multiple` (the notice announces/lists more than one position but fewer than two reliable boundaries exist) or `unreliable_boundaries` (multiple headings, at least one without qualification evidence). `signals` are generic explanatory labels, not document text. In `possible_multiple`, `canAnalyze` and every `selectable` are false; the UI must not offer a token for scoring and asks for a one-position description. In `unreliable_boundaries`, only high-confidence blocks are selectable. The client resubmits the same documents with the chosen token in `jobRoleId`. The server validates the token against the current normalized JD and analyzes only that position's block plus statements explicitly marked as applying to all positions. `jobMatch.roleScope` reports `mode`, `positionStatus` (`selected`, `identified` or `no_title`), `selectedRole`, detected role count, included/excluded statements, excluded other-role entry statements, shared statements applied/excluded, and the inheritance rule. Invalid, stale, malformed or mismatched tokens return `400` with `details.code = "ROLE_SELECTION_INVALID"`. A token for an unresolved boundary or a low-confidence ambiguous section returns `400` with `details.code = "ROLE_BOUNDARIES_UNRESOLVED"`; the server never falls back to an aggregate. Tokens are content-bound integrity identifiers, are not persisted, and are not authentication credentials. Selection changes are not stored in the database.
- **Versions**: matching engine `resume-jd-matcher-1.4.0`; role segmentation `jd-role-boundaries-1.1.0`; skill taxonomy `skill-taxonomy-1.2.0`; coverage policy `resume-jd-coverage-1.1.0`; score rubric `resume-jd-rubric-2.1.0`; JD interpretation `jd-interpretation-1.0.0`. **JD interpretation (RES-002D-A):** the backend segments headings, lead-ins and statements, joins wrapped PDF lines, and assigns each statement a purpose (`ENTRY_REQUIRED`, `ENTRY_PREFERRED`, `ROLE_RESPONSIBILITY`, `TRAINING_OUTCOME`, `SECTION_HEADING`, `INFORMATIONAL`, `AMBIGUOUS_REQUIREMENT`). Headings, informational prose and training outcomes are excluded from entry-qualification review and counted separately; training concepts are returned as `learningOutcomes` and never scored. Ambiguous statements remain unresolved and prevent a score. All fields are additive; existing paths, upload fields and field meanings are unchanged.
- **Requirement coverage and score availability**: the extractor separates supported structured requirements from potentially relevant unsupported statements and recognized-but-ambiguous statements. Unsupported statements are not assigned resume evidence and are not treated as met or missing. If any review item is present, `score` is `null`; review excerpts and required/preferred priority remain visible, and explicitly required qualification-like items are marked separately for review. This conservative abstention gate uses no confidence percentage or partial-coverage threshold. `none_detected` means the detector found no usable requirement; it does not imply full JD understanding.
- **Score rubric `resume-jd-rubric-2.1.0`**: when coverage is complete and both inputs are readable, required requirements have weight 2; preferred and unspecified requirements have weight 1. Evidence values are demonstrated 1.00, explicit mention 0.75, related 0.25, insufficient/familiarity 0.10, uncertain/not found 0.00. The score is the nearest integer of weighted evidence divided by total weight times 100. Duplicate canonical requirements are merged. No score is returned if either input is empty, no supported requirements can be extracted, or any statement needs review. The evidence weights and formula are unchanged from rubric 1.0.0; version 2.1.0 versions the purpose-aware score-availability rule (headings, informational text and training outcomes are excluded, while unsupported or ambiguous entry qualifications still withhold the score). Explicit mandatory education, certification and experience concerns remain separately identifiable.
- **Limitations**: this is a deterministic resume-evidence summary, not an employer ATS score, hiring/shortlisting probability, or certified proficiency assessment. Requirement coverage is a bounded rule-based detector, not proof that all JD statements were understood. Unknown names, complex compounds and implicit requirements can still be missed; some soft-skill or responsibility statements may be surfaced for review. Role recognition is English and rule-based: the closed abbreviation list covers common engineering titles, but non-English titles, rare abbreviations and unknown bare headings can be missed. A plural notice with fewer than two reliable boundaries is deliberately withheld rather than scored as one job; a truly single-position notice that uses plural wording can therefore require the user to supply a one-position description. Employment dates are never used to infer years of experience.
- **Controls**: 5 requests per minute, active-session guard, bounded multipart parser and process-local concurrency cap, `Cache-Control: no-store, private`, `Pragma: no-cache`, and 200 response. Failures follow the RES-001 error categories for request/auth/parser/rate/capacity errors.

#### RES-002B scoring hardening (`ats-readability-rubric-2.0.0`)
- This is a qualitative, deterministic parser-evidence report, not an official ATS vendor score or hiring probability. It is independent of JD matching and is not persisted. The API keeps `score: null` until evidence and a representative labeled evaluation support a fair numeric metric.
- `qualitativeSummary` states whether sufficient text was extracted and whether evidence-backed findings were observed. Confirmed parser issues (`issue`), uncertain structure signals (`warning`), successful checks (`passed`), and unsupported checks (`not_evaluated`) remain distinct.
- `coveragePercent` measures available parser-check capability, not document quality. The intended check weights are meaningful text (30), encoding (15), extraction signals (20), DOCX structure (15), and visual reading order (20). The current coverage is 65% for PDF (DOCX structure and visual order unsupported) and 80% for DOCX (visual order unsupported). Unsupported weights are excluded from coverage and never become passes, defects, or score deductions. No quality score is normalized from the evaluated subset.
- Fewer than 40 Unicode letters/numbers yields `status: insufficient` and `qualitativeSummary: insufficient_evidence`; no number is returned. A scanned/empty PDF remains a RES-001 extraction error with no assessment.
- PDF page text counts identify pages with no selectable text but cannot distinguish blank pages from image-only/unsupported content. PDF columns, tables, headers/footers, images, and reading order are not reliably inspected. DOCX XML exposes tables, multi-column sections, drawings/image parts, and populated header/footer parts; structure presence is generally a warning, not proof of ATS incompatibility. Mammoth omits header/footer parts from its raw-text output, so non-empty parts are reported as confirmed omissions from this analysis input. Neither parser predicts a particular employer ATS result.
- No OCR, external service, schema change, or new dependency is used.

---

### 📊 Dashboard & Readiness (`/api/v1/dashboard`)

#### `GET /api/v1/dashboard`
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "readinessOverall": 78,
      "atsScore": 84,
      "streakDays": 14,
      "targetRole": "Full Stack Developer",
      "topSkillGaps": [
        { "name": "NestJS Architecture", "currentLevel": 4, "requiredLevel": 8 }
      ],
      "todayTasks": [
        { "id": "task_12", "title": "Build NestJS JWT Guard", "progress": 50 }
      ]
    }
  }
  ```

---

### 🗺️ Learning Roadmap (`/api/v1/roadmap`)

#### `POST /api/v1/roadmap/generate`
- **Response `200 OK`**: Renders generated roadmap phases and tasks.

#### `PATCH /api/v1/roadmap/task`
- **Request Body**:
  ```json
  {
    "taskId": "task_12",
    "status": "COMPLETED",
    "progress": 100
  }
  ```
- **Response `200 OK`**: Updated task object & recalculated readiness score.

---

### 🤖 AI Career Coach (`/api/v1/ai/chat`)

#### `POST /api/v1/ai/chat`
- **Authentication**: Requires the application's existing `Authorization: Bearer <access JWT>`. The Next route verifies the token with the protected Nest `/profile` endpoint and confirms the current device session through `/auth/sessions` before loading context or invoking an AI provider.
- **Context ownership**: The route fetches dashboard, skills, roadmap and resume context through authenticated Nest endpoints using the same bearer token. Client-supplied user IDs are ignored; chat context is scoped by the backend-authenticated principal. The route does not use the frontend demo seed or Drizzle queries.
- **Limits**: JSON request body up to 16 KiB; `message` is 2–2,000 characters. A process-local 20-request/minute bucket is keyed by verified user ID.
- **Request Body**:
  ```json
  {
    "message": "What should I learn today to prepare for Google interviews?"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "answer": "Based on your 78/100 readiness score and target role Full Stack Developer...",
      "provider": "openai",
      "model": "gpt-5.5",
      "degraded": false,
      "groundedIn": [
        "Readiness 78/100",
        "Resume ATS 84",
        "Top gap: NestJS Architecture"
      ],
      "followUps": ["What skill gap should I close first?"]
    },
    "meta": {
      "provider": "openai",
      "model": "gpt-5.5",
      "generatedAt": "2026-11-04T00:00:00.000Z"
    }
  }
  ```
- **Errors**: `400` invalid message, `401` missing/invalid/expired/revoked session, `413` request body too large, `429` per-user limit, generic `503` when authenticated context or the route is unavailable. The configured provider adapter falls back to the deterministic grounded response if its completion fails and marks it degraded. Responses use `Cache-Control: no-store`.
- **Rendering**: The browser treats answer content as text, simple paragraphs, bullet lists and `**bold**` markers. Model HTML and URLs are not converted to active markup or links.

---

### 📁 Private Resume Library (`/api/v1/resumes/library`) — RES-003A

All endpoints require `JwtAuthGuard` + `ActiveSessionGuard`. Ownership is derived from the authenticated principal; the client never sends a user id. Responses use `Cache-Control: no-store, private`.

**Relationship to `GET /api/v1/resumes`:** that endpoint stays the analyzer's upload history and returns only records that have a stored file (`storageKey IS NOT NULL`). Structured library records are never returned there, so its `ResumeRecord` shape (`fileSizeBytes`, `mimeType`) remains accurate. Use the endpoints below for library records; the two lists are disjoint by construction.

#### `GET /api/v1/resumes/library`
- **Response `200 OK`**: `{ success: true, data: [ ResumeLibraryRecord ] }` — own resumes, newest-updated first.

#### `POST /api/v1/resumes/library`
- **Request Body**: `{ name, targetRoleLabel?, content }`.
- **Response `201 Created`**: `{ success: true, data: ResumeLibraryDetail }` — created resume with version 1.
- **Errors**: `400 RESUME_NAME_INVALID`, `400 RESUME_CONTENT_INVALID`, `400 RESUME_CONTENT_TOO_LARGE`, `409 RESUME_LIMIT_REACHED`.

#### `GET /api/v1/resumes/library/:id`
- **Response `200 OK`**: `{ success: true, data: ResumeLibraryDetail }`.
- **Errors**: `404 RESUME_NOT_FOUND`.

#### `GET /api/v1/resumes/library/:id/versions`
- **Response `200 OK`**: `{ success: true, data: [ ResumeVersionSummary ] }` — newest first.
- **Errors**: `404 RESUME_NOT_FOUND`.

#### `GET /api/v1/resumes/library/:id/versions/:versionNumber`
- **Response `200 OK`**: `{ success: true, data: ResumeVersionDetail }`.
- **Errors**: `400 RESUME_VERSION_INVALID`, `404 RESUME_NOT_FOUND`, `404 RESUME_VERSION_NOT_FOUND`.

#### `POST /api/v1/resumes/library/:id/versions`
- **Request Body**: `{ expectedRevision, targetRoleLabel?, content }`.
- **Response `201 Created`**: `{ success: true, data: ResumeLibraryDetail }` — updated resume with new current version.
- **Errors**: `400 RESUME_CONTENT_INVALID`, `400 RESUME_CONTENT_TOO_LARGE`, `404 RESUME_NOT_FOUND`, `409 RESUME_VERSION_LIMIT_REACHED`, `409 RESUME_EDIT_CONFLICT` (includes `currentRevision` and `currentVersionNumber`).

#### `PATCH /api/v1/resumes/library/:id`
- **Request Body**: `{ name }`.
- **Response `200 OK`**: `{ success: true, data: ResumeLibraryRecord }`.
- **Errors**: `400 RESUME_NAME_INVALID`, `404 RESUME_NOT_FOUND`.

#### `POST /api/v1/resumes/library/:id/duplicate`
- **Request Body**: `{ name?, targetRoleLabel? }`.
- **Response `201 Created`**: `{ success: true, data: ResumeLibraryDetail }` — new resume with version 1 copied from the source's current version.
- **Errors**: `400 RESUME_NAME_INVALID`, `404 RESUME_NOT_FOUND`, `409 RESUME_LIMIT_REACHED`.

#### `DELETE /api/v1/resumes/library/:id`
- **Response `200 OK`**: `{ success: true, data: { removedId, name } }`.
- **Effect**: private version content and findings are deleted; the resume row is soft-deleted.
- **Errors**: `404 RESUME_NOT_FOUND`.

#### Structured content (schema v2)
- Stored as validated JSON in `ResumeVersion.content`; raw files are never stored by the library.
- Supported fields: optional contact block, optional summary, ordered education, ordered experience with bullets, ordered projects with technologies, ordered skills, ordered certifications, ordered extra sections with lines.
- **`layout` (optional, schema v2)**: `{ pageSize?: "A4" | "LETTER", sectionOrder?: SectionKey[] }`, where `SectionKey` is one of `summary`, `education`, `experience`, `projects`, `skills`, `certifications`, `sections`. At most seven keys, no duplicates, no unknown keys or page sizes; an empty order is treated as absent. Unlisted sections render after the listed ones in default order, and sections without content are not rendered.
- Validation is strict: unknown keys rejected at every level, per-field and per-array caps enforced, serialized content capped at 64 KB.
- Quotas: 50 resumes per user, 100 versions per resume.
- Content-schema version is tracked per version (`contentSchemaVersion`); new saves record `2`, and schema v1 documents (no `layout`) remain readable.

#### Concurrency
- Saves carry the `expectedRevision` the tab loaded; the server atomically increments `revision` only if it still matches, otherwise returns `409 RESUME_EDIT_CONFLICT` with the current revision.
- Duplicate version numbers are prevented by a unique `(resumeId, versionNumber)` constraint plus a transactional pre-check.
