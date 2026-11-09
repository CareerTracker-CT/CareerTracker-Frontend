# RES-002D-B — Multi-Role JD Evaluation Record

**Date:** 2026-11-08  
**Corpus:** synthetic, English, authored for this slice. No real resume or job notice was used or persisted.  
**Purpose:** measure role-boundary detection, selected-role requirement attribution, shared-requirement inheritance, cross-role contamination, score availability and single-role regression.

## 1. Dataset

| File | Split | Cases | Role labels | Selected-scope requirement labels | Shared requirement labels | Ambiguous cases |
|---|---|---:|---:|---:|---:|---:|
| `multi-role.evaluation.json` | development | 8 | 10 | 12 | 1 | 1 |
| `multi-role-holdout.evaluation.json` | holdout | 6 | 12 | 11 | 1 | 0 |
| **Total** | | **14** | **22** | **23** | **2** | **1** |

Plus one generated load case (two positions, 500 qualification bullets) and six focused unit/HTTP tests outside the labeled metrics.

### Development cases (8)

1. Ordinary single-role frontend job with requirements, preferred experience and responsibilities.
2. Two independent developer positions.
3. Shared qualification under an explicit “General requirements for all positions” heading, with a non-global experience statement before it.
4. Same skill required for frontend and preferred for backend.
5. Training curriculum with five module headings and one target role.
6. Company overview and selection process only.
7. Ambiguous boundaries: two bare role titles with no qualification blocks.
8. No recognizable role title; requirements only.

### Holdout cases (6)

1. Three independent positions.
2. Explicit “All candidates” degree requirement with overlapping TypeScript vocabulary and different React priorities.
3. Repeated identical job title.
4. Wrapped PDF lines and Unicode bullets.
5. Unsupported qualification (“Zephyr Forge”) inside the selected position.
6. Backend position with Node.js required and React preferred.

The synthetic corpus covers shared-before-role qualifications, identical skills with different priorities, training module noise, company/selection text, overlapping vocabularies, ambiguous boundaries, repeated titles, PDF wrapping, Unicode bullets, unknown qualifications, no-title input, and a large input. It does **not** cover real notices, non-English text, scanned PDFs, abbreviations such as SDE/SRE/QA, or employer-specific section conventions.

## 2. Method

- `detectJobRoles` is evaluated by exact normalized role-title matching.
- For multi-role cases, the labeled `selectedRoleTitle` is resolved in the detection output and passed with the detection to `ResumeAnalysisService.analyze`.
- Requirement keys are canonical IDs (`skill:...`) or the existing education/experience/certification IDs.
- Metrics are emitted by `resume-analyzer-multi-role.spec.ts` under the `RES_002D_B_MULTI_ROLE` log prefix.
- The **baseline** is the previous aggregate behavior: the same whole JD analyzed without a role scope.
- No threshold is treated as production accuracy; the test asserts exact behavior on this corpus and reports sample counts.

## 3. Results

### 3.1 Role detection

| Split | Cases | Role TP | FP | FN | Precision | Recall | F1 | False multi-role detections | Missed multi-role documents | Status accuracy |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Development | 8 | 10 | 0 | 0 | 1.00 | 1.00 | 1.00 | 0 | 0 | 8/8 |
| Holdout | 6 | 12 | 0 | 0 | 1.00 | 1.00 | 1.00 | 0 | 0 | 6/6 |

Ambiguity labeling: 1/1 development ambiguous case correctly flagged; no holdout case was labeled ambiguous.

### 3.2 Selected-role requirement attribution

| Split | TP | FP | FN | Precision | Recall | F1 | Cross-role contamination |
|---|---:|---:|---:|---:|---:|---:|---:|
| Development | 12 | 0 | 0 | 1.00 | 1.00 | 1.00 | 0 |
| Holdout | 11 | 0 | 0 | 1.00 | 1.00 | 1.00 | 0 |

Shared-requirement attribution: 2 expected, 2 matched, 0 missing. The development case also confirmed that the non-global “3 years of experience” preamble statement was **not** inherited.

### 3.3 Score availability

| Split | Correct | Evaluated | Accuracy | Legacy aggregate accuracy |
|---|---:|---:|---:|---:|
| Development | 8 | 8 | 1.00 | 4/8 = 0.50 |
| Holdout | 6 | 6 | 1.00 | 4/6 = 0.667 |

### 3.4 Legacy aggregate baseline comparison

| Split | Selected-role contamination | Aggregate-baseline contamination | Selected score availability | Aggregate score availability |
|---|---:|---:|---:|---:|
| Development | 0 | 4 leaked requirement instances | 1.00 | 0.50 |
| Holdout | 0 | 7 leaked requirement instances | 1.00 | 0.667 |

The baseline leaks are requirements labeled as belonging only to another position (for example React/TypeScript in a backend selection) that appeared in the whole-document result. The fix removes them. The baseline also made the wrong score-availability decision on ambiguous or unsupported documents because the aggregate mixed review items from other roles.

### 3.5 Single-role regression

- 3 labeled single-role documents preserve whole-document behavior.
- A focused test deep-equals `analyze(resume, jd)` with `analyze(resume, jd, { detection, role })` for a single detected role; the extractor ignores scope when fewer than two roles exist.
- Existing RES-002D-A JD-understanding development (13 cases) and holdout (10 cases) suites still pass with role metadata added.
- Existing H2, coverage and quality evaluations still pass.

## 4. Large-input check

A generated two-position document with 250 frontend and 250 backend bullets is detected as two roles; the selected backend analysis excludes the frontend statements and retains Node.js. Detection remains linear and the existing 100,000-character extraction cap bounds work. No timing SLA is claimed; the Jest suite completes the large case in under a second locally.

## 5. Negative tests

- Selecting backend cannot include React or TypeScript from the frontend role; the result contains Node.js only and excludes the other role's entry statements.
- A token from an edited document is rejected (`findRoleByToken` returns null).
- Forged tokens (`role-1`, 32 zeros) are rejected.
- The HTTP endpoint returns `400 ROLE_SELECTION_INVALID` for a stale token and does not invoke analysis.
- The endpoint returns `jobMatch: null` plus `roleSelection` when no role is supplied for a multi-position document; analysis is not invoked.
- Training module titles do not become positions or scored requirements.
- Repeated identical titles do not create a second position.

## 6. Limitations and interpretation

This is a 14-case synthetic evaluation, not a production benchmark. Perfect results show the rules behave as specified on authored examples; they do not establish accuracy on real recruitment notices. The main expected failure modes are missed role titles (abbreviations, non-English, titles without role-head nouns), ambiguous bare-title lists, conservative shared-requirement exclusion, and the 12-role cap. Future evaluation needs a larger reviewed corpus, including real notices with explicit consent and multilingual text, plus separate precision measurement for ambiguous boundaries. Do not quote these numbers as production precision.
