"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Circle,
  FileUp,
  Flame,
  Info,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { MetricCell, PageHeader } from "@/components/layout/page-header";
import { ReadinessRing, MiniRing } from "@/components/charts/readiness-ring";
import { LedgerBar, SkillGapBar } from "@/components/charts/skill-bar";
import { Badge, SectionLabel, StatusDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { Reveal, Stagger, StaggerItem } from "@/components/shared/motion";
import { useDashboard } from "@/hooks/use-api";
import { cn, daysUntil, relativeTime } from "@/lib/utils";

function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="space-y-3">
        <Skeleton className="h-3 w-[130px]" />
        <Skeleton className="h-9 w-[320px]" />
        <Skeleton className="h-3 w-[420px]" />
      </div>
      <div className="mt-9 grid gap-6 lg:grid-cols-[280px_1fr]">
        <Skeleton className="h-[260px] w-full rounded-[12px]" />
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[12px] border border-rule bg-rule md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[124px] w-full rounded-none" />
          ))}
        </div>
      </div>
      <Skeleton className="mt-8 h-[280px] w-full rounded-[12px]" />
      <p className="sr-only">Loading your career dashboard</p>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, isError, refetch, isFetching } = useDashboard();

  return (
    <AppShell>
      {isLoading ? (
        <DashboardSkeleton />
      ) : isError || !data ? (
        <ErrorState
          title="We couldn't load your dashboard"
          description="Your data is safe. This usually means the connection dropped momentarily — try again and we'll rebuild your overview."
          onRetry={() => refetch()}
        />
      ) : (
        <div>
          <PageHeader
            eyebrow={`Welcome back, ${data.user.fullName.split(" ")[0]}`}
            title={
              <>
                You&apos;re at{" "}
                <span className="tnum text-navy">{data.readiness.overall}/100</span> —{" "}
                <span className="italic">{data.readiness.band}</span>
              </>
            }
            description={`Your readiness is recalculated from ${data.metrics.tasksTotal} roadmap tasks, ${data.metrics.skillsTotal} tracked skills and your latest resume analysis. ${data.profile?.targetRole ? `Target role: ${data.profile.targetRole}.` : ""}`}
            actions={
              <>
                <Link
                  href="/resume"
                  className="btn-base h-[42px] rounded-[10px] border border-rule-strong bg-panel px-[18px] text-[14px] font-medium text-ink hover:border-navy hover:text-navy"
                >
                  <FileUp className="h-[15px] w-[15px]" aria-hidden="true" />
                  Update resume
                </Link>
                <Link
                  href="/roadmap"
                  className="btn-base h-[42px] rounded-[10px] bg-navy px-[18px] text-[14px] font-medium text-white hover:bg-navy-dark dark:bg-navy dark:text-[#0d1117]"
                >
                  Continue roadmap
                  <ArrowRight className="h-[15px] w-[15px]" aria-hidden="true" />
                </Link>
              </>
            }
          />

          {/* ---------------------------------------------- HERO LEDGER */}
          <section className="overflow-hidden rounded-[14px] border border-rule bg-panel">
            <div className="grid lg:grid-cols-[300px_1fr]">
              {/* Ring column */}
              <div className="relative flex flex-col items-center justify-center border-b border-rule px-8 py-10 lg:border-b-0 lg:border-r">
                <div
                  className="grid-paper pointer-events-none absolute inset-0 opacity-[0.42]"
                  aria-hidden="true"
                />
                <div className="relative">
                  <ReadinessRing
                    value={data.readiness.overall}
                    size={212}
                    segments={data.readiness.dimensions.map((d) => ({
                      key: d.key,
                      label: d.label,
                      value: d.value,
                    }))}
                  />
                </div>
                <div className="relative mt-6 flex items-center gap-2">
                  <StatusDot tone={data.readiness.overall >= 70 ? "good" : "warn"} />
                  <p className="text-[12.5px] font-medium text-ink">{data.readiness.band}</p>
                </div>
                <div className="relative mt-3 flex items-center gap-1.5 rounded-full bg-good-wash px-2.5 py-1">
                  <TrendingUp className="h-[11px] w-[11px] text-good" aria-hidden="true" />
                  <span className="tnum text-[10px] font-semibold text-good">
                    +3 points this week
                  </span>
                </div>

                <div className="relative mt-6 w-full rounded-[9px] border border-rule bg-paper-2 px-3.5 py-3">
                  <div className="flex items-start gap-2">
                    <Info className="mt-[2px] h-[12px] w-[12px] shrink-0 text-warm" aria-hidden="true" />
                    <p className="text-[9.5px] leading-[1.62] text-warm">{data.readiness.methodology}</p>
                  </div>
                </div>
              </div>

              {/* Metrics ledger */}
              <div>
                <div className="grid grid-cols-2 gap-px border-b border-rule bg-rule md:grid-cols-3">
                  <div className="bg-panel">
                    <MetricCell
                      label="ATS score"
                      value={data.metrics.atsScore ?? "—"}
                      suffix="/100"
                      delta="+4"
                      note="From your latest resume version"
                    />
                  </div>
                  <div className="bg-panel">
                    <MetricCell
                      label="Skills on track"
                      value={data.metrics.skillsOnTrack}
                      suffix={`/${data.metrics.skillsTotal}`}
                      note="Skills at 60%+ of the target level"
                    />
                  </div>
                  <div className="bg-panel">
                    <MetricCell
                      label="Roadmap progress"
                      value={data.metrics.roadmapProgress}
                      suffix="%"
                      delta="+6%"
                      note={`${data.metrics.tasksCompleted} of ${data.metrics.tasksTotal} tasks complete`}
                    />
                  </div>
                  <div className="bg-panel">
                    <MetricCell
                      label="Projects"
                      value={data.metrics.projectsCount}
                      note="Contributing to your evidence base"
                    />
                  </div>
                  <div className="bg-panel">
                    <MetricCell
                      label="Interview prep"
                      value={data.metrics.interviewPrep}
                      suffix="%"
                      deltaTone="warn"
                      note="Your weakest dimension right now"
                    />
                  </div>
                  <div className="bg-panel">
                    <MetricCell
                      label="Applications"
                      value={data.metrics.applicationsActive}
                      suffix={`/${data.metrics.applicationsCount}`}
                      note="Currently active in your pipeline"
                    />
                  </div>
                </div>

                {/* Readiness dimension strip */}
                <div className="px-6 py-7">
                  <SectionLabel index="00">Readiness dimensions</SectionLabel>
                  <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                    {data.readiness.dimensions.map((dim) => (
                      <div key={dim.key}>
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-[11.5px] font-medium text-ink-soft">
                            {dim.label}
                          </span>
                          <div className="flex items-center gap-2.5">
                            <span className="text-[9.5px] text-warm">{dim.status}</span>
                            <span className="tnum text-[11.5px] font-semibold text-ink">
                              {dim.value}%
                            </span>
                          </div>
                        </div>
                        <div className="mt-2">
                          <LedgerBar
                            value={dim.value}
                            tone={
                              dim.value >= 70 ? "good" : dim.value >= 45 ? "navy" : "warn"
                            }
                            height={5}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ---------------------------------------------- TODAY */}
          <section className="mt-12">
            <SectionLabel index="01">Today&apos;s focus</SectionLabel>

            {data.todayTasks.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="You're all caught up"
                description="Every roadmap task with an upcoming deadline is complete. Add a new goal to keep your plan moving."
                action={
                  <Link
                    href="/roadmap"
                    className="btn-base h-[42px] rounded-[10px] bg-navy px-[18px] text-[14px] font-medium text-white hover:bg-navy-dark dark:bg-navy dark:text-[#0d1117]"
                  >
                    Review roadmap
                  </Link>
                }
              />
            ) : (
              <div className="overflow-hidden rounded-[13px] border border-rule bg-panel">
                {data.todayTasks.map((task, i) => {
                  const due = task.deadline ? daysUntil(task.deadline) : null;
                  return (
                    <Reveal key={task.id} delay={i * 0.05}>
                      <div
                        className={cn(
                          "group flex flex-col gap-4 px-6 py-6 transition-colors hover:bg-navy-wash/22 sm:flex-row sm:items-center",
                          i !== data.todayTasks.length - 1 && "border-b border-rule",
                        )}
                      >
                        <button
                          type="button"
                          className="flex h-[21px] w-[21px] shrink-0 items-center justify-center rounded-[6px] border-[1.5px] border-rule-strong transition-colors hover:border-navy hover:bg-navy-wash"
                          aria-label={`Mark "${task.title}" as complete`}
                        >
                          {task.status === "IN_PROGRESS" && (
                            <span className="h-[9px] w-[9px] rounded-[3px] bg-navy" aria-hidden="true" />
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[9.5px] font-semibold uppercase tracking-[0.13em] text-navy">
                              Phase {task.phase} · {task.phaseName}
                            </span>
                            {task.priority === "HIGH" && (
                              <Badge tone="bad" className="px-2 py-0.5 text-[9px]">
                                High priority
                              </Badge>
                            )}
                          </div>
                          <h3 className="mt-2 text-[14.5px] font-semibold leading-snug text-ink">
                            {task.title}
                          </h3>
                          <p className="mt-1.5 line-clamp-1 text-[11.5px] text-warm">
                            {task.description}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-6">
                          <div className="w-[120px]">
                            <div className="flex items-baseline justify-between">
                              <span className="text-[9px] uppercase tracking-[0.11em] text-warm">
                                Progress
                              </span>
                              <span className="tnum text-[10px] font-semibold text-ink">
                                {task.progress}%
                              </span>
                            </div>
                            <div className="mt-1.5">
                              <LedgerBar value={task.progress} height={4} />
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <CalendarClock
                              className={cn(
                                "h-[13px] w-[13px]",
                                due !== null && due <= 3 ? "text-bad" : "text-warm",
                              )}
                              aria-hidden="true"
                            />
                            <span
                              className={cn(
                                "tnum text-[10.5px] font-medium",
                                due !== null && due <= 3 ? "text-bad" : "text-warm",
                              )}
                            >
                              {due === null
                                ? "No deadline"
                                : due < 0
                                  ? "Overdue"
                                  : due === 0
                                    ? "Due today"
                                    : `Due in ${due}d`}
                            </span>
                          </div>

                          <Link
                            href="/roadmap"
                            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-warm opacity-0 transition-all hover:bg-navy-wash hover:text-navy group-hover:opacity-100 focus-visible:opacity-100"
                            aria-label={`Open ${task.title}`}
                          >
                            <ChevronRight className="h-[15px] w-[15px]" />
                          </Link>
                        </div>
                      </div>
                    </Reveal>
                  );
                })}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule bg-paper-2 px-6 py-4">
                  <p className="text-[11px] text-warm">
                    Ordered by deadline and readiness impact ·{" "}
                    {isFetching ? "refreshing…" : "updated just now"}
                  </p>
                  <Link
                    href="/roadmap"
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-navy underline-offset-4 hover:underline"
                  >
                    See all {data.metrics.tasksTotal} tasks
                    <ArrowUpRight className="h-[12px] w-[12px]" />
                  </Link>
                </div>
              </div>
            )}
          </section>

          {/* ---------------------------------------------- TWO COLUMN */}
          <section className="mt-12 grid gap-10 lg:grid-cols-[1.15fr_1fr]">
            {/* Skill gaps */}
            <div>
              <SectionLabel index="02">Priority skill gaps</SectionLabel>
              <div className="overflow-hidden rounded-[13px] border border-rule bg-panel">
                {data.skillGaps.map((skill, i) => (
                  <div
                    key={skill.id}
                    className={cn(
                      "px-6 py-5 transition-colors hover:bg-navy-wash/22",
                      i !== data.skillGaps.length - 1 && "border-b border-rule",
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-[13px] font-semibold text-ink">{skill.name}</h3>
                          <span className="text-[9px] text-warm-2">·</span>
                          <span className="text-[9.5px] uppercase tracking-[0.11em] text-warm">
                            {skill.category}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center gap-3">
                          <Badge
                            tone={
                              skill.priority === "HIGH"
                                ? "bad"
                                : skill.priority === "MEDIUM"
                                  ? "warn"
                                  : "neutral"
                            }
                            className="px-2 py-0.5 text-[8.5px]"
                          >
                            {skill.priority} priority
                          </Badge>
                          <span className="tnum text-[9.5px] text-warm">
                            Gap of {skill.requiredLevel - skill.currentLevel} points
                          </span>
                          {skill.trendDelta > 0 && (
                            <span className="tnum text-[9.5px] font-semibold text-good">
                              ▲ {skill.trendDelta}
                            </span>
                          )}
                        </div>
                        <div className="mt-3.5 max-w-[300px]">
                          <SkillGapBar
                            current={skill.currentLevel}
                            required={skill.requiredLevel}
                            showScale={false}
                          />
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <MiniRing value={skill.progress} size={38} />
                        <div>
                          <p className="tnum text-[13px] font-semibold leading-none text-ink">
                            {skill.progress}%
                          </p>
                          <p className="mt-1 text-[8.5px] uppercase tracking-[0.11em] text-warm">
                            progress
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between gap-3 border-t border-rule bg-paper-2 px-6 py-4">
                  <p className="text-[11px] text-warm">
                    Ranked by the distance to your target role&apos;s required level
                  </p>
                  <Link
                    href="/skills"
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-navy underline-offset-4 hover:underline"
                  >
                    All skills
                    <ArrowUpRight className="h-[12px] w-[12px]" />
                  </Link>
                </div>
              </div>

              {/* Weekly progress */}
              <div className="mt-10">
                <SectionLabel index="03">Study consistency</SectionLabel>
                <div className="rounded-[13px] border border-rule bg-panel p-6">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="label-caps">Hours studied per week</p>
                      <p className="tnum mt-2.5 font-display text-[27px] font-semibold leading-none tracking-[-0.028em] text-ink">
                        {data.metrics.studyHoursThisWeek}
                        <span className="ml-1.5 text-[13px] font-normal text-warm">this week</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-warn-wash px-3 py-1.5">
                      <Flame className="h-[12px] w-[12px] text-warn" aria-hidden="true" />
                      <span className="tnum text-[10px] font-semibold text-warn">
                        {data.user.streakDays}-day streak
                      </span>
                    </div>
                  </div>

                  <div className="mt-8 flex h-[124px] items-end gap-2.5">
                    {data.weeklyProgress.map((week, i) => {
                      const max = Math.max(...data.weeklyProgress.map((w) => w.hoursStudied));
                      return (
                        <div key={week.week} className="flex flex-1 flex-col items-center gap-2.5">
                          <div className="flex w-full flex-1 items-end">
                            <div
                              className={cn(
                                "w-full rounded-[5px] transition-colors",
                                i === data.weeklyProgress.length - 1
                                  ? "bg-navy"
                                  : "bg-navy/22 hover:bg-navy/35",
                              )}
                              style={{ height: `${Math.round((week.hoursStudied / max) * 100)}%` }}
                              title={`${week.week}: ${week.hoursStudied} hours`}
                            />
                          </div>
                          <span className="text-[8.5px] text-warm">{week.week.replace(" ago", "")}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-5 border-t border-rule pt-4 text-[10px] text-warm">
                    Readiness has risen alongside study hours over the last 8 weeks — the
                    correlation is calculated from your logged activity, not estimated.
                  </p>
                </div>
              </div>
            </div>

            {/* Right rail */}
            <div>
              <SectionLabel index="04">Recommended next actions</SectionLabel>
              <Stagger className="space-y-3">
                {data.recommendations.map((rec) => (
                  <StaggerItem key={rec.id}>
                    <Link
                      href={rec.href}
                      className="group block rounded-[12px] border border-rule bg-panel p-5 transition-colors hover:border-navy/40 hover:bg-navy-wash/25"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-navy/20 bg-navy-wash">
                          <Sparkles className="h-[14px] w-[14px] text-navy" aria-hidden="true" />
                        </div>
                        <Badge
                          tone={
                            rec.impact === "high"
                              ? "bad"
                              : rec.impact === "medium"
                                ? "warn"
                                : "neutral"
                          }
                          className="px-2 py-0.5 text-[8.5px]"
                        >
                          {rec.impact} impact
                        </Badge>
                      </div>
                      <h3 className="mt-4 text-[13px] font-semibold leading-snug text-ink">
                        {rec.title}
                      </h3>
                      <p className="mt-2 text-[11px] leading-[1.68] text-warm">{rec.reason}</p>
                      <span className="mt-3.5 inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-navy">
                        {rec.actionLabel}
                        <ArrowRight
                          className="h-[11px] w-[11px] transition-transform duration-200 group-hover:translate-x-1"
                          aria-hidden="true"
                        />
                      </span>
                    </Link>
                  </StaggerItem>
                ))}
              </Stagger>

              {/* Milestones */}
              <div className="mt-10">
                <SectionLabel index="05">Milestones</SectionLabel>
                <div className="overflow-hidden rounded-[12px] border border-rule bg-panel">
                  {data.milestones.map((milestone, i) => {
                    const pctValue = Math.min(
                      Math.round((milestone.progress / milestone.threshold) * 100),
                      100,
                    );
                    return (
                      <div
                        key={milestone.id}
                        className={cn(
                          "px-5 py-5",
                          i !== data.milestones.length - 1 && "border-b border-rule",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-[12px] font-semibold text-ink">
                              {milestone.title}
                            </h3>
                            <p className="mt-1.5 text-[10px] leading-[1.62] text-warm">
                              {milestone.detail}
                            </p>
                          </div>
                          {milestone.achievedAt ? (
                            <CheckCircle2
                              className="h-[15px] w-[15px] shrink-0 text-good"
                              aria-hidden="true"
                            />
                          ) : (
                            <Circle
                              className="h-[15px] w-[15px] shrink-0 text-rule-strong"
                              aria-hidden="true"
                            />
                          )}
                        </div>
                        <div className="mt-3.5 flex items-center gap-3">
                          <div className="h-[4px] flex-1 overflow-hidden rounded-full bg-rule">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                milestone.achievedAt ? "bg-good" : "bg-navy",
                              )}
                              style={{ width: `${pctValue}%` }}
                            />
                          </div>
                          <span className="tnum text-[9.5px] font-medium text-warm">
                            {milestone.progress}/{milestone.threshold} {milestone.unit}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Activity */}
              <div className="mt-10">
                <SectionLabel index="06">Recent activity</SectionLabel>
                <div className="relative pl-5">
                  <div className="absolute bottom-2 left-[5px] top-2 w-px bg-rule" aria-hidden="true" />
                  <div className="space-y-5">
                    {data.activity.slice(0, 6).map((event) => (
                      <div key={event.id} className="relative">
                        <span
                          className="absolute -left-5 top-[6px] h-[11px] w-[11px] rounded-full border-[2.5px] border-paper bg-navy"
                          aria-hidden="true"
                        />
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-medium leading-snug text-ink">
                              {event.title}
                            </p>
                            {event.detail && (
                              <p className="mt-1 text-[9.5px] leading-[1.6] text-warm">
                                {event.detail}
                              </p>
                            )}
                          </div>
                          <span className="tnum shrink-0 text-[9px] text-warm-2">
                            {relativeTime(event.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 rounded-[11px] border border-navy/18 bg-navy-wash/45 p-5">
                  <div className="flex items-start gap-3">
                    <Target className="mt-[2px] h-[15px] w-[15px] shrink-0 text-navy" aria-hidden="true" />
                    <div>
                      <p className="text-[11px] font-semibold text-navy">
                        Not sure where to start?
                      </p>
                      <p className="mt-1.5 text-[10px] leading-[1.66] text-navy/85">
                        Ask the AI assistant — it reads your roadmap, skill gaps and deadlines to
                        give you a specific answer, not a generic one.
                      </p>
                      <Link
                        href="/assistant"
                        className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-semibold text-navy underline-offset-4 hover:underline"
                      >
                        Open AI assistant
                        <ArrowUpRight className="h-[11px] w-[11px]" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
