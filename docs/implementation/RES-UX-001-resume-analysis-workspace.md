# RES-UX-001 — Compact Professional Resume Analysis Workspace

**Status:** Implemented; typecheck, lint and isolated tests pass. Browser and screenshot verification not performed (blocked by the environment-file boundary and missing browser-automation packages).  
**Date:** 2026-11-08  
**Repository:** `CareerTracker-Frontend`  
**Scope:** Frontend UX only. No backend, matching-engine, authentication, schema, migration, dependency, or persistence changes.

## 1. Objective and outcome

The analyzer previously rendered one long vertical report: intake form, two large extracted-text previews, summary metrics, unresolved statements, priority gaps, every requirement detail, every ATS check group, ATS limitations, job-match limitations, and version history in sequence. The replacement keeps the same API calls and analysis data but reorganises it into:

1. A full intake form before analysis.
2. A compact document summary bar after extraction, with the extracted text moved into a bounded drawer.
3. Three accessible analysis views — Overview, Requirement evidence, Document inspection — that are not stacked down the page.
4. A visibly separate saved-records section that never implies the temporary analysis was saved.

No matching, classification, scoring or API behaviour changed.

## 2. Part A — inventory before the change

**Rendering tree (before):** `src/app/resume/page.tsx` → `PageHeader`, `DocumentIntake` (all analyzer state and rendering), then a version-history section using `useResumes()`.

`DocumentIntake` owned: resume file, JD file, pasted JD text, JD source toggle, extraction result, analysis result, error, busy, drag state and server limits. It rendered, in order: upload form; extract/analyze actions; full extracted text for both documents in `<pre>`; job-match score panel with five counts; coverage note; partial-coverage notice; priority gaps; hard-eligibility concerns; unresolved review items in two `<details>` groups; every requirement as a `<details>` row; training outcomes; ATS readability as a `<details>`; job-match limitations; temporary-data note.

**API types:** local `ExtractionResult`, `AnalysisResult`, `Finding`, `RequirementReviewItem`, `LearningOutcome` and `StatementPurpose` types matched `docs/API_CONTRACT.md` (`/resumes/extract`, `/resumes/analyze`). The analysis response nests `jobMatch` and `atsReadability`, with additive `requirementCoverage` counts, `statementCounts`, purposes, `learningOutcomes` and parser checks.

**Reused primitives and tokens:** `Badge`, `PageHeader`, `AppShell`, the `label-caps` micro-label, navy/warm/rule/paper tokens, `.field`, `.btn-base`, `cn()`, existing focus-visible and reduced-motion rules. No component-library dependency was added.

**What already worked and was preserved:** PDF/DOCX resume and JD upload; pasted JD text; limits from `GET /resumes/limits`; extract-then-analyze flow; server-authoritative error messages; error/empty/partial states; score-unavailable explanation; unresolved requirement disclosure; training-outcome separation; ATS check statuses and limitations; saved version history from `<Resumes>` (read-only list). Authentication and protected resume endpoints were untouched.

## 3. Implemented user flow

### 3.1 Document intake and text review

- Before extraction, the complete input interface is shown: resume drop/choose zone, JD source toggle, pasted-text counter with the Unicode code-point limit, JD file choose/replace/remove.
- After extraction, the interface collapses to a compact summary bar showing each document's name, format, size, extracted character count, and warning count, plus `Review extracted text`, `Edit inputs`, and (after analysis) `Analyze again`.
- `Review extracted text` opens a right-side dialog with separate Resume / Job description selectors and one bounded, keyboard-focusable reading region (`pre-wrap`, `break-words`, no horizontal overflow). Warnings are listed above it. Escape, the close button, the backdrop, and a Tab trap close or contain the dialog; focus returns to the trigger.
- `Edit inputs` reopens the full fields inline without discarding anything merely by opening them. Changing a file, pasted text, or JD source clears extraction and analysis explicitly, with copy that says so.
- The extracted text is never rendered in the main result flow, so opening tabs cannot disclose it accidentally.

### 3.2 Overview

- Shows the weighted evidence score only when the API returns a finite number. A `null` score renders an em dash, the heading "No overall score is shown", and the server's reason. Null is never converted to zero.
- Five separate counts: requirements evaluated, demonstrated or mentioned, missing or insufficient, unresolved, training outcomes excluded. Counts are labelled as detection results, not confidence percentages.
- Coverage status and an honest status sentence, including the conservative abstention rule when statements are unresolved.
- The principal unresolved issue is promoted above priority gaps, with its JD excerpt and a `Review this requirement` action that switches to the evidence view, applies the matching state filter, opens the exact row, scrolls it into view and focuses its summary. A second action opens all unresolved rows.
- Up to five required qualifications without clear evidence, each linking to its evidence row, with the explicit note that a gap means evidence was not found and not that the capability is absent. Hard-eligibility/credential items are surfaced separately when not already listed.
- Key actions use only the API's truthful suggestions, with a note never to add unsupported skills.
- Method versions and job-match limitations live in a collapsed disclosure.

### 3.3 Requirement evidence

- Search across requirement names, concepts, categories, explanation, exact JD excerpts, resume excerpt sections and text, and evidence state.
- State filter chips: All, Demonstrated, Mentioned only, Partial or related, Not demonstrated, Not evaluated, with counts. Empty states are omitted from the chip row.
- Rows are grouped by evidence state, collapsed by default, and expandable to show the exact JD excerpt(s), exact resume excerpt(s) with their section, the classification explanation, role-context note, recognized concepts, and the truthful suggestion.
- "Not demonstrated" and "Not evaluated" use different labels, colours and explanatory copy. Unresolved statements are never presented as missing requirements.
- Live result count (`Showing X of Y requirements`) and a clear-filter action.

### 3.4 Document inspection

- Qualitative extraction summary, parser status, check coverage, rubric version and finding count. Coverage is described as available parser capability, not document quality.
- Confirmed findings and warnings are separate lists with evidence, explanation and recommendation.
- Unsupported checks are grouped by shared explanation, each group expandable and listing every affected check once. Repeated limitation paragraphs are deduplicated with `uniqueStrings`.
- Passed checks are collapsed under their own disclosure.
- A persistent notice explains why no numeric ATS score exists; unsupported weights are not turned into passes or defects.

### 3.5 Saved resume history

The saved-records section remains below the analyzer, separated by a rule and explicit copy: version history comes from the existing saved library and the analysis above does not create, save or update records. Its loading, error, retry, empty and `isCurrent` rendering are unchanged. No fake saved analysis records or new persistence were added.

### 3.6 State preservation and navigation

- Files, extraction, analysis, active view, editing state and drawer state live in `DocumentIntake`. Switching tabs only changes the view; it never clears inputs or results.
- Panels remain mounted and use the `hidden` attribute, so search, filter and disclosure state survive tab switches.
- Direct evidence navigation remounts only the evidence view with the requested initial filter (keyed by the focus request sequence) and opens/focuses the target row. It does not reset the analysis or the documents.

## 4. Component structure

```
src/app/resume/page.tsx
└── DocumentIntake                         (state owner, API calls, transitions)
    ├── IntakeFields                       (full input interface; reused for edit-in-place)
    ├── DocumentSummaryBar                 (compact post-extraction summary)
    ├── ExtractedTextDrawer                (bounded, focus-managed text review dialog)
    └── AnalysisWorkspace                  (ARIA tablist; mounted panels)
        ├── AnalysisOverview               (score, counts, principal issue, gaps, actions)
        ├── RequirementEvidence            (search, state filters, grouped disclosures)
        └── DocumentInspection             (qualitative findings, grouped unsupported checks)
```

Pure, browser-free view-model logic lives in `src/lib/resume-analysis.mjs` with `src/lib/resume-analysis.d.mts` declarations, following the repository's existing `.mjs` + `.d.mts` testable-module convention.

Exported helpers: `buildEvidenceRows`, `groupEvidenceRows`, `buildAnalysisSummary`, `selectPrincipalIssue`, `filterEvidenceGroups`, `groupAtsChecks`, `uniqueStrings`, `scoreDisplay`, `matchStatusCopy`, plus the `EVIDENCE_GROUPS` labels.

## 5. Accessibility and responsive decisions

- **Tabs:** `role="tablist"` with `aria-label`, `role="tab"`, `aria-selected`, `aria-controls`, roving `tabIndex`, and Left/Right/Home/End keyboard support. Each panel has `role="tabpanel"`, `aria-labelledby`, and is hidden when inactive.
- **Disclosures:** native `<details>/<summary>` keeps native keyboard and screen-reader behaviour; summaries are visibly focusable and indicators rotate only when motion is allowed.
- **Dialog:** `role="dialog"`, `aria-modal="true"`, labelled heading, initial focus, Escape close, Tab containment, focus restoration, and a single bounded scroll region.
- **Announcements:** extraction/analysis completion and the evidence result count use polite live regions; errors use `role="alert"`.
- **Status is never colour-only:** every badge has text, and the state label appears in the row summary.
- **Labels:** file inputs have labels, the JD textarea has an accessible name plus a described limit, icon-only actions have `aria-label`s, and filter chips use `aria-pressed`.
- **Layout:** desktop uses a two-column overview/evidence layout capped at readable measure; narrow screens stack to one column with wrapping controls and no horizontal overflow. No nested scroll containers except the bounded text dialog/pre.
- **Motion/focus:** no new animation library or keyframes; reduced-motion and global focus-visible rules are unchanged and reused.

## 6. Analyzer integrity

- No changes to `CareerTracker-Backend`, `src/lib/server/*`, `src/lib/api.ts`, auth/session code, database schema, migrations or dependencies.
- `/resumes/extract` and `/resumes/analyze` are called with the same fields, multipart handling, timeouts and error-message extraction as before.
- New API fields are read defensively: missing `findings`, `requirementCoverage.items`, `sourceExcerpts`, `concepts`, `learningOutcomes`, `checks` or `limitations` fall back to empty containers; a missing evidence classification is shown as "Evidence state unavailable" instead of being assumed.
- `scoreDisplay` keeps `null` unavailable and `0` available; tests assert the distinction.
- "Related" and "insufficient" evidence stay in a partial group; related technology is never promoted to demonstrated/exact.
- Training outcomes remain separate and are never scored as entry requirements.
- No literal document text is copied into documentation or test fixtures; tests use synthetic strings.

## 7. Multi-role job-description issue (recorded separately, not implemented)

**Observation (founder walkthrough):** the uploaded notice appears to describe multiple software-development positions plus selection-process information in one document. The text was not persisted or added to fixtures, so this record relies on the walkthrough observation plus source inspection; it is not reproduced against real data.

**Current behaviour — qualifications are aggregated across positions:**

- `CareerTracker-Backend/src/modules/resumes/matching/jd-segmentation.ts` — `segmentJobDescription` walks lines in one linear stream. `section` and `heading` are single mutable values reassigned whenever any heading is recognised; there is no position/role boundary concept. A repeated "Requirements" heading for a second role only replaces the heading label for following lines.
- `CareerTracker-Backend/src/modules/resumes/matching/jd-statement-classifier.ts` — `classifyStatement` uses only the current section/heading and lexical cues; it cannot know which advertised position a statement belongs to.
- `CareerTracker-Backend/src/modules/resumes/matching/job-requirements-extractor.ts` — `interpret` merges everything into one `Map` keyed by canonical requirement id (`skill:<id>`, `education:<level>`, `experience:years`, certification ids). `merge` keeps the highest priority seen and unions source excerpts, so a skill required by role B can be recorded as required even if role A only mentioned it. All statements also feed one `statementCounts` histogram.
- `CareerTracker-Backend/src/modules/resumes/matching/requirement-coverage.detector.ts` — review items are produced per statement and then aggregated; no role ownership is retained.
- `CareerTracker-Backend/src/modules/resumes/matching/resume-analysis.service.ts` — one denominator, one weighted score, one `requirementsNotDemonstrated`/`preferredSkillGaps`/`hardEligibilityConcerns` set for the whole notice. Selection-process or eligibility prose classified as entry requirements also enters that single assessment.

**False-match risks:** priority inflation (required in one role becomes required for the whole notice); missing-evidence gaps attributed to a role the candidate is not pursuing; a score withheld by one role's ambiguous wording even when another role is fully evaluable; a score computed across incompatible skill sets; and process/eligibility statements mistaken for technical qualifications. Conversely, a candidate strong for role A can look weak because role B's unrelated requirements are included.

**Proposed separate slice (do not implement speculatively here):**

1. Detect likely position boundaries from explicit role/position headings and repeated requirement sections; expose detection as a suggestion, never a silent split.
2. Ask the user to choose one advertised position (or explicitly analyse all and view separate results). Never choose a role on the user's behalf.
3. Scope segmentation, classification, coverage review, scoring and suggestions per selected position, preserving per-role source excerpts.
4. Add synthetic multi-role evaluation fixtures and measure false matches against the current single-role baseline.
5. Keep the existing API fields additive; no schema or authentication changes are needed.

Matching-quality improvements, secure resume storage and the Overleaf-inspired builder remain separate future slices.

## 8. Files changed

| File | Change |
|---|---|
| `src/app/resume/page.tsx` | Shortened analyzer framing; separate saved-records section with explicit non-persistence copy. Version-history behaviour unchanged. |
| `src/components/resume/document-intake.tsx` | Rewritten as the analysis state owner: intake → summary bar → workspace, view/focus/edit/drawer state, preserved API calls and error handling. |
| `src/components/resume/intake-fields.tsx` | New full input interface, reused for edit-in-place. |
| `src/components/resume/document-summary-bar.tsx` | New compact post-extraction document summary and actions. |
| `src/components/resume/extracted-text-drawer.tsx` | New bounded extracted-text dialog with focus management. |
| `src/components/resume/analysis-types.ts` | New extraction request/response types, protocol limits and accepted formats. |
| `src/components/resume/analysis-workspace.tsx` | New accessible tab workspace and derived summary/grouping. |
| `src/components/resume/analysis-overview.tsx` | New overview with honest score display, counts, principal issue and actions. |
| `src/components/resume/requirement-evidence.tsx` | New searchable, state-filtered, grouped requirement disclosures and direct navigation. |
| `src/components/resume/document-inspection.tsx` | New inspection view with grouped unsupported checks and deduplicated limits. |
| `src/lib/resume-analysis.mjs` | New pure view-model/grouping/filtering logic. |
| `src/lib/resume-analysis.d.mts` | New declarations for the logic module. |
| `test/res-ux-001-resume-workspace.test.mjs` | New synthetic regression tests. |
| `docs/implementation/RES-UX-001-resume-analysis-workspace.md` | This record. |

No backend file, lockfile, dependency, schema, migration, auth file or environment file was modified or read.

## 9. Tests added

`test/res-ux-001-resume-workspace.test.mjs` (Node built-in test runner, synthetic fixtures only):

1. `null` scores stay unavailable; `0` remains a real score; missing reasons fall back honestly.
2. Rows distinguish "Not demonstrated" from "Not evaluated", with no resume excerpts on unresolved statements.
3. Duplicate unresolved statements collapse to one visible row.
4. Summary keeps evaluated, demonstrated/mentioned, missing/insufficient, unresolved and training-excluded counts separate.
5. Principal issue prefers a potentially mandatory unresolved statement and returns the exact row key/state; falls back to a required evidence gap; returns nothing when no issue exists.
6. Search matches exact JD and resume excerpts; state filtering isolates not-demonstrated rows.
7. Parser checks retain four states and repeated unsupported explanations group once per explanation.
8. Defensive behaviour for missing additive fields and empty analyses.
9. A 40-requirement analysis with very long excerpts remains complete and fully searchable.
10. Repeated limitation strings deduplicate while distinct ones survive.

Fixtures are synthetic and contain no text from the walkthrough resume or notice.

## 10. Verification

| Command | Result |
|---|---|
| `npm run typecheck` (`tsc --noEmit`) | Exit 0. |
| `npm run lint` (`eslint .`) | Exit 0 after fixing a ref write during render, an effect-driven state reset, and declaration-file `declare` syntax. |
| `node --test --test-isolation=none test/res-ux-001-resume-workspace.test.mjs` | 10 tests passed, 0 failed. |
| `node --test --test-isolation=none test/sec-001-ai-chat.test.mjs test/auth-login-errors.test.mjs` | 16 existing tests passed, 0 failed (no auth regressions). |
| Backend tests | Not run; no backend source changed. |
| Typecheck of backend | Not run; no backend source changed. |
| Browser interaction and screenshots (desktop/mobile, tab keyboard behaviour, drawer focus, long-text overflow) | **Unverified.** Starting Next dev/build would load real environment files, which this slice's boundary forbids without separate approval, and Playwright/Puppeteer/Selenium are not installed. Layout and keyboard behaviour are implemented and typechecked but not visually confirmed. |
| Live extraction/analysis against Nest | **Unverified.** Requires the protected services and real documents; only synthetic fixtures and static code paths were exercised. |
| Authentication/database changes | None made; verified by file scope, not by runtime diff tooling. |

The test runner is invoked with `--test-isolation=none` because the sandbox cannot spawn the default Node test subprocess, consistent with the existing SEC-001 record.

## 11. Known limitations

- Browser, responsive, screen-reader and live-API checks remain outstanding; the "no horizontal overflow", focus order and mobile stacking conclusions come from source inspection, not screenshots.
- Score and counts still depend on the existing bounded vocabulary. Unknown compounds and multi-role notices remain unresolved by design and are documented above rather than guessed.
- Direct navigation remounts the evidence view, which resets its local search/filter and collapses previously opened rows. This is intentional so the requested row is visible and focused.
- The drawer implements a local Tab trap rather than an application-wide modal manager; no shared dialog primitive exists in the repository.
- The saved-records list is unchanged and still read-only; this slice does not add secure storage, deletion or analysis persistence.
- No numeric ATS score, confidence percentage, hiring prediction or candidate rating was added.

## 12. Restrictions observed

No Git commit, push, reset, deployment, dependency installation, paid service, backend business-logic change, schema change, migration or authentication change was made. No real environment file, credential, token or private key was read or printed. No real resume/JD text was persisted as a fixture.
