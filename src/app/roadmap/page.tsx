"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock,
  Flame,
  Layers,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { MetricCell, PageHeader } from "@/components/layout/page-header";
import { LedgerBar } from "@/components/charts/skill-bar";
import { Badge, SectionLabel, StatusDot } from "@/components/ui/badge";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/feedback";
import { Reveal } from "@/components/shared/motion";
import { useRoadmap } from "@/hooks/use-api";
import { cn, daysUntil, formatDate } from "@/lib/utils";

export default function RoadmapPage() {
  const { data, isLoading, isError, refetch } = useRoadmap();
  const [expanded, setExpanded] = useState<number | null>(2);
  const [now, setNow] = useState<number | null>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setNow(Date.now()), []);

  const tasks = data ?? [];
  const phases = Array.from(new Set(tasks.map((t) => t.phase))).sort((a, b) => a - b);

  const totalHours = tasks.reduce((a, t) => a + t.estimatedHours, 0);
  const completed = tasks.filter((t) => t.status === "COMPLETED").length;

  const nextDueTask = tasks
    .filter((t) => t.status !== "COMPLETED" && t.deadline)
    .sort(
      (a, b) => new Date(a.deadline as string).getTime() - new Date(b.deadline as string).getTime(),
    )[0];

  const nextDueDays = nextDueTask?.deadline && now !== null
    ? Math.round((new Date(nextDueTask.deadline).getTime() - now) / 86_400_000)
    : null;
  const overall = tasks.length
    ? Math.round(tasks.reduce((a, t) => a + t.progress, 0) / tasks.length)
    : 0;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Personalised roadmap"
        title={
          <>
            Your plan is{" "}
            <span className="tnum text-navy">{overall}%</span> complete
          </>
        }
        description="Generated from your target role, semester, available study hours and placement timeline. Every task names the skill it moves and why it is ordered where it is."
        actions={
          <>
            <button
              type="button"
              className="btn-base h-[42px] rounded-[10px] border border-rule-strong bg-panel px-[18px] text-[14px] font-medium text-ink hover:border-navy hover:text-navy"
            >
              Adjust preferences
            </button>
            <button
              type="button"
              className="btn-base h-[42px] rounded-[10px] bg-navy px-[18px] text-[14px] font-medium text-white hover:bg-navy-dark dark:bg-navy dark:text-[#0d1117]"
            >
              <Sparkles className="h-[15px] w-[15px]" aria-hidden="true" />
              Regenerate roadmap
            </button>
          </>
        }
      />

      <section className="overflow-hidden rounded-[13px] border border-rule bg-panel">
        <div className="grid grid-cols-2 gap-px border-b border-rule bg-rule lg:grid-cols-4">
          <div className="bg-panel">
            <MetricCell label="Overall progress" value={overall} suffix="%" delta="+6% this week" />
          </div>
          <div className="bg-panel">
            <MetricCell
              label="Tasks complete"
              value={completed}
              suffix={`/${tasks.length}`}
              note="Across all five phases"
            />
          </div>
          <div className="bg-panel">
            <MetricCell
              label="Estimated effort"
              value={totalHours}
              suffix="h"
              note={`≈ ${Math.round(totalHours / 2.5)} study days at 2.5 h/day`}
            />
          </div>
          <div className="bg-panel">
            <MetricCell
              label="Next deadline"
              value={nextDueDays === null ? "—" : Math.max(nextDueDays, 0)}
              suffix={nextDueDays === null ? "" : nextDueDays < 0 ? " days overdue" : " days"}
              deltaTone={nextDueDays !== null && nextDueDays <= 3 ? "bad" : "warn"}
              note={nextDueTask?.title ?? "No upcoming deadlines"}
            />
          </div>
        </div>

        {/* Phase timeline */}
        <div className="px-7 py-8">
          <div className="relative">
            <div className="absolute left-0 right-0 top-[13px] h-[2px] bg-rule" aria-hidden="true" />
            <div className="relative grid grid-cols-5 gap-3">
              {phases.map((phase, i) => {
                const phaseTasks = tasks.filter((t) => t.phase === phase);
                const phaseProgress = Math.round(
                  phaseTasks.reduce((a, t) => a + t.progress, 0) / (phaseTasks.length || 1),
                );
                return (
                  <button
                    key={phase}
                    type="button"
                    onClick={() => setExpanded(expanded === phase ? null : phase)}
                    className="group flex flex-col items-start gap-3 text-left"
                    aria-expanded={expanded === phase}
                  >
                    <span
                      className={cn(
                        "flex h-[28px] w-[28px] items-center justify-center rounded-full border-2 transition-colors",
                        phaseProgress >= 100
                          ? "border-good bg-good text-white"
                          : expanded === phase
                            ? "border-navy bg-navy text-white"
                            : "border-rule-strong bg-paper text-warm group-hover:border-navy",
                      )}
                    >
                      {phaseProgress >= 100 ? (
                        <CheckCircle2 className="h-[13px] w-[13px]" aria-hidden="true" />
                      ) : (
                        <span className="tnum text-[9.5px] font-semibold">{phase}</span>
                      )}
                    </span>
                    <div>
                      <p
                        className={cn(
                          "text-[11px] font-semibold leading-tight",
                          expanded === phase ? "text-navy" : "text-ink",
                        )}
                      >
                        {phaseTasks[0]?.phaseName ?? `Phase ${phase}`}
                      </p>
                      <div className="mt-2 w-full">
                        <LedgerBar
                          value={phaseProgress}
                          tone={phaseProgress >= 100 ? "good" : "navy"}
                          height={3}
                        />
                      </div>
                      <p className="tnum mt-1.5 text-[8.5px] text-warm">{phaseProgress}%</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <SectionLabel index="01">Phases and tasks</SectionLabel>

        {isLoading ? (
          <div className="rounded-[13px] border border-rule bg-panel p-7">
            <SkeletonRows rows={6} />
          </div>
        ) : isError ? (
          <ErrorState
            title="We couldn't load your roadmap"
            description="Your plan is safe. Try again and we'll rebuild the phase view from your saved tasks."
            onRetry={() => refetch()}
          />
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No roadmap generated yet"
            description="A roadmap needs your target role, timeline and current skill levels. Complete your career profile and we'll build a phased plan tailored to your placement date."
            action={
              <Link
                href="/profile"
                className="btn-base h-[42px] rounded-[10px] bg-navy px-[18px] text-[14px] font-medium text-white hover:bg-navy-dark dark:bg-navy dark:text-[#0d1117]"
              >
                Complete career profile
              </Link>
            }
            secondaryAction={
              <Link
                href="/skills"
                className="btn-base h-[42px] rounded-[10px] border border-rule-strong bg-panel px-[18px] text-[14px] font-medium text-ink hover:border-navy hover:text-navy"
              >
                Review skill gaps first
              </Link>
            }
          />
        ) : (
          <div className="space-y-4">
            {phases.map((phase) => {
              const phaseTasks = tasks.filter((t) => t.phase === phase);
              const isOpen = expanded === phase;

              return (
                <div
                  key={phase}
                  className="overflow-hidden rounded-[13px] border border-rule bg-panel"
                >
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : phase)}
                    className="flex w-full flex-wrap items-center justify-between gap-4 px-7 py-6 text-left transition-colors hover:bg-navy-wash/22"
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-center gap-5">
                      <span className="tnum font-mono text-[10px] font-medium tracking-[0.15em] text-navy">
                        PHASE {phase.toString().padStart(2, "0")}
                      </span>
                      <div>
                        <h2 className="text-[17px] font-semibold leading-tight tracking-[-0.022em] text-ink">
                          {phaseTasks[0]?.phaseName}
                        </h2>
                        <p className="mt-1.5 text-[10.5px] text-warm">
                          {phaseTasks.length} tasks ·{" "}
                          {phaseTasks.reduce((a, t) => a + t.estimatedHours, 0)}h estimated ·{" "}
                          {phaseTasks.filter((t) => t.status === "COMPLETED").length} complete
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-5">
                      <div className="w-[132px]">
                        <LedgerBar
                          value={
                            phaseTasks.reduce((a, t) => a + t.progress, 0) /
                            (phaseTasks.length || 1)
                          }
                          height={6}
                        />
                      </div>
                      <ChevronDown
                        className={cn(
                          "h-[17px] w-[17px] text-warm transition-transform duration-300",
                          isOpen && "rotate-180",
                        )}
                        aria-hidden="true"
                      />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-rule">
                      {phaseTasks.map((task, i) => {
                        const due = task.deadline ? daysUntil(task.deadline) : null;
                        return (
                          <Reveal key={task.id} delay={i * 0.04}>
                            <div
                              className={cn(
                                "group flex flex-col gap-4 px-7 py-6 transition-colors hover:bg-navy-wash/18 lg:flex-row lg:items-start",
                                i !== phaseTasks.length - 1 && "border-b border-rule",
                              )}
                            >
                              <button
                                type="button"
                                className={cn(
                                  "mt-0.5 flex h-[21px] w-[21px] shrink-0 items-center justify-center rounded-[6px] border-[1.5px] transition-colors",
                                  task.status === "COMPLETED"
                                    ? "border-good bg-good text-white"
                                    : "border-rule-strong hover:border-navy hover:bg-navy-wash",
                                )}
                                aria-label={
                                  task.status === "COMPLETED"
                                    ? `"${task.title}" is complete`
                                    : `Mark "${task.title}" as complete`
                                }
                              >
                                {task.status === "COMPLETED" && (
                                  <CheckCircle2 className="h-[12px] w-[12px]" aria-hidden="true" />
                                )}
                                {task.status === "IN_PROGRESS" && (
                                  <span
                                    className="h-[8px] w-[8px] rounded-[3px] bg-navy"
                                    aria-hidden="true"
                                  />
                                )}
                              </button>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2.5">
                                  <Badge
                                    tone={
                                      task.priority === "HIGH"
                                        ? "bad"
                                        : task.priority === "MEDIUM"
                                          ? "warn"
                                          : "neutral"
                                    }
                                    className="px-2 py-0.5 text-[8.5px]"
                                  >
                                    {task.priority}
                                  </Badge>
                                  <Badge tone="navy" className="px-2 py-0.5 text-[8.5px]">
                                    {task.difficulty}
                                  </Badge>
                                  {task.skillTag && (
                                    <span className="text-[9px] text-warm">
                                      → {task.skillTag}
                                    </span>
                                  )}
                                </div>

                                <h3
                                  className={cn(
                                    "mt-3 text-[13.5px] font-semibold leading-[1.48]",
                                    task.status === "COMPLETED"
                                      ? "text-warm line-through decoration-warm-2/50"
                                      : "text-ink",
                                  )}
                                >
                                  {task.title}
                                </h3>
                                <p className="mt-2 max-w-[70ch] text-[11px] leading-[1.74] text-warm">
                                  {task.description}
                                </p>
                              </div>

                              <div className="flex shrink-0 flex-row items-center gap-6 lg:flex-col lg:items-end">
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="h-[12px] w-[12px] text-warm" aria-hidden="true" />
                                    <span className="tnum text-[9.5px] text-warm">
                                      {task.estimatedHours}h
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <CalendarClock
                                      className={cn(
                                        "h-[12px] w-[12px]",
                                        due !== null && due <= 3 ? "text-bad" : "text-warm",
                                      )}
                                      aria-hidden="true"
                                    />
                                    <span
                                      className={cn(
                                        "tnum text-[9.5px]",
                                        due !== null && due <= 3 ? "font-semibold text-bad" : "text-warm",
                                      )}
                                    >
                                      {task.deadline
                                        ? due !== null && due < 0
                                          ? "Overdue"
                                          : formatDate(task.deadline, {
                                              day: "numeric",
                                              month: "short",
                                            })
                                        : "No deadline"}
                                    </span>
                                  </div>
                                </div>

                                <div className="w-[112px]">
                                  <div className="flex items-baseline justify-between">
                                    <span className="text-[8.5px] uppercase tracking-[0.11em] text-warm">
                                      {task.status.replace("_", " ").toLowerCase()}
                                    </span>
                                    <span className="tnum text-[9.5px] font-semibold text-ink">
                                      {task.progress}%
                                    </span>
                                  </div>
                                  <div className="mt-1.5">
                                    <LedgerBar
                                      value={task.progress}
                                      tone={task.progress >= 100 ? "good" : "navy"}
                                      height={4}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Reveal>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-12 flex flex-wrap items-center justify-between gap-5 rounded-[13px] border border-navy/18 bg-navy-wash/42 px-7 py-7">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-navy">
            <Flame className="h-[17px] w-[17px] text-white" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <StatusDot tone="good" />
              <p className="text-[12.5px] font-semibold text-ink">
                You&apos;re on pace for your placement timeline
              </p>
            </div>
            <p className="mt-2 max-w-[62ch] text-[11.5px] leading-[1.72] text-ink-soft">
              At 2.5 hours per day you&apos;ll complete the remaining{" "}
              {totalHours - Math.round((totalHours * overall) / 100)} hours roughly 18 days before
              your target date — enough buffer to revisit the highest-weight skills.
            </p>
          </div>
        </div>
        <Link
          href="/assistant"
          className="btn-base h-[42px] rounded-[10px] bg-navy px-[18px] text-[14px] font-medium text-white hover:bg-navy-dark dark:bg-navy dark:text-[#0d1117]"
        >
          Ask how to adjust this
          <ArrowRight className="h-[15px] w-[15px]" aria-hidden="true" />
        </Link>
      </section>
    </AppShell>
  );
}
