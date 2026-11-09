# RES-002D-C — Real-World Role Robustness Evaluation Record

**Date:** 2026-11-08  
**Corpus:** 31 synthetic English cases authored for this slice. No real resume, job notice, environment file or credential was used or persisted.  
**Purpose:** measure role-boundary recognition, requirement attribution, cross-role contamination, shared inheritance and score-withholding on more varied recruitment structures.

## 1. Dataset

| File | Split | Cases | Role labels | Requirement labels | Shared labels | Withheld-score cases |
|---|---|---:|---:|---:|---:|---:|
| `real-world-role.evaluation.json` | development | 19 | 28 | 24 | 1 | 4 |
| `real-world-role-holdout.evaluation.json` | holdout | 12 | 20 | 11 | 0 | 2 |
| **Total** | | **31** | **48** | **35** | **1** | **6** |

Status composition:

- Development: 11 `multiple`, 3 `single`, 1 `none`, 4 `ambiguous`.
- Holdout: 9 `multiple`, 1 `single`, 0 `none`, 2 `ambiguous`.

### Coverage

- SDE-I/SDE-II and Software Development Engineer.
- QA, QA Automation Engineer, SDET, Automation Engineer.
- SRE, DevOps Engineer, Platform Engineer.
- Graduate Engineer Trainee, Associate Software Engineer.
- Internship and campus-placement notices.
- Numbered headings with wrapped PDF lines.
- Pipe/tab vacancy tables with serial and location columns.
- Repeated and inconsistent headings (`SDE-I` / `Software Development Engineer I`; `QA Engineer` / `Quality Assurance Engineer`).
- Training modules with one real position, before or after the title.
- Shared degree requirements plus separate role requirements.
- Plural notices with only one bounded position.
- Slash-separated position lists with no boundary blocks.
- Unfamiliar explicit titles and unknown titles in a list.
- Title-less requirements and single abbreviation-only roles.

The corpus is still authored, English and small. It does not cover real notices, non-English text, scanned PDFs, flattened tables without delimiters or employer-specific layouts. Perfect results are **not** production accuracy.

## 2. Method

- `detectJobRoles` is evaluated by exact normalized title matching and by the documented status.
- A selected role is resolved by its labeled title, then validated with `isSelectableRole`.
- If selection is required but no selectable role exists, the evaluator does **not** call the service; it mirrors the controller’s abstention (`jobMatch: null`).
- Requirement keys are existing canonical IDs (`skill:...`, `education:...`, `experience:...`, `certification:...`).
- The **baseline** is RES-002D-B’s pre-C fallback: analyze the same whole document without a role scope.
- Metrics are emitted by `resume-analyzer-real-world-roles.spec.ts` under `RES_002D_C_REAL_WORLD`.
- The test asserts exact behavior on this corpus and reports sample counts; no threshold is described as production accuracy.

## 3. Results

### 3.1 Role detection

| Split | Cases | Role TP | FP | FN | Precision | Recall | F1 | False multi-role documents | Missed multi-role documents | Status accuracy |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Development | 19 | 28 | 0 | 0 | 1.00 | 1.00 | 1.00 | 0 | 0 | 19/19 |
| Holdout | 12 | 20 | 0 | 0 | 1.00 | 1.00 | 1.00 | 0 | 0 | 12/12 |
| **Total** | **31** | **48** | **0** | **0** | **1.00** | **1.00** | **1.00** | **0** | **0** | **31/31** |

### 3.2 Requirement attribution

| Split | TP | FP | FN | Precision | Recall | F1 | Cross-role contamination |
|---|---:|---:|---:|---:|---:|---:|---:|
| Development | 24 | 0 | 0 | 1.00 | 1.00 | 1.00 | 0 |
| Holdout | 11 | 0 | 0 | 1.00 | 1.00 | 1.00 | 0 |
| **Total** | **35** | **0** | **0** | **1.00** | **1.00** | **1.00** | **0** |

Shared-requirement attribution: 1 expected, 1 matched, 0 missing. The negative test also confirms that an ordinary “3 years of experience” preamble is excluded from a selected role (`sharedStatementsApplied: 0`, `sharedStatementsExcluded: 1`).

### 3.3 Score availability and withholding

| Split | Score decisions correct | Accuracy | Withheld cases correct | Withholding accuracy | Legacy aggregate accuracy |
|---|---:|---:|---:|---:|---:|
| Development | 19/19 | 1.00 | 4/4 | 1.00 | 18/19 = 0.947 |
| Holdout | 12/12 | 1.00 | 2/2 | 1.00 | 11/12 = 0.917 |
| **Total** | **31/31** | **1.00** | **6/6** | **1.00** | **29/31 = 0.935** |

The legacy aggregate’s two wrong decisions were the plural notices with one bounded role: the old path scored them as a single job. Withholding cases also included lists with no blocks and two unsupported headings; those happened to have no score in the baseline for a different reason, which is why the baseline score-availability number is not zero.

### 3.4 Baseline contamination

| Split | Selected-role contamination | Aggregate-baseline contamination |
|---|---:|---:|
| Development | 0 | 16 leaked requirement instances |
| Holdout | 0 | 11 leaked requirement instances |
| **Total** | **0** | **27** |

Baseline leaks are requirements labeled as belonging only to another position (for example React/TypeScript in an SDET selection, Java in a QA selection, Node.js in an SDE-I selection). The scoped path removes them.

## 4. Negative and regression tests

- Existing RES-002D-B corpus (8 development + 6 holdout) still passes unchanged.
- Single-position deep-equality regression still passes: scoped and unscoped calls are identical when only one role is detected.
- Plural notice with one boundary: status `ambiguous`, uncertainty `possible_multiple`, zero selectable roles; HTTP returns no `jobMatch`.
- Token for an unresolved boundary: HTTP `400 ROLE_BOUNDARIES_UNRESOLVED`, analysis service not called.
- Stale and forged tokens: still `400 ROLE_SELECTION_INVALID`.
- Training modules, departments, projects, selection-process steps and ordinary acronym prose do not create roles.
- Locations are not role titles.
- `SDE - II` and numbered `SDE - II - 2 Vacancies` retain the level suffix without swallowing the vacancy column.
- Two unsupported headings produce no selectable roles.
- Non-global preamble requirements are not inherited by a selected role.
- Existing JD-understanding, H2, coverage and quality evaluations remain green.

## 5. False positives and false negatives

On this authored corpus: zero role false positives and zero false negatives, with the six intended abstentions correctly withheld.

Expected failure modes outside the corpus:

- **False negatives:** non-English titles; rare abbreviations outside the closed list; an unknown title that appears as a bare heading with no explicit marker or list context; flattened tables without pipe/tab/heading structure.
- **False positives / over-abstention:** a notice that says “multiple positions” but actually describes one is treated as `possible_multiple`; a bare title-shaped line with qualification text can still be considered a candidate. The fail-safe direction is withholding rather than merging, but the UI cost is an extra one-position request.
- **Shared qualification false negatives:** a genuinely global statement without all/every wording is excluded.
- **Truncation:** more than 12 candidates are capped and flagged; evaluation does not measure selection beyond that cap.

## 6. Interpretation

The numbers demonstrate that the specified rules behave deterministically on 31 varied authored structures and that the unsafe whole-document fallback is closed. They do **not** establish real-world precision/recall. A production claim would require a larger, consented, independently labeled corpus, including scanned and multilingual notices, plus calibration of `possible_multiple` against human judgments of whether a document is truly multi-position. Do not quote 1.00 as production accuracy.
