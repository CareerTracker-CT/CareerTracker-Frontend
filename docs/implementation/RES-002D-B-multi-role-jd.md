# RES-002D-B — Multi-Role JD Detection, Explicit Selection and Isolated Matching

**Status:** Implemented in the backend and the RES-UX-001 workspace. Backend typecheck and all 65 tests pass; frontend typecheck, lint and 26 tests pass. Authenticated browser acceptance remains unverified because starting the app would load real environment files, which this slice forbids.  
**Date:** 2026-11-08  
**Repositories:** `CareerTracker-Backend`, `CareerTracker-Frontend`  
**Scope:** JD interpretation, role selection contract, role-scoped matching, and the existing resume workspace. No authentication, database schema, migration, dependency, persistence, or deployment change.

> **Follow-up (RES-002D-C):** this record describes the RES-002D-B baseline. RES-002D-C closes the unresolved-boundary fallback, adds abbreviations/table/list recognition and canonical duplicate handling, adds `possible_multiple`/`unreliable_boundaries` abstention, and expands the synthetic corpus to 19 development + 12 holdout cases. See `RES-002D-C-real-world-roles.md` and `RES-002D-C-evaluation.md` for the current rules, metrics and limitations. The RES-002D-B metrics below remain a historical record of that slice.

## 1. Existing failure and root cause

A notice describing several positions was interpreted as one qualification set.

- `matching/jd-segmentation.ts` (`segmentJobDescription`) walks the document linearly with one mutable `section` and one `heading`. A second position's heading replaces the heading label, but no role boundary exists; lines after it inherit the previous section.
- `matching/jd-statement-classifier.ts` (`classifyStatement`) sees only the current section/heading and lexical cues, so it cannot tell which advertised position a statement belongs to.
- `matching/job-requirements-extractor.ts` (`interpret`) merges every recognized skill/education/experience/certification into one `Map` keyed by canonical ID. `merge` keeps the highest priority seen and unions source excerpts. Requirements from independent positions therefore collapse together; a skill required by one position can become required for the whole notice.
- `matching/requirement-coverage.detector.ts` produces review items per statement with no role ownership.
- `matching/resume-analysis.service.ts` (`analyze`) computes one denominator and one score across that merged map, and one set of gaps/eligibility concerns.

Reproduced with synthetic multi-role fixtures before the fix: the legacy aggregate leaked 4 cross-position requirement instances in the 8 development cases and 7 in the 6 holdout cases (11 total), and produced the wrong score-availability decision in 4/8 development and 2/6 holdout cases (see the evaluation record).

## 2. Implemented behavior

1. `POST /resumes/analyze` extracts the JD as before, then runs deterministic role detection on the extracted text.
2. **No position or exactly one position:** the whole-document analysis runs exactly as before. No selection step is added; `jobMatch.roleScope.mode` is `"single"` and existing fields are unchanged.
3. **Two or more confident positions:** the endpoint returns `jobMatch: null` plus a typed `roleSelection` object. The server does not choose a role and does not calculate an aggregate score. ATS readability is still assessed because it is independent of the JD.
4. **Ambiguous boundaries:** the response is the same typed selection state with `roleSelection.ambiguous: true`, candidate sections for review, and guidance to choose a position or supply a single-position description. No apparently reliable aggregate score is returned.
5. **Selected role:** the client submits the server-issued `jobRoleId` token with the same resume/JD. The backend recomputes detection and validates the token against the current document before extracting only that role's qualifications, its preferred qualifications, its responsibilities/training distinctions, and explicitly global shared statements.
6. The result carries `roleScope` with the selected identity, detected role count, statements included/excluded, shared statements applied/excluded, and the inheritance rule. The frontend keeps the selected role visible above the tabs and never shows another role's requirements as evaluated.
7. Changing the selection clears the previous score immediately and reopens the compact selection panel without asking for the files again. The files remain in browser memory; re-analysis resends them to the stateless endpoint.

## 3. Role-boundary algorithm

`matching/job-description-roles.ts` implements `detectJobRoles(text)`. It is deterministic, linear in lines, bounded to 12 roles, and uses no LLM, network call, or new dependency.

1. **Normalize and offset:** reuse `normalizeJobDescriptionText`, split physical lines, and retain exact character offsets. Bullet glyphs are stripped for recognition, not for source offsets.
2. **Candidate headings:**
   - explicit markers: `Position 1:`, `Role —`, `Job Title:`, `Vacancy:`, `Opening:`, `Post:`;
   - numbered position headings (`1. Frontend Developer`);
   - standalone title-case role headings containing a role-head noun (developer, engineer, designer, analyst, architect, administrator, specialist, consultant, manager, scientist, technician, programmer, intern, trainee).
3. **False-positive rejection:** section headings (requirements, qualifications, responsibilities, about, benefits, selection/hiring/application/interview process, training/curriculum/modules, department/team/project/program, career progression) are rejected. Module/week/session lines are rejected. Lines with prose verbs, sentence punctuation, colons, arrows/career ladders, or more than seven title words are rejected. Candidates inside a training, selection-process, or company-overview context are rejected.
4. **Structural support:** a role block is the text from its heading to the next distinct role heading. It must contain recognized skill vocabulary or qualification wording for the role to count as high confidence. This prevents department or project names from becoming roles.
5. **Repetition:** identical normalized titles are not counted twice and do not split a role. Repeated listings for the same title remain one position.
6. **Status:** one role → `single`; two or more roles with at least two high-confidence blocks → `multiple`; two or more candidates with fewer than two supported blocks → `ambiguous`.
7. **Shared preamble:** text before the first position is returned separately. A preamble heading matching “General/Common/Shared requirements”, “All positions/roles”, or “Requirements for all” marks its following statements as explicitly global. A statement elsewhere is global only when its own wording says all/every/any positions or candidates, regardless of role, or common to all.
8. **Server identity:** each candidate gets a 32-hex SHA-256 token over the normalized document, role index, title, start and end offsets. Any JD edit changes the token. Tokens are integrity identifiers, not authentication secrets and not persisted.

## 4. Attribution and shared-qualification rules

For a selected role, a statement is included only when:

- its source offset is inside the selected role block; or
- it explicitly says it applies to all/every position or candidate; or
- it sits in the preamble under an explicit general/all-positions heading.

A statement inside another role's block is excluded even if it contains a vocabulary term. The selected role's heading line is excluded as a boundary; this was necessary because “Test Automation Engineer” contains the taxonomy concept `test-automation`. Priorities are merged only within the selected scope, so React can be required for the frontend role and preferred for the backend role. Unsupported/ambiguous statements in the selected role still create review items and still withhold the score under rubric 2.1.0. Training outcomes remain separate and are never scored. A non-global preamble requirement is not inherited by any position; the selection payload states this.

## 5. API compatibility

`POST /resumes/analyze` keeps all existing fields and adds:

- optional multipart text field `jobRoleId` (≤64 characters, server-issued token); the bounded parser now permits two text fields instead of one, and the controller still rejects every unknown field;
- `data.jobMatch: null` plus `data.roleSelection` only when selection is required;
- `jobMatch.roleSegmentationVersion: "jd-role-boundaries-1.0.0"` and `jobMatch.roleScope`;
- `data.roleSelection` echo on a successful selected-role analysis so “Change position” needs no extra round trip.

`roleSelection` includes `version`, `required`, `ambiguous`, `detectedRoleCount`, `truncated`, `guidance`, `roles[]` (`id` token, title, index, excerpt, confidence, requirement-hint count), and an optional shared-context summary. Invalid, malformed, stale, truncated, or mismatched tokens return `400` with `details.code = "ROLE_SELECTION_INVALID"`; the server never falls back to the first role or to an aggregate. Existing single-role clients receive the prior response shape plus additive fields. Engine version is now `resume-jd-matcher-1.4.0`; the score formula and rubric `resume-jd-rubric-2.1.0` are unchanged.

No second analysis engine or endpoint was introduced. No database schema or persistence change was made.

## 6. Frontend experience

`role-selection-panel.tsx` is a compact panel inside the existing document section, after the extracted-document summary. It contains:

- a heading and guidance explaining why selection is required;
- a native radio fieldset named `job-role`, keyboard operable with arrow keys and labelled cards showing title, detected/possible confidence, source excerpt and qualification-line count;
- an ambiguity warning when boundaries are uncertain, explicitly stating that no combined score is produced;
- a shared-preamble note when general statements exist;
- `Analyze selected position` (disabled until a choice) and `Use a different job description`.

No role is preselected on first presentation. The panel uses no animation, keeps the RES-UX-001 tokens and compact density, stacks on mobile, and does not nest scroll regions. `DocumentIntake` retains files, extraction, tab state and the selection list in memory. Selecting and analyzing keeps the chosen position visible in a “Position analyzed” bar above the tabs, with the number of excluded positions and an ambiguity caveat when relevant. `Change position` clears the score and analysis immediately, keeps the files and candidates, and returns to the selection panel. The Overview method disclosure reports role scope, excluded other-role statements and applied shared statements.

If the client receives a selection response, the generic “Analyze resume against this job” action is replaced by the panel's explicit action, so the user cannot accidentally request an aggregate.

## 7. Security and privacy

- The backend remains authoritative for detection, tokens, scope and scoring. Client text, offsets, titles and indices are never trusted.
- Tokens are validated against the exact normalized JD processed in the same request; stale tokens after an edit are rejected.
- Parsing stays within the existing 100,000-character extracted-text cap, 40-page/5 MiB document limits, two-file/field bounds, rate limits and process-local concurrency cap.
- No JD or resume content is logged. No selection is stored in the database, cookie, or localStorage.
- Authentication, guards, CSRF, cookies, JWT issuance, sessions and revocation were not modified.
- No environment file, credential, key, service-account file or database connection string was read, printed, searched or changed.

## 8. Evaluation summary

Two synthetic labeled files are used: 8 development cases and 6 holdout cases (14 total), plus a generated 500-bullet two-position load case. Labels cover 22 roles, 23 selected-scope requirement keys, 2 shared requirements, 1 ambiguous notice, 3 single-role documents, 2 no-role documents, training modules, repeated titles, wrapped lines, Unicode bullets, overlapping vocabularies, different priorities, unknown qualifications and no-title input.

Both sets score 1.00 role precision/recall, 1.00 requirement attribution precision/recall, zero cross-role contamination, correct shared attribution, and 14/14 score-availability decisions. The legacy aggregate baseline leaked 4 excluded requirements in development and 7 in holdout and made the wrong score-availability decision in 4/8 and 2/6 cases respectively. This is a small synthetic corpus, not production accuracy evidence.

Full metrics and per-case notes: `RES-002D-B-multi-role-evaluation.md`.

## 9. Tests and verification

| Check | Result |
|---|---|
| Backend `npx tsc --noEmit -p tsconfig.json` | exit 0 |
| Backend Jest, all suites | 12 suites, 65/65 tests pass |
| New `resume-analyzer-multi-role.spec.ts` | 8/8 pass (dev, holdout, cross-role negative, shared inheritance, token staleness, single-role regression, training, large input) |
| `resumes.controller.spec.ts` | 6/6 pass, including selection-required response, token round trip and stale-token 400 |
| Existing JD-understanding / H2 / coverage / quality evaluations | unchanged and passing |
| Frontend `npm run typecheck` | exit 0 |
| Frontend `npm run lint` | exit 0 |
| Frontend `node --test --test-isolation=none test/res-ux-001-resume-workspace.test.mjs` | 10/10 pass |
| Existing SEC-001 and login-error tests | 16/16 pass |
| Backend lint | **Blocked / not configured:** the backend has a `lint` script but no ESLint config or local ESLint binary; no dependency was installed. TypeScript strict compile and tests were used instead. |
| Browser acceptance (selection, mobile, keyboard, change-role) | **Unverified:** starting Next would load real env files; Playwright/Puppeteer are not installed. Manual steps below. |

Manual browser steps: authenticate in a test session; upload a resume and the three-position synthetic JD; confirm the selection panel appears with no preselection; use Tab/Space/arrow keys to choose; analyze; confirm only the chosen position's requirements appear and the header names it; use “Change position” and confirm the score disappears before re-analysis; open Review extracted text and confirm files survive; test at 360 px, 768 px and desktop widths.

## 10. Known risks

- Role-title recall is bounded by English titles containing a role-head noun. Abbreviations such as SDE, SRE or QA, and non-English titles, may be missed; the document is then analyzed as a single role. This is a false negative, not an aggregate multi-role score, but it can still over-scope requirements.
- Explicit position markers are the strongest signal. A document with section-only headings that never names positions is treated as single-role.
- Ambiguous detection is heuristic. Bare title lists can be flagged ambiguous even when a human sees separate blocks; selection still requires confirmation.
- Shared inheritance is deliberately conservative. A genuine general requirement without global wording will be excluded rather than silently applied to every role.
- Only 14 synthetic labeled cases exist. Precision/recall on real notices is unknown.
- Tokens prevent stale/mismatched selection and accidental index reuse; they are not a security boundary and do not encrypt content.
- More than 12 candidates are truncated and flagged; the UI must surface that flag (it currently shows the count and the backend `truncated` value is available for a future warning).
- The ATS inspection remains independent and unchanged; no numeric ATS score or hiring prediction was added.
- No role selection is persisted, so a page refresh restarts the flow.

## 11. Remaining work

- **RES-002D-C:** broaden JD understanding and evaluation on a larger, reviewed corpus (including real notices with consent), add abbreviation/title synonyms and multilingual title handling, refine ambiguous-boundary confidence, and decide whether role selection should be persisted with a saved analysis. Current slice deliberately does not persist selections.
- **Resume builder:** Overleaf-style editing, storage of versions and analyses, AI rewriting and export remain excluded. Multi-role scoping provides the prerequisite for building a resume against one selected position without contaminating it with other roles' requirements.

## 12. Files

**Backend added**
- `src/modules/resumes/matching/job-description-roles.ts` — detection, tokens, selection payload.
- `src/modules/resumes/matching/resume-analyzer-multi-role.spec.ts` — evaluation and negative tests.
- `src/modules/resumes/matching/multi-role.evaluation.json` — 8 development cases.
- `src/modules/resumes/matching/multi-role-holdout.evaluation.json` — 6 holdout cases.

**Backend modified**
- `matching/jd-interpretation.types.ts` — role-scope summary on interpretation.
- `matching/job-requirements-extractor.ts` — scoped extraction, shared inheritance, role-heading exclusion.
- `matching/matching.types.ts` — `RoleScope`, `roleSegmentationVersion`.
- `matching/resume-analysis.service.ts` — scope pass-through, role metadata, engine version 1.4.0.
- `resumes.controller.ts` — optional `jobRoleId`, selection response, token validation.
- `resumes.controller.spec.ts` — HTTP selection/stale-token coverage.
- `document-files.interceptor.ts` — bounded field count raised from 1 to 2 for the optional role token.

**Frontend modified**
- `src/lib/resume-analysis.d.mts` — role selection/scope/analyze-response types.
- `src/components/resume/document-intake.tsx` — selection state, scoped analyze call, results header, change-role flow.
- `src/components/resume/analysis-overview.tsx` — role scope/version in method details.

**Frontend added**
- `src/components/resume/role-selection-panel.tsx`.

**Documentation**
- This record, the evaluation record, `docs/API_CONTRACT.md`, `docs/APP_FLOW.md`, `docs/TRD.md`.

No authentication, schema, migration, lockfile, dependency, environment or unrelated team file was changed.

## 13. Viva explanation

No viva document existed in the repository, so this section is the viva reference.

A job advert is not necessarily one job. If the analyzer combines three positions, it can make a candidate look under-qualified for a role they never applied for, or inflate a requirement's priority because another role marked it required. RES-002D-B therefore separates **document scope** from **candidate scope**. The server first detects position boundaries using explicit position markers and structurally supported role headings, rejecting training modules, departments, projects and selection-process headings. If it finds multiple positions, it refuses to score and returns a typed selection state. The student chooses one advertised position; the server validates a content-bound token and re-runs extraction over only that position's block plus statements explicitly marked for all positions. React required for the frontend role can therefore remain preferred for the backend role, and the backend score cannot include frontend gaps. If boundaries are ambiguous, the system says so and still refuses an aggregate score. This is a conservative, explainable rule system: it prefers withholding a score or asking the student over inventing a boundary or a combined result.

## 14. Restrictions observed

No Git commit, push, merge, reset, rebase, deployment or migration was performed. No dependency or paid service was added. No authentication file, guard, token, cookie, session or database schema was modified. No real `.env` file, service-account JSON, private key, credential, token or connection string was read, printed, copied or searched. Browser and live Firebase/Supabase/database checks were not run. The only environment-shaped verification used is TypeScript and Jest with synthetic in-memory fixtures.
