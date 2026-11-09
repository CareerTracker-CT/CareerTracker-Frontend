"use client";

import { Badge } from "@/components/ui/badge";
import { groupAtsChecks, uniqueStrings } from "@/lib/resume-analysis.mjs";
import type { AtsCheck, ResumeAnalysisPayload } from "@/lib/resume-analysis.mjs";

const QUALITATIVE_COPY = {
  text_extracted:
    "Readable text was extracted. This does not confirm the visual layout or how an employer's system will parse the document.",
  text_extracted_with_findings:
    "Text was extracted, with inspection findings to review below.",
  insufficient_evidence: "There is not enough extracted text to assess readability.",
} as const;

const CHECK_STATUS_LABEL = {
  issue: "Confirmed finding",
  warning: "Warning",
  passed: "No finding",
  not_evaluated: "Not performed",
} as const;

function CheckList({
  id,
  title,
  description,
  checks,
  showStatus = false,
}: {
  id: string;
  title: string;
  description: string;
  checks: AtsCheck[];
  showStatus?: boolean;
}) {
  if (checks.length === 0) return null;
  return (
    <section aria-labelledby={id} className="overflow-hidden rounded-[12px] border border-rule bg-panel">
      <div className="border-b border-rule px-4 py-3.5">
        <h3 id={id} className="text-[12.5px] font-semibold text-ink">
          {title}
          <span className="tnum ml-1.5 font-normal text-warm">({checks.length})</span>
        </h3>
        <p className="mt-1 text-[10.5px] leading-5 text-warm">{description}</p>
      </div>
      <ul>
        {checks.map((check) => (
          <li key={check.id} className="border-b border-rule px-4 py-3 last:border-b-0">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="min-w-0 break-words text-[11.5px] font-semibold text-ink">
                {check.title}
              </p>
              {showStatus && (
                <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.08em] text-warm">
                  {CHECK_STATUS_LABEL[check.status] ?? check.status}
                </span>
              )}
            </div>
            {check.evidence && (
              <p className="mt-1 break-words text-[10.5px] leading-5 text-ink-soft">
                <span className="font-semibold text-warm">Evidence: </span>
                {check.evidence}
              </p>
            )}
            {check.explanation && (
              <p className="mt-1 text-[10.5px] leading-5 text-warm">{check.explanation}</p>
            )}
            {check.recommendation && check.status !== "passed" && (
              <p className="mt-1 text-[10.5px] leading-5 text-navy">{check.recommendation}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DocumentInspection({ analysis }: { analysis: ResumeAnalysisPayload }) {
  const ats = analysis.atsReadability;
  const checks = groupAtsChecks(ats.checks);
  const limitations = uniqueStrings(ats.limitations);
  const summary =
    QUALITATIVE_COPY[ats.qualitativeSummary] ??
    "The readability summary is unavailable for this analysis.";
  const coverage =
    typeof ats.coveragePercent === "number" ? `${ats.coveragePercent}%` : "not reported";

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_296px]">
      <div className="min-w-0 space-y-4">
        <section className="rounded-[12px] border border-rule bg-panel p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="label-caps text-navy">Document inspection</p>
              <h3 className="mt-1.5 text-[15px] font-semibold text-ink">
                Readability and extraction evidence
              </h3>
            </div>
            <Badge tone={ats.status === "partial" ? "warn" : "neutral"}>
              {ats.status === "partial" ? "Partial inspection" : "Insufficient evidence"}
            </Badge>
          </div>
          <p className="mt-2.5 text-[11.5px] leading-6 text-ink-soft">{summary}</p>
          <dl className="mt-3.5 flex flex-wrap gap-x-6 gap-y-2 border-t border-rule pt-3">
            <div>
              <dt className="text-[9.5px] uppercase tracking-[0.08em] text-warm">Check coverage</dt>
              <dd className="tnum mt-0.5 text-[12px] font-semibold text-ink">{coverage}</dd>
            </div>
            <div>
              <dt className="text-[9.5px] uppercase tracking-[0.08em] text-warm">Rubric</dt>
              <dd className="mt-0.5 font-mono text-[10.5px] text-ink">{ats.rubricVersion}</dd>
            </div>
            <div>
              <dt className="text-[9.5px] uppercase tracking-[0.08em] text-warm">Findings</dt>
              <dd className="tnum mt-0.5 text-[12px] font-semibold text-ink">
                {checks.confirmed.length + checks.warnings.length}
              </dd>
            </div>
          </dl>
          <p className="mt-2.5 text-[10px] leading-4 text-warm-2">
            Coverage describes available parser checks, not document quality or an ATS outcome.
          </p>
        </section>

        <CheckList
          id="ats-confirmed-title"
          title="Confirmed extraction findings"
          description="These findings come from the extracted document evidence."
          checks={checks.confirmed}
          showStatus
        />
        <CheckList
          id="ats-warnings-title"
          title="Warnings to review"
          description="Structure signals that are usually a warning, not proof of incompatibility."
          checks={checks.warnings}
          showStatus
        />

        {checks.unsupported.length > 0 && (
          <section
            aria-labelledby="ats-unsupported-title"
            className="overflow-hidden rounded-[12px] border border-rule bg-panel"
          >
            <div className="border-b border-rule px-4 py-3.5">
              <h3 id="ats-unsupported-title" className="text-[12.5px] font-semibold text-ink">
                Checks this parser cannot perform
                <span className="tnum ml-1.5 font-normal text-warm">
                  ({checks.unsupported.length})
                </span>
              </h3>
              <p className="mt-1 text-[10.5px] leading-5 text-warm">
                Unsupported checks are excluded from coverage. They are never scored as passes or
                defects.
              </p>
            </div>
            <div className="space-y-2 p-3">
              {checks.unsupportedGroups.map((group) => (
                <details key={group.key} className="rounded-[9px] border border-rule bg-paper">
                  <summary className="cursor-pointer list-none px-3 py-2.5 [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-[11px] font-semibold text-ink">
                        {group.checks.length} check{group.checks.length === 1 ? "" : "s"} not
                        performed
                      </span>
                      <span className="text-[9.5px] text-warm">Expand</span>
                    </span>
                    <span className="mt-0.5 block truncate text-[10px] text-warm">
                      {group.checks.map((check) => check.title).join(" · ")}
                    </span>
                  </summary>
                  <div className="border-t border-rule px-3 py-3">
                    <p className="text-[10.5px] leading-5 text-warm">{group.explanation}</p>
                    <ul className="mt-2 space-y-1.5">
                      {group.checks.map((check) => (
                        <li key={check.id} className="break-words text-[10.5px] leading-5 text-ink">
                          <span className="font-medium">{check.title}</span>
                          {check.evidence ? (
                            <span className="text-warm"> — {check.evidence}</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                    {group.recommendation && (
                      <p className="mt-2 text-[10.5px] leading-5 text-navy">
                        {group.recommendation}
                      </p>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}

        {checks.passed.length > 0 && (
          <details className="overflow-hidden rounded-[12px] border border-rule bg-panel">
            <summary className="cursor-pointer list-none px-4 py-3.5 [&::-webkit-details-marker]:hidden">
              <span className="text-[12.5px] font-semibold text-ink">
                Checks completed without a finding
                <span className="tnum ml-1.5 font-normal text-warm">({checks.passed.length})</span>
              </span>
              <span className="mt-0.5 block text-[10px] text-warm">
                Expand to review the evidence behind each successful check.
              </span>
            </summary>
            <ul className="border-t border-rule">
              {checks.passed.map((check) => (
                <li
                  key={check.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-rule px-4 py-2.5 last:border-b-0"
                >
                  <span className="text-[11px] font-medium text-ink">{check.title}</span>
                  <span className="break-words text-[10px] text-warm">{check.evidence}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <aside className="space-y-4">
        <section className="rounded-[12px] border border-warn/35 bg-warn-wash/40 p-4">
          <h3 className="text-[12px] font-semibold text-ink">No numeric ATS score</h3>
          <p className="mt-1.5 text-[10.5px] leading-5 text-warm">
            {ats.scoreUnavailableReason ||
              "A numeric ATS score is not provided without a validated rubric and representative labeled evaluation."}
          </p>
          <p className="mt-2 text-[10px] leading-4 text-warm-2">
            This platform-defined inspection is not an official employer ATS result or a hiring
            prediction.
          </p>
        </section>

        {limitations.length > 0 && (
          <details className="rounded-[12px] border border-rule bg-panel">
            <summary className="cursor-pointer px-4 py-3 text-[11px] font-semibold text-ink">
              Parser limitations ({limitations.length})
            </summary>
            <ul className="space-y-1.5 border-t border-rule px-4 py-3 text-[10px] leading-4 text-warm">
              {limitations.map((limitation) => (
                <li key={limitation} className="flex gap-1.5">
                  <span className="mt-[6px] h-[3px] w-[3px] shrink-0 rounded-full bg-warm-2" aria-hidden="true" />
                  <span>{limitation}</span>
                </li>
              ))}
            </ul>
          </details>
        )}

        <p className="rounded-[12px] border border-rule bg-paper-2/45 p-4 text-[10px] leading-4 text-warm">
          A passed check means the parser found no issue in the evidence it can inspect. It does not
          confirm visual layout, reading order, or another system&apos;s result.
        </p>
      </aside>
    </div>
  );
}
