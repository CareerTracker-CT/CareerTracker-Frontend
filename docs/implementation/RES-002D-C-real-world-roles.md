# RES-002D-C — Real-World JD Robustness and Safe Scoring

**Status:** Implemented in the backend and the existing RES-UX-001 resume workspace. Backend typecheck and 74/74 tests across 13 suites pass; frontend typecheck, lint and 26/26 tests pass. Authenticated browser acceptance is **unverified** because starting the app would load real environment files, which this slice forbids.  
**Date:** 2026-11-08  
**Repositories:** `CareerTracker-Backend`, `CareerTracker-Frontend`  
**Scope:** role-boundary recognition, structural-uncertainty abstention, selection safety, compact explanations, synthetic evaluation and documentation. No authentication, schema, migration, dependency, persistence, deployment or editor work.

## 1. Why this slice exists

RES-002D-B refused an aggregate score when it found two confident positions. It still had a dangerous gap: a document could **signal** multiple positions while yielding only one or zero reliable boundaries. The old fallback treated that remaining count as `single`, so the whole document could be scored as one job. Common triggers were:

- a plural notice (“multiple openings”, “Positions: SDE-I / SDE-II”) followed by only one parseable heading;
- abbreviations such as SDE/SDET/QA/SRE that were not recognized as role terms;
- abbreviated or expanded duplicates (`SDE-I` and `Software Development Engineer I`);
- numbered vacancy tables and slash-separated position lists;
- unknown titles that were strong only because they followed an explicit `Role:` marker.

This slice closes that fallback. It also broadens recognition without treating every acronym or heading as a job.

## 2. Detection rules added

`matching/job-description-roles.ts` remains deterministic, line-bounded, in-process and capped at 12 roles. Version is now `jd-role-boundaries-1.1.0`.

### 2.1 Recognition

- **Closed abbreviation list:** SDE, SDET, QA, QE, SRE, DBA, BA, PM, TPM, UI, UX, ETL, BI, ML, AI, HR, IT, CRM, ERP, RPA, SOC, NOC, SEO, SEM. A bare token counts only when the whole line has heading shape; `QA process` and `SRE is important` do not become roles.
- **Explicit markers:** `Position 1:`, `Role:`, `Job Title:`, `Vacancy:`, `Opening:` and `Post:`. These may carry an unfamiliar title such as `Growth Hacker` because the marker is strong evidence. Locations, numeric cells, prose, process headings and non-role section words are still rejected.
- **Numbered headings:** `1. SDE-I`, including trailing vacancy columns separated by a spaced dash.
- **Vacancy table rows:** pipe/tab rows such as `1 | SDE-I | 2 | Bengaluru`. The first role-like cell is the title; header cells, numeric cells, locations and requirement cells are ignored. Serial-number columns are not treated as titles.
- **Position lists:** `Open Positions: SDE-I / SDE-II`, `Positions: Growth Hacker / Developer Advocate`, and hiring lists. Two or more title-shaped entries are a structural signal even when no block boundary can be built.
- **Canonical duplicates:** expanded forms and roman/numeric levels collapse for duplicate detection: `Software Development Engineer I` ≡ `SDE-I`; `Quality Assurance Engineer` ≡ `QA Engineer`; `Site Reliability Engineer` ≡ `SRE`. Distinct levels remain distinct (`SDE-I` vs `SDE-II`).
- **Explicit marker after a training block:** an explicit position marker overrides a stale training/about context, so `Training Program … Position: Graduate Engineer Trainee` is one job, not an empty document.

### 2.2 Structural uncertainty

`detectJobRoles` now returns `uncertainty` and content-free `signals` (labels only, never document text):

| Uncertainty | Meaning | Scoring |
|---|---|---|
| `none` | no credible multi-position signal, or two or more confidently bounded positions | normal single flow or explicit selection |
| `unreliable_boundaries` | two or more headings exist but at least one block has no qualification evidence | only a high-confidence block is selectable; low-confidence blocks are shown for review only |
| `possible_multiple` | the document announces/ lists more than one position, but fewer than two reliable boundaries were established | no role is selectable; no whole-document score |

`possible_multiple` is deliberately conservative and narrow: it requires a plural-opening phrase, two announced citeable titles, or two title-list entries. A single unfamiliar word or one unknown explicit title does **not** trigger it.

### 2.3 Selection contract

- `requiresRoleSelection` remains true for `multiple` and `ambiguous`.
- `isSelectableRole` allows every role in `multiple`, only high-confidence roles in `unreliable_boundaries`, and **no role** in `possible_multiple`.
- `roleSelection` adds `uncertainty`, `signals`, `canAnalyze`, and per-role `selectable`.
- `jobMatch.roleScope.positionStatus` distinguishes `selected`, `identified` (one title) and `no_title` (whole document analyzed without a recognized title).

## 3. Server enforcement

`POST /resumes/analyze` still:

1. extracts the documents in memory;
2. recomputes detection on the extracted JD;
3. validates any `jobRoleId` against the current document;
4. returns `{ jobMatch: null, atsReadability, roleSelection }` when selection is required and no role is supplied.

New guard: if a supplied token resolves to a role that is not selectable (`possible_multiple`, or a low-confidence ambiguous section), the endpoint returns `400` with `details.code = "ROLE_BOUNDARIES_UNRESOLVED"` and never calls the analysis service. Stale/forged tokens still return `ROLE_SELECTION_INVALID`. The client cannot force an aggregate by omitting or inventing a token.

Scoped extraction, shared-preamble inheritance, priority merging, token binding and rubric behavior are unchanged from RES-002D-B. The rubric remains `resume-jd-rubric-2.1.0`; the engine remains `resume-jd-matcher-1.4.0`.

## 4. API compatibility

All changes are additive:

- optional `jobRoleId` field unchanged;
- existing single-role `jobMatch` shape unchanged except `roleScope.positionStatus`;
- `roleSelection` keeps existing fields and gains `uncertainty`, `signals`, `canAnalyze`; each role gains `selectable`;
- `roleSelection.uncertainty` values: `none`, `possible_multiple`, `unreliable_boundaries`;
- new error code `ROLE_BOUNDARIES_UNRESOLVED` is limited to a token for an unselectable boundary;
- role segmentation version `jd-role-boundaries-1.1.0` in results and selection payloads.

## 5. Frontend behavior

`role-selection-panel.tsx` now has four explicit states:

1. **Confident multiple positions:** native radio fieldset, no preselection, “Analyze selected position”.
2. **Unreliable boundaries:** only supported sections have enabled radios; unsupported sections are visibly “not offered for scoring”; a neutral warning explains why.
3. **Possible multiple / no reliable split:** no radios and no Analyze action. The panel explains that a combined score would be unsafe, lists the generic detection signals in a disclosure, and offers “Provide a one-position description”.
4. **One identified position or no title:** no selection panel. The Overview shows either “Position identified: …” or “No position title was recognized… confirm it describes a single position.” Neither is framed as a candidate weakness.

Files remain in page memory. Re-extraction clears the previous selected token so a same-document result is never silently preselected. Changing position still clears the score immediately and keeps the files.

## 6. Evaluation

New synthetic files:

- `real-world-role.evaluation.json` — 19 development cases.
- `real-world-role-holdout.evaluation.json` — 12 untouched holdout cases.

They cover SDE-I/SDE-II, Software Development Engineer, QA/SDET/Automation, SRE/DevOps/Platform, Graduate Engineer Trainee, Associate Software Engineer, internships, campus placement, numbered vacancy tables, wrapped PDF lines, repeated/expanded headings, training modules with one position, shared qualifications, incomplete descriptions and unfamiliar explicit titles.

| Split | Cases | Role TP/FP/FN | Requirement TP/FP/FN | Contamination | Withholding | Baseline contamination | Baseline score availability |
|---|---:|---|---|---:|---:|---:|---:|
| Development | 19 | 28 / 0 / 0 | 24 / 0 / 0 | 0 | 4/4 | 16 | 18/19 = 0.947 |
| Holdout | 12 | 20 / 0 / 0 | 11 / 0 / 0 | 0 | 2/2 | 11 | 11/12 = 0.917 |
| **Total** | **31** | **48 / 0 / 0** | **35 / 0 / 0** | **0** | **6/6** | **27** | **29/31 = 0.935** |

The improved path made the correct score-availability decision in 31/31 cases. The legacy aggregate leaked 27 excluded requirement instances and exposed a score in the six cases where boundaries were unresolved. These are authored synthetic fixtures, **not** real-world accuracy estimates.

Full method and per-category notes: `RES-002D-C-evaluation.md`.

## 7. Tests and checks

| Check | Result |
|---|---|
| Backend `npx tsc --noEmit -p tsconfig.json` | exit 0 |
| Backend Jest | 13 suites, **74/74** pass |
| New `resume-analyzer-real-world-roles.spec.ts` | 8/8 pass (dev/holdout metrics, plural abstention, training/location rejection, department/project/process/acronym negatives, spaced levels/trailing vacancy columns, unsupported headings, non-global preamble) |
| Existing `resume-analyzer-multi-role.spec.ts` | 8/8 pass unchanged |
| `resumes.controller.spec.ts` | 7/7 pass, including unresolved-boundary no-score and `ROLE_BOUNDARIES_UNRESOLVED` |
| Existing JD-understanding, H2, coverage, quality suites | pass |
| Frontend `npm run typecheck` | exit 0 |
| Frontend `npm run lint` | exit 0 |
| Frontend `node --test --test-isolation=none test/*.mjs` | 26/26 pass |
| Backend lint | **Blocked / not configured:** no ESLint config or local binary; no dependency installed. Strict TypeScript and tests were used instead. |
| Browser acceptance | **Unverified:** starting Next would load real env files; no Playwright/Puppeteer. Manual steps below. |

Manual browser steps (authenticated test session only): upload a resume and a synthetic JD; verify (a) two-position JD shows radios with none preselected and only selected-role evidence after analysis; (b) `Positions: SDE-I / SDE-II` with no blocks shows no Analyze action and the one-position CTA; (c) a plural phrase with one bounded role shows the same abstention; (d) one-position JD shows the “Position identified” note; (e) title-less requirements show “No position title was recognized”; (f) keyboard Tab/Space/arrows work; (g) “Change position” clears the score and keeps files; (h) 360/768/desktop widths have no horizontal overflow.

## 8. Known limitations

- Recognition is English and rule-based. Non-English titles, rare abbreviations outside the closed list, and titles with no role-head noun can still be missed.
- A bare unknown heading is not guessed. Unknown titles are recognized only under explicit markers or in a position list.
- `possible_multiple` can withhold a score on a notice that says “multiple positions” but actually describes one; this is intentional fail-safe behavior.
- Shared inheritance remains conservative; a general requirement without global wording is excluded.
- Vacancy tables are recognized only with pipe/tab columns or numbered headings. A table flattened into unpunctuated single-space columns may remain ambiguous.
- 12-role cap and 100,000-character extraction cap remain. Truncation is flagged.
- Tokens are integrity identifiers, not secrets, and no selection is persisted.
- No numeric ATS score, candidate rating, LLM or external service was added.

## 9. Remaining work

- Larger consented/real-world and multilingual corpus; calibrated abstention precision, not just authored examples.
- Optional review UI for splitting a pasted notice into sections (not implemented; this slice asks for a one-position description instead).
- Resume builder/editor, persistence, PDF generation and AI rewriting remain out of scope.
- Browser acceptance and backend lint remain outstanding for the reasons above.

## 10. Files changed

**Backend modified**
- `src/modules/resumes/matching/job-description-roles.ts` — abbreviation/table/list detection, canonical duplicates, `uncertainty`, `signals`, `selectable`, `isSelectableRole`.
- `src/modules/resumes/matching/matching.types.ts` — `RoleScope.positionStatus`.
- `src/modules/resumes/matching/resume-analysis.service.ts` — position status metadata.
- `src/modules/resumes/resumes.controller.ts` — unresolved-boundary guard and `ROLE_BOUNDARIES_UNRESOLVED`.
- `src/modules/resumes/resumes.controller.spec.ts` — unresolved plural HTTP test.

**Backend added**
- `src/modules/resumes/matching/resume-analyzer-real-world-roles.spec.ts` — 8 tests.
- `src/modules/resumes/matching/real-world-role.evaluation.json` — 19 cases.
- `src/modules/resumes/matching/real-world-role-holdout.evaluation.json` — 12 cases.

**Frontend modified**
- `src/lib/resume-analysis.d.mts` — additive selection/scope types.
- `src/components/resume/role-selection-panel.tsx` — four states and safe actions.
- `src/components/resume/document-intake.tsx` — clears selection on re-extraction.
- `src/components/resume/analysis-overview.tsx` — identified/no-title scope notes.

**Documentation**
- This record, `RES-002D-C-evaluation.md`, `API_CONTRACT.md`, `APP_FLOW.md`, `TRD.md`, and a follow-up note in `RES-002D-B-multi-role-jd.md`.

No authentication, guard, JWT/session/cookie, database schema, migration, dependency, lockfile, environment file or deployment configuration was changed.

## 11. Viva explanation

The key production question is not “can we split every job advert?” but “when must we refuse to produce a number?” A notice can say “multiple openings” yet present only one parseable heading. Scoring the whole text then silently attributes another role’s qualifications to the candidate. RES-002D-C therefore separates **boundary evidence** from **role recognition**. Explicit markers, numbered/table rows and supported role headings create boundaries; abbreviations and canonical titles improve recognition without turning any acronym into a job. If the document announces more than one role but yields fewer than two reliable boundaries, the detector returns `possible_multiple`; the server returns no `jobMatch`, offers no token for scoring, and the UI asks for a one-position description. If two headings exist but one lacks qualification evidence, it returns `unreliable_boundaries` and only offers the supported section. If exactly one position is identified, the old whole-document path is preserved. The abstention is deterministic, explainable through generic signals, and enforced server-side, so a client cannot request an aggregate by omission or by forging a token.

## 12. Restrictions observed

No Git commit, push, merge, reset, rebase, deployment, migration or destructive operation was performed. No dependency, paid service or LLM was added. No authentication, authorization, session, cookie, CSRF, identity or database file was modified. No real `.env` file, service-account JSON, key, token, cookie or connection string was read, printed, searched, copied or changed. All fixtures are invented and in-memory; no document content is logged or persisted.
