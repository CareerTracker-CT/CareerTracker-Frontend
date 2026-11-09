# RES-003A — Secure Private Resume Library and Versioning Foundation

**Status:** Foundation implemented and unit-tested; pending migration application for live verification.  \
**Date:** 2026-11-09  \
**Repository:** `CareerTracker-Backend`, `CareerTracker-Frontend`  \
**Scope:** Private, user-owned resume storage with version history, ownership enforcement, optimistic concurrency, validation, quotas, and a frontend library UI. Analyzer, authentication, and existing file-based resume records are preserved unchanged.

---

## 1. Objective and outcome

A student must be able to create, name, edit, version, duplicate, rename, and delete private resume records owned by their authenticated identity, with safe concurrent-editing behavior and structured content suitable for a future Overleaf-inspired editor. No public sharing, recruiter access, collaborative editing, raw file storage, or AI rewriting is in this slice.

**What was delivered:**

- A versionable structured resume content model (schema v1) with explicit content-schema versioning.
- Server-owned ownership, validation, quotas, and optimistic-concurrency (CAS) version creation.
- A private REST library under `/resumes/library` with nine endpoints.
- A complete frontend library UI using the existing design system, kept separate from the temporary analyzer workspace.
- Synthetic tests covering ownership, cross-user denial, validation, versioning, conflicts, rename, duplicate, delete, quotas, and malformed content.
- An additive, reviewed migration draft that has **not** been applied to any database.

---

## 2. Existing functionality reused

- **Authentication:** `JwtAuthGuard` + `ActiveSessionGuard` are reused without modification. Library endpoints are guarded by both; the principal's `sub` becomes the owner id. No client-supplied user id exists anywhere in the API.
- **Existing resume model:** The backend Prisma `Resume` model already carried `revision`, `fileName`, file metadata, findings, and soft deletion. The library reuses the same table rather than creating a second `Resume` model.
- **Frontend design system:** `Button`, `Badge`, `EmptyState`, `ErrorState`, `SkeletonRows`, `label-caps` micro-labels, and existing CSS tokens are reused.
- **Frontend API layer:** `use-api.ts` hooks, axios proxy via `next.config.ts` rewrites to `/api/v1`, and the `ApiSuccess`/`ApiFailure` envelope are reused.
- **Analyzer separation:** The existing `DocumentIntake` / `AnalysisWorkspace` path is preserved. The analyzer never writes to the library; the library never depends on analyzer state.

---

## 3. Architecture and data flow

### 3.1 Conceptual model

**Resume (row: `resumes`)**

- `id` — UUID primary key
- `userId` — owner, from the verified backend principal
- `fileName` — display name chosen by the user
- `revision` — optimistic-concurrency counter; equals the current version number
- `createdAt` / `updatedAt` — timestamps
- `deletedAt` — soft-delete timestamp; library queries exclude rows where this is set
- File metadata columns (`storageKey`, `fileSizeBytes`, `mimeType`) are nullable because structured library resumes carry no uploaded file; existing file-based analyzer records continue to populate them.

**ResumeVersion (row: `resume_versions`)**

- `id` — UUID primary key
- `resumeId` — foreign key to `resumes`, cascade on delete
- `versionNumber` — unique per resume, contiguous from 1
- `contentSchemaVersion` — content format version (currently 1)
- `targetRoleLabel` — optional role-specific label for this version
- `content` — validated structured JSON (schema v1)
- `createdAt` — version creation timestamp

**ResumeFinding (existing)** is cascade-deleted with its resume so private analysis artifacts do not survive resume deletion.

### 3.2 Ownership enforcement

Every repository query scopes on `userId` **and** `deletedAt is null` **and** `versions: { some: {} }` (library resumes always have at least one version). A user who knows another user's resume id still cannot list, read, save, rename, duplicate, or delete it, because the predicate includes their own `userId`. This is enforced in the repository, not only by Supabase RLS or hidden frontend controls.

### 3.3 Version creation and concurrency

Saving a version is a compare-and-swap on `Resume.revision` inside one transaction:

1. Look up the resume by id and owner.
2. Check the per-resume version quota.
3. Atomically increment `revision` only if it still equals the client's `expectedRevision`.
4. If the increment affected zero rows, another tab advanced the resume first; return the current `revision` so the client can reload.
5. Insert the new `ResumeVersion` with `versionNumber = expectedRevision + 1`.

Duplicate version numbers are also prevented by the unique index on `(resumeId, versionNumber)` and by an explicit pre-check inside the transaction.

### 3.4 Content schema

Structured content is versioned separately from the row model via `contentSchemaVersion`. Schema v1 supports:

- Optional contact/profile block (name, email, phone, location, headline, links)
- Optional professional summary
- Ordered education entries
- Ordered work-experience entries with bullets
- Ordered projects with technologies
- Ordered skills list
- Ordered certifications list
- Ordered extra sections with lines

Item ordering and repeated sections are preserved because arrays are stored as JSON and validated in order.

### 3.5 Frontend/backend boundary

- The frontend never sends a user id.
- `resume-library.tsx` renders list, empty state, create form, detail panel, version history, rename, duplicate, delete confirmation, and conflict feedback.
- `use-api.ts` hooks call `/api/v1/resumes/library/*` through the axios client; Next.js rewrites proxy those to the NestJS backend in deployed/dev configurations.
- `resume-library.mjs` mirrors server bounds for local form validation and translates stable error codes into user-facing copy; the server re-validates everything.
- The `LegacyRecords` panel in the library lists older file-based analyzer records read-only, using `useResumes()` (the existing `GET /resumes` endpoint), so the analyzer history and the library remain visually distinct.

---

## 4. API contract

All responses use the `ApiSuccess<T>` / `ApiFailure` envelope. All endpoints require `JwtAuthGuard` + `ActiveSessionGuard`.

### `GET /resumes/library`

- **Response 200:** `{ data: ResumeLibraryRecord[] }` — own resumes, newest-updated first, each annotated with current version metadata.

### `POST /resumes/library`

- **Request:** `{ name, targetRoleLabel?, content }`
- **Response 201:** `{ data: ResumeLibraryDetail }` — created resume with version 1 content.
- **Errors:** `400 RESUME_NAME_INVALID`, `400 RESUME_CONTENT_INVALID`, `400 RESUME_CONTENT_TOO_LARGE`, `409 RESUME_LIMIT_REACHED`.

### `GET /resumes/library/:id`

- **Response 200:** `{ data: ResumeLibraryDetail }`
- **Errors:** `404 RESUME_NOT_FOUND`.

### `GET /resumes/library/:id/versions`

- **Response 200:** `{ data: ResumeVersionSummary[] }` — newest first.
- **Errors:** `404 RESUME_NOT_FOUND`.

### `GET /resumes/library/:id/versions/:versionNumber`

- **Response 200:** `{ data: ResumeVersionDetail }`
- **Errors:** `400 RESUME_VERSION_INVALID`, `404 RESUME_NOT_FOUND`, `404 RESUME_VERSION_NOT_FOUND`.

### `POST /resumes/library/:id/versions`

- **Request:** `{ expectedRevision, targetRoleLabel?, content }`
- **Response 201:** `{ data: ResumeLibraryDetail }` — updated resume with new current version.
- **Errors:** `400 RESUME_CONTENT_INVALID`, `400 RESUME_CONTENT_TOO_LARGE`, `404 RESUME_NOT_FOUND`, `409 RESUME_VERSION_LIMIT_REACHED`, `409 RESUME_EDIT_CONFLICT` (includes `currentRevision` and `currentVersionNumber`).

### `PATCH /resumes/library/:id`

- **Request:** `{ name }`
- **Response 200:** `{ data: ResumeLibraryRecord }`
- **Errors:** `400 RESUME_NAME_INVALID`, `404 RESUME_NOT_FOUND`.

### `POST /resumes/library/:id/duplicate`

- **Request:** `{ name?, targetRoleLabel? }`
- **Response 201:** `{ data: ResumeLibraryDetail }` — new resume with version 1 copied from the source's current version.
- **Errors:** `400 RESUME_NAME_INVALID`, `404 RESUME_NOT_FOUND`, `409 RESUME_LIMIT_REACHED`.

### `DELETE /resumes/library/:id`

- **Response 200:** `{ data: { removedId, name } }`
- **Errors:** `404 RESUME_NOT_FOUND`.
- **Effect:** private content (versions + findings) is deleted; the resume row is soft-deleted.

---

## 5. Validation and quotas

**Content validation (`resume-content.validator.ts`):**

- Strict schema; unknown keys rejected at every level.
- Per-field string caps (for example contact fields 200, email 190, summary 4000, bullet 1000, skill 80, section title 120).
- Array caps: education 20, experience 20, projects 30, skills 120, certifications 30, sections 12, bullets per experience 20, lines per section 30, links per contact 10.
- Serialized JSON capped at 64 KB per version (`MAX_CONTENT_BYTES`).
- Email format checked when present.
- Empty document accepted as a blank resume.

**Quotas:**

- `MAX_RESUMES_PER_USER = 50`
- `MAX_VERSIONS_PER_RESUME = 100`
- `RESUME_CONTENT_SCHEMA_VERSION = 1`

**Payload protection:**

- DTOs use `class-validator` for envelope shape (name length, integer revision, required fields).
- The service additionally validates content in depth and rejects oversized or malformed payloads before any persistence.
- Rate limiting is applied per endpoint via `@Throttle`.

No complete resume content or extracted text is logged.

---

## 6. Version concurrency

Two browser tabs editing the same resume cannot silently overwrite each other. Both load revision N; the first save atomically increments to N+1; the second save's CAS fails because `revision` no longer equals N. The loser receives `409 RESUME_EDIT_CONFLICT` with the current revision, and the UI offers a "Reload latest version" action.

The frontend conveys the loaded revision to the server as `expectedRevision`, and the server returns the new current revision on success so the UI can keep its revision in sync.

---

## 7. Data ownership, privacy, and deletion

- Ownership is derived exclusively from the verified backend principal; the client never supplies it.
- Every mutation and query is ownership-scoped in the repository.
- Resume content is personally sensitive; the service and repository never log content, extracted text, or other document details.
- Saving is an explicit user action. The analyzer does not auto-save; uploaded PDFs/DOCX files and analyzer results are not stored by the library.
- The library stores validated structured content, not raw documents. Raw file storage is not introduced.
- Deletion removes private version content and findings, then soft-deletes the resume row so identities referenced elsewhere are not cascade-destroyed unexpectedly; library list queries exclude soft-deleted rows.

---

## 8. Schema changes and migration status

### 8.1 What changed in the schema

**Backend Prisma (`prisma/schema.prisma`):**

- `Resume` already had `revision`, nullable file metadata, `createdAt`, `updatedAt`, `deletedAt`, `findings`, and `versions` relations before this slice; those fields are reused rather than introduced here.
- `ResumeVersion` model already existed with `versionNumber`, `contentSchemaVersion`, `targetRoleLabel`, `content: Json`, `createdAt`, the unique `(resumeId, versionNumber)` constraint, and cascade to `Resume`.
- Therefore the library's data model was already present in the schema before this implementation slice; the service, repository, and migration draft codify how the library uses it.

**Frontend Drizzle (`src/db/schema.ts`):**

- An earlier pass added `revision`, `updatedAt`, a `(userId, deletedAt)` index, and a `resumeVersions` table + relation to this file for "parity" with the Prisma schema. **That change was reverted in RES-003A-GATE-01** (see §19): it described a different database, mapped `updatedAt` to a column name that does not exist anywhere (`updated_at`), and introduced a proven pre-migration runtime regression on the dashboard. The file is now byte-identical to its committed state.
- The frontend reads/writes resume library data through the backend API, not through Drizzle. The Drizzle schema describes only the Drizzle-managed dashboard database and must not mirror Prisma columns that no Drizzle migration creates.

### 8.2 Migration draft

- Backend migration: `prisma/migrations/20261108120000_resume_library_versions/migration.sql`
- It is **additive only**: nullable file-metadata columns, a `revision` column, an `updatedAt` column, the `resume_versions` table, unique and lookup indexes, and the foreign key.
- No existing data is altered or deleted by the draft.
- **This migration has not been applied.** No `prisma migrate` command was run. The existing Supabase development database is untouched.
- The backend library repository currently uses a typed bridge (`resume-library.database.ts`) because `prisma generate` has not been run in this environment (the CLI would load the real `.env`). Once the migration is applied and the client regenerated, the bridge can be removed in favor of the generated types.

### 8.3 Migration safety

- No destructive transformation is required for the library itself; the draft is additive: three `DROP NOT NULL`, two `ADD COLUMN`, one `CREATE TABLE`, three `CREATE INDEX`, one FK.
- If a future step needs to backfill `revision` for pre-existing file-based rows, that must be reviewed separately because existing `version`/`isCurrent` semantics on those rows may interact with the new `revision` semantics. This slice does not attempt that backfill.
- **Verified in GATE-01** (source inspection only, no database access):
  - All three `ALTER COLUMN ... DROP NOT NULL` targets exist and are `NOT NULL` in `20260921160652_init` (lines 71–73), so they are valid metadata-only changes.
  - `ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1` and `ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP` use non-volatile defaults, so PostgreSQL 11+ applies them without rewriting the table. Each still takes an `ACCESS EXCLUSIVE` lock for the statement duration.
  - `resumes_userId_deletedAt_idx` does not already exist (the init migration only created `resumes_userId_isCurrent_idx` and `resumes_status_idx`), so there is no duplicate-index error.
  - `resume_versions` matches `model ResumeVersion` exactly (camelCase quoted columns, `UUID`, `JSONB`, `TIMESTAMP(3)`), and its unique + FK constraints match `@@unique([resumeId, versionNumber])` and `onDelete: Cascade`.
  - `CREATE INDEX "resume_versions_resumeId_versionNumber_idx"` is fully redundant with the unique index on the same columns. Not harmful, but it is a second index Prisma will also want; dropping `@@index([resumeId, versionNumber])` from the Prisma model and this SQL line is a safe follow-up.
  - Non-`CONCURRENTLY` index creation takes a `SHARE` lock that blocks writes to `resumes`/`resume_versions` while it builds. Trivial on a small development table; on a large table, split it into its own `CONCURRENTLY` migration and confirm whether your Prisma version wraps the file in a transaction (it cannot run inside one).
  - Nothing in the file is destructive, but the `DROP NOT NULL` changes are only trivially reversible until library rows exist: after that, restoring `NOT NULL` on `storageKey`/`fileSizeBytes`/`mimeType` would require removing the library rows that legitimately have nulls. Recovery paths and their order matter (see §20.4).

### 8.4 Legacy `GET /resumes` compatibility after the migration

- `ResumesService.getResumeRecords` (`src/modules/resumes/resumes.service.ts`) is the analyzer's **upload history**: `{ userId, deletedAt: null, storageKey: { not: null } }`, projected to explicit fields, newest first.
- `storageKey` is the discriminator because it literally means "this row has a stored file". The structured library writes `storageKey: null` (with `fileSizeBytes` and `mimeType` also null) and never creates a stored file.
- It is correct in **both** schema states and never depends on the new table:
  - Before migration `20261108120000`, `storageKey` is `NOT NULL`, so `{ not: null }` matches every row — byte-for-byte the previous behaviour.
  - After it, library rows are excluded while every historical upload stays visible.
- The response contract (`fileSizeBytes: number`, `mimeType: string`) therefore stays true: no record without file metadata can reach the UI.
- `versions: { none: {} }` was considered and **rejected**: it queries `resume_versions`, which does not exist until the migration is applied — so `GET /resumes` would break in the pre-migration state that is current today.
- The library's own predicate (`versions: { some: {} }`) is unchanged, so the two surfaces are disjoint by construction: file-backed rows appear in history, version-backed rows appear in the library.
- Regression coverage: `src/modules/resumes/resumes.service.spec.ts` — 8 synthetic tests (§20.5).

---

## 9. Test results

### Backend

Run from `CareerTracker-Backend`:

- `npm test -- --testPathPattern="resume-library"` — 2 suites, 16 tests passed.
- `npm test -- --testPathPattern="resume-content.validator"` — 1 suite, 8 tests passed.
- `npm test` (full suite, includes existing analyzer regressions) — 16 suites, 98 tests passed, 0 failed.

Library-specific coverage includes:

- Creation with version 1 and library record shape.
- Cross-user access denial and nonexistent-record 404s.
- Malformed, oversized, and empty-name rejections with stable codes.
- Version save, history listing, and old-version read.
- Concurrent save conflict resulting in 409 with current revision.
- Rename without changing revision; empty-name rejection.
- Duplicate as a role-specific copy with fresh version 1.
- Deletion removing private content and soft-deleting the row; subsequent 404.
- Per-user resume quota and per-resume version quota.

Analyzer regressions (RES-002 family) continue to pass in the full suite; no analyzer algorithm was changed.

### Frontend

Run from `CareerTracker-Frontend`:

- `node --test test/res-003a-resume-library.test.mjs` — 10 tests passed, 0 failed.
- `node --test test/res-ux-001-resume-workspace.test.mjs` — 10 tests passed, 0 failed (existing analyzer UX regression suite; included to confirm no regression).
- `npm run typecheck` — exit 0 after the Drizzle schema update.

Frontend library tests are pure-helper tests (no network, no database). They cover empty-content factory, skills parsing, draft validation, content application, content summarization, version label/sort helpers, and error-description mapping.

---

## 10. Browser verification status

**Not performed.** The environment-file boundary forbids starting the Next dev server or build in this session without separate approval, and no browser-automation package is installed. The library UI is implemented against the typed API contract and typechecks cleanly, but interactive verification (create/save/rename/duplicate/delete flows, conflict reload behavior, loading and empty states, keyboard behavior) requires live services and is marked **integration-pending** until the migration is applied and the backend is reachable.

---

## 11. Known risks

1. **Migration not applied.** The library cannot be verified end-to-end against a real database until the reviewed migration is applied and the Prisma client regenerated. This is the main blocking item for live verification.
2. **`revision` semantics on legacy file-based rows.** Existing analyzer file records already use `version`/`isCurrent`. The library reuses `revision` on the same table. The migration draft adds `revision` as a non-null default 1 column, so legacy rows will have `revision = 1` after apply. The library only treats a row as a library resume when it has at least one version, so legacy file records without versions are excluded from library queries. Any future backfill or unification of `version` and `revision` should be reviewed separately.
3. **Bridge file while client is stale.** Until `prisma generate` runs against the applied schema, the backend library repository types the Prisma client through a documented cast. This is contained to one file and does not affect other modules.
4. **Content schema evolution.** Schema v1 is intentionally strict and self-contained. Future editor features that need new fields will require a new content schema version and a migration/upgrade path for existing versions; that is out of this slice.
5. **No live conflict test against real concurrent requests.** Conflict behavior is verified with an in-memory fake that honors the same predicates; true concurrent tab behavior also depends on the database transaction isolation, which is assumed to be PostgreSQL default.
6. **Frontend integration not run.** UI flows are not browser-verified in this session.

---

## 12. Relationship to the Overleaf-inspired editor

The library stores structured, schema-versioned resume content that the future editor can load, edit, and save back as new versions. It is the persistence and concurrency layer; it is not an editor, LaTeX renderer, or PDF exporter. The analyzer and library are kept conceptually separate so the editor can later replace the analyzer's temporary workspace without reshaping the library.

Planned editor integration points:

- Load a resume's current version content into the editor.
- Save edits as a new version with CAS-based conflict protection.
- Use `targetRoleLabel` to keep role-specific variants.
- Render LaTeX/PDF later as an export concern on top of the same structured content.

---

## 13. Files changed

### Backend (new / modified since the previous committed state)

| File | Change |
|---|---|
| `src/modules/resumes/library/resume-library.controller.ts` | New — nine library endpoints under `/resumes/library`, guarded, ownership from principal. |
| `src/modules/resumes/library/resume-library.service.ts` | New — ownership, validation, quotas, CAS version creation, rename/duplicate/delete. |
| `src/modules/resumes/library/resume-library.repository.ts` | New — ownership-scoped queries, transactional version append with CAS, controlled deletion. |
| `src/modules/resumes/library/resume-library.database.ts` | New — typed bridge over the Prisma client for the un-generated client. |
| `src/modules/resumes/library/resume-content.validator.ts` | New — strict structured content validation and quotas. |
| `src/modules/resumes/library/dto/resume-library.dto.ts` | New — create/save/rename/duplicate DTOs. |
| `src/modules/resumes/library/resume-library.controller.spec.ts` | New — HTTP-surface tests with mocked service and auth guards. |
| `src/modules/resumes/library/resume-library.service.spec.ts` | New — service + repository tests against an in-memory fake. |
| `src/modules/resumes/library/resume-content.validator.spec.ts` | New — content validation tests. |
| `src/modules/resumes/resumes.module.ts` | Modified — imports the library controller/service/repository. |
| `prisma/migrations/20261108120000_resume_library_versions/migration.sql` | New — reviewed draft migration (not applied). |

### Frontend (modified in this session)

| File | Change |
|---|---|
| `src/db/schema.ts` | Net **no change**. A parity edit (`revision`, `updatedAt`, `resumeVersions`) was added in the earlier pass and reverted in GATE-01; the file matches its committed state. |

### Frontend (already present before this session, preserved)

| File | Note |
|---|---|
| `src/app/resume/page.tsx` | Mounts `DocumentIntake` and `ResumeLibrary`. |
| `src/components/resume/resume-library.tsx` | Complete library UI. |
| `src/components/resume/analysis-workspace.tsx` | Temporary analyzer workspace, unchanged by the library. |
| `src/hooks/use-api.ts` | Library hooks calling `/api/v1/resumes/library/*`. |
| `src/lib/resume-library.mjs` | Validation, content helpers, error translation. |
| `src/lib/resume-library.d.mts` | Type declarations. |
| `src/types/index.ts` | Library and analyzer types. |
| `test/res-003a-resume-library.test.mjs` | Frontend library helper tests. |
| `test/res-ux-001-resume-workspace.test.mjs` | Existing analyzer UX tests. |

---

## 14. Restrictions observed

- No authentication file, guard, JWT issuance, refresh token, CSRF cookie, or session logic was modified.
- **Correction to an earlier claim in this document:** the first RES-003A pass ran `npm run build` in the backend, whose `prebuild` script runs `prisma generate`, and that process loads the real `.env`. No value was printed, logged, or disclosed, but the command should have been recognised as env-loading and avoided. In GATE-01 no `npm run build`, `prisma generate`, `prisma migrate*`, dev server, or database command was run; every command used is listed in §18.
- No database was connected to, migrated, seeded, or mutated. No `prisma migrate` / `db push` / `migrate reset` / `migrate deploy` command was run.
- No Git commit, push, reset, rebase, or merge was created.
- No object storage, cloud file upload, AI rewrite, LaTeX editor, or PDF export was added.
- No new external service or paid infrastructure was introduced.
- No resume-analyzer business logic was changed; the existing analyzer test suites continue to pass.

---

## 15. What remains blocked by the unapplied migration

- End-to-end creation, saving, versioning, rename, duplicate, and delete against a real database.
- Prisma generated types in place of the typed bridge.
- Browser verification of the library UI flows.
- Confirmation that the frontend proxy rewrite reaches the backend library endpoints in the deployed configuration.

## 16. What requires live verification

- Full integration of `GET /resumes/library` and the nine library endpoints through the Next.js proxy to the NestJS backend.
- Concurrent save conflict behavior across real concurrent requests.
- Deletion semantics against real dependent rows.
- UI behavior for create/save/rename/duplicate/delete/conflict/loading/empty/error states.

---

## 17. Viva explanation (beginner-friendly)

**What is this?** A private, versioned resume notebook for one student. Only that student can see their resumes. Every time they save, a new version is kept so they can look back and never lose earlier work.

**Why versions?** Editing a resume is iterative. If the system only kept the latest text, a bad save could destroy good work. With versions, every save is a snapshot, and the student can revisit any snapshot.

**How is ownership protected?** The server decides who owns a resume using the signed-in user's identity from the access token. The frontend never sends "this is my user id." Every database query includes the owner's id, so even if someone guesses another person's resume id, the server will not return it.

**What happens if two tabs save at once?** The system uses an optimistic-concurrency check. When you open a resume, the UI notes its current revision number. When you save, the server only accepts the save if the resume is still on that same revision. If another tab saved first, your save is rejected with a clear "this was changed elsewhere" message and the current revision, instead of silently overwriting the other tab's work.

**What is stored?** Structured resume data — contact, summary, education, experience, projects, skills, certifications, and extra sections — as validated JSON. The system does not store uploaded PDF/DOCX files in the library, and it does not automatically save analyzer results. Saving is an explicit action.

**Why structured content instead of raw LaTeX or PDF?** Structured content is easier to edit, validate, and render later into LaTeX or PDF. LaTeX and PDF become rendering/export concerns, not the source of truth.

**What about privacy?** Resume content is sensitive. The server never logs the full content. Saved resumes belong to one user and are deleted when the user deletes the resume; the private version content and analysis findings are removed, and the resume row is soft-deleted so it does not leak through list queries.

**What is not built yet?** The live database migration is written but not applied, so the system cannot yet be verified end-to-end against a real database. The editor that will let students compose resumes in place, LaTeX rendering, and PDF export are separate future slices.

---

## 18. Verification commands run

From `CareerTracker-Backend`:

```bash
npm test -- --testPathPattern="resume-library"          # 2 suites, 16 tests, 0 failed
npm test -- --testPathPattern="resume-content.validator" # 1 suite,  8 tests, 0 failed
npm test                                                 # 16 suites, 98 tests, 0 failed
```

From `CareerTracker-Frontend`:

```bash
node --test test/res-003a-resume-library.test.mjs        # 10 tests, 0 failed
node --test test/res-ux-001-resume-workspace.test.mjs    # 10 tests, 0 failed
npm run typecheck                                         # exit 0
```

```bash
# GATE-01 (frontend): Drizzle SQL inspection without a connection or env file
node --input-type=module -e "import { drizzle } from 'drizzle-orm/node-postgres'; import { resumes } from './src/db/schema.ts'; console.log(drizzle.mock().select().from(resumes).toSQL().sql)"
npx tsc --noEmit                                         # exit 0
node --test test/res-003a-resume-library.test.mjs test/res-ux-001-resume-workspace.test.mjs
                                                         # 20 tests, 0 failed
```

```bash
# GATE-01 (backend): jest is invoked directly (no prebuild hook); jest.config.js
# has no setupFiles/globalSetup and no spec reads process.env or dotenv.
npm test                                                 # 16 suites, 98 tests, 0 failed
```

No real environment file was read. No database connection or migration was made. No Git commit was created.

---

## 19. RES-003A-GATE-01 — migration, Drizzle compatibility and safety gate

Bounded review performed before anyone applies `20261108120000_resume_library_versions`. Source inspection plus isolated, env-independent checks only: no database connection, no Prisma command, no build, no dev server.

### 19.1 Was the Drizzle update a real pre-migration regression?

**Yes — proven, not inferred.** An earlier pass added `revision` and `updatedAt` to the Drizzle `resumes` table while the migration stayed unapplied.

`src/lib/server/queries.ts:181` `getResumeRecords()` uses an *unprojected* select:

```ts
db.select().from(resumes).where(and(eq(resumes.userId, userId), isNull(resumes.deletedAt)))
```

Drizzle does not emit `SELECT *`. It expands the table definition into an explicit column list. Rendering the statement without executing it (`drizzle.mock().toSQL()`) gave:

```
select "id", "user_id", ..., "is_current", "revision", "created_at", "updated_at", "deleted_at" from "resumes"
```

Against any database without those columns this fails with `42703 column "revision" does not exist`, which breaks the dashboard's resume list (and `getDashboard`, which awaits it alongside the other dashboard queries).

Two independent reasons the declarations could not be correct, so the conclusion does not depend on which database is assumed:

1. The Drizzle schema uses snake_case columns (`created_at`, `file_size_bytes`). The Prisma-managed database created by `20260921160652_init` uses quoted camelCase columns (`"createdAt"`, `"fileSizeBytes"`). These are different tables; the same table cannot serve both.
2. Even in the Prisma database, the new column is `"updatedAt"`, not `"updated_at"`. So the added `updatedAt: timestamp("updated_at")` declaration was wrong under either assumption.

### 19.2 Affected query paths

| Path | Query | Pre-migration effect |
|---|---|---|
| `getResumeRecords()` (`src/lib/server/queries.ts:181`) | `db.select().from(resumes)` — unprojected | **Broken**: emitted `"revision"`, `"updated_at"` |
| `getDashboard()` (`:279`) | awaits `getResumeRecords()` | **Broken** transitively (whole dashboard payload rejects) |
| `ensureSeed()` → `db.insert(resumes)` (`seed.ts`) | insert with explicit values | Would also reference the undeclared columns when building the insert |
| Library operations (`/resumes/library/*`) | HTTP to NestJS | Unaffected — never uses Drizzle |
| `resumeFindings` select in `getResumeRecords()` | projected to that table only | Unaffected |

No other file queries `resumes` through Drizzle (verified by search; only `src/db/schema.ts`, `use-api.ts` query keys, and the API-security helper reference the name).

### 19.3 Correction made

`src/db/schema.ts` — removed the `revision` and `updatedAt` column declarations, the extra `(userId, deletedAt)` index, and the `resumeVersions` table plus its relation. The file is now identical to its committed state (`git status` clean for that path). No dashboard rewrite, no new query paths, no change to how the dashboard loads data.

Before → after SQL for the dashboard resume list:

- Before: `... "version", "is_current", "revision", "created_at", "updated_at", "deleted_at" ...`
- After: `... "version", "is_current", "created_at", "deleted_at" ...`

### 19.4 Prisma/Drizzle compatibility

- They are **not** a shared schema and should not be kept in parity. Source shows two independent clients: the Drizzle pool in `src/db/index.ts` (reading `DATABASE_URL`) behind the dashboard queries in `src/lib/server/queries.ts`, seeded by `ensureSeed()`; and the NestJS/Prisma path used by every API module. **Which server and database each client resolves to at runtime cannot be proven from source** without reading real environment configuration, so connection targets are recorded as unverified (§20.10).
- Column naming already differs across every table (`full_name` vs `"fullName"`, `why_it_matters` vs `"whyItMatters"`), which is conclusive: mirroring Prisma field names into Drizzle is always wrong.
- `resumeVersions` in Drizzle is **not required**. Nothing reads it; library reads go through the API. Declaring it was dormant risk, not parity.
- `resumeVersionsRelations` was also inert — `drizzle(pool)` is constructed without a schema argument, so relational query building is never used.
- Nullability drift to be aware of after the migration: Prisma makes `storageKey`/`fileSizeBytes`/`mimeType` nullable; Drizzle keeps `file_size_bytes`/`mime_type` `NOT NULL`. Because they are separate databases, this does not break either side — but it means the `ResumeRecord` TS type is not a guarantee for library rows (see §8.4).

### 19.5 Migration safety findings and unresolved assumptions

Safe: additive only; valid targets; fast defaults; no row deletion; no rewrite expected on PostgreSQL 11+.

Unresolved assumptions that must be confirmed by whoever applies it:

1. The target database was actually built by the checked-in migration chain (`20260921160652_init` → `add_firebase_uid` → `replace_user_jti_with_auth_sessions`) and has not drifted via `db push`. `ALTER COLUMN ... DROP NOT NULL` fails if a column is missing or already nullable-but-typed differently.
2. `"storageKey"` exists in the live table at all. It is in the init migration and the current Prisma model, but it is not read anywhere in the library code.
3. Server is PostgreSQL 11+ (fast defaults) and its `server_version` was recorded before apply.
4. No other service holds a long transaction on `resumes` during apply (the `ACCESS EXCLUSIVE` lock will queue behind it).
5. The migration file is not edited after being applied; the `_prisma_migrations` checksum must match the applied file.

Non-blocking: redundant `resume_versions` index (§8.3); `ALTER`/`CREATE INDEX` lock duration (§8.3).

### 19.6 Library ownership, concurrency and privacy findings

Verified by reading the controller, service, repository, validator and DTOs, and by the existing isolated suites:

- **Identity:** `req.user.id` from `AuthenticatedRequest` (JwtAuthGuard). No endpoint accepts a user id in body, param or query. Class-level `@UseGuards(JwtAuthGuard, ActiveSessionGuard)` — the library is stricter than legacy `GET /resumes`, which is `JwtAuthGuard` only. That is deliberate for a mutation surface and does not change any existing guard.
- **Ownership:** every library predicate includes `userId` and `deletedAt: null`, plus `versions: { some: {} }`. Cross-user ids therefore behave exactly like nonexistent ids (`404 RESUME_NOT_FOUND`), which avoids an existence oracle.
- **Narrow TOCTOU:** `renameResume` verifies ownership first, then updates by `id` alone. Safe because the id was just proven owned in the same request, but not defence-in-depth if that helper is ever reused.
- **Concurrency:** `appendVersion` does a compare-and-swap (`updateMany where revision = expectedRevision`) inside `$transaction`, then creates version `expectedRevision + 1`. Under `READ COMMITTED` the loser's `updateMany` re-evaluates to `count = 0` after the row lock releases, returning `conflict` → `409 RESUME_EDIT_CONFLICT` with `currentRevision`. The `(resumeId, versionNumber)` unique index is the backstop if CAS ever passes twice.
- **Quotas:** 50 resumes/user (counted as library rows only), 100 versions/resume, 64 KB serialized JSON, per-field and per-array bounds, unknown keys rejected. Enforced server-side in the validator/service, not only in DTOs.
- **Deletion:** one transaction deletes versions and findings, then soft-deletes the resume. Version content is irreversibly destroyed — intended, and documented in the UI confirm step.
- **Logging:** no `Logger` or `console` usage anywhere in `src/modules/resumes/library/`. Content is never logged; error bodies carry codes, not content.
- **Minor:** `currentVersions` filters `resumeId IN (...) AND versionNumber IN (...)`, a cross-product rather than per-resume pairing. Harmless with contiguous versions, but a corrupt row could be matched to the wrong resume in the map. Low risk; note for a future hardening pass.

### 19.7 Automated verification (GATE-01)

| Check | Command | Result |
|---|---|---|
| Drizzle emitted SQL | `drizzle.mock().select().from(resumes).toSQL()` | Only pre-existing columns; `revision`/`updated_at` gone |
| Frontend types | `npx tsc --noEmit` | exit 0 |
| Frontend helper suites | `node --test test/res-003a-resume-library.test.mjs test/res-ux-001-resume-workspace.test.mjs` | 20 passed, 0 failed |
| Backend full suite (jest invoked directly — no `prebuild`, no `setupFiles`, no `process.env`/`dotenv` in any spec) | `npm test` | 16 suites, 98 tests passed, 0 failed |
| Git state of the reverted file | `git status --porcelain -- src/db/schema.ts` | empty |

### 19.8 Blocked by the environment-file restriction

Marked **blocked**, not passed:

- Any dashboard request against a real database (needs a live connection and `.env`).
- `prisma generate`, `prisma migrate status`/`diff`, `npm run build`, `next build`, `next dev`.
- Every library endpoint end-to-end, real `409` behaviour under true concurrency, cascade deletion against real rows.
- Browser acceptance of the library UI.
- Confirmation of the Next.js `/api/v1/*` rewrite against a running backend.

Emitted-SQL and mock-based checks are **not** reported as a live database or browser pass.

### 19.9 User-run migration approval and rollback preparation

1. Confirm a verified backup exists for the target database (Supabase snapshot or `pg_dump -Fc`); record the timestamp.
2. Confirm `_prisma_migrations` shows the three earlier migrations finished, with no failed rows.
3. Record pre-apply baselines: `SELECT count(*) FROM resumes;`, `SELECT count(*) FROM resume_findings;`, `SELECT count(*) FROM resumes WHERE "storageKey" IS NULL OR "fileSizeBytes" IS NULL OR "mimeType" IS NULL;` (expect `0`), and `SHOW server_version;`.
4. Snapshot column state: `SELECT column_name, is_nullable, data_type FROM information_schema.columns WHERE table_name = 'resumes' ORDER BY ordinal_position;` — `"storageKey"`, `"fileSizeBytes"`, `"mimeType"` must be `NOT NULL`, and `revision`/`"updatedAt"` must be absent.
5. Apply in a maintenance window: `npx prisma migrate deploy` (never `migrate dev`, `db push`, or `migrate reset`). Do not edit the file afterwards — the `_prisma_migrations` checksum must keep matching.
6. Verify after apply: `resume_versions` exists with its unique index and FK; every pre-existing `resumes` row has `revision = 1`; the three metadata columns are nullable now; the `_prisma_migrations` row is finished.
7. Re-run the ownership/versioning suites, then run `prisma generate` deliberately (it loads `.env`), and remove `resume-library.database.ts` in a separate follow-up change.
8. If the application misbehaves after apply, pick a recovery path from **§20.4** and treat it as an incident decision. This document deliberately contains **no ready-to-run destructive rollback script**: reverting an applied schema change needs a validated backup, a specific incident, and a separately reviewed migration. `prisma migrate resolve --rolled-back` is **not** a general rollback command (see §20.4).
9. Post-apply sanity: create → save → conflict → duplicate → delete as one user, and confirm a second user gets `404` for the same id.

### 19.10 Manual end-to-end acceptance cases after migration

1. `/resume` shows the analyzer workspace and a real library empty state — no fabricated records.
2. `POST /resumes/library` creates the record plus version 1; the list shows name, revision and target-role label.
3. Two tabs save on the same revision: the first succeeds (revision 2), the second returns `409 RESUME_EDIT_CONFLICT` and the UI offers reload instead of overwriting.
4. Version history lists versions newest-first; opening an old version shows its content and stays read-only.
5. Duplicate with a new role label creates a separate record at version 1; the original is unchanged.
6. Rename changes the display name only — revision and version count stay the same.
7. Delete asks for confirmation, removes the record, and a repeated request returns `404`.
8. A second user cannot read, rename, duplicate, save to, or delete the first user's ids (`404`).
9. Oversized payloads and unknown keys are rejected with `400` and stable codes.
10. The dashboard still loads, and "Imported file records" contains only analyzer uploads (see §8.4).
11. An analyzer run still produces analysis and never writes to the library.

### 19.11 Files changed in GATE-01

| File | Change |
|---|---|
| `CareerTracker-Frontend/src/db/schema.ts` | Reverted the `revision` / `updatedAt` / `resumeVersions` declarations; net no diff from the committed state. |
| `CareerTracker-Frontend/docs/implementation/RES-003A-secure-private-resume-library.md` | Corrected §8.1, expanded §8.3, added §8.4, corrected the env-access claim in §14, added GATE-01 verification commands and this section. |

No backend file was modified in GATE-01. Pre-existing untracked work (library module, migration draft, analyzer evaluation files, frontend components/hooks/tests) was left untouched.

### 19.12 Gate confirmations

- **Authentication untouched:** no Firebase, NestJS auth, JWT, refresh, CSRF, cookie, `AuthSession`, login/logout or guard file was modified; the library reuses `JwtAuthGuard` + `ActiveSessionGuard` as-is.
- **No real environment file** was read, printed, searched, parsed or modified; only `.env.example` was opened.
- **No database operation** of any kind was performed — no connection, migration, seed, query or mutation.
- **No dependency added** and no resume-editor work started.
- **No Git commit, push, reset, rebase or merge** was created.

---

## 20. RES-003A-GATE-02 — legacy history compatibility and migration release readiness

Narrow follow-up to GATE-01. No editor work, no architecture rewrite, no database access.

### 20.1 Exact issue and root cause

`GET /resumes` and the library share the `resumes` table. The library reuses that table for structured records that have **no uploaded file**, while `GET /resumes` still promises `fileSizeBytes: number` and `mimeType: string` to the frontend history UI.

Root cause: `ResumesService.getResumeRecords` filtered only on `{ userId, deletedAt: null }`. Nothing in that predicate distinguishes a file-backed upload from a structured library record, so after the migration the legacy endpoint would return library rows whose file metadata is `NULL`. Before the migration the collision was latent — library rows cannot exist until the `revision` column exists — which is why the bug only surfaces at apply time.

The frontend had a partial shield (`LegacyRecords` subtracts known library ids), but it depends on the library request succeeding: if `/resumes/library` fails, the shield disappears and `null / 1024` renders as `0 KB`. That is a UI workaround, not a contract.

Source-level relationship between the two record kinds:

| Element | Legacy upload | Structured library record |
|---|---|---|
| Row in `resumes` | `storageKey` set, file metadata set | `storageKey = NULL`, file metadata `NULL`, `status = PENDING` |
| Child rows | `resume_findings` | `resume_versions` (at least one, contiguous from 1) |
| Listed by | `GET /resumes` | `GET /resumes/library` |
| Discriminator | `storageKey IS NOT NULL` | `versions: { some: {} }` |
| Written by | analyzer upload/analyze path | `/resumes/library/*` only |
| Mutable by | no library endpoint | no analyzer endpoint |

### 20.2 Chosen solution

Add one ownership-scoped predicate to the legacy query:

```ts
where: { userId, deletedAt: null, storageKey: { not: null } }
```

Why `storageKey` and not the alternatives:

| Option | Verdict |
|---|---|
| `storageKey: { not: null }` | **Chosen.** The column *means* "a file is stored". It exists in every schema state. Pre-migration it is `NOT NULL`, so the predicate is a no-op; post-migration library rows are exactly the rows with `storageKey IS NULL`. No dependency on `resume_versions`. |
| `versions: { none: {} }` | **Rejected.** It queries `resume_versions`, which does not exist until the migration is applied, so `GET /resumes` would fail today. It also inverts the library's own predicate, coupling the two modules to each other's table. |
| Filter in the frontend | **Rejected.** The endpoint contract would remain broken for any other consumer, and the UI would need to guess what a legacy record is. |
| New `kind`/`origin` column | **Out of scope.** Requires a schema change and backfill for a distinction the existing column already encodes. Worth considering only if library rows ever gain files. |
| Filter on `fileSizeBytes` / `mimeType` | **Not added.** Those columns only became nullable in this same migration, and a row with a `storageKey` but missing metadata is not produced by any code path. Filtering on them would silently hide a historical upload; `storageKey` is the honest discriminator. |

The endpoint path, guards, response fields, ordering and `include: { findings: true }` are unchanged.

### 20.3 Source files changed

| File | Change |
|---|---|
| `CareerTracker-Backend/src/modules/resumes/resumes.service.ts` | Added `storageKey: { not: null }` to the legacy `where`; documented why it is schema-state independent. No other behaviour touched. |
| `CareerTracker-Backend/src/modules/resumes/resumes.service.spec.ts` | **New** — 8 synthetic regression tests (§20.5). |
| `CareerTracker-Frontend/docs/implementation/RES-003A-secure-private-resume-library.md` | Rewrote §8.4, softened the Drizzle connection claim in §19.4, removed the destructive rollback script from §19.9, added this section. |
| `CareerTracker-Frontend/docs/API_CONTRACT.md` | Noted that `GET /resumes` remains uploads-only and how it relates to the library. |

No authentication file, guard, applied migration, Drizzle schema, dashboard route or dependency was modified.

### 20.4 Migration release and recovery guidance

Four situations are often conflated. They need different actions, and only one of them involves `prisma migrate resolve`.

**1. A migration failed *while applying***

- Prisma records the row as `failed` in `_prisma_migrations` and stops; some statements may already have run.
- Inspect the real schema state (`information_schema.columns`, whether `resume_versions` exists) instead of assuming either outcome.
- If the partial changes were manually undone and the file itself is still correct, `npx prisma migrate resolve --rolled-back <migration>` marks it as not applied so it can be retried. **This is the only supported use of `--rolled-back`:** it edits migration history, it does not undo SQL.
- If the file was wrong, fix the file only when it was never successfully applied to a shared database; otherwise add a corrective migration.

**2. Reverting a change that applied *successfully***

- Prisma Migrate has no `down`. `migrate resolve --rolled-back` is **not** the tool here: the migration really is applied, and marking it rolled back desynchronises history from the schema, so the next deploy tries to re-apply it and fails.
- The supported approach is a **new forward migration** that reverses the change (for example a new `..._revert_resume_library_versions`), reviewed and applied like any other migration.
- Re-adding `NOT NULL` to `storageKey`/`fileSizeBytes`/`mimeType` is only possible once no library rows exist; that data loss must be an explicit, separately signed-off decision — it is not a routine rollback.

**3. Restoring a database backup**

- For a bad *data* outcome rather than a schema bug, restore the validated snapshot; the schema and `_prisma_migrations` come back with it.
- Verify migration history matches the restored schema before restarting the application, and accept that writes after the snapshot are lost. Founder approval and a maintenance window are required.

**4. Deploying a forward corrective migration**

- Preferred for code-level defects. GATE-02 is exactly this case: the fix is a query predicate, so **no schema change is needed** — no migration is generated, applied or reverted for it.

**Development-only sequence (founder runs this in a separate, explicitly approved step)**

1. Stop the backend so nothing writes during apply.
2. Back up: Supabase snapshot or `pg_dump -Fc`; record the timestamp and the restore command.
3. Record baselines: row counts for `resumes`/`resume_findings`, `SHOW server_version;`, the `information_schema.columns` snapshot for `resumes`, and the `_prisma_migrations` rows.
4. `npx prisma migrate deploy` (never `migrate dev`, `db push`, `migrate reset`). Confirm the new history row is `finished`.
5. Run `npx prisma generate` deliberately — it reads `.env`, so it must not be a build side effect.
6. Restart the backend and confirm boot plus `GET /health`.
7. Run the regression suites and the manual acceptance list in §20.8.
8. If anything fails, stop and choose one of situations 1–4. No ad-hoc SQL, no script from this document — none is provided on purpose.

### 20.5 Regression tests added

`src/modules/resumes/resumes.service.spec.ts` — in-memory fake that honours the same `where` predicates as Prisma, plus a `Proxy` that throws if anything reads `database.resumeVersion`. No database, no `.env`, no network, synthetic content only.

| Test | Requirement covered |
|---|---|
| Returns an uploaded-file record with file metadata and findings | Legacy upload appears in `GET /resumes` |
| Keeps structured library resumes out of legacy history | Library record excluded; every returned row has numeric size and string mime type |
| Excludes a row that has a name but no stored file | Missing/nullable metadata cannot become a misleading UI record |
| Preserves every record under the pre-migration state (`storageKey NOT NULL`) | Old-schema compatibility; predicate is a no-op |
| Stays owner-scoped | One user never sees another user's uploads |
| Keeps soft-deleted uploads excluded | Soft-delete scoping preserved |
| Filters without touching `resume_versions` | No dependency on the new table; also asserts the `where` shape contains no `versions` key |
| Structured resume remains available via the library path | Excluded record is still readable through `ResumeLibraryService` |

Results:

- `npm test -- --testPathPattern="resumes.service.spec"` → **1 suite, 8 tests passed**.
- `npm test` (full backend suite) → **17 suites, 106 tests passed, 0 failed** (was 16/98; +1 suite, +8 tests).
- Frontend `npx tsc --noEmit` → exit 0.
- `node --test test/res-003a-resume-library.test.mjs test/res-ux-001-resume-workspace.test.mjs` → **20 passed, 0 failed**.

Analyzer and library suites are unchanged and still green. No mock or in-memory result is reported as a live database or browser pass.

### 20.6 Database schema states supported

| State | Legacy `GET /resumes` behaviour | Library behaviour |
|---|---|---|
| **Pre-migration** (current): `storageKey NOT NULL`, no `resume_versions`, no `revision`/`updatedAt` | Predicate `storageKey IS NOT NULL` matches every row — identical to before this change. No reference to the missing table or columns. | Fails safely at the database (missing `revision` column); the UI shows its retryable error state and fabricates nothing. |
| **Post-migration**: `storageKey` nullable, `resume_versions` present | Library rows (`storageKey IS NULL`) excluded; all uploads preserved. | Fully functional. |
| **Mid-apply / partial** | Not claimed. Treated as an incident state — see §20.4. | Not claimed. |

### 20.7 Remaining pre-application checks

These must still be confirmed against the real database by the founder; nothing here was verified at runtime.

1. The database was built by the checked-in migration chain and has no `db push` drift.
2. `resumes."storageKey"`, `"fileSizeBytes"`, `"mimeType"` are `NOT NULL`, and `revision`/`"updatedAt"` are absent.
3. `resumes_userId_deletedAt_idx` does not already exist.
4. PostgreSQL 11+ (`SHOW server_version;`) so the `ADD COLUMN` defaults do not rewrite the table.
5. No long-running transaction holds `resumes` while the `ACCESS EXCLUSIVE` lock is taken.
6. A validated backup exists and the restore path has been read at least once.
7. `prisma/schema.prisma` and the migration SQL still agree, and the migration file will not be edited after apply.
8. The generated Prisma client matches the schema you intend to deploy (see §20.9).

### 20.8 Manual acceptance after migration

Run through the library flows in §19.10, plus these legacy-history checks:

1. `GET /resumes` returns only records that have a stored file — no library record appears in "Imported file records".
2. Every returned record shows a real size in KB and a real version number (no `0 KB`).
3. A library resume created after migration is absent from `GET /resumes` but present in `GET /resumes/library` with its content and version history.
4. The dashboard still loads after the change.
5. Existing historical uploads (created before the migration) all still appear.
6. Second user sees none of the first user's uploads or library records.

### 20.9 Known limitations

1. **Not runtime-verified.** All GATE-02 evidence is source inspection plus synthetic tests. No database, browser or live endpoint was exercised.
2. **`storageKey` is a semantic discriminator, not a constraint.** Nothing in the schema prevents a future file-backed row from being written with a null `storageKey`, or a library row from being given one. A `kind`/`origin` column would be stronger; that is a schema change and was deliberately not made.
3. **Rows with a storage key but nulled file metadata** are not produced by any code path, so they are not filtered out. If data repair ever creates one, it would appear in history with missing size/type. Documented rather than silently hidden.
4. **Generated Prisma client is already ahead of the database.** `node_modules/.prisma/client` on this machine already contains `ResumeVersion`, `revision` and `updatedAt` (an earlier `npm run build` ran `prisma generate` against the modified schema). That means the backend will attempt real queries against columns that do not exist until the migration is applied — expected, and the reason library calls fail cleanly today. It also means `resume-library.database.ts` may already be removable; that is a separate, reviewed cleanup, not part of this gate. Anyone on a stale client must run `prisma generate` before typechecking, because `storageKey: { not: null }` only typechecks once the field is nullable.
5. **`GET /resumes` still returns legacy rows to any consumer**, and the frontend keeps its id-based de-duplication in `LegacyRecords`. The backend predicate now makes that workaround redundant, but removing frontend code was out of scope.
6. **No runtime proof of database topology.** See §20.10.
7. **No cleanup of `tsconfig.tsbuildinfo`** (already modified in the worktree before this gate).

### 20.10 Drizzle architecture — source-level separation only

What the source shows:

- `src/db/index.ts` builds a `pg` `Pool` from `process.env.DATABASE_URL` (falling back to a local default) and wraps it with `drizzle()`. Dashboard reads live in `src/lib/server/queries.ts`; `ensureSeed()` writes demo rows through the same client.
- The Resume Library and every other feature call the NestJS backend over HTTP (`NEXT_PUBLIC_API_URL` / `/api/v1` rewrite), where Prisma owns persistence.
- The two schema definitions are incompatible in naming: Drizzle uses `file_name`, `created_at`, `why_it_matters`; Prisma uses quoted `"fileName"`, `"createdAt"`, `"whyItMatters"`. They cannot describe the same physical table.

What the source does **not** prove: whether both clients resolve to the same server or database at runtime. `DATABASE_URL` is shared by name, so only runtime configuration (which must not be read here) could settle it. Treat the deployment topology as **unverified**; the GATE-01 regression argument never depended on it, because the added Drizzle columns were wrong under either topology.

What is intentionally **not** changed: Drizzle schema, dashboard routes, credentials, auth.

Future-work recommendation only (not started): consolidate dashboard reads behind the NestJS API so one schema is authoritative; it needs its own migration plan, permission model and tests before any table moves.

### 20.11 GATE-02 confirmations

- **Authentication unchanged:** no Firebase, NestJS auth, JWT, refresh, cookie, CSRF, `AuthSession`, login/logout or guard file touched. `GET /resumes` keeps `@UseGuards(JwtAuthGuard)` and the same `req.user.id` ownership source.
- **No real environment file** was read, printed, searched, parsed or modified; only `.env.example` was opened. No `npm run build`, `prisma generate`, `prisma migrate*`, `db push`, seed or dev server was run. Test scripts were inspected first: `npm test` invokes the jest binary directly, `jest.config.js` has no `setupFiles`/`globalSetup`, and no spec reads `process.env` or `dotenv`.
- **No database operation:** no connection to PostgreSQL, Supabase or Firebase; no migration applied; no data seeded or mutated.
- **No applied migration edited**; `20260921160652_init`, `20261006130000_add_firebase_uid` and `20261104091500_replace_user_jti_with_auth_sessions` are untouched.
- **No Git commit, push, reset, rebase or merge** was created; all pre-existing worktree changes are preserved.
- **No dependency installed** and no editor work started.

---

## 21. Structured resume builder, PDF export and analyzer handoff

This section records the editor phase that followed GATE-02. It is additive: every contract from §1–§20 still holds.

### 21.1 What already existed

- `Resume` / `ResumeVersion` models, structured JSON content (schema v1), optimistic concurrency, ownership checks, quota handling and the nine `/resumes/library` endpoints.
- A private library UI with create, rename, duplicate, delete and version history. Its inline editor only exposed **summary and skills**; everything else in the stored document could not be edited.
- The analyzer workspace, deterministic JD matching, multi-role selection and the qualitative ATS-readability panel. These were not rewritten.

### 21.2 What was completed

1. **Content schema v2** — one optional `layout` object (`pageSize`, `sectionOrder`) added to the unchanged v1 body, so section ordering is a stored property of the resume rather than a UI preference. v1 versions still load; `contentSchemaVersion` is now 2 for new saves.
2. **Full structured editor** — contact/profile, summary, education, experience (with bullets), projects (with technologies), skills, certifications, custom sections, add/remove/reorder everywhere, plus a saved section order.
3. **Split-pane workspace** — independently scrolling form and preview, sticky action bar, mobile Edit/Preview switch that keeps the draft mounted.
4. **Direct PDF export** — a real PDF written in the browser from the same layout engine as the preview. No new dependency.
5. **Analyzer handoff** — one explicit action that copies only evidenced skills into a new private draft.
6. **Regression tests** — 30 new programmatic tests for the document model, PDF geometry and handoff rules.

### 21.3 Editor structure

| File | Responsibility |
|---|---|
| `src/lib/resume-builder.mjs` (+ `.d.mts`) | Pure document model: normalise v1/v2 content, immutable list/section edits, server-mirrored validation with field paths, save payload, fingerprint for dirty checks, evidenced-skill extraction. |
| `src/lib/resume-pdf.mjs` (+ `.d.mts`) | Layout engine (wrapping, pagination, margins, section order) **and** PDF 1.4 writer. Shared by preview and download. |
| `src/components/resume/resume-preview.tsx` | Renders the layout as positioned text/rules on paper-sized pages, scaled to the pane. |
| `src/components/resume/resume-builder.tsx` | Editor state, save/conflict/export, unsaved-change guard, mobile switch, section-order panel. |
| `src/lib/resume-events.mjs` | Tiny event bridge so the analyzer can open a record in the library's builder without owning its state. |
| `src/components/resume/resume-library.tsx` | List/details/rename/duplicate/delete; routes create and edit into the builder. |

Validation is layered: the browser uses `validateResumeDocument` for immediate per-field messages with paths such as `experience.0.title`; the server independently re-validates every field and bound, so nothing depends on the client being honest.

### 21.4 Data flow

```
stored version ──GET /resumes/library/:id──▶ normalizeResumeDocument ──▶ editable draft
                                                        │
                                          layoutResume ─┴─▶ live preview (pages)
                                                        └─▶ renderResumePdf ─▶ Blob download

draft ──validateResumeDocument──▶ content ──POST /versions (expectedRevision)──▶ new version
```

The stored structured document stays canonical. LaTeX is never produced or stored, and the layout object only describes presentation. Adding a template later means adding a renderer over the same document, not a new storage format.

### 21.5 Saving, versioning and drafts

- The editable document is a **draft keyed by the server revision it started from**. When the query returns a newer revision (initial load, reload after a conflict), the stale draft stops applying and the editor shows server state. No effect synchronises state, so there are no cascading renders.
- Saving sends `expectedRevision`; the server accepts only if the revision still matches. On `409 RESUME_EDIT_CONFLICT` the editor keeps the user's text, explains the conflict and offers **Reload latest (discards your edits)** — it never silently overwrites.
- A save always creates a new version. Nothing in the builder can mutate an existing version, and the original uploaded file is never touched.
- `Ctrl/Cmd+S` saves. Closing with unsaved changes asks first; `beforeunload` covers tab close. Save status is explicit (`No unsaved changes` / `Unsaved changes` / `Saving…` / `Saved as Version N` / `Not saved`) and announced via `aria-live`.
- The target role is per-version metadata (`targetRoleLabel`), so one resume can hold versions aimed at different roles; `Duplicate for a role` creates a separate resume instead.
- Role-only changes count as unsaved changes even when the document body is untouched.

### 21.6 PDF export

`renderResumePdf` writes PDF 1.4 directly in the browser — no server round trip, no screenshot, no new dependency:

- **Selectable, searchable text** using the PDF core fonts Helvetica/Helvetica-Bold with `/WinAnsiEncoding`. Nothing is rasterised; there are no image objects and no embedded fonts, so files stay small.
- **Exact page geometry**: A4 `595.28 × 841.89 pt` or US Letter `612 × 792 pt`, 48 pt margins, content never placed outside them.
- **Predictable pagination**: every line is measured before it is placed, long tokens are split, headings are kept with following content, and dates move to their own line instead of colliding with long titles. Multi-page resumes repeat nothing and drop nothing.
- **Deterministic**: preview and download share `layoutResume`, so the page count shown in the preview footer equals the page count in the file (asserted by a test).
- **Limitation**: core fonts are Latin-1. Accented characters survive; characters outside WinAnsi are transliterated (curly quotes/dashes/bullets) or dropped (emoji, CJK). Documented, not silently mangled into images.

Tests cover: file structure and `%EOF`, xref offsets and entry count, absence of images/flate streams, A4 vs Letter media boxes, in-margin text runs, long-token wrapping, multi-page content retention, empty-document page, PDF metacharacter escaping, Latin-1 and dropped-glyph handling, saved section order, and long name/title/heading wrapping.

### 21.7 JD matching versus readability

These remain two separate measurements and are never combined into one number:

- **Job Description Match Score** — alignment between the resume's documented evidence and the selected position's requirements, with required vs preferred priorities, exact source excerpts, unknown qualifications, training-outcome exclusions and role boundaries preserved. The builder does **not** alter or resubmit this score.
- **Resume Readability Assessment** — only properties observable through the supported extraction/rendering checks. It still returns `score: null` with qualitative findings and lists unsupported checks explicitly. No ATS percentage, no hiring probability, and no claim that parser coverage equals resume quality.

The builder's PDF is deliberately single-column, text-based and heading-structured so it is *compatible with* those checks, but the product makes no claim that any specific employer's ATS will parse it perfectly.

### 21.8 Security and privacy

- Ownership is derived from the authenticated principal; no endpoint or component accepts a client-supplied user id. A second user receives `404` for another user's resume id.
- All new content fields are validated server-side: unknown keys at every level, per-field/per-array caps, enum-checked `pageSize`, and a section order restricted to the seven known keys with no duplicates. The whole document is capped at 64 KB.
- Resume text is untrusted data. The preview renders it as React text nodes (never `innerHTML`), the PDF writer escapes `(`, `)` and `\`, and no LaTeX or HTML is interpreted. There is no `dangerouslySetInnerHTML` in the flow.
- Content is never logged; errors are stable codes with human copy.
- Quotas (50 resumes, 100 versions) and soft-delete semantics are unchanged. The legacy upload history stays file-backed only.

### 21.9 Verification performed

| Check | Command | Result |
|---|---|---|
| Backend suite | `npm test` (jest binary, no env loading) | **17 suites, 111 tests passed** (was 106; +5 layout validation tests) |
| Frontend types | `npx tsc --noEmit` | exit 0 |
| Frontend tests | `node --test test/*.test.mjs` | **66 passed, 0 failed** (was 36; +30 new) |
| Lint (touched files) | `npx eslint <changed ts/tsx>` | 0 errors, 0 warnings |

Not run, by constraint: `prisma generate`, `migrate deploy/status`, any DB connection, `next build`, `next dev`, and any real endpoint call. No mock is reported as a live integration pass.

**Manual browser acceptance (founder, after the migration):**

1. `/resume` → Resume library → **New resume** → name it, save → builder opens with version 1.
2. Fill contact, summary, one role with two bullets, education, skills → preview updates live → **Save new version** → status shows `Saved as Version 2`.
3. **Download PDF** → open it: text is selectable/searchable, A4, margins intact, no clipped line; add enough content to cross a page and confirm the second page continues cleanly with no blank page.
4. Edit and close via **Library** → discard prompt appears; cancel keeps the draft.
5. Open the same resume in two tabs, save in tab A, save in tab B → tab B shows the conflict with **Reload latest** and does not overwrite.
6. **Duplicate for a role** → change role label → save → version history lists both role labels.
7. Switch the view to Preview on a narrow window → only one pane shows, draft survives switching back.
8. Run the analyzer, then **Create the copy** → open it in the builder → confirm only evidenced skills are present and no experience/education was invented.

### 21.10 Remaining limitations

1. **Blocked by the unapplied migration** `20261108120000_resume_library_versions`: creating, opening, saving, duplicating and the analyzer handoff all require `resume_versions` + `revision`. Until the founder applies it (§20.4), those actions fail safely with an error state; nothing is fabricated or partially written.
2. **No automated DOM/browser tests** — the repository has no component-testing dependency and none was installed. Model, validation, layout and PDF logic are covered programmatically; layout/behaviour above is listed as manual acceptance, not as a passed browser test.
3. **Latin-1-only PDF text** (see §21.6).
4. **Approximate bold metrics** — bold widths are scaled regular widths, so wrapping errs toward shorter lines; text never overflows, but justification is not attempted.
5. **Template support is single-design** — the layout object covers page size and section order; multiple visual templates would be a follow-up renderer over the same document.
6. **No version restore** — history is inspectable only; restoring would need an explicit new-version flow (deliberately not added to avoid accidental rollbacks).
7. Resume delete/rename still live in the library list, not inside the builder.
