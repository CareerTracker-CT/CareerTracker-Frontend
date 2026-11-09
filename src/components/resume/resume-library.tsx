"use client";

import { useEffect, useState } from "react";
import {
  Copy,
  FileText,
  History,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/feedback";
import { ResumeBuilder } from "@/components/resume/resume-builder";
import {
  useCreateResumeLibrary,
  useDeleteResumeLibrary,
  useDuplicateResumeLibrary,
  useRenameResumeLibrary,
  useResumeLibrary,
  useResumeLibraryDetail,
  useResumeVersions,
  useResumes,
} from "@/hooks/use-api";
import { emptyResumeDocument } from "@/lib/resume-builder.mjs";
import { subscribeResumeOpen } from "@/lib/resume-events.mjs";
import {
  describeResumeLibraryError,
  formatVersionLabel,
  parseSkills,
  sortVersionsDesc,
  summarizeContent,
  validateLibraryDraft,
} from "@/lib/resume-library.mjs";
import { formatDate, relativeTime } from "@/lib/utils";
import type { ResumeContentV1, ResumeLibraryRecord, ResumeRecord } from "@/types";

interface FormErrors {
  name?: string;
  roleLabel?: string;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-[11px] text-bad">
      {message}
    </p>
  );
}

function CreateForm({
  onCreated,
  onCancel,
}: {
  onCreated: (id: string) => void;
  onCancel: () => void;
}) {
  const create = useCreateResumeLibrary();
  const [name, setName] = useState("");
  const [roleLabel, setRoleLabel] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const validation = validateLibraryDraft({ name, roleLabel });
    if (!validation.ok) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    try {
      const created = await create.mutateAsync({
        name: validation.value.name,
        targetRoleLabel: validation.value.roleLabel || undefined,
        content: emptyResumeDocument(),
      });
      onCreated(created.id);
    } catch {
      // The mutation error is rendered below from the mutation state.
    }
  }

  const failure = create.error ? describeResumeLibraryError(create.error) : null;

  return (
    <form
      onSubmit={submit}
      aria-labelledby="create-resume-title"
      className="mt-5 rounded-[12px] border border-rule bg-panel p-5"
    >
      <h3 id="create-resume-title" className="text-[14px] font-semibold text-ink">
        New resume
      </h3>
      <p className="mt-1 text-[11.5px] leading-5 text-warm">
        Creates version 1 with an empty document and opens it in the builder. Nothing else is
        saved until you choose Save.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="new-resume-name" className="label-caps">
            Name
          </label>
          <input
            id="new-resume-name"
            className="field mt-2"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "new-resume-name-error" : undefined}
            autoComplete="off"
            placeholder="Backend engineer — product companies"
          />
          <FieldError id="new-resume-name-error" message={errors.name} />
        </div>
        <div>
          <label htmlFor="new-resume-role" className="label-caps">
            Target role (optional)
          </label>
          <input
            id="new-resume-role"
            className="field mt-2"
            value={roleLabel}
            onChange={(event) => setRoleLabel(event.target.value)}
            placeholder="e.g. Frontend Engineer"
            aria-invalid={Boolean(errors.roleLabel)}
            aria-describedby={errors.roleLabel ? "new-resume-role-error" : undefined}
            autoComplete="off"
          />
          <FieldError id="new-resume-role-error" message={errors.roleLabel} />
        </div>
      </div>
      {failure && (
        <p role="alert" className="mt-4 text-[12px] text-bad">
          {failure.message}
        </p>
      )}
      <div className="mt-5 flex flex-wrap gap-3">
        <Button type="submit" loading={create.isPending} loadingText="Creating…">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Create and open builder
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          <X className="h-4 w-4" aria-hidden="true" />
          Cancel
        </Button>
      </div>
    </form>
  );
}

function DetailPanel({
  id,
  onDeleted,
  onOpenBuilder,
}: {
  id: string;
  onDeleted: () => void;
  onOpenBuilder: () => void;
}) {
  const detail = useResumeLibraryDetail(id);
  const versions = useResumeVersions(id);
  const rename = useRenameResumeLibrary();
  const duplicate = useDuplicateResumeLibrary();
  const remove = useDeleteResumeLibrary();

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState("");
  const [duplicating, setDuplicating] = useState(false);
  const [copyName, setCopyName] = useState("");
  const [copyRole, setCopyRole] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (detail.isLoading) {
    return (
      <div className="mt-1 border-t border-rule px-5 py-4">
        <SkeletonRows rows={3} />
      </div>
    );
  }
  if (detail.isError || !detail.data) {
    const failure = describeResumeLibraryError(detail.error);
    return (
      <div className="mt-1 border-t border-rule px-5 py-4">
        <ErrorState
          title="Could not load this resume"
          description={failure.message}
          onRetry={() => detail.refetch()}
        />
      </div>
    );
  }

  const record = detail.data;
  const content: ResumeContentV1 | null = record.content;
  const counts = summarizeContent(content);

  async function submitRename(event: React.FormEvent) {
    event.preventDefault();
    const validation = validateLibraryDraft({ name: newName });
    if (!validation.ok) {
      setFormErrors({ name: validation.errors.name });
      return;
    }
    try {
      await rename.mutateAsync({ id: record.id, name: validation.value.name });
      setRenaming(false);
      setNewName("");
      setFormErrors({});
    } catch {
      // Rendered below.
    }
  }

  async function submitDuplicate(event: React.FormEvent) {
    event.preventDefault();
    const validation = validateLibraryDraft({ name: copyName || "copy", roleLabel: copyRole });
    if (!validation.ok) {
      setFormErrors(validation.errors);
      return;
    }
    try {
      await duplicate.mutateAsync({
        id: record.id,
        ...(copyName.trim() ? { name: copyName.trim() } : {}),
        ...(copyRole.trim() ? { targetRoleLabel: copyRole.trim() } : {}),
      });
      setDuplicating(false);
      setCopyName("");
      setCopyRole("");
    } catch {
      // Rendered below.
    }
  }

  async function confirmDelete() {
    try {
      await remove.mutateAsync(record.id);
      onDeleted();
    } catch {
      // Rendered below.
    }
  }

  return (
    <div className="mt-1 border-t border-rule px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="navy">{formatVersionLabel(record.currentVersionNumber)}</Badge>
        {record.targetRoleLabel && <Badge>{record.targetRoleLabel}</Badge>}
        <span className="text-[10.5px] text-warm">
          Updated {relativeTime(record.updatedAt)} · {formatDate(record.updatedAt)}
        </span>
        <Button type="button" size="sm" className="ml-auto" onClick={onOpenBuilder}>
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          Edit in the builder
        </Button>
      </div>

      {content?.summary && (
        <p className="mt-3 max-w-[72ch] text-[12.5px] leading-6 text-ink-soft">
          {content.summary}
        </p>
      )}
      <p className="mt-2 text-[11px] text-warm" aria-label="Sections in this version">
        {counts.experience} experience · {counts.education} education · {counts.projects}{" "}
        projects · {counts.skills} skills · {counts.certifications} certifications
        {counts.sections > 0 ? ` · ${counts.sections} extra sections` : ""}
      </p>
      {(content?.skills ?? []).length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Skills in this version">
          {(content?.skills ?? []).map((skill) => (
            <li key={skill}>
              <Badge>{skill}</Badge>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5">
        <h3 className="label-caps flex items-center gap-2">
          <History className="h-3.5 w-3.5" aria-hidden="true" />
          Version history
        </h3>
        {versions.isLoading ? (
          <p className="mt-2 text-[11.5px] text-warm">Loading versions…</p>
        ) : versions.isError ? (
          <p role="alert" className="mt-2 text-[11.5px] text-bad">
            Version history is unavailable.{" "}
            <button type="button" onClick={() => versions.refetch()} className="underline">
              Retry
            </button>
          </p>
        ) : (
          <ol className="mt-2 divide-y divide-rule rounded-[10px] border border-rule">
            {sortVersionsDesc(versions.data ?? []).map((version) => (
              <li key={version.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                <span className="text-[11.5px] font-medium text-ink">
                  {formatVersionLabel(version.versionNumber)}
                </span>
                {version.versionNumber === record.currentVersionNumber && (
                  <Badge tone="good">Current</Badge>
                )}
                {version.targetRoleLabel && <Badge>{version.targetRoleLabel}</Badge>}
                <span className="ml-auto text-[10.5px] text-warm">
                  {formatDate(version.createdAt)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {renaming ? (
          <form onSubmit={submitRename} className="flex flex-wrap items-center gap-2">
            <label htmlFor={`rename-${id}`} className="sr-only">
              New name
            </label>
            <input
              id={`rename-${id}`}
              className="field w-[220px]"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              aria-invalid={Boolean(formErrors.name)}
            />
            <Button type="submit" size="sm" loading={rename.isPending}>
              Save name
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setRenaming(false)}
            >
              Cancel
            </Button>
            {rename.error && (
              <span role="alert" className="text-[11.5px] text-bad">
                {describeResumeLibraryError(rename.error).message}
              </span>
            )}
          </form>
        ) : (
          <Button type="button" size="sm" variant="secondary" onClick={() => setRenaming(true)}>
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            Rename
          </Button>
        )}

        {duplicating ? (
          <form onSubmit={submitDuplicate} className="flex flex-wrap items-center gap-2">
            <label htmlFor={`copy-name-${id}`} className="sr-only">
              Copy name (optional)
            </label>
            <input
              id={`copy-name-${id}`}
              className="field w-[200px]"
              placeholder={`${record.name} (copy)`}
              value={copyName}
              onChange={(event) => setCopyName(event.target.value)}
            />
            <label htmlFor={`copy-role-${id}`} className="sr-only">
              Target role for the copy
            </label>
            <input
              id={`copy-role-${id}`}
              className="field w-[200px]"
              placeholder="Target role"
              value={copyRole}
              onChange={(event) => setCopyRole(event.target.value)}
            />
            <Button type="submit" size="sm" loading={duplicate.isPending}>
              Create copy
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setDuplicating(false)}
            >
              Cancel
            </Button>
            {duplicate.error && (
              <span role="alert" className="text-[11.5px] text-bad">
                {describeResumeLibraryError(duplicate.error).message}
              </span>
            )}
          </form>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setDuplicating(true)}
          >
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            Duplicate for a role
          </Button>
        )}

        {confirmingDelete ? (
          <span className="flex flex-wrap items-center gap-2" role="group" aria-label="Confirm deletion">
            <span className="text-[11.5px] text-bad">Delete this resume and all its versions?</span>
            <Button
              type="button"
              size="sm"
              variant="danger"
              loading={remove.isPending}
              onClick={confirmDelete}
            >
              Yes, delete
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setConfirmingDelete(false)}
            >
              Keep it
            </Button>
            {remove.error && (
              <span role="alert" className="text-[11.5px] text-bad">
                {describeResumeLibraryError(remove.error).message}
              </span>
            )}
          </span>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="danger"
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}

function LegacyRecords({ libraryIds }: { libraryIds: Set<string> }) {
  const { data, isError } = useResumes();
  if (isError || !data) return null;
  const legacy = data.filter((record: ResumeRecord) => !libraryIds.has(record.id));
  if (legacy.length === 0) return null;
  return (
    <details className="mt-5 rounded-[12px] border border-rule bg-panel px-5 py-4">
      <summary className="cursor-pointer text-[12px] font-medium text-ink">
        Imported file records ({legacy.length}) — read only
      </summary>
      <p className="mt-1.5 text-[11px] leading-5 text-warm">
        Uploads from the analyzer&apos;s earlier history. Saving, editing and versioning apply to
        library resumes above.
      </p>
      <ul className="mt-3 divide-y divide-rule">
        {legacy.map((record) => (
          <li key={record.id} className="flex flex-wrap items-center gap-3 py-2.5">
            <FileText className="h-4 w-4 shrink-0 text-navy" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block truncate text-[12px] font-medium text-ink">
                {record.fileName}
              </span>
              <span className="mt-0.5 block text-[10px] text-warm">
                v{record.version} · {(record.fileSizeBytes / 1024).toFixed(0)} KB ·{" "}
                {formatDate(record.createdAt)}
              </span>
            </span>
            {record.isCurrent && (
              <Badge tone="good" className="ml-auto">
                Current
              </Badge>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}

/**
 * RES-003A private resume library. Kept separate from the analyzer workspace
 * above it: the analyzer never saves; this section only shows and edits records
 * the user explicitly saved here. Opening a resume replaces the list with the
 * split-pane builder so the editor gets the full column width.
 */
export function ResumeLibrary() {
  const { data: records, isLoading, isError, refetch } = useResumeLibrary();
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [builderId, setBuilderId] = useState<string | null>(null);

  useEffect(
    () =>
      subscribeResumeOpen((id) => {
        setCreating(false);
        setOpenId(null);
        setBuilderId(id);
      }),
    [],
  );

  if (builderId) {
    return (
      <ResumeBuilder
        id={builderId}
        onClose={() => {
          setBuilderId(null);
          void refetch();
        }}
      />
    );
  }

  return (
    <section aria-labelledby="resume-library-title" className="mt-14 border-t border-rule pt-9">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[74ch]">
          <p className="label-caps text-navy">Private library</p>
          <h2 id="resume-library-title" className="mt-2 text-[19px] font-semibold text-ink">
            Resume library
          </h2>
          <p className="mt-1.5 text-[11.5px] leading-5 text-warm">
            Only you can see these resumes. The builder saves a new version every time; renaming
            never changes content. The analysis workspace above is temporary and never writes
            here.
          </p>
        </div>
        <div className="flex gap-2">
          {isError && (
            <Button type="button" size="sm" variant="secondary" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Retry
            </Button>
          )}
          <Button type="button" size="sm" onClick={() => setCreating((value) => !value)}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            New resume
          </Button>
        </div>
      </div>

      {creating && (
        <CreateForm
          onCancel={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            setOpenId(null);
            setBuilderId(id);
          }}
        />
      )}

      {isLoading ? (
        <div className="mt-5 rounded-[12px] border border-rule bg-panel p-5">
          <SkeletonRows rows={3} />
        </div>
      ) : isError ? (
        <div className="mt-5">
          <ErrorState
            title="Your resume library is unavailable"
            description="The failure is safe to retry. The analysis workspace above is unaffected."
            onRetry={() => refetch()}
          />
        </div>
      ) : records && records.length > 0 ? (
        <div className="mt-5 overflow-hidden rounded-[12px] border border-rule bg-panel">
          {records.map((record: ResumeLibraryRecord, index: number) => (
            <article
              key={record.id}
              className={index < records.length - 1 ? "border-b border-rule" : ""}
            >
              <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <FileText className="h-4 w-4 shrink-0 text-navy" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium text-ink">{record.name}</p>
                    <p className="mt-1 text-[10px] text-warm">
                      {formatVersionLabel(record.currentVersionNumber)} · {record.versionCount}{" "}
                      {record.versionCount === 1 ? "version" : "versions"} ·{" "}
                      {relativeTime(record.updatedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {record.targetRoleLabel && <Badge tone="navy">{record.targetRoleLabel}</Badge>}
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    aria-expanded={openId === record.id}
                    onClick={() => setOpenId(openId === record.id ? null : record.id)}
                  >
                    {openId === record.id ? "Close" : "Details"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setCreating(false);
                      setBuilderId(record.id);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    Edit
                  </Button>
                </div>
              </div>
              {openId === record.id && (
                <DetailPanel
                  key={`${record.id}:${record.revision}`}
                  id={record.id}
                  onDeleted={() => setOpenId(null)}
                  onOpenBuilder={() => {
                    setCreating(false);
                    setBuilderId(record.id);
                  }}
                />
              )}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          className="mt-5"
          title="No resumes saved yet"
          description="Create your first library resume above. Uploading in the analysis workspace does not save anything here."
          action={
            <Button type="button" size="sm" onClick={() => setCreating(true)}>
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Create a resume
            </Button>
          }
        />
      )}

      <LegacyRecords libraryIds={new Set((records ?? []).map((record) => record.id))} />
    </section>
  );
}

// Re-exported so parseSkills stays part of the documented helper surface.
export { parseSkills };
