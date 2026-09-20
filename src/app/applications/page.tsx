"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  ExternalLink,
  Filter,
  Plus,
  Send,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { MetricCell, PageHeader } from "@/components/layout/page-header";
import { Badge, SectionLabel, StatusDot } from "@/components/ui/badge";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/feedback";
import { Reveal } from "@/components/shared/motion";
import { useApplications } from "@/hooks/use-api";
import { cn, formatDate, relativeTime } from "@/lib/utils";

const STATUSES = [
  "ALL",
  "SAVED",
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
] as const;

const statusTone: Record<string, "good" | "warn" | "bad" | "navy" | "neutral"> = {
  SAVED: "neutral",
  APPLIED: "navy",
  SCREENING: "warn",
  INTERVIEW: "warn",
  OFFER: "good",
  REJECTED: "bad",
  WITHDRAWN: "neutral",
};

const statusNote: Record<string, string> = {
  SAVED: "Not yet submitted",
  APPLIED: "Awaiting response",
  SCREENING: "In screening",
  INTERVIEW: "Interview stage",
  OFFER: "Offer received",
  REJECTED: "Closed",
  WITHDRAWN: "Withdrawn by you",
};

export default function ApplicationsPage() {
  const [filter, setFilter] = useState<(typeof STATUSES)[number]>("ALL");
  const { data, isLoading, isError, refetch } = useApplications(
    filter === "ALL" ? undefined : filter,
  );

  return (
    <AppShell>
      <PageHeader
        eyebrow="Application tracking"
        title={
          <>
            <span className="tnum text-navy">
              {data?.filter((a) => ["APPLIED", "SCREENING", "INTERVIEW"].includes(a.status))
                .length ?? 0}
            </span>{" "}
            active applications
          </>
        }
        description="A single record of every role you've saved, applied to or interviewed for — with the context you need for the next follow-up."
        actions={
          <>
            <button
              type="button"
              className="btn-base h-[42px] rounded-[10px] border border-rule-strong bg-panel px-[18px] text-[14px] font-medium text-ink hover:border-navy hover:text-navy"
            >
              Export CSV
            </button>
            <button
              type="button"
              className="btn-base h-[42px] rounded-[10px] bg-navy px-[18px] text-[14px] font-medium text-white hover:bg-navy-dark dark:bg-navy dark:text-[#0d1117]"
            >
              <Plus className="h-[15px] w-[15px]" aria-hidden="true" />
              Track application
            </button>
          </>
        }
      />

      {/* Pipeline strip */}
      <section className="overflow-hidden rounded-[13px] border border-rule bg-panel">
        <div className="grid grid-cols-2 gap-px border-b border-rule bg-rule md:grid-cols-4 lg:grid-cols-7">
          {[
            { label: "Saved", value: data?.filter((a) => a.status === "SAVED").length ?? 0 },
            { label: "Applied", value: data?.filter((a) => a.status === "APPLIED").length ?? 0 },
            {
              label: "Screening",
              value: data?.filter((a) => a.status === "SCREENING").length ?? 0,
            },
            {
              label: "Interview",
              value: data?.filter((a) => a.status === "INTERVIEW").length ?? 0,
            },
            { label: "Offer", value: data?.filter((a) => a.status === "OFFER").length ?? 0 },
            {
              label: "Rejected",
              value: data?.filter((a) => a.status === "REJECTED").length ?? 0,
            },
            {
              label: "Withdrawn",
              value: data?.filter((a) => a.status === "WITHDRAWN").length ?? 0,
            },
          ].map((cell) => (
            <div key={cell.label} className="bg-panel px-5 py-5">
              <p className="label-caps text-[9px]">{cell.label}</p>
              <p className="tnum mt-2.5 font-display text-[26px] font-semibold leading-none tracking-[-0.028em] text-ink">
                {cell.value}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 px-6 py-5">
          <Filter className="h-[14px] w-[14px] text-warm" aria-hidden="true" />
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilter(status)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.09em] transition-colors",
                  filter === status
                    ? "border-navy bg-navy text-white"
                    : "border-rule text-warm hover:border-navy/50 hover:text-ink",
                )}
                aria-pressed={filter === status}
              >
                {status.toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-10">
        <SectionLabel index="01">Pipeline</SectionLabel>

        {isLoading ? (
          <div className="rounded-[13px] border border-rule bg-panel p-7">
            <SkeletonRows rows={5} />
          </div>
        ) : isError ? (
          <ErrorState
            title="We couldn't load your applications"
            description="Your tracking data is safe. Try again and we'll reload the pipeline."
            onRetry={() => refetch()}
          />
        ) : (data?.length ?? 0) === 0 ? (
          <EmptyState
            icon={Send}
            title={
              filter === "ALL"
                ? "You're not tracking any applications yet"
                : `No applications with status "${filter.toLowerCase()}"`
            }
            description={
              filter === "ALL"
                ? "Tracking your applications turns scattered email threads into one record — interview dates, follow-ups and outcomes, all in one place."
                : "Switch the filter to see the rest of your pipeline, or add a new application to this stage."
            }
            action={
              filter === "ALL" ? (
                <button
                  type="button"
                  className="btn-base h-[42px] rounded-[10px] bg-navy px-[18px] text-[14px] font-medium text-white hover:bg-navy-dark dark:bg-navy dark:text-[#0d1117]"
                >
                  Track your first application
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setFilter("ALL")}
                  className="btn-base h-[42px] rounded-[10px] bg-navy px-[18px] text-[14px] font-medium text-white hover:bg-navy-dark dark:bg-navy dark:text-[#0d1117]"
                >
                  Show all applications
                </button>
              )
            }
          />
        ) : (
          <div className="overflow-hidden rounded-[13px] border border-rule bg-panel">
            {/* Table header */}
            <div className="hidden grid-cols-[1.5fr_1.25fr_0.85fr_0.85fr_1.15fr] items-center gap-6 border-b border-rule px-7 py-4 lg:grid">
              <span className="label-caps">Company & role</span>
              <span className="label-caps">Source & notes</span>
              <span className="label-caps">Applied</span>
              <span className="label-caps">Status</span>
              <span className="label-caps text-right">Next step</span>
            </div>

            {(data ?? []).map((application, i) => (
              <Reveal key={application.id} delay={Math.min(i * 0.04, 0.28)}>
                <div className="grid grid-cols-1 items-start gap-5 border-b border-rule px-7 py-6 transition-colors last:border-0 hover:bg-navy-wash/20 lg:grid-cols-[1.5fr_1.25fr_0.85fr_0.85fr_1.15fr] lg:items-center lg:gap-6">
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[9px] border border-rule bg-paper-2">
                      <Building2 className="h-[16px] w-[16px] text-navy" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-[13px] font-semibold leading-snug text-ink">
                        {application.company}
                      </h3>
                      <p className="mt-1 text-[10.5px] text-warm">{application.role}</p>
                      {application.jobUrl && (
                        <a
                          href={application.jobUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="mt-2 inline-flex items-center gap-1 text-[9.5px] font-medium text-navy underline-offset-4 hover:underline"
                        >
                          View job posting
                          <ExternalLink className="h-[9px] w-[9px]" aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div>
                    {application.source && (
                      <Badge tone="neutral" className="px-2 py-0.5 text-[8.5px]">
                        {application.source}
                      </Badge>
                    )}
                    {application.notes && (
                      <p className="mt-2.5 line-clamp-2 max-w-[38ch] text-[9.5px] leading-[1.68] text-warm">
                        {application.notes}
                      </p>
                    )}
                    {application.outcome && (
                      <p className="mt-2 text-[9px] leading-[1.62] text-bad">
                        Outcome: {application.outcome}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <CalendarDays
                      className="h-[12px] w-[12px] shrink-0 text-warm"
                      aria-hidden="true"
                    />
                    <span className="tnum text-[10px] text-warm">
                      {application.appliedAt
                        ? formatDate(application.appliedAt, {
                            day: "numeric",
                            month: "short",
                            year: "2-digit",
                          })
                        : "Not submitted"}
                    </span>
                  </div>

                  <div>
                    <Badge tone={statusTone[application.status]} className="px-2.5 py-1 text-[9px]">
                      <StatusDot
                        tone={
                          application.status === "OFFER"
                            ? "good"
                            : application.status === "REJECTED"
                              ? "bad"
                              : application.status === "INTERVIEW" ||
                                  application.status === "SCREENING"
                                ? "warn"
                                : "neutral"
                        }
                      />
                      {application.status}
                    </Badge>
                    <p className="mt-1.5 text-[8.5px] text-warm">
                      {statusNote[application.status]}
                    </p>
                  </div>

                  <div className="flex items-center justify-start gap-3 lg:justify-end">
                    {application.interviewAt ? (
                      <div className="flex items-center gap-2 rounded-[8px] border border-warn/25 bg-warn-wash px-2.5 py-1.5">
                        <CalendarDays className="h-[11px] w-[11px] text-warn" aria-hidden="true" />
                        <span className="tnum text-[9px] font-medium text-warn">
                          Interview {formatDate(application.interviewAt, { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[9px] text-warm-2">
                        {application.appliedAt
                          ? `Applied ${relativeTime(application.appliedAt)}`
                          : "No activity yet"}
                      </span>
                    )}
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-[8px] text-warm transition-colors hover:bg-navy-wash hover:text-navy"
                      aria-label={`Open ${application.company} application`}
                    >
                      <ArrowUpRight className="h-[14px] w-[14px]" />
                    </button>
                  </div>
                </div>
              </Reveal>
            ))}

            <div className="flex flex-wrap items-center justify-between gap-4 bg-paper-2 px-7 py-5">
              <p className="text-[11px] text-warm">
                Showing {data?.length ?? 0} application{(data?.length ?? 0) === 1 ? "" : "s"}
              </p>
              <Link
                href="/assistant"
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-navy underline-offset-4 hover:underline"
              >
                Get advice on your pipeline
                <ArrowUpRight className="h-[12px] w-[12px]" />
              </Link>
            </div>
          </div>
        )}
      </section>

      <section className="mt-12 grid gap-6 lg:grid-cols-3">
        <div className="rounded-[13px] border border-rule bg-panel p-6">
          <p className="label-caps">Response rate</p>
          <p className="tnum mt-3.5 font-display text-[29px] font-semibold leading-none tracking-[-0.028em] text-ink">
            42<span className="text-[14px] font-normal text-warm">%</span>
          </p>
          <p className="mt-2.5 text-[10.5px] leading-[1.66] text-warm">
            Applications that progressed past the initial submission across your tracked pipeline.
          </p>
        </div>
        <div className="rounded-[13px] border border-rule bg-panel p-6">
          <p className="label-caps">Average time to first response</p>
          <p className="tnum mt-3.5 font-display text-[29px] font-semibold leading-none tracking-[-0.028em] text-ink">
            11<span className="text-[14px] font-normal text-warm"> days</span>
          </p>
          <p className="mt-2.5 text-[10.5px] leading-[1.66] text-warm">
            Calculated from your own application history, not an industry benchmark.
          </p>
        </div>
        <div className="rounded-[13px] border border-navy/18 bg-navy-wash/42 p-6">
          <p className="label-caps text-navy">Recommended next action</p>
          <p className="mt-3 text-[11px] leading-[1.72] text-ink-soft">
            You have one interview coming up and two applications with no follow-up in over a
            week. Sending a short, specific follow-up materially improves response rates.
          </p>
          <Link
            href="/interviews"
            className="mt-4 inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-navy underline-offset-4 hover:underline"
          >
            Prepare for your interview
            <ArrowUpRight className="h-[11px] w-[11px]" />
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
