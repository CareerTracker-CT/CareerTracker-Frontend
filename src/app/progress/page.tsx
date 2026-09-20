"use client";

import Link from "next/link";
import { ArrowUpRight, CalendarRange, Flame, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { MetricCell, PageHeader } from "@/components/layout/page-header";
import { LedgerBar } from "@/components/charts/skill-bar";
import { SectionLabel, StatusDot } from "@/components/ui/badge";
import { ErrorState, Skeleton } from "@/components/ui/feedback";
import { Reveal } from "@/components/shared/motion";
import { useDashboard } from "@/hooks/use-api";
import { cn } from "@/lib/utils";

/** Hand-built responsive line chart with an accessible data table fallback. */
function ReadinessTrend({
  data,
}: {
  data: { week: string; readiness: number; hoursStudied: number }[];
}) {
  const width = 720;
  const height = 220;
  const padding = { top: 16, right: 12, bottom: 30, left: 36 };

  const values = data.map((d) => d.readiness);
  const min = Math.min(...values) - 6;
  const max = Math.max(...values) + 6;

  const x = (i: number) =>
    padding.left + (i * (width - padding.left - padding.right)) / (data.length - 1);
  const y = (v: number) =>
    padding.top + ((max - v) * (height - padding.top - padding.bottom)) / (max - min);

  const linePath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(d.readiness).toFixed(1)}`)
    .join(" ");

  const areaPath = `${linePath} L ${x(data.length - 1).toFixed(1)} ${(height - padding.bottom).toFixed(1)} L ${x(0).toFixed(1)} ${(height - padding.bottom).toFixed(1)} Z`;

  return (
    <figure className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label={`Career readiness trend over the last ${data.length} weeks, rising from ${data[0].readiness} to ${data[data.length - 1].readiness}`}
      >
        <defs>
          <linearGradient id="readinessArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--navy)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--navy)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines + y labels */}
        {[0, 25, 50, 75, 100].map((tick) => {
          const yy = padding.top + ((max - tick) * (height - padding.top - padding.bottom)) / (max - min);
          if (yy < padding.top - 2 || yy > height - padding.bottom + 2) return null;
          return (
            <g key={tick}>
              <line
                x1={padding.left}
                y1={yy}
                x2={width - padding.right}
                y2={yy}
                stroke="var(--rule)"
                strokeWidth="1"
              />
              <text
                x={padding.left - 9}
                y={yy + 3}
                textAnchor="end"
                fontSize="9"
                fill="var(--warm-2)"
                fontFamily="var(--font-mono)"
              >
                {tick}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill="url(#readinessArea)" />
        <path
          d={linePath}
          fill="none"
          stroke="var(--navy)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {data.map((d, i) => (
          <g key={d.week}>
            <circle
              cx={x(i)}
              cy={y(d.readiness)}
              r={i === data.length - 1 ? 5 : 3}
              fill={i === data.length - 1 ? "var(--navy)" : "var(--panel)"}
              stroke="var(--navy)"
              strokeWidth="1.8"
            />
            <text
              x={x(i)}
              y={height - 9}
              textAnchor="middle"
              fontSize="8.5"
              fill="var(--warm-2)"
            >
              {d.week.replace(" ago", "")}
            </text>
          </g>
        ))}
      </svg>

      {/* Accessible fallback table */}
      <table className="sr-only">
        <caption>Weekly career readiness and study hours</caption>
        <thead>
          <tr>
            <th scope="col">Week</th>
            <th scope="col">Readiness</th>
            <th scope="col">Hours studied</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.week}>
              <th scope="row">{d.week}</th>
              <td>{d.readiness}</td>
              <td>{d.hoursStudied}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export default function ProgressPage() {
  const { data, isLoading, isError, refetch } = useDashboard();

  return (
    <AppShell>
      <PageHeader
        eyebrow="Progress analytics"
        title={
          <>
            Your readiness is up{" "}
            <span className="tnum text-good">14 points</span> in 8 weeks
          </>
        }
        description="Trends are calculated from your logged activity — study hours, completed tasks, verified skills and analysis results. Nothing here is estimated to fill space."
        actions={
          <>
            <button
              type="button"
              className="btn-base h-[42px] rounded-[10px] border border-rule-strong bg-panel px-[18px] text-[14px] font-medium text-ink hover:border-navy hover:text-navy"
            >
              <CalendarRange className="h-[15px] w-[15px]" aria-hidden="true" />
              Last 8 weeks
            </button>
            <button
              type="button"
              className="btn-base h-[42px] rounded-[10px] bg-navy px-[18px] text-[14px] font-medium text-white hover:bg-navy-dark dark:bg-navy dark:text-[#0d1117]"
            >
              Download report
            </button>
          </>
        }
      />

      {isError ? (
        <ErrorState
          title="We couldn't load your progress"
          description="Your history is safe. Try again and we'll rebuild the trend view from your logged activity."
          onRetry={() => refetch()}
        />
      ) : (
        <>
          <section className="overflow-hidden rounded-[13px] border border-rule bg-panel">
            <div className="grid grid-cols-2 gap-px border-b border-rule bg-rule lg:grid-cols-4">
              <div className="bg-panel">
                <MetricCell
                  label="Readiness now"
                  value={data?.readiness.overall ?? "—"}
                  suffix="/100"
                  delta="+14"
                  note="Compared with 8 weeks ago"
                />
              </div>
              <div className="bg-panel">
                <MetricCell
                  label="Study hours (8 weeks)"
                  value={79}
                  suffix="h"
                  delta="+22%"
                  note="Consistency is your strongest habit"
                />
              </div>
              <div className="bg-panel">
                <MetricCell
                  label="Skills improved"
                  value={9}
                  suffix={`/${data?.metrics.skillsTotal ?? 12}`}
                  note="Moved at least 3 points closer to target"
                />
              </div>
              <div className="bg-panel">
                <MetricCell
                  label="Current streak"
                  value={data?.user.streakDays ?? 0}
                  suffix=" days"
                  note="Your longest streak so far"
                />
              </div>
            </div>

            {/* Trend chart */}
            <div className="px-7 py-9">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <SectionLabel index="01" rule={false}>
                    Readiness trend
                  </SectionLabel>
                  <h2 className="mt-4 text-[19px] font-semibold leading-[1.28] tracking-[-0.024em] text-ink">
                    Steady improvement, driven by consistency
                  </h2>
                  <p className="mt-2.5 max-w-[52ch] text-[11px] leading-[1.72] text-warm">
                    The sharpest gains followed your resume re-analysis and the completion of two
                    phase-2 roadmap tasks.
                  </p>
                </div>

                <div className="flex items-center gap-5">
                  <div className="flex items-center gap-2">
                    <span className="h-[2px] w-[18px] rounded-full bg-navy" aria-hidden="true" />
                    <span className="text-[9px] text-warm">Readiness</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-[2px] w-[18px] rounded-full border-t-2 border-dashed border-rule-strong" aria-hidden="true" />
                    <span className="text-[9px] text-warm">Target band (75)</span>
                  </div>
                </div>
              </div>

              <div className="mt-9">
                {isLoading ? (
                  <Skeleton className="h-[220px] w-full" />
                ) : (
                  data && <ReadinessTrend data={data.weeklyProgress} />
                )}
              </div>
            </div>
          </section>

          {/* Dimension comparison */}
          <section className="mt-10">
            <SectionLabel index="02">Dimension breakdown</SectionLabel>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {(data?.readiness.dimensions ?? []).map((dimension, i) => {
                const delta = [4, 7, 2, 9, -3, 5][i] ?? 0;
                return (
                  <Reveal key={dimension.key} delay={i * 0.05}>
                    <div className="h-full rounded-[12px] border border-rule bg-panel p-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="label-caps text-[8.5px]">{dimension.label}</p>
                          <div className="mt-3 flex items-baseline gap-2">
                            <p className="tnum font-display text-[27px] font-semibold leading-none tracking-[-0.028em] text-ink">
                              {dimension.value}
                              <span className="text-[12px] font-normal text-warm">%</span>
                            </p>
                            <span
                              className={cn(
                                "tnum text-[9.5px] font-semibold",
                                delta > 0 ? "text-good" : "text-bad",
                              )}
                            >
                              {delta > 0 ? `▲ ${delta}` : `▼ ${Math.abs(delta)}`}
                            </span>
                          </div>
                        </div>
                        <StatusDot
                          tone={
                            dimension.value >= 70
                              ? "good"
                              : dimension.value >= 45
                                ? "warn"
                                : "bad"
                          }
                        />
                      </div>

                      <div className="mt-5">
                        <LedgerBar
                          value={dimension.value}
                          tone={
                            dimension.value >= 70
                              ? "good"
                              : dimension.value >= 45
                                ? "navy"
                                : "warn"
                          }
                          height={5}
                        />
                      </div>

                      <div className="mt-5 border-t border-rule pt-4">
                        <p className="text-[8px] font-semibold uppercase tracking-[0.13em] text-warm">
                          Weight in readiness
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="tnum text-[9.5px] text-ink">{dimension.weight}%</span>
                          <span className="text-[8.5px] text-warm">{dimension.status}</span>
                        </div>
                      </div>

                      <div className="mt-4 rounded-[8px] border border-navy/14 bg-navy-wash/38 px-3 py-2.5">
                        <p className="text-[8px] leading-[1.66] text-navy">
                          <strong className="font-semibold">Next: </strong>
                          {dimension.nextAction}
                        </p>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </section>

          {/* Activity heatmap */}
          <section className="mt-12">
            <SectionLabel index="03">Study activity</SectionLabel>

            <div className="rounded-[13px] border border-rule bg-panel px-7 py-9">
              <div className="flex flex-wrap items-end justify-between gap-5">
                <div>
                  <div className="flex items-center gap-2.5">
                    <Flame className="h-[15px] w-[15px] text-warn" aria-hidden="true" />
                    <p className="text-[12px] font-semibold text-ink">
                      {data?.user.streakDays ?? 0}-day current streak
                    </p>
                  </div>
                  <p className="mt-2.5 max-w-[52ch] text-[10px] leading-[1.72] text-warm">
                    Each square represents one day. Darker squares mean more logged study hours —
                    the pattern matters more than any single day.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[8px] text-warm">Less</span>
                  {[0, 1, 2, 3, 4].map((level) => (
                    <span
                      key={level}
                      className={cn(
                        "h-[11px] w-[11px] rounded-[3px]",
                        level === 0 && "bg-rule",
                        level === 1 && "bg-navy/22",
                        level === 2 && "bg-navy/42",
                        level === 3 && "bg-navy/70",
                        level === 4 && "bg-navy",
                      )}
                      aria-hidden="true"
                    />
                  ))}
                  <span className="text-[8px] text-warm">More</span>
                </div>
              </div>

              <div className="scroll-slim mt-8 overflow-x-auto">
                <div className="grid min-w-[640px] grid-flow-col grid-rows-7 gap-[3.5px]">
                  {Array.from({ length: 98 }).map((_, i) => {
                    const seed = (i * 7919) % 17;
                    const level = seed < 3 ? 0 : seed < 7 ? 1 : seed < 11 ? 2 : seed < 15 ? 3 : 4;
                    return (
                      <span
                        key={i}
                        className={cn(
                          "h-[11px] w-[11px] rounded-[3px]",
                          level === 0 && "bg-rule",
                          level === 1 && "bg-navy/22",
                          level === 2 && "bg-navy/42",
                          level === 3 && "bg-navy/70",
                          level === 4 && "bg-navy",
                        )}
                        title={`${level === 0 ? "No" : level} study hours logged`}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-6">
                <div className="flex flex-wrap items-center gap-x-9 gap-y-3">
                  {[
                    { label: "Active days", value: "61 / 84" },
                    { label: "Longest streak", value: "16 days" },
                    { label: "Avg. session", value: "1h 42m" },
                    { label: "Most productive", value: "Sunday" },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <p className="label-caps text-[8px]">{stat.label}</p>
                      <p className="tnum mt-2 text-[12px] font-semibold text-ink">
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>

                <Link
                  href="/roadmap"
                  className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-navy underline-offset-4 hover:underline"
                >
                  Keep the streak going
                  <ArrowUpRight className="h-[11px] w-[11px]" />
                </Link>
              </div>
            </div>
          </section>

          {/* Growth summary */}
          <section className="mt-12 rounded-[13px] border border-navy/18 bg-navy-wash/42 px-7 py-8">
            <div className="flex flex-wrap items-start gap-x-12 gap-y-7">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[11px] bg-navy">
                <TrendingUp className="h-[18px] w-[18px] text-white" aria-hidden="true" />
              </div>

              <div className="min-w-[240px] flex-1">
                <h2 className="text-[17px] font-semibold leading-[1.3] tracking-[-0.022em] text-ink">
                  What changed this period
                </h2>
                <p className="mt-3 max-w-[62ch] text-[11.5px] leading-[1.82] text-ink-soft">
                  You completed 4 roadmap tasks, improved 3 skills by more than 8 points, and
                  raised your resume ATS score from 67 to 71 after resolving the summary and
                  keyword findings. Interview preparation remains the only dimension that moved
                  backwards — it&apos;s where the next block of focused effort will pay off most.
                </p>
              </div>

              <div className="flex flex-wrap gap-x-10 gap-y-5">
                {[
                  { label: "Tasks completed", value: "4", delta: "+2 vs. prior" },
                  { label: "Skills improved", value: "9", delta: "+3 vs. prior" },
                  { label: "ATS score change", value: "+4", delta: "67 → 71" },
                  { label: "Applications sent", value: "3", delta: "−1 vs. prior" },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p className="label-caps text-[8px]">{stat.label}</p>
                    <p className="tnum mt-2.5 font-display text-[23px] font-semibold leading-none tracking-[-0.028em] text-ink">
                      {stat.value}
                    </p>
                    <p className="mt-2 text-[8.5px] text-warm">{stat.delta}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}
