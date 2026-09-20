"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Clock,
  ExternalLink,
  Flame,
  Play,
  Target,
  Timer,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { MetricCell, PageHeader } from "@/components/layout/page-header";
import { LedgerBar } from "@/components/charts/skill-bar";
import { Badge, SectionLabel } from "@/components/ui/badge";
import { Reveal, Stagger, StaggerItem } from "@/components/shared/motion";
import { useDashboard } from "@/hooks/use-api";
import { cn } from "@/lib/utils";

const questionSets = [
  {
    category: "Data structures & algorithms",
    total: 120,
    attempted: 74,
    accuracy: 71,
    next: "Graph traversal — Dijkstra's algorithm",
    tone: "navy",
  },
  {
    category: "System design",
    total: 24,
    attempted: 9,
    accuracy: 58,
    next: "Design a distributed rate limiter",
    tone: "warn",
  },
  {
    category: "Behavioural (STAR)",
    total: 18,
    attempted: 11,
    accuracy: 82,
    next: "Tell me about a conflict in your team",
    tone: "good",
  },
  {
    category: "Database & SQL",
    total: 60,
    attempted: 38,
    accuracy: 76,
    next: "Query optimisation with window functions",
    tone: "navy",
  },
];

const upcoming = [
  {
    title: "Atlassian — Round 2, System design",
    date: "In 4 days",
    kind: "Real interview",
    prep: 46,
  },
  {
    title: "Mock interview — Rate limiter prompt",
    date: "Scheduled this week",
    kind: "Practice session",
    prep: 22,
  },
];

export default function InterviewsPage() {
  const { data } = useDashboard();
  const prepProgress = data?.metrics.interviewPrep ?? 0;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Interview preparation"
        title={
          <>
            You&apos;re <span className="tnum text-navy">{prepProgress}%</span> prepared for your
            target role
          </>
        }
        description="Preparation adapts to your target role — the question sets below are weighted by what Backend Engineer (SDE-1) interviews actually test, based on your tracked skill gaps."
        actions={
          <>
            <button
              type="button"
              className="btn-base h-[42px] rounded-[10px] border border-rule-strong bg-panel px-[18px] text-[14px] font-medium text-ink hover:border-navy hover:text-navy"
            >
              Review past interviews
            </button>
            <button
              type="button"
              className="btn-base h-[42px] rounded-[10px] bg-navy px-[18px] text-[14px] font-medium text-white hover:bg-navy-dark dark:bg-navy dark:text-[#0d1117]"
            >
              <Play className="h-[14px] w-[14px]" aria-hidden="true" />
              Start mock interview
            </button>
          </>
        }
      />

      <section className="overflow-hidden rounded-[13px] border border-rule bg-panel">
        <div className="grid grid-cols-2 gap-px border-b border-rule bg-rule lg:grid-cols-4">
          <div className="bg-panel">
            <MetricCell
              label="Questions attempted"
              value={132}
              suffix="/222"
              note="Across all tracked categories"
            />
          </div>
          <div className="bg-panel">
            <MetricCell
              label="Average accuracy"
              value={71}
              suffix="%"
              delta="+5 pts"
              note="Compared with your previous month"
            />
          </div>
          <div className="bg-panel">
            <MetricCell
              label="Mock interviews"
              value={7}
              note="Completed in the last 60 days"
            />
          </div>
          <div className="bg-panel">
            <MetricCell
              label="Study time"
              value={26}
              suffix="h"
              deltaTone="warn"
              note="Interview-specific preparation logged"
            />
          </div>
        </div>

        <div className="grid gap-8 px-7 py-8 lg:grid-cols-[1.35fr_1fr]">
          {/* Question sets */}
          <div>
            <SectionLabel index="01" rule={false}>
              Question sets for your target role
            </SectionLabel>

            <div className="mt-6 space-y-px overflow-hidden rounded-[11px] border border-rule">
              {questionSets.map((set, i) => (
                <Reveal key={set.category} delay={i * 0.05}>
                  <div className="group bg-panel px-5 py-5 transition-colors hover:bg-navy-wash/22">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-[12.5px] font-semibold text-ink">{set.category}</h3>
                          <Badge
                            tone={set.tone as "navy" | "warn" | "good"}
                            className="px-2 py-0.5 text-[8px]"
                          >
                            {set.accuracy >= 75
                              ? "Strong"
                              : set.accuracy >= 60
                                ? "Developing"
                                : "Needs work"}
                          </Badge>
                        </div>
                        <p className="mt-2 text-[9.5px] text-warm">
                          Next up: {set.next}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="tnum text-[16px] font-semibold leading-none text-ink">
                          {set.attempted}
                          <span className="text-[10px] font-normal text-warm">/{set.total}</span>
                        </p>
                        <p className="mt-1.5 text-[8px] uppercase tracking-[0.11em] text-warm">
                          attempted
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <LedgerBar
                        value={(set.attempted / set.total) * 100}
                        tone={set.tone as "navy" | "warn" | "good"}
                        height={4}
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <span className="tnum text-[8.5px] text-warm">
                        {set.accuracy}% accuracy on attempted questions
                      </span>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-[8.5px] font-semibold text-navy opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                      >
                        Continue
                        <ArrowUpRight className="h-[9px] w-[9px]" />
                      </button>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          {/* Upcoming */}
          <div>
            <SectionLabel index="02" rule={false}>
              Upcoming sessions
            </SectionLabel>

            <div className="mt-6 space-y-3">
              {upcoming.map((session) => (
                <div
                  key={session.title}
                  className={cn(
                    "rounded-[11px] border p-5",
                    session.kind === "Real interview"
                      ? "border-warn/28 bg-warn-wash/50"
                      : "border-rule bg-panel",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Timer
                      className={cn(
                        "h-[12px] w-[12px]",
                        session.kind === "Real interview" ? "text-warn" : "text-warm",
                      )}
                      aria-hidden="true"
                    />
                    <span
                      className={cn(
                        "text-[8px] font-semibold uppercase tracking-[0.13em]",
                        session.kind === "Real interview" ? "text-warn" : "text-warm",
                      )}
                    >
                      {session.kind}
                    </span>
                  </div>
                  <h3 className="mt-3 text-[11.5px] font-semibold leading-[1.5] text-ink">
                    {session.title}
                  </h3>
                  <p className="mt-1.5 text-[9px] text-warm">{session.date}</p>

                  <div className="mt-4">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[8px] uppercase tracking-[0.11em] text-warm">
                        Preparation
                      </span>
                      <span className="tnum text-[9px] font-semibold text-ink">
                        {session.prep}%
                      </span>
                    </div>
                    <div className="mt-1.5">
                      <LedgerBar
                        value={session.prep}
                        tone={session.prep >= 60 ? "good" : "warn"}
                        height={3}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-base mt-4 h-[32px] w-full rounded-[8px] border border-rule-strong bg-panel text-[9.5px] font-medium text-ink hover:border-navy hover:text-navy"
                  >
                    {session.kind === "Real interview" ? "Prepare for this interview" : "Join session"}
                  </button>
                </div>
              ))}
            </div>

            {/* Focus areas */}
            <div className="mt-8 rounded-[11px] border border-navy/18 bg-navy-wash/42 p-5">
              <div className="flex items-start gap-3">
                <Target className="mt-[1px] h-[14px] w-[14px] shrink-0 text-navy" aria-hidden="true" />
                <div>
                  <p className="text-[10px] font-semibold text-navy">Focus areas this week</p>
                  <ul className="mt-3 space-y-2.5">
                    {[
                      "Distributed systems fundamentals — your largest gap at 27%",
                      "System design: rate limiting and consistent hashing",
                      "Quantifying project impact in STAR-format answers",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span
                          className="mt-[6px] h-[3px] w-[3px] shrink-0 rounded-full bg-navy"
                          aria-hidden="true"
                        />
                        <span className="text-[9px] leading-[1.72] text-ink-soft">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/assistant"
                    className="mt-4 inline-flex items-center gap-1.5 text-[9px] font-semibold text-navy underline-offset-4 hover:underline"
                  >
                    Get a personalised prep plan
                    <ArrowUpRight className="h-[10px] w-[10px]" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Resources */}
      <section className="mt-12">
        <SectionLabel index="03">Recommended preparation resources</SectionLabel>

        <Stagger className="grid gap-px overflow-hidden rounded-[13px] border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: BookOpen,
              kind: "Documentation",
              title: "Designing Data-Intensive Applications — notes",
              meta: "Chapters 1–4 · 2h 40m",
              reason: "Maps directly to your distributed systems gap",
            },
            {
              icon: Play,
              kind: "Video course",
              title: "System design: rate limiters from first principles",
              meta: "12 lessons · 3h 10m",
              reason: "Prepares you for the Atlassian round-2 prompt",
            },
            {
              icon: Target,
              kind: "Practice set",
              title: "Graph algorithms — 20 timed problems",
              meta: "Intermediate–hard · 6h",
              reason: "Your accuracy drops on graph questions",
            },
            {
              icon: Flame,
              kind: "Mock drill",
              title: "Behavioural answer clinic — 12 STAR prompts",
              meta: "Self-paced · 2h",
              reason: "Converts project work into interview-ready stories",
            },
          ].map((resource) => (
            <StaggerItem key={resource.title}>
              <div className="group flex h-full flex-col bg-panel p-6 transition-colors hover:bg-navy-wash/22">
                <div className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-rule bg-paper-2">
                  <resource.icon className="h-[15px] w-[15px] text-navy" strokeWidth={1.8} aria-hidden="true" />
                </div>
                <p className="label-caps mt-5 text-[8.5px]">{resource.kind}</p>
                <h3 className="mt-3 text-[12px] font-semibold leading-[1.52] text-ink">
                  {resource.title}
                </h3>
                <div className="mt-2.5 flex items-center gap-1.5">
                  <Clock className="h-[10px] w-[10px] text-warm-2" aria-hidden="true" />
                  <span className="text-[8.5px] text-warm">{resource.meta}</span>
                </div>
                <div className="mt-5 rounded-[8px] border border-navy/14 bg-navy-wash/38 px-3 py-2.5">
                  <p className="text-[8px] leading-[1.62] text-navy">
                    <strong className="font-semibold">Why this: </strong>
                    {resource.reason}
                  </p>
                </div>
                <a
                  href="#"
                  className="mt-5 inline-flex items-center gap-1.5 text-[9px] font-semibold text-navy underline-offset-4 hover:underline"
                >
                  Open resource
                  <ExternalLink className="h-[9px] w-[9px]" aria-hidden="true" />
                </a>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </section>
    </AppShell>
  );
}
