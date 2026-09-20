"use client";

import Link from "next/link";
import { ArrowRight, Plus, Search, Target, TrendingUp } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { MetricCell, PageHeader } from "@/components/layout/page-header";
import { SkillGapBar } from "@/components/charts/skill-bar";
import { MiniRing } from "@/components/charts/readiness-ring";
import { Badge, SectionLabel } from "@/components/ui/badge";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/feedback";
import { Reveal } from "@/components/shared/motion";
import { useSkills } from "@/hooks/use-api";
import { cn } from "@/lib/utils";

type PriorityFilter = "ALL" | "HIGH" | "MEDIUM" | "LOW";

export default function SkillsPage() {
  const { data, isLoading, isError, refetch } = useSkills();
  const [filter, setFilter] = useState<PriorityFilter>("ALL");
  const [query, setQuery] = useState("");

  const skills = (data ?? []).filter(
    (s) =>
      (filter === "ALL" || s.priority === filter) &&
      (query.trim() === "" ||
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.category.toLowerCase().includes(query.toLowerCase())),
  );

  const coverage = data?.length
    ? Math.round(
        (data.reduce((acc, s) => acc + Math.min(s.currentLevel / s.requiredLevel, 1), 0) /
          data.length) *
          100,
      )
    : 0;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Skill intelligence"
        title={
          <>
            <span className="tnum text-navy">{coverage}%</span> coverage against your target role
          </>
        }
        description="Your current level is compared against what your target role actually expects. Priority is set by how much the gap affects your readiness, not alphabetically."
        actions={
          <>
            <button
              type="button"
              className="btn-base h-[42px] rounded-[10px] border border-rule-strong bg-panel px-[18px] text-[14px] font-medium text-ink hover:border-navy hover:text-navy"
            >
              Import from resume
            </button>
            <button
              type="button"
              className="btn-base h-[42px] rounded-[10px] bg-navy px-[18px] text-[14px] font-medium text-white hover:bg-navy-dark dark:bg-navy dark:text-[#0d1117]"
            >
              <Plus className="h-[15px] w-[15px]" aria-hidden="true" />
              Add skill
            </button>
          </>
        }
      />

      <section className="overflow-hidden rounded-[13px] border border-rule bg-panel">
        <div className="grid grid-cols-2 gap-px border-b border-rule bg-rule lg:grid-cols-4">
          <div className="bg-panel">
            <MetricCell
              label="Tracked skills"
              value={data?.length ?? 0}
              note="Across fundamentals, architecture, data and DevOps"
            />
          </div>
          <div className="bg-panel">
            <MetricCell
              label="High-priority gaps"
              value={data?.filter((s) => s.priority === "HIGH").length ?? 0}
              deltaTone="warn"
              note="These weigh most heavily on readiness"
            />
          </div>
          <div className="bg-panel">
            <MetricCell
              label="Improved this month"
              value={data?.filter((s) => s.trendDelta > 0).length ?? 0}
              delta="+12%"
              note="Based on your verified practice log"
            />
          </div>
          <div className="bg-panel">
            <MetricCell
              label="Average level"
              value={
                data?.length
                  ? Math.round(data.reduce((a, s) => a + s.currentLevel, 0) / data.length)
                  : 0
              }
              suffix="%"
              note="Across every tracked skill"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 px-6 py-5">
          <div className="relative min-w-[220px] flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-warm-2"
              aria-hidden="true"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search skills or categories…"
              className="field h-[40px] pl-10 text-[12.5px]"
              aria-label="Search skills"
            />
          </div>
          <div className="flex items-center gap-1.5 rounded-[10px] border border-rule p-1">
            {(["ALL", "HIGH", "MEDIUM", "LOW"] as PriorityFilter[]).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setFilter(level)}
                className={cn(
                  "rounded-[7px] px-3.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.09em] transition-colors",
                  filter === level
                    ? "bg-navy text-white"
                    : "text-warm hover:bg-navy-wash/50 hover:text-ink",
                )}
                aria-pressed={filter === level}
              >
                {level.toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-10">
        <SectionLabel index="01">Skill ledger</SectionLabel>

        {isLoading ? (
          <div className="rounded-[13px] border border-rule bg-panel p-7">
            <SkeletonRows rows={6} />
          </div>
        ) : isError ? (
          <ErrorState
            title="We couldn't load your skills"
            description="Your skill data is safe. Try again and we'll reload the comparison against your target role."
            onRetry={() => refetch()}
          />
        ) : skills.length === 0 ? (
          <EmptyState
            icon={Target}
            title={query || filter !== "ALL" ? "No skills match those filters" : "No skills tracked yet"}
            description={
              query || filter !== "ALL"
                ? "Adjust your search or filter to see the rest of your tracked skills. Clearing the filters will show all 12."
                : "Add the skills you already have so CareerTracker can compare them against what your target role expects — without a baseline there is nothing to measure."
            }
            action={
              query || filter !== "ALL" ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setFilter("ALL");
                  }}
                  className="btn-base h-[42px] rounded-[10px] bg-navy px-[18px] text-[14px] font-medium text-white hover:bg-navy-dark dark:bg-navy dark:text-[#0d1117]"
                >
                  Clear filters
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-base h-[42px] rounded-[10px] bg-navy px-[18px] text-[14px] font-medium text-white hover:bg-navy-dark dark:bg-navy dark:text-[#0d1117]"
                >
                  Add your first skill
                </button>
              )
            }
          />
        ) : (
          <div className="overflow-hidden rounded-[13px] border border-rule bg-panel">
            <div className="hidden grid-cols-[1.5fr_1.6fr_0.75fr_0.6fr_0.55fr] items-center gap-6 border-b border-rule px-7 py-4 lg:grid">
              <span className="label-caps">Skill</span>
              <span className="label-caps">Current vs. required</span>
              <span className="label-caps">Priority</span>
              <span className="label-caps">Trend</span>
              <span className="label-caps text-right">Progress</span>
            </div>

            {skills.map((skill, i) => (
              <Reveal key={skill.id} delay={Math.min(i * 0.035, 0.3)}>
                <div className="grid grid-cols-1 items-center gap-5 border-b border-rule px-7 py-6 transition-colors last:border-0 hover:bg-navy-wash/22 lg:grid-cols-[1.5fr_1.6fr_0.75fr_0.6fr_0.55fr] lg:gap-6">
                  <div>
                    <h3 className="text-[13.5px] font-semibold leading-snug text-ink">
                      {skill.name}
                    </h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="text-[9.5px] uppercase tracking-[0.11em] text-warm">
                        {skill.category}
                      </span>
                      {skill.verifiedBy && (
                        <>
                          <span className="text-[9px] text-warm-2">·</span>
                          <span className="text-[9.5px] text-warm-2">
                            verified by {skill.verifiedBy.toLowerCase()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <SkillGapBar
                    current={skill.currentLevel}
                    required={skill.requiredLevel}
                  />

                  <div>
                    <Badge
                      tone={
                        skill.priority === "HIGH"
                          ? "bad"
                          : skill.priority === "MEDIUM"
                            ? "warn"
                            : "neutral"
                      }
                      className="px-2.5 py-1 text-[9px]"
                    >
                      {skill.priority}
                    </Badge>
                    <p className="mt-2 text-[9px] text-warm">
                      Gap of {skill.requiredLevel - skill.currentLevel} points
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {skill.trendDelta > 0 ? (
                      <>
                        <TrendingUp className="h-[12px] w-[12px] text-good" aria-hidden="true" />
                        <span className="tnum text-[10.5px] font-semibold text-good">
                          +{skill.trendDelta}
                        </span>
                      </>
                    ) : (
                      <span className="tnum text-[10.5px] text-warm">—</span>
                    )}
                  </div>

                  <div className="flex items-center justify-start gap-2.5 lg:justify-end">
                    <MiniRing value={skill.progress} size={30} />
                    <span className="tnum text-[11px] font-semibold text-ink">
                      {skill.progress}%
                    </span>
                  </div>
                </div>
              </Reveal>
            ))}

            <div className="flex flex-wrap items-center justify-between gap-4 bg-paper-2 px-7 py-5">
              <p className="text-[11px] text-warm">
                Showing {skills.length} of {data?.length ?? 0} tracked skills
              </p>
              <Link
                href="/roadmap"
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-navy underline-offset-4 hover:underline"
              >
                Turn gaps into roadmap tasks
                <ArrowRight className="h-[12px] w-[12px]" />
              </Link>
            </div>
          </div>
        )}
      </section>

      <section className="mt-12 rounded-[13px] border border-navy/18 bg-navy-wash/42 px-7 py-7">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-[62ch]">
            <p className="label-caps text-navy">How priorities are set</p>
            <p className="mt-3 text-[12.5px] leading-[1.78] text-ink-soft">
              A skill is marked <strong>high priority</strong> when your target role lists it as a
              core requirement and your current level is more than 20 points below that
              requirement. Medium priority covers skills with a moderate gap or partial relevance;
              low priority covers maintenance skills where you already meet the bar.
            </p>
          </div>
          <Link
            href="/assistant"
            className="btn-base h-[42px] shrink-0 rounded-[10px] bg-navy px-[18px] text-[14px] font-medium text-white hover:bg-navy-dark dark:bg-navy dark:text-[#0d1117]"
          >
            Ask the assistant
            <ArrowRight className="h-[15px] w-[15px]" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
