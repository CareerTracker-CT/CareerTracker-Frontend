"use client";

import {
  ArrowUpRight,
  BookMarked,
  Clock,
  ExternalLink,
  FileCode2,
  GraduationCap,
  PlayCircle,
  Video,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { MetricCell, PageHeader } from "@/components/layout/page-header";
import { LedgerBar } from "@/components/charts/skill-bar";
import { Badge, SectionLabel } from "@/components/ui/badge";
import { Reveal, Stagger, StaggerItem } from "@/components/shared/motion";

const tracks = [
  {
    skill: "Distributed Systems",
    gap: 51,
    resources: 4,
    hours: 12,
    progress: 33,
    reason: "Your largest gap against the target role",
  },
  {
    skill: "System Design",
    gap: 46,
    resources: 3,
    hours: 9,
    progress: 42,
    reason: "Directly tested in your upcoming interview round",
  },
  {
    skill: "PostgreSQL & Query Tuning",
    gap: 21,
    resources: 2,
    hours: 6,
    progress: 68,
    reason: "Active roadmap task due in 3 days",
  },
  {
    skill: "Testing (Unit + Integration)",
    gap: 34,
    resources: 3,
    hours: 8,
    progress: 57,
    reason: "Improves both project quality and interview answers",
  },
];

const resources = [
  {
    type: "Documentation",
    icon: BookMarked,
    title: "Distributed systems for practical engineers",
    provider: "University of Cambridge — lecture notes",
    duration: "2h 30m",
    skill: "Distributed Systems",
    format: "Read",
    progress: 18,
  },
  {
    type: "Video course",
    icon: Video,
    title: "System design interview: scalability patterns",
    provider: "Grokemy Academy",
    duration: "6h 10m",
    skill: "System Design",
    format: "Watch",
    progress: 42,
  },
  {
    type: "Practice",
    icon: FileCode2,
    title: "Query optimisation workshop — 12 real schemas",
    provider: "PGExercises",
    duration: "4h",
    skill: "PostgreSQL & Query Tuning",
    format: "Practice",
    progress: 68,
  },
  {
    type: "Project-based",
    icon: PlayCircle,
    title: "Build a distributed cache from scratch",
    provider: "Self-directed",
    duration: "10h",
    skill: "Distributed Systems",
    format: "Build",
    progress: 0,
  },
  {
    type: "Article series",
    icon: GraduationCap,
    title: "Testing strategies for Node.js services",
    provider: "Test Automation University",
    duration: "1h 45m",
    skill: "Testing (Unit + Integration)",
    format: "Read",
    progress: 25,
  },
  {
    type: "Video",
    icon: Video,
    title: "Consistent hashing, explained visually",
    provider: "System Design Deep Dive",
    duration: "32m",
    skill: "Distributed Systems",
    format: "Watch",
    progress: 100,
  },
];

export default function LearningPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Learning paths"
        title={
          <>
            <span className="tnum text-navy">{resources.length}</span> resources matched to your
            skill gaps
          </>
        }
        description="Nothing here is random. Every resource is attached to a tracked skill gap, an open roadmap task, or an interview you have coming up."
        actions={
          <>
            <button
              type="button"
              className="btn-base h-[42px] rounded-[10px] border border-rule-strong bg-panel px-[18px] text-[14px] font-medium text-ink hover:border-navy hover:text-navy"
            >
              Browse library
            </button>
            <button
              type="button"
              className="btn-base h-[42px] rounded-[10px] bg-navy px-[18px] text-[14px] font-medium text-white hover:bg-navy-dark dark:bg-navy dark:text-[#0d1117]"
            >
              Add custom resource
            </button>
          </>
        }
      />

      <section className="overflow-hidden rounded-[13px] border border-rule bg-panel">
        <div className="grid grid-cols-2 gap-px border-b border-rule bg-rule lg:grid-cols-4">
          <div className="bg-panel">
            <MetricCell
              label="Learning hours logged"
              value={47}
              suffix="h"
              delta="+6h this week"
              note="Across all tracked resources"
            />
          </div>
          <div className="bg-panel">
            <MetricCell
              label="Resources completed"
              value={11}
              suffix={`/${resources.length + 7}`}
              note="Marked complete in your learning log"
            />
          </div>
          <div className="bg-panel">
            <MetricCell
              label="In progress"
              value={resources.filter((r) => r.progress > 0 && r.progress < 100).length}
              note="Started but not yet finished"
            />
          </div>
          <div className="bg-panel">
            <MetricCell
              label="Current streak"
              value={12}
              suffix=" days"
              note="Consecutive days with learning activity"
            />
          </div>
        </div>
      </section>

      {/* Skill tracks */}
      <section className="mt-10">
        <SectionLabel index="01">Learning tracks by skill gap</SectionLabel>

        <div className="overflow-hidden rounded-[13px] border border-rule bg-panel">
          <div className="hidden grid-cols-[1.5fr_1.25fr_0.65fr_0.65fr_0.75fr] items-center gap-6 border-b border-rule px-7 py-4 lg:grid">
            <span className="label-caps">Skill</span>
            <span className="label-caps">Why it&apos;s prioritised</span>
            <span className="label-caps">Resources</span>
            <span className="label-caps">Est. hours</span>
            <span className="label-caps text-right">Progress</span>
          </div>

          {tracks.map((track, i) => (
            <Reveal key={track.skill} delay={i * 0.05}>
              <div className="grid grid-cols-1 items-center gap-4 border-b border-rule px-7 py-6 transition-colors last:border-0 hover:bg-navy-wash/22 lg:grid-cols-[1.5fr_1.25fr_0.65fr_0.65fr_0.75fr] lg:gap-6">
                <div>
                  <h3 className="text-[12.5px] font-semibold text-ink">{track.skill}</h3>
                  <div className="mt-2.5 flex items-center gap-2">
                    <Badge tone="bad" className="px-2 py-0.5 text-[8px]">
                      gap of {track.gap} pts
                    </Badge>
                  </div>
                </div>

                <p className="max-w-[36ch] text-[9.5px] leading-[1.72] text-warm">
                  {track.reason}
                </p>

                <div>
                  <p className="tnum text-[13px] font-semibold leading-none text-ink">
                    {track.resources}
                  </p>
                  <p className="mt-1.5 text-[8px] uppercase tracking-[0.11em] text-warm">
                    curated
                  </p>
                </div>

                <div>
                  <p className="tnum text-[13px] font-semibold leading-none text-ink">
                    {track.hours}h
                  </p>
                  <p className="mt-1.5 text-[8px] uppercase tracking-[0.11em] text-warm">
                    estimated
                  </p>
                </div>

                <div className="flex items-center gap-2.5 lg:justify-end">
                  <div className="w-[82px]">
                    <LedgerBar
                      value={track.progress}
                      tone={track.progress >= 60 ? "good" : track.progress >= 35 ? "navy" : "warn"}
                      height={5}
                    />
                  </div>
                  <span className="tnum text-[10px] font-semibold text-ink">
                    {track.progress}%
                  </span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Resource grid */}
      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-[520px]">
            <SectionLabel index="02" rule={false}>
              Recommended resources
            </SectionLabel>
            <h2 className="mt-4 text-[21px] font-semibold leading-[1.26] tracking-[-0.026em] text-ink">
              Matched to your open gaps, not a generic catalogue
            </h2>
          </div>
          <button
            type="button"
            className="btn-base h-[38px] rounded-[10px] border border-rule-strong bg-panel px-4 text-[12px] font-medium text-ink hover:border-navy hover:text-navy"
          >
            Filter by format
          </button>
        </div>

        <Stagger className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => (
            <StaggerItem key={resource.title}>
              <article className="group flex h-full flex-col rounded-[12px] border border-rule bg-panel p-6 transition-colors hover:border-navy/32">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-rule bg-paper-2">
                    <resource.icon
                      className="h-[15px] w-[15px] text-navy"
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                  </div>
                  <Badge tone="navy" className="px-2.5 py-1 text-[8px]">
                    {resource.type}
                  </Badge>
                </div>

                <h3 className="mt-5 text-[12.5px] font-semibold leading-[1.52] text-ink">
                  {resource.title}
                </h3>
                <p className="mt-2 text-[9px] text-warm">{resource.provider}</p>

                <div className="mt-4 flex flex-wrap items-center gap-x-3.5 gap-y-2">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-[9px] w-[9px] text-warm-2" aria-hidden="true" />
                    <span className="tnum text-[8.5px] text-warm">{resource.duration}</span>
                  </div>
                  <span className="h-[3px] w-[3px] rounded-full bg-rule-strong" aria-hidden="true" />
                  <span className="text-[8.5px] text-warm">{resource.format}</span>
                </div>

                <div className="mt-4 rounded-[8px] border border-navy/14 bg-navy-wash/38 px-3 py-2.5">
                  <p className="text-[8px] leading-[1.62] text-navy">
                    Connects to: <strong className="font-semibold">{resource.skill}</strong>
                  </p>
                </div>

                <div className="mt-auto pt-5">
                  {resource.progress > 0 ? (
                    <>
                      <div className="flex items-baseline justify-between">
                        <span className="text-[8px] uppercase tracking-[0.11em] text-warm">
                          {resource.progress >= 100 ? "Completed" : "In progress"}
                        </span>
                        <span className="tnum text-[8.5px] font-semibold text-ink">
                          {resource.progress}%
                        </span>
                      </div>
                      <div className="mt-2">
                        <LedgerBar
                          value={resource.progress}
                          tone={resource.progress >= 100 ? "good" : "navy"}
                          height={3}
                        />
                      </div>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn-base h-[32px] w-full rounded-[8px] border border-rule-strong bg-panel text-[9px] font-medium text-ink transition-colors hover:border-navy hover:text-navy"
                    >
                      Start resource
                    </button>
                  )}

                  <a
                    href="#"
                    className="mt-3.5 inline-flex items-center gap-1.5 text-[8.5px] font-semibold text-navy underline-offset-4 hover:underline"
                  >
                    Open resource
                    <ExternalLink className="h-[9px] w-[9px]" aria-hidden="true" />
                  </a>
                </div>
              </article>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section className="mt-12 flex flex-wrap items-center justify-between gap-5 rounded-[13px] border border-navy/18 bg-navy-wash/42 px-7 py-7">
        <div>
          <p className="label-caps text-navy">Next recommended action</p>
          <p className="mt-2.5 max-w-[62ch] text-[12px] leading-[1.78] text-ink-soft">
            You have three resources started but unfinished. Finishing{" "}
            <strong>System design interview: scalability patterns</strong> would move your
            interview preparation dimension by an estimated 6 points — and it maps directly to your
            upcoming Atlassian round.
          </p>
        </div>
        <button
          type="button"
          className="btn-base h-[42px] rounded-[10px] bg-navy px-[18px] text-[14px] font-medium text-white hover:bg-navy-dark dark:bg-navy dark:text-[#0d1117]"
        >
          Resume learning
          <ArrowUpRight className="h-[15px] w-[15px]" aria-hidden="true" />
        </button>
      </section>
    </AppShell>
  );
}
