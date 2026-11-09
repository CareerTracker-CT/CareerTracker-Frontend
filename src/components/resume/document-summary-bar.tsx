"use client";

import { CheckCircle2, FileText, PencilLine, ScanText, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ExtractionResult } from "@/components/resume/analysis-types";
import { cn } from "@/lib/utils";

function formatSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "size unavailable";
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function DocumentRow({
  label,
  name,
  format,
  size,
  characters,
  warnings,
}: {
  label: string;
  name: string;
  format: string;
  size?: string;
  characters: number;
  warnings: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
      <FileText className="h-4 w-4 shrink-0 text-navy" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-medium text-ink">{name}</p>
        <p className="mt-0.5 text-[10.5px] leading-4 text-warm">
          {format}
          {size ? ` · ${size}` : ""} · {characters.toLocaleString()} characters extracted
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {warnings > 0 ? (
          <Badge tone="warn">
            <TriangleAlert className="h-3 w-3" aria-hidden="true" />
            {warnings} warning{warnings === 1 ? "" : "s"}
          </Badge>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-good">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            Text extracted
          </span>
        )}
        <span className="rounded-full border border-rule px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-warm">
          {label}
        </span>
      </div>
    </div>
  );
}

export function DocumentSummaryBar({
  result,
  resumeFile,
  jdFile,
  useJdFile,
  jdText,
  busy,
  hasAnalysis,
  onReviewText,
  onEditInputs,
  onAnalyze,
}: {
  result: ExtractionResult;
  resumeFile: File | null;
  jdFile: File | null;
  useJdFile: boolean;
  jdText: string;
  busy: boolean;
  hasAnalysis: boolean;
  onReviewText: () => void;
  onEditInputs: () => void;
  onAnalyze: () => void;
}) {
  const resume = result.resume;
  const jobDescription = result.jobDescription;
  const jdName = useJdFile ? (jdFile?.name ?? "Job description file") : "Pasted job description";
  const jdSize = useJdFile && jdFile ? formatSize(jdFile.size) : undefined;

  return (
    <div className="rounded-[11px] border border-rule bg-paper-2/35">
      <DocumentRow
        label="Resume"
        name={resumeFile?.name ?? "Resume document"}
        format={resume.format}
        size={resumeFile ? formatSize(resumeFile.size) : undefined}
        characters={resume.characterCount}
        warnings={resume.warnings?.length ?? 0}
      />
      <div className="border-t border-rule">
        <DocumentRow
          label="Job description"
          name={jdName}
          format={useJdFile ? jobDescription.format : `Pasted text · ${Array.from(jdText).length.toLocaleString()} pasted characters`}
          size={jdSize}
          characters={jobDescription.characterCount}
          warnings={jobDescription.warnings?.length ?? 0}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rule px-4 py-2.5">
        <p className="text-[10px] leading-4 text-warm-2">
          Held in this page&apos;s memory only. Opening a result view does not clear these inputs.
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={onReviewText}
            disabled={busy}
            className={cn(
              "btn-base h-8 rounded-[8px] border border-rule-strong bg-panel px-3 text-[10.5px] font-medium text-ink",
              "hover:border-navy hover:text-navy disabled:opacity-60",
            )}
          >
            <ScanText className="h-3.5 w-3.5" aria-hidden="true" />
            Review extracted text
          </button>
          <button
            type="button"
            onClick={onEditInputs}
            disabled={busy}
            className="btn-base h-8 rounded-[8px] px-3 text-[10.5px] font-medium text-warm hover:bg-navy-wash/40 hover:text-navy disabled:opacity-60"
          >
            <PencilLine className="h-3.5 w-3.5" aria-hidden="true" />
            Edit inputs
          </button>
          {hasAnalysis && (
            <button
              type="button"
              onClick={onAnalyze}
              disabled={busy}
              className="btn-base h-8 rounded-[8px] px-3 text-[10.5px] font-medium text-warm hover:bg-navy-wash/40 hover:text-navy disabled:opacity-60"
            >
              {busy ? "Analyzing…" : "Analyze again"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
