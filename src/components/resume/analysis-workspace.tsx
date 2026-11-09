"use client";

import { useMemo, useRef, type KeyboardEvent } from "react";
import { AnalysisOverview } from "@/components/resume/analysis-overview";
import { DocumentInspection } from "@/components/resume/document-inspection";
import { RequirementEvidence } from "@/components/resume/requirement-evidence";
import {
  buildAnalysisSummary,
  buildEvidenceRows,
  groupEvidenceRows,
  selectPrincipalIssue,
} from "@/lib/resume-analysis.mjs";
import type { FocusRequest, ResumeAnalysisPayload } from "@/lib/resume-analysis.mjs";
import type { EvidenceCopyState, OpenEvidence } from "@/components/resume/analysis-types";
import { cn } from "@/lib/utils";

export type AnalysisView = "overview" | "evidence" | "inspection";

const TABS: { key: AnalysisView; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "evidence", label: "Requirement evidence" },
  { key: "inspection", label: "Document inspection" },
];

export function AnalysisWorkspace({
  analysis,
  activeView,
  onViewChange,
  focusRequest,
  onOpenEvidence,
  copyState,
  onCreateEvidenceCopy,
  onOpenEvidenceCopy,
}: {
  analysis: ResumeAnalysisPayload;
  activeView: AnalysisView;
  onViewChange: (view: AnalysisView) => void;
  focusRequest: FocusRequest | null;
  onOpenEvidence: OpenEvidence;
  copyState: EvidenceCopyState;
  onCreateEvidenceCopy: () => void;
  onOpenEvidenceCopy: () => void;
}) {
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const rows = useMemo(() => buildEvidenceRows(analysis.jobMatch), [analysis]);
  const groups = useMemo(() => groupEvidenceRows(rows), [rows]);
  const summary = useMemo(() => buildAnalysisSummary(analysis.jobMatch, rows), [analysis, rows]);
  const principal = useMemo(() => selectPrincipalIssue(analysis.jobMatch, rows), [analysis, rows]);

  function onTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = TABS.findIndex((tab) => tab.key === activeView);
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % TABS.length;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + TABS.length) % TABS.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = TABS.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    const next = TABS[nextIndex].key;
    onViewChange(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <section
      aria-labelledby="analysis-workspace-title"
      className="rounded-[14px] border border-rule bg-panel"
    >
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-rule px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <p className="label-caps text-navy">Analysis workspace</p>
          <h2
            id="analysis-workspace-title"
            className="mt-1.5 text-[17px] font-semibold text-ink"
          >
            Resume evidence against this job
          </h2>
        </div>
        <p className="text-[10px] leading-4 text-warm">Temporary result · not saved</p>
      </div>

      <div
        role="tablist"
        aria-label="Analysis views"
        onKeyDown={onTabKeyDown}
        className="flex flex-wrap gap-1 border-b border-rule px-3 pt-2 sm:px-4"
      >
        {TABS.map((tab) => {
          const selected = activeView === tab.key;
          const count = tab.key === "evidence" ? rows.length : undefined;
          return (
            <button
              key={tab.key}
              ref={(node) => {
                tabRefs.current[tab.key] = node;
              }}
              type="button"
              role="tab"
              id={`resume-tab-${tab.key}`}
              aria-selected={selected}
              aria-controls={`resume-panel-${tab.key}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onViewChange(tab.key)}
              className={cn(
                "-mb-px inline-flex items-center gap-2 rounded-t-[8px] border-b-2 px-3 py-2.5 text-[11.5px] font-medium transition-colors",
                selected
                  ? "border-navy text-navy"
                  : "border-transparent text-warm hover:text-ink",
              )}
            >
              {tab.label}
              {typeof count === "number" && (
                <span
                  className={cn(
                    "tnum rounded-full px-1.5 py-0.5 text-[9px]",
                    selected ? "bg-navy-wash text-navy" : "bg-paper-2 text-warm",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id="resume-panel-overview"
        aria-labelledby="resume-tab-overview"
        hidden={activeView !== "overview"}
        className="p-4 sm:p-5"
      >
        <AnalysisOverview
          analysis={analysis}
          summary={summary}
          groups={groups}
          principal={principal}
          onOpenEvidence={onOpenEvidence}
          onOpenInspection={() => onViewChange("inspection")}
          copyState={copyState}
          onCreateEvidenceCopy={onCreateEvidenceCopy}
          onOpenEvidenceCopy={onOpenEvidenceCopy}
        />
      </div>

      <div
        role="tabpanel"
        id="resume-panel-evidence"
        aria-labelledby="resume-tab-evidence"
        hidden={activeView !== "evidence"}
        className="p-4 sm:p-5"
      >
        <RequirementEvidence
          key={`evidence-${focusRequest?.seq ?? "initial"}`}
          groups={groups}
          focusRequest={focusRequest}
        />
      </div>

      <div
        role="tabpanel"
        id="resume-panel-inspection"
        aria-labelledby="resume-tab-inspection"
        hidden={activeView !== "inspection"}
        className="p-4 sm:p-5"
      >
        <DocumentInspection analysis={analysis} />
      </div>
    </section>
  );
}
