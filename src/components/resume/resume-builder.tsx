"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Download,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ResumePreview } from "@/components/resume/resume-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState, SkeletonRows } from "@/components/ui/feedback";
import { useResumeLibraryDetail, useSaveResumeVersion } from "@/hooks/use-api";
import {
  DOCUMENT_LIMITS,
  PAGE_DIMENSIONS,
  PAGE_SIZES,
  SECTION_LABELS,
  appendListItem,
  documentFingerprint,
  documentStats,
  moveInList,
  moveSection,
  newEducationItem,
  newExperienceItem,
  newProjectItem,
  newSection,
  normalizeResumeDocument,
  orderedSections,
  removeListItem,
  replaceInList,
  slugifyFileName,
  updateListItem,
  validateResumeDocument,
} from "@/lib/resume-builder.mjs";
import type {
  DocumentError,
  PageSize,
  ResumeDocument,
  SectionKey,
} from "@/lib/resume-builder.mjs";
import { resumePdfBlob } from "@/lib/resume-pdf.mjs";
import { describeResumeLibraryError, formatVersionLabel } from "@/lib/resume-library.mjs";
import { cn } from "@/lib/utils";

type SaveStatus = "clean" | "dirty" | "saving" | "saved" | "error";

/** Editable copy of one server revision, kept only while it is still current. */
type Draft = {
  revision: number;
  doc: ResumeDocument;
  baseline: string;
  role: string;
  roleBaseline: string;
};

const STATUS_COPY: Record<SaveStatus, string> = {
  clean: "No unsaved changes",
  dirty: "Unsaved changes",
  saving: "Saving…",
  saved: "Saved",
  error: "Not saved",
};

function errorMap(errors: DocumentError[]) {
  const map = new Map<string, string>();
  for (const error of errors) {
    if (!map.has(error.path)) map.set(error.path, error.message);
  }
  return map;
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "btn-base inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] border border-rule text-ink-soft transition-colors hover:border-rule-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-35",
        danger && "hover:border-bad/50 hover:text-bad",
      )}
    >
      {children}
    </button>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button type="button" size="sm" variant="secondary" onClick={onClick}>
      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </Button>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  placeholder,
  type = "text",
  autoComplete = "off",
  maxLength,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  maxLength?: number;
  hint?: string;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="label-caps">
        {label}
      </label>
      <input
        id={id}
        type={type}
        className="field mt-1.5"
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        maxLength={maxLength}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-[11px] leading-4 text-bad">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-[10.5px] leading-4 text-warm">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function TextArea({
  id,
  label,
  value,
  onChange,
  error,
  rows = 3,
  hint,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  rows?: number;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="label-caps">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        className="field mt-1.5"
        value={value}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-[11px] leading-4 text-bad">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-[10.5px] leading-4 text-warm">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Repeatable single-line values (bullets, links, lines, technologies). */
function LineList({
  id,
  label,
  values,
  onChange,
  error,
  addLabel = "Add line",
  placeholder,
}: {
  id: string;
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  error?: string;
  addLabel?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="label-caps" id={`${id}-label`}>
          {label}
        </span>
        <AddButton label={addLabel} onClick={() => onChange(appendListItem(values, ""))} />
      </div>
      <ul className="mt-2 space-y-1.5" aria-labelledby={`${id}-label`}>
        {values.length === 0 && <li className="text-[11px] text-warm">Nothing added yet.</li>}
        {values.map((value, index) => (
          <li key={index} className="flex items-center gap-1.5">
            <input
              aria-label={`${label}, item ${index + 1}`}
              className="field min-w-0 flex-1"
              value={value}
              placeholder={placeholder}
              onChange={(event) => onChange(replaceInList(values, index, event.target.value))}
            />
            <IconButton
              label={`Move ${label} item ${index + 1} up`}
              disabled={index === 0}
              onClick={() => onChange(moveInList(values, index, -1))}
            >
              <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
            </IconButton>
            <IconButton
              label={`Move ${label} item ${index + 1} down`}
              disabled={index === values.length - 1}
              onClick={() => onChange(moveInList(values, index, 1))}
            >
              <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
            </IconButton>
            <IconButton
              label={`Remove ${label} item ${index + 1}`}
              danger
              onClick={() => onChange(removeListItem(values, index))}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </IconButton>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="mt-1.5 text-[11px] leading-4 text-bad">
          {error}
        </p>
      )}
    </div>
  );
}

function ItemCard({
  heading,
  label,
  index,
  count,
  onMove,
  onRemove,
  children,
}: {
  heading: string;
  label: string;
  index: number;
  count: number;
  onMove: (delta: number) => void;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <li className="rounded-[10px] border border-rule bg-paper/50 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11.5px] font-medium text-ink">{heading}</p>
        <div className="flex items-center gap-1">
          <IconButton
            label={`Move ${label} up`}
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
          </IconButton>
          <IconButton
            label={`Move ${label} down`}
            disabled={index === count - 1}
            onClick={() => onMove(1)}
          >
            <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
          </IconButton>
          <IconButton label={`Remove ${label}`} danger onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </IconButton>
        </div>
      </div>
      <div className="mt-3">{children}</div>
    </li>
  );
}

function Panel({
  id,
  title,
  description,
  action,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={`panel-${id}`}
      className="rounded-[12px] border border-rule bg-panel p-4 sm:p-[18px]"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 id={`panel-${id}`} className="text-[13px] font-semibold text-ink">
            {title}
          </h3>
          {description && (
            <p className="mt-1 text-[10.5px] leading-4 text-warm">{description}</p>
          )}
        </div>
        {action}
      </div>
      <div className="mt-3.5">{children}</div>
    </section>
  );
}

export function ResumeBuilder({ id, onClose }: { id: string; onClose: () => void }) {
  const detail = useResumeLibraryDetail(id);
  const save = useSaveResumeVersion();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [status, setStatus] = useState<SaveStatus>("clean");
  const [note, setNote] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [exportNote, setExportNote] = useState("");
  const [confirmingClose, setConfirmingClose] = useState(false);

  const data = detail.data;
  const loadedDoc = useMemo(
    () => (data ? normalizeResumeDocument(data.content) : null),
    [data],
  );
  // Edits live in a draft keyed by the revision they started from. A newer
  // server revision (reload after a conflict) makes the draft stale, so the
  // editor shows the server state without any effect-driven state syncing.
  // A draft saved from revision N stays current until the server moves past N.
  const active = draft && data && draft.revision >= data.revision ? draft : null;
  const doc = active?.doc ?? loadedDoc;
  const roleLabel = active?.role ?? data?.targetRoleLabel ?? "";
  const revision = active?.revision ?? data?.revision ?? null;

  const validation = useMemo(
    () => (doc ? validateResumeDocument(doc) : null),
    [doc],
  );
  const errors = useMemo(() => errorMap(validation?.errors ?? []), [validation]);
  const documentDirty = Boolean(
    active && documentFingerprint(active.doc) !== active.baseline,
  );
  const roleDirty = Boolean(active && active.role.trim() !== active.roleBaseline.trim());
  const dirty = documentDirty || roleDirty;
  const effectiveStatus: SaveStatus =
    status === "saving" || status === "error"
      ? status
      : dirty
        ? "dirty"
        : status === "saved"
          ? "saved"
          : "clean";
  const stats = useMemo(() => (doc ? documentStats(doc) : null), [doc]);
  const pageSize: PageSize = doc?.layout.pageSize ?? "A4";

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const submit = useCallback(async () => {
    if (!doc || revision === null) return;
    setAttempted(true);
    const result = validateResumeDocument(doc);
    if (!result.ok) {
      setStatus("error");
      setNote(
        `${result.errors.length} ${result.errors.length === 1 ? "field needs" : "fields need"} attention before this can be saved.`,
      );
      return;
    }
    setStatus("saving");
    setNote("");
    save.reset();
    try {
      const saved = await save.mutateAsync({
        id,
        expectedRevision: revision,
        ...(roleLabel.trim() ? { targetRoleLabel: roleLabel.trim() } : {}),
        content: result.content,
      });
      const stored = normalizeResumeDocument(saved.content ?? result.content);
      setDraft({
        revision: saved.revision,
        doc: stored,
        baseline: documentFingerprint(stored),
        role: roleLabel,
        roleBaseline: roleLabel,
      });
      setStatus("saved");
      setAttempted(false);
      setNote(`Saved as ${formatVersionLabel(saved.currentVersionNumber)}.`);
    } catch {
      setStatus("error");
    }
  }, [doc, id, revision, roleLabel, save]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "s") return;
      event.preventDefault();
      void submit();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [submit]);

  function freshDraft(): Draft | null {
    if (!data || !loadedDoc) return null;
    const serverRole = data.targetRoleLabel ?? "";
    return {
      revision: data.revision,
      doc: loadedDoc,
      baseline: documentFingerprint(loadedDoc),
      role: serverRole,
      roleBaseline: serverRole,
    };
  }

  function patch(updater: (current: ResumeDocument) => ResumeDocument) {
    setDraft((current) => {
      const base = current && data && current.revision >= data.revision ? current : freshDraft();
      return base ? { ...base, doc: updater(base.doc) } : current;
    });
    setStatus("dirty");
    setExportNote("");
  }

  function changeRole(value: string) {
    setDraft((current) => {
      const base = current && data && current.revision >= data.revision ? current : freshDraft();
      return base ? { ...base, role: value } : current;
    });
    setStatus("dirty");
  }

  function exportPdf() {
    if (!doc) return;
    const name = data?.name ?? "resume";
    const blob = resumePdfBlob(doc, { pageSize });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = slugifyFileName(name);
    window.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    setExportNote(`Exported ${slugifyFileName(name)} from the current editor content.`);
  }

  function requestClose() {
    if (dirty) {
      setConfirmingClose(true);
      return;
    }
    onClose();
  }

  if (detail.isLoading || (!doc && !detail.isError)) {
    return (
      <div className="mt-5 rounded-[12px] border border-rule bg-panel p-5">
        <SkeletonRows rows={5} />
      </div>
    );
  }

  if (detail.isError || !doc) {
    return (
      <div className="mt-5">
        <ErrorState
          title="Could not open this resume"
          description={describeResumeLibraryError(detail.error).message}
          onRetry={() => detail.refetch()}
        />
        <div className="mt-3">
          <Button type="button" size="sm" variant="secondary" onClick={onClose}>
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to the library
          </Button>
        </div>
      </div>
    );
  }

  const saveFailure = save.error ? describeResumeLibraryError(save.error) : null;
  const sectionOrder = orderedSections(doc);

  return (
    <div className="mt-5">
      <div className="sticky top-0 z-20 rounded-[12px] border border-rule bg-panel/95 px-4 py-3 backdrop-blur sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <button
              type="button"
              onClick={requestClose}
              className="btn-base inline-flex items-center gap-1.5 text-[11px] text-warm hover:text-ink"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Library
            </button>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="truncate text-[16px] font-semibold text-ink">{data?.name}</h2>
              <Badge tone="navy">
                {formatVersionLabel(revision ?? data?.currentVersionNumber ?? 1)}
              </Badge>
              {roleLabel.trim() && <Badge>{roleLabel.trim()}</Badge>}
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] text-warm">
              <span
                role="status"
                aria-live="polite"
                className={cn(
                  "inline-flex items-center gap-1.5 font-medium",
                  effectiveStatus === "error"
                    ? "text-bad"
                    : effectiveStatus === "saved"
                      ? "text-good"
                      : "text-warm",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    effectiveStatus === "error"
                      ? "bg-bad"
                      : effectiveStatus === "saved"
                        ? "bg-good"
                        : effectiveStatus === "saving" || effectiveStatus === "dirty"
                          ? "bg-warn"
                          : "bg-warm-2",
                  )}
                />
                {effectiveStatus === "saved" && note ? note : STATUS_COPY[effectiveStatus]}
              </span>
              {stats && (
                <span className="text-warm-2">
                  {stats.experience} roles · {stats.education} education · {stats.projects} projects ·{" "}
                  {stats.skills} skills · {stats.words} words
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label="Editor view"
              className="flex rounded-[9px] border border-rule bg-paper p-0.5 lg:hidden"
            >
              {(["edit", "preview"] as const).map((view) => (
                <button
                  key={view}
                  type="button"
                  aria-pressed={mobileView === view}
                  onClick={() => setMobileView(view)}
                  className={cn(
                    "rounded-[7px] px-2.5 py-1.5 text-[11px] font-medium capitalize transition-colors",
                    mobileView === view ? "bg-panel text-ink shadow-sm" : "text-warm",
                  )}
                >
                  {view}
                </button>
              ))}
            </div>

            <label className="sr-only" htmlFor="builder-page-size">
              Page size
            </label>
            <select
              id="builder-page-size"
              className="field h-9 w-[132px] py-0 text-[11.5px]"
              value={pageSize}
              onChange={(event) =>
                patch((current) => ({
                  ...current,
                  layout: { ...current.layout, pageSize: event.target.value as PageSize },
                }))
              }
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size === "A4" ? "A4 (210 × 297)" : "US Letter (8.5 × 11)"}
                </option>
              ))}
            </select>

            <Button type="button" size="sm" variant="secondary" onClick={exportPdf}>
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Download PDF
            </Button>

            <Button
              type="button"
              size="sm"
              loading={effectiveStatus === "saving"}
              loadingText="Saving…"
              onClick={() => void submit()}
            >
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
              {dirty ? "Save new version" : "Save version"}
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-rule pt-3">
          <label htmlFor="builder-role" className="label-caps">
            Target role for this version
          </label>
          <input
            id="builder-role"
            className="field h-8 w-[230px] py-0 text-[11.5px]"
            value={roleLabel}
            maxLength={DOCUMENT_LIMITS.contactField}
            placeholder="e.g. Backend Engineer"
            onChange={(event) => changeRole(event.target.value)}
          />
          <span className="text-[10px] text-warm">
            Stored with the version, not the resume name.
          </span>
        </div>

        {exportNote && (
          <p role="status" className="mt-2 text-[11px] leading-4 text-good">
            {exportNote}
          </p>
        )}
        {note && effectiveStatus === "error" && (
          <p role="alert" className="mt-2 text-[11px] leading-4 text-bad">
            {note}
          </p>
        )}
        {saveFailure && (
          <div role="alert" className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-[11px] leading-4 text-bad">{saveFailure.message}</p>
            {saveFailure.isConflict && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  save.reset();
                  setConfirmingClose(false);
                  setStatus("clean");
                  setNote("");
                  setAttempted(false);
                  setDraft(null);
                  void detail.refetch();
                }}
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Reload latest (discards your edits)
              </Button>
            )}
          </div>
        )}
        {confirmingClose && (
          <div
            role="alertdialog"
            aria-label="Discard unsaved changes"
            className="mt-2 flex flex-wrap items-center gap-2 rounded-[9px] border border-warn/40 bg-warn-wash/40 px-3 py-2"
          >
            <TriangleAlert className="h-4 w-4 text-warn" aria-hidden="true" />
            <p className="text-[11.5px] text-ink">Discard unsaved changes to this resume?</p>
            <Button type="button" size="sm" variant="secondary" onClick={() => setConfirmingClose(false)}>
              Keep editing
            </Button>
            <Button type="button" size="sm" variant="danger" onClick={onClose}>
              Discard and leave
            </Button>
          </div>
        )}
      </div>

      {attempted && !validation?.ok && (
        <div
          role="alert"
          className="mt-4 rounded-[12px] border border-bad/35 bg-bad-wash/40 p-4"
        >
          <p className="text-[12px] font-medium text-bad">
            {validation?.errors.length} {validation?.errors.length === 1 ? "field needs" : "fields need"} attention
          </p>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-[11px] leading-5 text-ink-soft">
            {validation?.errors.slice(0, 5).map((error) => (
              <li key={`${error.path}:${error.message}`}>{error.message}</li>
            ))}
            {(validation?.errors.length ?? 0) > 5 && (
              <li>…and {(validation?.errors.length ?? 0) - 5} more.</li>
            )}
          </ul>
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:items-start">
        <div className={cn("space-y-4", mobileView === "preview" && "hidden lg:block")}>
          <Panel
            id="contact"
            title="Contact and profile"
            description="Rendered at the top of the page. Every field is optional, but a name and one contact method are expected by recruiters."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                id="contact-full-name"
                label="Full name"
                value={doc.contact.fullName}
                error={errors.get("contact.fullName")}
                maxLength={DOCUMENT_LIMITS.contactField}
                autoComplete="name"
                onChange={(value) =>
                  patch((current) => ({
                    ...current,
                    contact: { ...current.contact, fullName: value },
                  }))
                }
              />
              <Field
                id="contact-headline"
                label="Headline"
                value={doc.contact.headline}
                placeholder="Backend Engineer"
                error={errors.get("contact.headline")}
                maxLength={DOCUMENT_LIMITS.contactField}
                onChange={(value) =>
                  patch((current) => ({
                    ...current,
                    contact: { ...current.contact, headline: value },
                  }))
                }
              />
              <Field
                id="contact-email"
                label="Email"
                type="email"
                value={doc.contact.email}
                error={errors.get("contact.email")}
                maxLength={DOCUMENT_LIMITS.email}
                autoComplete="email"
                onChange={(value) =>
                  patch((current) => ({
                    ...current,
                    contact: { ...current.contact, email: value },
                  }))
                }
              />
              <Field
                id="contact-phone"
                label="Phone"
                type="tel"
                value={doc.contact.phone}
                error={errors.get("contact.phone")}
                maxLength={DOCUMENT_LIMITS.phone}
                autoComplete="tel"
                onChange={(value) =>
                  patch((current) => ({
                    ...current,
                    contact: { ...current.contact, phone: value },
                  }))
                }
              />
              <Field
                id="contact-location"
                label="Location"
                value={doc.contact.location}
                error={errors.get("contact.location")}
                maxLength={DOCUMENT_LIMITS.contactField}
                placeholder="London, UK"
                onChange={(value) =>
                  patch((current) => ({
                    ...current,
                    contact: { ...current.contact, location: value },
                  }))
                }
              />
            </div>
            <div className="mt-3">
              <LineList
                id="contact-links"
                label="Links"
                addLabel="Add link"
                placeholder="example.com/portfolio"
                values={doc.contact.links}
                error={errors.get("contact.links")}
                onChange={(links) =>
                  patch((current) => ({
                    ...current,
                    contact: { ...current.contact, links },
                  }))
                }
              />
            </div>
          </Panel>

          <Panel
            id="summary"
            title="Professional summary"
            description="Two or three sentences of documented experience. The analyzer never fills this in for you."
            action={
              <span className="tnum text-[10px] text-warm">
                {doc.summary.length}/{DOCUMENT_LIMITS.summary}
              </span>
            }
          >
            <TextArea
              id="summary-text"
              label="Summary"
              rows={4}
              value={doc.summary}
              error={errors.get("summary")}
              onChange={(value) =>
                patch((current) => ({ ...current, summary: value }))
              }
            />
          </Panel>

          <Panel
            id="experience"
            title="Experience"
            description="Most recent first. Each bullet is a single accomplishment."
            action={
              <AddButton
                label="Add role"
                onClick={() =>
                  patch((current) => ({
                    ...current,
                    experience: appendListItem(current.experience, newExperienceItem()),
                  }))
                }
              />
            }
          >
            {doc.experience.length === 0 ? (
              <p className="text-[11.5px] leading-5 text-warm">
                No roles yet. Add one to start the section.
              </p>
            ) : (
              <ul className="space-y-3">
                {doc.experience.map((entry, index) => (
                  <ItemCard
                    key={index}
                    heading={`Role ${index + 1}${entry.title.trim() ? ` · ${entry.title.trim()}` : ""}`}
                    label={`role ${index + 1}`}
                    index={index}
                    count={doc.experience.length}
                    onMove={(delta) =>
                      patch((current) => ({
                        ...current,
                        experience: moveInList(current.experience, index, delta),
                      }))
                    }
                    onRemove={() =>
                      patch((current) => ({
                        ...current,
                        experience: removeListItem(current.experience, index),
                      }))
                    }
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field
                        id={`experience-${index}-title`}
                        label="Job title"
                        value={entry.title}
                        maxLength={DOCUMENT_LIMITS.entryField}
                        error={errors.get(`experience.${index}.title`)}
                        onChange={(value) =>
                          patch((current) => ({
                            ...current,
                            experience: updateListItem(current.experience, index, { title: value }),
                          }))
                        }
                      />
                      <Field
                        id={`experience-${index}-company`}
                        label="Company"
                        value={entry.company}
                        maxLength={DOCUMENT_LIMITS.entryField}
                        error={errors.get(`experience.${index}.company`)}
                        onChange={(value) =>
                          patch((current) => ({
                            ...current,
                            experience: updateListItem(current.experience, index, { company: value }),
                          }))
                        }
                      />
                      <Field
                        id={`experience-${index}-location`}
                        label="Location"
                        value={entry.location}
                        maxLength={DOCUMENT_LIMITS.entryField}
                        error={errors.get(`experience.${index}.location`)}
                        onChange={(value) =>
                          patch((current) => ({
                            ...current,
                            experience: updateListItem(current.experience, index, { location: value }),
                          }))
                        }
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <Field
                          id={`experience-${index}-start`}
                          label="Start"
                          value={entry.start}
                          maxLength={DOCUMENT_LIMITS.entryField}
                          error={errors.get(`experience.${index}.start`)}
                          onChange={(value) =>
                            patch((current) => ({
                              ...current,
                              experience: updateListItem(current.experience, index, { start: value }),
                            }))
                          }
                        />
                        <Field
                          id={`experience-${index}-end`}
                          label="End"
                          value={entry.end}
                          maxLength={DOCUMENT_LIMITS.entryField}
                          placeholder="Present"
                          error={errors.get(`experience.${index}.end`)}
                          onChange={(value) =>
                            patch((current) => ({
                              ...current,
                              experience: updateListItem(current.experience, index, { end: value }),
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="mt-3">
                      <LineList
                        id={`experience-${index}-bullets`}
                        label="Bullets"
                        addLabel="Add bullet"
                        placeholder="Reduced p95 latency by 40% by adding a covering index."
                        values={entry.bullets}
                        error={errors.get(`experience.${index}.bullets`)}
                        onChange={(bullets) =>
                          patch((current) => ({
                            ...current,
                            experience: updateListItem(current.experience, index, { bullets }),
                          }))
                        }
                      />
                    </div>
                  </ItemCard>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            id="education"
            title="Education"
            description="Institution is required once an entry has any content."
            action={
              <AddButton
                label="Add education"
                onClick={() =>
                  patch((current) => ({
                    ...current,
                    education: appendListItem(current.education, newEducationItem()),
                  }))
                }
              />
            }
          >
            {doc.education.length === 0 ? (
              <p className="text-[11.5px] leading-5 text-warm">No education entries yet.</p>
            ) : (
              <ul className="space-y-3">
                {doc.education.map((entry, index) => (
                  <ItemCard
                    key={index}
                    heading={`Education ${index + 1}${entry.institution.trim() ? ` · ${entry.institution.trim()}` : ""}`}
                    label={`education entry ${index + 1}`}
                    index={index}
                    count={doc.education.length}
                    onMove={(delta) =>
                      patch((current) => ({
                        ...current,
                        education: moveInList(current.education, index, delta),
                      }))
                    }
                    onRemove={() =>
                      patch((current) => ({
                        ...current,
                        education: removeListItem(current.education, index),
                      }))
                    }
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field
                        id={`education-${index}-institution`}
                        label="School or institution"
                        value={entry.institution}
                        maxLength={DOCUMENT_LIMITS.entryField}
                        error={errors.get(`education.${index}.institution`)}
                        onChange={(value) =>
                          patch((current) => ({
                            ...current,
                            education: updateListItem(current.education, index, { institution: value }),
                          }))
                        }
                      />
                      <Field
                        id={`education-${index}-degree`}
                        label="Degree"
                        value={entry.degree}
                        maxLength={DOCUMENT_LIMITS.entryField}
                        error={errors.get(`education.${index}.degree`)}
                        onChange={(value) =>
                          patch((current) => ({
                            ...current,
                            education: updateListItem(current.education, index, { degree: value }),
                          }))
                        }
                      />
                      <Field
                        id={`education-${index}-field`}
                        label="Field of study"
                        value={entry.field}
                        maxLength={DOCUMENT_LIMITS.entryField}
                        error={errors.get(`education.${index}.field`)}
                        onChange={(value) =>
                          patch((current) => ({
                            ...current,
                            education: updateListItem(current.education, index, { field: value }),
                          }))
                        }
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <Field
                          id={`education-${index}-start`}
                          label="Start"
                          value={entry.start}
                          maxLength={DOCUMENT_LIMITS.entryField}
                          error={errors.get(`education.${index}.start`)}
                          onChange={(value) =>
                            patch((current) => ({
                              ...current,
                              education: updateListItem(current.education, index, { start: value }),
                            }))
                          }
                        />
                        <Field
                          id={`education-${index}-end`}
                          label="End"
                          value={entry.end}
                          maxLength={DOCUMENT_LIMITS.entryField}
                          error={errors.get(`education.${index}.end`)}
                          onChange={(value) =>
                            patch((current) => ({
                              ...current,
                              education: updateListItem(current.education, index, { end: value }),
                            }))
                          }
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <TextArea
                          id={`education-${index}-notes`}
                          label="Notes"
                          rows={2}
                          value={entry.notes}
                          error={errors.get(`education.${index}.notes`)}
                          onChange={(value) =>
                            patch((current) => ({
                              ...current,
                              education: updateListItem(current.education, index, { notes: value }),
                            }))
                          }
                        />
                      </div>
                    </div>
                  </ItemCard>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            id="projects"
            title="Projects"
            description="Only projects you can describe. Technologies are your own list, never inferred from the job description."
            action={
              <AddButton
                label="Add project"
                onClick={() =>
                  patch((current) => ({
                    ...current,
                    projects: appendListItem(current.projects, newProjectItem()),
                  }))
                }
              />
            }
          >
            {doc.projects.length === 0 ? (
              <p className="text-[11.5px] leading-5 text-warm">No projects yet.</p>
            ) : (
              <ul className="space-y-3">
                {doc.projects.map((entry, index) => (
                  <ItemCard
                    key={index}
                    heading={`Project ${index + 1}${entry.name.trim() ? ` · ${entry.name.trim()}` : ""}`}
                    label={`project ${index + 1}`}
                    index={index}
                    count={doc.projects.length}
                    onMove={(delta) =>
                      patch((current) => ({
                        ...current,
                        projects: moveInList(current.projects, index, delta),
                      }))
                    }
                    onRemove={() =>
                      patch((current) => ({
                        ...current,
                        projects: removeListItem(current.projects, index),
                      }))
                    }
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field
                        id={`project-${index}-name`}
                        label="Project name"
                        value={entry.name}
                        maxLength={DOCUMENT_LIMITS.entryField}
                        error={errors.get(`projects.${index}.name`)}
                        onChange={(value) =>
                          patch((current) => ({
                            ...current,
                            projects: updateListItem(current.projects, index, { name: value }),
                          }))
                        }
                      />
                      <Field
                        id={`project-${index}-url`}
                        label="Link"
                        value={entry.url}
                        maxLength={DOCUMENT_LIMITS.entryField}
                        placeholder="example.com/project"
                        error={errors.get(`projects.${index}.url`)}
                        onChange={(value) =>
                          patch((current) => ({
                            ...current,
                            projects: updateListItem(current.projects, index, { url: value }),
                          }))
                        }
                      />
                      <div className="sm:col-span-2">
                        <TextArea
                          id={`project-${index}-description`}
                          label="Description"
                          rows={2}
                          value={entry.description}
                          error={errors.get(`projects.${index}.description`)}
                          onChange={(value) =>
                            patch((current) => ({
                              ...current,
                              projects: updateListItem(current.projects, index, { description: value }),
                            }))
                          }
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <LineList
                          id={`project-${index}-tech`}
                          label="Technologies"
                          addLabel="Add technology"
                          values={entry.technologies}
                          error={errors.get(`projects.${index}.technologies`)}
                          onChange={(technologies) =>
                            patch((current) => ({
                              ...current,
                              projects: updateListItem(current.projects, index, { technologies }),
                            }))
                          }
                        />
                      </div>
                    </div>
                  </ItemCard>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            id="skills"
            title="Skills"
            description="One skill per line. Listed exactly as you write them, in this order."
            action={
              <span className="tnum text-[10px] text-warm">
                {doc.skills.filter((skill) => skill.trim()).length}/{DOCUMENT_LIMITS.skills}
              </span>
            }
          >
            <TextArea
              id="skills-text"
              label="Skills, one per line"
              rows={6}
              value={doc.skills.join("\n")}
              error={errors.get("skills")}
              placeholder={"TypeScript\nPostgreSQL\nReact"}
              onChange={(value) =>
                patch((current) => ({ ...current, skills: value.split("\n") }))
              }
            />
          </Panel>

          <Panel
            id="certifications"
            title="Certifications"
            action={
              <AddButton
                label="Add certification"
                onClick={() =>
                  patch((current) => ({
                    ...current,
                    certifications: appendListItem(current.certifications, ""),
                  }))
                }
              />
            }
          >
            <LineList
              id="certifications"
              label="Certifications"
              addLabel="Add certification"
              placeholder="AWS Cloud Practitioner"
              values={doc.certifications}
              error={errors.get("certifications")}
              onChange={(certifications) =>
                patch((current) => ({ ...current, certifications }))
              }
            />
          </Panel>

          <Panel
            id="extra"
            title="Additional sections"
            description="Awards, volunteering, languages, publications — anything the standard sections do not cover."
            action={
              <AddButton
                label="Add section"
                onClick={() =>
                  patch((current) => ({
                    ...current,
                    sections: appendListItem(current.sections, newSection()),
                  }))
                }
              />
            }
          >
            {doc.sections.length === 0 ? (
              <p className="text-[11.5px] leading-5 text-warm">No additional sections.</p>
            ) : (
              <ul className="space-y-3">
                {doc.sections.map((entry, index) => (
                  <ItemCard
                    key={index}
                    heading={`Section ${index + 1}${entry.title.trim() ? ` · ${entry.title.trim()}` : ""}`}
                    label={`section ${index + 1}`}
                    index={index}
                    count={doc.sections.length}
                    onMove={(delta) =>
                      patch((current) => ({
                        ...current,
                        sections: moveInList(current.sections, index, delta),
                      }))
                    }
                    onRemove={() =>
                      patch((current) => ({
                        ...current,
                        sections: removeListItem(current.sections, index),
                      }))
                    }
                  >
                    <Field
                      id={`section-${index}-title`}
                      label="Section title"
                      value={entry.title}
                      maxLength={DOCUMENT_LIMITS.sectionTitle}
                      error={errors.get(`sections.${index}.title`)}
                      onChange={(value) =>
                        patch((current) => ({
                          ...current,
                          sections: updateListItem(current.sections, index, { title: value }),
                        }))
                      }
                    />
                    <div className="mt-3">
                      <LineList
                        id={`section-${index}-lines`}
                        label="Lines"
                        addLabel="Add line"
                        values={entry.lines}
                        error={errors.get(`sections.${index}.lines`)}
                        onChange={(lines) =>
                          patch((current) => ({
                            ...current,
                            sections: updateListItem(current.sections, index, { lines }),
                          }))
                        }
                      />
                    </div>
                  </ItemCard>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            id="order"
            title="Section order"
            description="Saved with the next version. Sections without content are not rendered, and moving one costs nothing."
          >
            <ol className="space-y-1.5">
              {sectionOrder.map((key, index) => (
                <li
                  key={key}
                  className="flex items-center gap-2 rounded-[8px] border border-rule bg-paper/50 px-3 py-1.5"
                >
                  <span className="tnum w-4 text-[10px] text-warm">{index + 1}</span>
                  <span className="flex-1 text-[11.5px] text-ink">{SECTION_LABELS[key]}</span>
                  <IconButton
                    label={`Move ${SECTION_LABELS[key]} up`}
                    disabled={index === 0}
                    onClick={() => patch((current) => moveSection(current, key as SectionKey, -1))}
                  >
                    <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                  </IconButton>
                  <IconButton
                    label={`Move ${SECTION_LABELS[key]} down`}
                    disabled={index === sectionOrder.length - 1}
                    onClick={() => patch((current) => moveSection(current, key as SectionKey, 1))}
                  >
                    <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                  </IconButton>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div
          className={cn(
            "lg:sticky lg:top-[104px]",
            mobileView === "edit" && "hidden lg:block",
          )}
        >
          <div className="overflow-hidden rounded-[12px] border border-rule bg-paper-2/40">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule px-3.5 py-2.5">
              <p className="label-caps">Live preview</p>
              <span className="text-[10px] text-warm">{PAGE_DIMENSIONS[pageSize].label}</span>
            </div>
            <div className="max-h-[calc(100vh-190px)] overflow-auto px-2">
              <ResumePreview document={doc} />
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-rule px-3.5 py-2.5">
              <p className="text-[10px] leading-4 text-warm">
                Text stays selectable and searchable in the downloaded PDF. Page breaks are
                computed, not screenshot.
              </p>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="ml-auto"
                onClick={exportPdf}
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                PDF
              </Button>
            </div>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-[10px] text-warm">
            <Check className="h-3 w-3" aria-hidden="true" />
            Saved versions are immutable; saving always adds a version.
          </p>
        </div>
      </div>
    </div>
  );
}
