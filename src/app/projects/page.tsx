"use client";

import {
  ArrowUpRight,
  CalendarRange,
  ExternalLink,
  FolderKanban,
  Plus,
  Star,
} from "lucide-react";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.2 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z" />
    </svg>
  );
}
import { AppShell } from "@/components/layout/app-shell";
import { MetricCell, PageHeader } from "@/components/layout/page-header";
import { LedgerBar } from "@/components/charts/skill-bar";
import { Badge, SectionLabel, StatusDot } from "@/components/ui/badge";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/feedback";
import { Reveal } from "@/components/shared/motion";
import { useProjects } from "@/hooks/use-api";
import { cn, formatDate } from "@/lib/utils";

const statusTone: Record<string, "good" | "warn" | "navy" | "neutral"> = {
  SHIPPED: "good",
  IN_PROGRESS: "warn",
  MAINTENANCE: "navy",
  PLANNED: "neutral",
};

export default function ProjectsPage() {
  const { data, isLoading, isError, refetch } = useProjects();

  return (
    <AppShell>
      <PageHeader
        eyebrow="Project portfolio"
        title={
          <>
            <span className="tnum text-navy">{data?.length ?? 0}</span> projects backing your
            readiness
          </>
        }
        description="Projects are the evidence recruiters actually verify. Each one contributes to your readiness score based on the skills it demonstrates and whether it's shipped."
        actions={
          <>
            <button
              type="button"
              className="btn-base h-[42px] rounded-[10px] border border-rule-strong bg-panel px-[18px] text-[14px] font-medium text-ink hover:border-navy hover:text-navy"
            >
              Import from GitHub
            </button>
            <button
              type="button"
              className="btn-base h-[42px] rounded-[10px] bg-navy px-[18px] text-[14px] font-medium text-white hover:bg-navy-dark dark:bg-navy dark:text-[#0d1117]"
            >
              <Plus className="h-[15px] w-[15px]" aria-hidden="true" />
              Add project
            </button>
          </>
        }
      />

      <section className="overflow-hidden rounded-[13px] border border-rule bg-panel">
        <div className="grid grid-cols-2 gap-px border-b border-rule bg-rule lg:grid-cols-4">
          <div className="bg-panel">
            <MetricCell label="Total projects" value={data?.length ?? 0} note="Across all statuses" />
          </div>
          <div className="bg-panel">
            <MetricCell
              label="Shipped"
              value={data?.filter((p) => p.status === "SHIPPED").length ?? 0}
              note="Completed and deployed"
            />
          </div>
          <div className="bg-panel">
            <MetricCell
              label="Technologies used"
              value={new Set((data ?? []).flatMap((p) => p.technologies)).size}
              note="Distinct tools in your portfolio"
            />
          </div>
          <div className="bg-panel">
            <MetricCell
              label="Readiness impact"
              value={data?.reduce((a, p) => a + p.readinessImpact, 0) ?? 0}
              suffix=" pts"
              delta="+6"
              note="Weighted contribution to your score"
            />
          </div>
        </div>
      </section>

      <section className="mt-10">
        <SectionLabel index="01">Portfolio</SectionLabel>

        {isLoading ? (
          <div className="rounded-[13px] border border-rule bg-panel p-7">
            <SkeletonRows rows={4} />
          </div>
        ) : isError ? (
          <ErrorState
            title="We couldn't load your projects"
            description="Your portfolio data is safe. Try again and we'll reload the project view."
            onRetry={() => refetch()}
          />
        ) : (data?.length ?? 0) === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No projects added yet"
            description="Projects are the strongest evidence of what you can actually build — and they carry 18% of your readiness score. Add your best two to start."
            action={
              <button
                type="button"
                className="btn-base h-[42px] rounded-[10px] bg-navy px-[18px] text-[14px] font-medium text-white hover:bg-navy-dark dark:bg-navy dark:text-[#0d1117]"
              >
                Add your first project
              </button>
            }
            secondaryAction={
              <button
                type="button"
                className="btn-base h-[42px] rounded-[10px] border border-rule-strong bg-panel px-[18px] text-[14px] font-medium text-ink hover:border-navy hover:text-navy"
              >
                Import from GitHub
              </button>
            }
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {(data ?? []).map((project, i) => (
              <Reveal key={project.id} delay={i * 0.06}>
                <article className="group flex h-full flex-col overflow-hidden rounded-[13px] border border-rule bg-panel transition-colors hover:border-navy/32">
                  {/* Cover band */}
                  <div className="relative h-[112px] overflow-hidden border-b border-rule bg-navy-wash/40">
                    <div className="grid-paper absolute inset-0 opacity-70" aria-hidden="true" />
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(135deg, color-mix(in srgb, var(--navy) 16%, transparent), transparent 62%)",
                      }}
                      aria-hidden="true"
                    />
                    <div className="absolute left-5 top-5">
                      <Badge
                        tone={statusTone[project.status] ?? "neutral"}
                        className="px-2.5 py-1 text-[8.5px]"
                      >
                        <StatusDot
                          tone={
                            project.status === "SHIPPED"
                              ? "good"
                              : project.status === "IN_PROGRESS"
                                ? "warn"
                                : "neutral"
                          }
                        />
                        {project.status.replace("_", " ")}
                      </Badge>
                    </div>
                    {project.readinessImpact >= 14 && (
                      <div className="absolute right-5 top-5 flex items-center gap-1.5 rounded-full border border-white/16 bg-white/70 px-2.5 py-1">
                        <Star className="h-[9px] w-[9px] text-navy" aria-hidden="true" />
                        <span className="text-[8px] font-semibold uppercase tracking-[0.11em] text-navy">
                          High impact
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-6">
                    <h2 className="text-[15px] font-semibold leading-[1.32] tracking-[-0.018em] text-ink">
                      {project.name}
                    </h2>
                    {project.role && (
                      <p className="mt-1.5 text-[9px] uppercase tracking-[0.12em] text-navy">
                        {project.role}
                      </p>
                    )}
                    <p className="mt-3.5 text-[11px] leading-[1.78] text-warm">
                      {project.description}
                    </p>

                    {/* Technologies */}
                    <div className="mt-5 flex flex-wrap gap-1.5">
                      {project.technologies.map((tech) => (
                        <span
                          key={tech}
                          className="rounded-[6px] border border-rule bg-paper-2 px-2 py-1 text-[8.5px] font-medium text-ink-soft"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>

                    {/* Skills demonstrated */}
                    <div className="mt-5 border-t border-rule pt-4">
                      <p className="label-caps text-[8px]">Skills demonstrated</p>
                      <div className="mt-2.5 space-y-2">
                        {project.skillsDemonstrated.slice(0, 3).map((skill) => (
                          <div key={skill} className="flex items-center gap-2">
                            <span className="h-[3px] w-[3px] rounded-full bg-navy" aria-hidden="true" />
                            <span className="text-[9px] text-ink-soft">{skill}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-5">
                      <div className="flex items-center gap-4">
                        {project.startDate && (
                          <div className="flex items-center gap-1.5">
                            <CalendarRange
                              className="h-[10px] w-[10px] text-warm-2"
                              aria-hidden="true"
                            />
                            <span className="tnum text-[8.5px] text-warm">
                              {formatDate(project.startDate, {
                                month: "short",
                                year: "2-digit",
                              })}
                              {project.endDate
                                ? ` – ${formatDate(project.endDate, {
                                    month: "short",
                                    year: "2-digit",
                                  })}`
                                : " – present"}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] uppercase tracking-[0.11em] text-warm">
                            Impact
                          </span>
                          <div className="w-[52px]">
                            <LedgerBar
                              value={Math.min(project.readinessImpact * 5, 100)}
                              tone="navy"
                              height={3}
                            />
                          </div>
                          <span className="tnum text-[8.5px] font-semibold text-ink">
                            +{project.readinessImpact}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {project.githubUrl && (
                          <a
                            href={project.githubUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="flex h-[28px] w-[28px] items-center justify-center rounded-[7px] border border-rule text-warm transition-colors hover:border-navy hover:text-navy"
                            aria-label={`View ${project.name} source on GitHub`}
                          >
                            <GithubIcon className="h-[11px] w-[11px]" />
                          </a>
                        )}
                        {project.liveUrl && (
                          <a
                            href={project.liveUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="flex h-[28px] w-[28px] items-center justify-center rounded-[7px] border border-rule text-warm transition-colors hover:border-navy hover:text-navy"
                            aria-label={`Open ${project.name} live`}
                          >
                            <ExternalLink className="h-[11px] w-[11px]" aria-hidden="true" />
                          </a>
                        )}
                        <button
                          type="button"
                          className={cn(
                            "inline-flex h-[28px] items-center gap-1 rounded-[7px] border border-rule px-2.5 text-[8.5px] font-medium text-ink transition-colors hover:border-navy hover:text-navy",
                          )}
                        >
                          Details
                          <ArrowUpRight className="h-[9px] w-[9px]" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        )}
      </section>

      <section className="mt-12 rounded-[13px] border border-navy/18 bg-navy-wash/42 px-7 py-7">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-[62ch]">
            <p className="label-caps text-navy">Next recommended action</p>
            <p className="mt-3 text-[12.5px] leading-[1.78] text-ink-soft">
              Your in-progress project — <strong>Atlas Job Scheduler</strong> — carries your
              highest potential readiness impact. Shipping it with a measurable outcome (latency,
              throughput, or users served) would add an estimated 14 points to your projects
              dimension and give you a concrete story for behavioural questions.
            </p>
          </div>
          <button
            type="button"
            className="btn-base h-[42px] shrink-0 rounded-[10px] bg-navy px-[18px] text-[14px] font-medium text-white hover:bg-navy-dark dark:bg-navy dark:text-[#0d1117]"
          >
            Add project update
          </button>
        </div>
      </section>
    </AppShell>
  );
}
