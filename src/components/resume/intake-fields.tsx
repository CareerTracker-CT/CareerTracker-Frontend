"use client";

import { useRef, useState } from "react";
import { FileText, UploadCloud, X } from "lucide-react";
import {
  ACCEPTED_DOCUMENTS,
  type ExtractionLimits,
} from "@/components/resume/analysis-types";
import { cn } from "@/lib/utils";

type Target = "resume" | "jobDescription";

export function IntakeFields({
  resume,
  jdFile,
  jdText,
  useJdFile,
  limits,
  busy,
  onChooseFile,
  onClearFile,
  onJdTextChange,
  onJdSourceChange,
}: {
  resume: File | null;
  jdFile: File | null;
  jdText: string;
  useJdFile: boolean;
  limits: ExtractionLimits;
  busy: boolean;
  onChooseFile: (file: File | undefined, target: Target) => void;
  onClearFile: (target: Target) => void;
  onJdTextChange: (value: string) => void;
  onJdSourceChange: (useFile: boolean) => void;
}) {
  const resumeInput = useRef<HTMLInputElement>(null);
  const jdInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const pastedCharacters = Array.from(jdText).length;
  const overPastedLimit = pastedCharacters > limits.maxPastedJobDescriptionCharacters;
  const maxMegabytes = (limits.maxDocumentBytes / (1024 * 1024)).toFixed(2);

  function pickFile(event: React.ChangeEvent<HTMLInputElement>, target: Target) {
    const file = event.currentTarget.files?.[0];
    onChooseFile(file, target);
    event.currentTarget.value = "";
  }

  function clear(target: Target) {
    if (target === "resume" && resumeInput.current) resumeInput.current.value = "";
    if (target === "jobDescription" && jdInput.current) jdInput.current.value = "";
    onClearFile(target);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="min-w-0">
        <label htmlFor="resume-file" className="label-caps text-warm">
          Resume · PDF or DOCX
        </label>
        <input
          ref={resumeInput}
          id="resume-file"
          type="file"
          accept={ACCEPTED_DOCUMENTS}
          className="sr-only"
          disabled={busy}
          onChange={(event) => pickFile(event, "resume")}
        />
        <div
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            onChooseFile(event.dataTransfer.files[0], "resume");
          }}
          className={cn(
            "mt-2 rounded-[10px] border-2 border-dashed bg-paper p-3 transition-colors",
            dragging ? "border-navy bg-navy-wash/30" : "border-rule-strong",
          )}
        >
          <button
            type="button"
            disabled={busy}
            onClick={() => resumeInput.current?.click()}
            className="flex min-h-12 w-full items-start gap-3 text-left disabled:opacity-60"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-rule bg-panel">
              <UploadCloud className="h-4 w-4 text-navy" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-medium text-ink">
                {resume ? resume.name : "Drop a resume here, or choose a file"}
              </span>
              <span className="mt-1 block text-[10.5px] leading-4 text-warm">
                {resume
                  ? `${(resume.size / 1024).toFixed(0)} KB · file signature checked by the server`
                  : `PDF or DOCX · up to ${maxMegabytes} MB`}
              </span>
            </span>
          </button>
          {resume && (
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={() => clear("resume")}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] text-warm hover:text-bad disabled:opacity-50"
                aria-label="Remove resume"
              >
                <X className="h-3 w-3" aria-hidden="true" />
                Remove
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="min-w-0">
        <span className="label-caps text-warm">Job description</span>
        <div className="mt-2 flex gap-1.5" role="group" aria-label="Job description source">
          <button
            type="button"
            disabled={busy}
            aria-pressed={!useJdFile}
            onClick={() => onJdSourceChange(false)}
            className={cn(
              "btn-base h-8 rounded-[8px] px-3 text-[11px] disabled:opacity-50",
              !useJdFile ? "bg-navy text-white" : "border border-rule text-warm hover:text-ink",
            )}
          >
            Paste text
          </button>
          <button
            type="button"
            disabled={busy}
            aria-pressed={useJdFile}
            onClick={() => onJdSourceChange(true)}
            className={cn(
              "btn-base h-8 rounded-[8px] px-3 text-[11px] disabled:opacity-50",
              useJdFile ? "bg-navy text-white" : "border border-rule text-warm hover:text-ink",
            )}
          >
            Upload PDF/DOCX
          </button>
        </div>

        {useJdFile ? (
          <>
            <input
              ref={jdInput}
              id="job-description-file"
              type="file"
              accept={ACCEPTED_DOCUMENTS}
              className="sr-only"
              disabled={busy}
              onChange={(event) => pickFile(event, "jobDescription")}
            />
            <div className="mt-2 flex min-h-14 items-center gap-3 rounded-[10px] border border-rule-strong bg-paper px-3">
              <FileText className="h-4 w-4 shrink-0 text-navy" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-[12px] text-ink">
                {jdFile?.name ?? "No job description file selected"}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => jdInput.current?.click()}
                className="shrink-0 text-[11px] font-medium text-navy underline underline-offset-2 disabled:opacity-50"
              >
                {jdFile ? "Replace" : "Choose file"}
              </button>
              {jdFile && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => clear("jobDescription")}
                  className="inline-flex shrink-0 items-center gap-1 text-[10px] text-warm hover:text-bad disabled:opacity-50"
                  aria-label="Remove job description file"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  Remove
                </button>
              )}
            </div>
            {jdFile && (
              <p className="mt-1 text-[10px] text-warm">
                {(jdFile.size / 1024).toFixed(0)} KB · file signature checked by the server
              </p>
            )}
          </>
        ) : (
          <>
            <textarea
              id="job-description-text"
              aria-label="Job description text"
              aria-describedby="job-description-count"
              aria-invalid={overPastedLimit || undefined}
              value={jdText}
              onChange={(event) => onJdTextChange(event.target.value)}
              disabled={busy}
              rows={5}
              placeholder="Paste the job description here…"
              className="mt-2 w-full resize-y rounded-[10px] border border-rule-strong bg-paper p-3 text-[12px] leading-5 text-ink placeholder:text-warm-2 focus:border-navy focus:outline-none disabled:opacity-60"
            />
            <p
              id="job-description-count"
              className={cn(
                "tnum mt-1 text-right text-[10px]",
                overPastedLimit ? "text-bad" : "text-warm",
              )}
            >
              {pastedCharacters.toLocaleString()} /{" "}
              {limits.maxPastedJobDescriptionCharacters.toLocaleString()} Unicode code points
            </p>
          </>
        )}
      </div>
    </div>
  );
}
