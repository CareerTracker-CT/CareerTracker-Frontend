"use client";

import { ArrowRight, CircleAlert, ScanSearch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { matchStatusCopy, scoreDisplay, uniqueStrings } from "@/lib/resume-analysis.mjs";
import type {
  AnalysisSummary,
  EvidenceGroup,
  PrincipalIssue,
  ResumeAnalysisPayload,
} from "@/lib/resume-analysis.mjs";
import type { EvidenceCopyState, OpenEvidence } from "@/components/resume/analysis-types";
import { skillsFromEvidence } from "@/lib/resume-builder.mjs";

const STATUS_TONE = {
  complete: "good",
  partial: "warn",
  none_detected: "neutral",
} as const;

const STATUS_LABEL = {
  complete: "Coverage complete",
  partial: "Coverage partial",
  none_detected: "No requirement detected",
} as const;

export function AnalysisOverview({
  analysis,
  summary,
  groups,
  principal,
  onOpenEvidence,
  onOpenInspection,
  copyState,
  onCreateEvidenceCopy,
  onOpenEvidenceCopy,
}: {
  analysis: ResumeAnalysisPayload;
  summary: AnalysisSummary;
  groups: EvidenceGroup[];
  principal: PrincipalIssue | null;
  onOpenEvidence: OpenEvidence;
  onOpenInspection: () => void;
  copyState: EvidenceCopyState;
  onCreateEvidenceCopy: () => void;
  onOpenEvidenceCopy: () => void;
}) {
  const match = analysis.jobMatch;
  const evidencedSkills = skillsFromEvidence(match);
  const coverage = match.requirementCoverage;
  const score = scoreDisplay(match.score, match.scoreUnavailableReason);
  const rows = groups.flatMap((group) => group.rows);
  const priorityGaps = rows
    .filter(
      (row) =>
        row.kind === "finding" &&
        row.priority === "required" &&
        (row.classification === "not_found" || row.classification === "insufficient"),
    )
    .slice(0, 5);
  const gapKeys = new Set(priorityGaps.map((row) => row.key));
  const eligibility = rows
    .filter((row) => row.hardEligibilityConcern && !gapKeys.has(row.key))
    .slice(0, 3);
  const unresolved = groups.find((group) => group.key === "not_evaluated")?.rows ?? [];
  const actions = uniqueStrings(priorityGaps.map((row) => row.suggestion)).slice(0, 3);
  const statusTone = STATUS_TONE[coverage.status] ?? "neutral";
  const statusLabel = STATUS_LABEL[coverage.status] ?? "Coverage unavailable";
  const statementNote = `${coverage.candidateRequirementCount ?? summary.totalRows} candidate qualification statement${
    (coverage.candidateRequirementCount ?? summary.totalRows) === 1 ? "" : "s"
  } identified${
    coverage.excludedStatementCount
      ? ` · ${coverage.excludedStatementCount} headings or informational statements excluded`
      : ""
  }. Counts describe what the detector found; they are not confidence percentages or a candidate rating.`;

  const cells = [
    { label: "Requirements evaluated", value: summary.evaluated, note: "structured requirements" },
    {
      label: "Demonstrated or mentioned",
      value: summary.demonstratedOrMentioned,
      note: "evidence found",
    },
    {
      label: "Missing or insufficient",
      value: summary.missing,
      note: "no or weak evidence",
    },
    { label: "Unresolved", value: summary.unresolved, note: "not evaluated" },
    {
      label: "Training excluded",
      value: summary.trainingExcluded,
      note: "never entry requirements",
    },
  ];

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_296px]">
      <div className="min-w-0 space-y-4">
        <section
          aria-labelledby="match-summary-title"
          className="overflow-hidden rounded-[12px] border border-rule"
        >
          <div className="flex flex-wrap items-start justify-between gap-4 bg-panel p-4 sm:p-5">
            <div className="min-w-0">
              <p className="label-caps text-navy">Requirement evidence</p>
              <h3
                id="match-summary-title"
                className="mt-1.5 text-[16px] font-semibold text-ink"
              >
                Job match summary
              </h3>
              <div className="mt-4 flex flex-wrap items-end gap-x-5 gap-y-2">
                <p className="tnum font-display text-[38px] font-semibold leading-none tracking-[-0.03em] text-ink">
                  {score.available ? score.value : "—"}
                  {score.available && (
                    <span className="ml-1 font-sans text-[13px] font-normal text-warm">/ 100</span>
                  )}
                </p>
                <div className="max-w-[44ch]">
                  <p className="text-[11.5px] font-semibold text-ink">
                    {score.available ? "Weighted resume evidence score" : "No overall score is shown"}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-warm">
                    {score.available
                      ? "Weighted evidence across this job description. Not an ATS score, hiring prediction, or proficiency claim."
                      : score.reason}
                  </p>
                  {match.roleScope?.mode === "single" && (
                    <p className="mt-1.5 text-[10px] leading-4 text-warm-2">
                      {match.roleScope.positionStatus === "no_title"
                        ? "No position title was recognized. The description was analyzed as one scope; confirm it describes a single position."
                        : `Position identified: ${match.roleScope.selectedRole?.title ?? "one position"}. The description was analyzed as one position.`}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-start gap-1.5 sm:items-end">
              <Badge tone={statusTone}>{statusLabel}</Badge>
              <p className="text-[10px] text-warm">
                {summary.unresolved} unresolved statement{summary.unresolved === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-px border-t border-rule bg-rule sm:grid-cols-5">
            {cells.map((cell) => (
              <div key={cell.label} className="bg-panel px-3.5 py-3">
                <dt className="min-h-8 text-[10px] leading-4 text-warm">{cell.label}</dt>
                <dd className="tnum mt-0.5 text-[20px] font-semibold leading-none text-ink">
                  {cell.value}
                </dd>
                <p className="mt-1.5 text-[9.5px] leading-4 text-warm-2">{cell.note}</p>
              </div>
            ))}
          </dl>

          <div className="border-t border-rule px-4 py-3">
            <p className="text-[10.5px] leading-5 text-warm">{matchStatusCopy(coverage.status)}</p>
            <p className="mt-1 text-[10px] leading-4 text-warm-2">{statementNote}</p>
          </div>
        </section>

        {principal && (
          <section
            aria-labelledby="principal-issue-title"
            className="rounded-[12px] border border-warn/35 bg-warn-wash/40 p-4 sm:p-5"
          >
            <div className="flex items-start gap-3">
              <CircleAlert
                className="mt-0.5 h-[17px] w-[17px] shrink-0 text-warn"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="label-caps text-warn">Principal unresolved item</p>
                <h3
                  id="principal-issue-title"
                  className="mt-2 break-words text-[14px] font-semibold leading-5 text-ink"
                >
                  {principal.title}
                </h3>
                <p className="mt-1.5 text-[11.5px] leading-5 text-ink-soft">{principal.reason}</p>
                {principal.excerpt && (
                  <blockquote className="mt-2.5 border-l-2 border-warn/40 pl-3 text-[11px] italic leading-5 text-warm">
                    JD: {principal.excerpt}
                  </blockquote>
                )}
                <div className="mt-3.5 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onOpenEvidence({ key: principal.key, state: principal.state })
                    }
                    className="btn-base h-9 rounded-[9px] bg-navy px-3.5 text-[11.5px] font-medium text-white hover:bg-navy-dark"
                  >
                    Review this requirement
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  {unresolved.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onOpenEvidence({ state: "not_evaluated" })}
                      className="btn-base h-9 rounded-[9px] border border-rule-strong bg-panel px-3 text-[11px] font-medium text-ink hover:border-navy hover:text-navy"
                    >
                      See all {unresolved.length} unresolved
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {priorityGaps.length > 0 && (
          <section
            aria-labelledby="priority-gaps-title"
            className="overflow-hidden rounded-[12px] border border-rule bg-panel"
          >
            <div className="border-b border-rule px-4 py-3.5">
              <h3 id="priority-gaps-title" className="text-[13px] font-semibold text-ink">
                Required qualifications without clear evidence
              </h3>
              <p className="mt-1 text-[10.5px] leading-5 text-warm">
                A gap means evidence was not found in this resume, not that the capability is
                absent.
              </p>
            </div>
            <ul>
              {priorityGaps.map((row) => (
                <li
                  key={row.key}
                  className="flex flex-wrap items-start justify-between gap-3 border-b border-rule px-4 py-3 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-[12px] font-semibold text-ink">{row.title}</p>
                    <p className="mt-1 line-clamp-2 text-[10.5px] leading-5 text-warm">
                      {row.explanation}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenEvidence({ key: row.key, state: row.state })}
                    className="btn-base h-8 shrink-0 rounded-[8px] border border-rule px-2.5 text-[10.5px] font-medium text-navy hover:border-navy"
                    aria-label={`Open ${row.title} in requirement evidence`}
                  >
                    {row.stateLabel}
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {eligibility.length > 0 && (
          <section
            aria-labelledby="eligibility-title"
            className="rounded-[10px] border border-rule bg-paper-2/45 p-4"
          >
            <h3 id="eligibility-title" className="text-[12px] font-semibold text-ink">
              Eligibility or credential statements to check
            </h3>
            <ul className="mt-2 space-y-2">
              {eligibility.map((row) => (
                <li key={row.key} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-[11px] font-medium text-ink">{row.title}</span>
                  <span className="text-[10px] text-warm">
                    · {row.stateLabel} · {row.priority}
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenEvidence({ key: row.key, state: row.state })}
                    className="text-[10px] font-semibold text-navy underline-offset-2 hover:underline"
                  >
                    Inspect
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section
          aria-labelledby="evidence-copy-title"
          className="rounded-[12px] border border-rule bg-panel p-4 sm:p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 max-w-[62ch]">
              <h3 id="evidence-copy-title" className="text-[13px] font-semibold text-ink">
                Build a role-specific copy
              </h3>
              <p className="mt-1.5 text-[11px] leading-5 text-warm">
                Creates a new private library resume with only the{" "}
                {evidencedSkills.length} skill{evidencedSkills.length === 1 ? "" : "s"} this
                analysis found evidence for. Your uploaded file is unchanged, missing skills are
                never added, and the copy stays a draft until you edit and save it yourself.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {copyState.created ? (
                <button
                  type="button"
                  onClick={onOpenEvidenceCopy}
                  className="btn-base h-9 rounded-[9px] bg-navy px-3.5 text-[11.5px] font-medium text-white hover:bg-navy-dark"
                >
                  Open in the builder
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onCreateEvidenceCopy}
                  disabled={copyState.busy}
                  className="btn-base h-9 rounded-[9px] bg-navy px-3.5 text-[11.5px] font-medium text-white hover:bg-navy-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {copyState.busy ? "Creating…" : "Create the copy"}
                </button>
              )}
              <button
                type="button"
                onClick={() => onOpenEvidence({ state: "demonstrated" })}
                className="btn-base h-9 rounded-[9px] border border-rule-strong bg-panel px-3 text-[11px] font-medium text-ink hover:border-navy hover:text-navy"
              >
                Review the evidence first
              </button>
            </div>
          </div>
          {copyState.created && (
            <p
              role="status"
              className="mt-3 border-t border-rule pt-3 text-[11px] leading-5 text-good"
            >
              Saved “{copyState.created.name}” to your library as version 1. Only evidenced skills
              were copied; everything else is empty for you to fill in.
            </p>
          )}
          {copyState.error && (
            <p
              role="alert"
              className="mt-3 border-t border-rule pt-3 text-[11px] leading-5 text-bad"
            >
              {copyState.error}
            </p>
          )}
        </section>
      </div>

      <aside className="space-y-4">
        <section aria-labelledby="key-actions-title" className="rounded-[12px] border border-rule bg-panel p-4">
          <h3 id="key-actions-title" className="label-caps text-navy">
            Key actions
          </h3>
          {actions.length > 0 ? (
            <ol className="mt-3 space-y-3">
              {actions.map((action, index) => (
                <li key={action} className="flex gap-2.5">
                  <span className="tnum mt-0.5 font-mono text-[10px] font-semibold text-navy">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="text-[11px] leading-5 text-ink-soft">{action}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-[11px] leading-5 text-warm">
              No gap-specific suggestion was returned. Open a requirement to inspect its exact
              sources.
            </p>
          )}
          <p className="mt-3 border-t border-rule pt-3 text-[10px] leading-4 text-warm-2">
            Suggestions describe how to present evidence you already have. Never add a skill you
            cannot support.
          </p>
        </section>

        <section className="rounded-[12px] border border-rule bg-paper-2/45 p-4">
          <h3 className="label-caps">Inspect further</h3>
          <button
            type="button"
            onClick={onOpenInspection}
            className="btn-base mt-2.5 h-9 w-full justify-between rounded-[8px] border border-rule-strong bg-panel px-3 text-[11px] font-medium text-ink hover:border-navy hover:text-navy"
          >
            Document inspection
            <ScanSearch className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <p className="mt-2 text-[10px] leading-4 text-warm-2">
            Extraction quality, qualitative findings and the parser checks that were not performed.
          </p>
        </section>

        <details className="rounded-[12px] border border-rule bg-panel">
          <summary className="cursor-pointer px-4 py-3 text-[11px] font-semibold text-ink">
            Method, versions and limits
          </summary>
          <div className="border-t border-rule px-4 py-3">
            <p className="text-[10px] leading-4 text-warm">
              Rubric {match.rubricVersion} · Engine {match.engineVersion}
              {match.interpretationVersion ? ` · Interpretation ${match.interpretationVersion}` : ""}
              {match.roleSegmentationVersion ? ` · Roles ${match.roleSegmentationVersion}` : ""}
            </p>
            {match.roleScope && (
              <p className="mt-2 border-t border-rule pt-2 text-[10px] leading-4 text-warm">
                {match.roleScope.mode === "selected"
                  ? `Scope: only the qualifications of ${match.roleScope.selectedRole?.title ?? "the selected position"} are included.`
                  : match.roleScope.positionStatus === "no_title"
                    ? "Scope: no position title was recognized; the whole description was analyzed as one scope."
                    : `Scope: one identified position (${match.roleScope.selectedRole?.title ?? "title unavailable"}); the whole description was analyzed as one position.`}
                {match.roleScope.excludedOtherRoleEntryStatements > 0
                  ? ` ${match.roleScope.excludedOtherRoleEntryStatements} qualification statement${
                      match.roleScope.excludedOtherRoleEntryStatements === 1 ? "" : "s"
                    } from other positions excluded.`
                  : ""}
                {match.roleScope.sharedStatementsApplied > 0
                  ? ` ${match.roleScope.sharedStatementsApplied} shared statement${
                      match.roleScope.sharedStatementsApplied === 1 ? "" : "s"
                    } applied.`
                  : ""}
              </p>
            )}
            <ul className="mt-2 list-disc space-y-1 pl-4 text-[10px] leading-4 text-warm">
              {uniqueStrings(match.limitations).map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
          </div>
        </details>
      </aside>
    </div>
  );
}
