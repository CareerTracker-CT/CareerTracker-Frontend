"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import type { ExtractionResult } from "@/components/resume/analysis-types";
import { cn } from "@/lib/utils";

type DocumentKey = "resume" | "jobDescription";

const TABS: { key: DocumentKey; label: string }[] = [
  { key: "resume", label: "Resume" },
  { key: "jobDescription", label: "Job description" },
];

export function ExtractedTextDrawer({
  result,
  onClose,
}: {
  result: ExtractionResult;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closeHandler = useRef(onClose);
  const [active, setActive] = useState<DocumentKey>("resume");

  useEffect(() => {
    closeHandler.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeHandler.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  const activeDocument = result[active];
  const warnings = activeDocument.warnings ?? [];

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="extracted-text-title"
        className="relative flex h-full w-full max-w-[620px] flex-col border-l border-rule bg-panel shadow-lift"
      >
        <div className="flex items-start justify-between gap-4 border-b border-rule px-5 py-4">
          <div className="min-w-0">
            <p className="label-caps text-navy">Extracted text</p>
            <h2 id="extracted-text-title" className="mt-1.5 text-[16px] font-semibold text-ink">
              Review what the analyzer read
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-rule text-warm hover:border-navy hover:text-navy"
            aria-label="Close extracted text"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div
          role="group"
          aria-label="Document to review"
          className="flex flex-wrap items-center gap-1.5 border-b border-rule px-5 py-3"
        >
          {TABS.map((tab) => {
            const selected = active === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                aria-pressed={selected}
                onClick={() => setActive(tab.key)}
                className={cn(
                  "btn-base h-8 rounded-[8px] px-3 text-[11px]",
                  selected
                    ? "bg-navy text-white"
                    : "border border-rule text-warm hover:text-ink",
                )}
              >
                {tab.label}
                <span className="tnum text-[9.5px] opacity-75">
                  {result[tab.key].characterCount.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 px-5 py-4">
          {warnings.length > 0 && (
            <ul className="space-y-1 rounded-[8px] border border-warn/35 bg-warn-wash/45 px-3 py-2">
              {warnings.map((warning, index) => (
                <li
                  key={`${warning.code}-${index}`}
                  className="flex items-start gap-1.5 text-[10.5px] leading-4 text-warn"
                >
                  <AlertTriangle className="mt-[2px] h-3 w-3 shrink-0" aria-hidden="true" />
                  {warning.message}
                </li>
              ))}
            </ul>
          )}
          <pre
            tabIndex={0}
            aria-label={`Extracted ${active === "resume" ? "resume" : "job description"} text`}
            className="scroll-slim min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words rounded-[9px] border border-rule bg-paper p-4 font-sans text-[11.5px] leading-6 text-ink"
          >
            {activeDocument.text}
          </pre>
          <p className="text-[10px] leading-4 text-warm-2">
            Extraction can differ from the document&apos;s visual layout. This text is a temporary
            preview and is not saved or shared with an AI provider.
          </p>
        </div>
      </div>
    </div>
  );
}
