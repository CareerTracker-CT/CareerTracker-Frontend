"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Download,
  FileText,
  Filter,
  Info,
  RefreshCw,
  UploadCloud,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { MetricCell, PageHeader } from "@/components/layout/page-header";
import { LedgerBar } from "@/components/charts/skill-bar";
import { Badge, SectionLabel, StatusDot } from "@/components/ui/badge";
import { EmptyState, ErrorState, ProcessingNote, SkeletonRows } from "@/components/ui/feedback";
import { Reveal } from "@/components/shared/motion";
import { useResumes } from "@/hooks/use-api";
import { cn, formatDate, relativeTime } from "@/lib/utils";

const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;

export default function ResumePage() {
  const { data, isLoading, isError, refetch } = useResumes();
  const [severityFilter, setSeverityFilter] = useState<"ALL" | "HIGH" | "MEDIUM" | "LOW">("ALL");
  const [analyzing, setAnalyzing] = useState(false);

  const current = data?.find((r) => r.isCurrent) ?? data?.[0];

  const filteredFindings =
    current?.findings
      .filter((f) => severityFilter === "ALL" || f.severity === severityFilter)
      .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]) ?? [];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Resume intelligence"
        title={
          <>
            Your resume scores{" "}
            <span className="tnum text-navy">{current?.atsScore ?? "—"}/100</span>
          </>
        }
        description="Every finding below is derived from your uploaded file — the reason it matters and the fix are spelled out so you know what to change first."
        actions={
          <>
            <button
              type="button"
              className="btn-base h-[42px] rounded-[10px] border border-rule-strong bg-panel px-[18px] text-[14px] font-medium text-ink hover:border-navy hover:text-navy"
            >
              <Download className="h-[15px] w-[15px]" aria-hidden="true" />
              Export report
            </button>
            <button
              type="button"
              onClick={() => {
                setAnalyzing(true);
                window.setTimeout(() => setAnalyzing(false), 2600);
              }}
              className="btn-base h-[42px] rounded-[10px] bg-navy px-[18px] text-[14px] font-medium text-white hover:bg-navy-dark dark:bg-navy dark:text-[#0d1117]"
            >
              <RefreshCw className={cn("h-[15px] w-[15px]", analyzing && "animate-spin")} aria-hidden="true" />
              Re-run analysis
            </button>
          </>
        }
      />

      {analyzing && (
        <div className="mb-8">
          <ProcessingNote
            message="Analysing your resume — extracting keywords, measuring ATS compatibility and scoring impact statements…"
            step="step 2 of 4"
          />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[12px] border border-rule bg-rule lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-[128px] bg-panel p-6">
                <div className="skeleton h-2.5 w-20" />
                <div className="skeleton mt-4 h-7 w-16" />
              </div>
            ))}
          </div>
          <SkeletonRows rows={5} />
        </div>
      ) : isError || !current ? (
        <ErrorState
          title="We couldn't load your resume analysis"
          description="Your file is safe and unchanged. Try again and we'll rebuild the analysis from the stored result."
          onRetry={() => refetch()}
        />
      ) : (
        <>
          {/* -------------------------------------------- SCORE LEDGER */}
          <section className="overflow-hidden rounded-[13px] border border-rule bg-panel">
            <div className="grid grid-cols-2 gap-px border-b border-rule bg-rule lg:grid-cols-5">
              <div className="bg-panel">
                <MetricCell
                  label="ATS compatibility"
                  value={current.atsScore ?? "—"}
                  suffix="/100"
                  delta="+4"
                  note="Across 40 automated checks"
                />
              </div>
              <div className="bg-panel">
                <MetricCell
                  label="Keyword coverage"
                  value={current.keywordCoverage ?? "—"}
                  suffix="%"
                  note="Against your target role's postings"
                />
              </div>
              <div className="bg-panel">
                <MetricCell
                  label="Quantified impact"
                  value={current.quantifiedImpactCount ?? 0}
                  note="Measurable achievements detected"
                />
              </div>
              <div className="bg-panel">
                <MetricCell
                  label="Summary strength"
                  value={current.summaryStrength ?? "—"}
                  suffix="/100"
                  deltaTone="warn"
                  note="Opening statement quality"
                />
              </div>
              <div className="bg-panel">
                <MetricCell
                  label="Length"
                  value={current.pageCount ?? "—"}
                  suffix={current.pageCount === 1 ? " page" : " pages"}
                  note={`${current.wordCount ?? 0} words`}
                />
              </div>
            </div>

            {/* File strip */}
            <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-[9px] border border-rule bg-paper-2">
                  <FileText className="h-[17px] w-[17px] text-navy" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-[12.5px] font-medium text-ink">{current.fileName}</p>
                  <p className="mt-1 text-[10px] text-warm">
                    Version {current.version} · {(current.fileSizeBytes / 1024).toFixed(0)} KB ·
                    uploaded {relativeTime(current.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Badge tone="good">
                  <StatusDot tone="good" />
                  {current.resumeHealth === "GOOD" ? "Healthy structure" : "Needs work"}
                </Badge>
                <Badge tone="navy">Analysis complete</Badge>
              </div>
            </div>
          </section>

          {/* -------------------------------------------- UPLOAD */}
          <section className="mt-10">
            <SectionLabel index="01">Upload a new version</SectionLabel>
            <div className="relative overflow-hidden rounded-[13px] border-2 border-dashed border-rule-strong bg-panel/60 px-8 py-12 text-center transition-colors hover:border-navy/50">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[11px] border border-rule bg-paper">
                <UploadCloud className="h-[20px] w-[20px] text-navy" strokeWidth={1.7} aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-[15px] font-semibold text-ink">
                Drag your resume here, or browse
              </h3>
              <p className="mx-auto mt-2.5 max-w-[46ch] text-[12px] leading-[1.72] text-warm">
                PDF or DOCX, up to 10 MB. Replacing your resume keeps the previous version in
                history and recalculates your readiness score automatically.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  className="btn-base h-[40px] rounded-[10px] bg-navy px-5 text-[13px] font-medium text-white hover:bg-navy-dark dark:bg-navy dark:text-[#0d1117]"
                >
                  Choose file
                </button>
                <button
                  type="button"
                  className="btn-base h-[40px] rounded-[10px] border border-rule-strong bg-panel px-5 text-[13px] font-medium text-ink hover:border-navy hover:text-navy"
                >
                  Import from LinkedIn
                </button>
              </div>
              <p className="mt-5 text-[10px] text-warm-2">
                Accepted: PDF, DOCX · MIME and extension are both validated before storage
              </p>
            </div>
          </section>

          {/* -------------------------------------------- FINDINGS */}
          <section className="mt-12">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div className="max-w-[520px]">
                <SectionLabel index="02" rule={false}>
                  Analysis findings
                </SectionLabel>
                <h2 className="mt-4 text-[22px] font-semibold leading-[1.24] tracking-[-0.026em] text-ink">
                  {filteredFindings.length} finding
                  {filteredFindings.length === 1 ? "" : "s"} — each with the reason it matters
                </h2>
              </div>

              <div className="flex items-center gap-1.5 rounded-[10px] border border-rule bg-panel p-1">
                <Filter className="ml-2.5 h-[13px] w-[13px] text-warm" aria-hidden="true" />
                {(["ALL", "HIGH", "MEDIUM", "LOW"] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSeverityFilter(level)}
                    className={cn(
                      "rounded-[7px] px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.09em] transition-colors",
                      severityFilter === level
                        ? "bg-navy text-white"
                        : "text-warm hover:bg-navy-wash/50 hover:text-ink",
                    )}
                    aria-pressed={severityFilter === level}
                  >
                    {level.toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {filteredFindings.length === 0 ? (
              <div className="mt-8">
                <EmptyState
                  icon={CheckCircle2}
                  title="No findings at this severity"
                  description="Nothing needs attention at this level right now. Switch the filter to review the remaining recommendations."
                  action={
                    <button
                      type="button"
                      onClick={() => setSeverityFilter("ALL")}
                      className="btn-base h-[42px] rounded-[10px] bg-navy px-[18px] text-[14px] font-medium text-white hover:bg-navy-dark dark:bg-navy dark:text-[#0d1117]"
                    >
                      Show all findings
                    </button>
                  }
                />
              </div>
            ) : (
              <div className="mt-8 overflow-hidden rounded-[13px] border border-rule bg-panel">
                {filteredFindings.map((finding, i) => (
                  <Reveal key={finding.id} delay={i * 0.04}>
                    <article
                      className={cn(
                        "px-6 py-7 transition-colors hover:bg-navy-wash/18",
                        i !== filteredFindings.length - 1 && "border-b border-rule",
                      )}
                    >
                      <div className="flex flex-wrap items-start gap-5">
                        <div
                          className={cn(
                            "flex h-[26px] shrink-0 items-center rounded-full px-2.5 text-[9px] font-bold uppercase tracking-[0.12em]",
                            finding.severity === "HIGH"
                              ? "bg-bad-wash text-bad"
                              : finding.severity === "MEDIUM"
                                ? "bg-warn-wash text-warn"
                                : "bg-paper-2 text-warm",
                          )}
                        >
                          {finding.severity}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[9px] font-semibold uppercase tracking-[0.13em] text-navy">
                              {finding.category}
                            </span>
                          </div>
                          <h3 className="mt-2.5 text-[15px] font-semibold leading-[1.42] text-ink">
                            {finding.title}
                          </h3>
                          <p className="mt-3 max-w-[76ch] text-[12.5px] leading-[1.76] text-warm">
                            {finding.detail}
                          </p>

                          <div className="mt-5 rounded-[10px] border border-navy/15 bg-navy-wash/42 p-4">
                            <div className="flex items-start gap-2.5">
                              <Info
                                className="mt-[2px] h-[13px] w-[13px] shrink-0 text-navy"
                                aria-hidden="true"
                              />
                              <div>
                                <p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-navy">
                                  Why it matters
                                </p>
                                <p className="mt-1.5 max-w-[72ch] text-[11.5px] leading-[1.72] text-ink-soft">
                                  {finding.whyItMatters}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 flex items-start gap-2.5">
                            <CheckCircle2
                              className="mt-[2px] h-[13px] w-[13px] shrink-0 text-good"
                              aria-hidden="true"
                            />
                            <p className="max-w-[72ch] text-[11.5px] leading-[1.72] text-ink-soft">
                              <strong className="font-semibold">Recommended fix: </strong>
                              {finding.recommendation}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="btn-base h-[34px] shrink-0 rounded-[9px] border border-rule-strong bg-panel px-3.5 text-[11px] font-medium text-ink hover:border-navy hover:text-navy"
                        >
                          Apply fix
                        </button>
                      </div>
                    </article>
                  </Reveal>
                ))}
              </div>
            )}

            {/* Next action */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-5 rounded-[13px] border border-navy/18 bg-navy-wash/42 px-7 py-6">
              <div>
                <p className="label-caps text-navy">Next recommended action</p>
                <p className="mt-2.5 max-w-[62ch] text-[13px] leading-[1.72] text-ink">
                  Resolve the two high-severity findings, then re-run the analysis. Resume quality
                  carries 20% of your readiness score — this is the fastest improvement available
                  to you right now.
                </p>
              </div>
              <Link
                href="/skills"
                className="btn-base h-[42px] rounded-[10px] bg-navy px-[18px] text-[14px] font-medium text-white hover:bg-navy-dark dark:bg-navy dark:text-[#0d1117]"
              >
                Review missing skills
                <ArrowRight className="h-[15px] w-[15px]" aria-hidden="true" />
              </Link>
            </div>
          </section>

          {/* -------------------------------------------- HISTORY */}
          <section className="mt-12">
            <SectionLabel index="03">Version history</SectionLabel>
            <div className="overflow-hidden rounded-[13px] border border-rule bg-panel">
              {(data ?? []).map((resume, i) => (
                <div
                  key={resume.id}
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-4 px-6 py-5",
                    i !== (data?.length ?? 0) - 1 && "border-b border-rule",
                  )}
                >
                  <div className="flex items-center gap-4">
                    <span className="tnum font-mono text-[11px] text-warm">
                      v{resume.version.toString().padStart(2, "0")}
                    </span>
                    <div>
                      <p className="text-[12px] font-medium text-ink">{resume.fileName}</p>
                      <p className="mt-1 text-[9.5px] text-warm">
                        {formatDate(resume.createdAt)} · {resume.findings.length} findings
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[9px] uppercase tracking-[0.11em] text-warm">
                        ATS
                      </span>
                      <div className="w-[86px]">
                        <LedgerBar
                          value={resume.atsScore ?? 0}
                          tone={(resume.atsScore ?? 0) >= 75 ? "good" : "navy"}
                          height={5}
                        />
                      </div>
                      <span className="tnum text-[11px] font-semibold text-ink">
                        {resume.atsScore}
                      </span>
                    </div>
                    {resume.isCurrent ? (
                      <Badge tone="good">Current</Badge>
                    ) : (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-navy underline-offset-4 hover:underline"
                      >
                        Make current
                        <ArrowUpRight className="h-[11px] w-[11px]" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}
