"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Bell,
  BellRing,
  CalendarClock,
  CheckCheck,
  FileText,
  Sparkles,
  Trophy,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, SectionLabel } from "@/components/ui/badge";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/feedback";
import { Reveal } from "@/components/shared/motion";
import { useNotifications } from "@/hooks/use-api";
import { cn, relativeTime } from "@/lib/utils";

const typeIcon: Record<string, typeof Bell> = {
  INTERVIEW_REMINDER: BellRing,
  ROADMAP_DEADLINE: CalendarClock,
  RESUME_ANALYSIS: FileText,
  MILESTONE: Trophy,
  WEEKLY_REPORT: Sparkles,
};

const typeTone: Record<string, "good" | "warn" | "bad" | "navy"> = {
  INTERVIEW_REMINDER: "warn",
  ROADMAP_DEADLINE: "bad",
  RESUME_ANALYSIS: "navy",
  MILESTONE: "good",
  WEEKLY_REPORT: "navy",
};

export default function NotificationsPage() {
  const { data, isLoading, isError, refetch } = useNotifications();

  return (
    <AppShell>
      <PageHeader
        eyebrow="Notifications"
        title={
          <>
            <span className="tnum text-navy">{data?.filter((n) => !n.readAt).length ?? 0}</span>{" "}
            unread notifications
          </>
        }
        description="Deadline reminders, analysis results, milestones and weekly reports — everything that should change what you do today."
        actions={
          <button
            type="button"
            className="btn-base h-[42px] rounded-[10px] border border-rule-strong bg-panel px-[18px] text-[14px] font-medium text-ink hover:border-navy hover:text-navy"
          >
            <CheckCheck className="h-[15px] w-[15px]" aria-hidden="true" />
            Mark all as read
          </button>
        }
      />

      <section className="overflow-hidden rounded-[13px] border border-rule bg-panel">
        <div className="flex flex-wrap items-center gap-3 border-b border-rule px-6 py-5">
          <p className="label-caps">Categories</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {["All", "Deadlines", "Interviews", "Resume", "Milestones", "Reports"].map(
              (category, i) => (
                <button
                  key={category}
                  type="button"
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-[10px] font-medium transition-colors",
                    i === 0
                      ? "border-navy bg-navy text-white"
                      : "border-rule text-warm hover:border-navy/50 hover:text-ink",
                  )}
                  aria-pressed={i === 0}
                >
                  {category}
                </button>
              ),
            )}
          </div>
        </div>

        <div className="px-6 py-8">
          {isLoading ? (
            <SkeletonRows rows={5} />
          ) : isError ? (
            <ErrorState
              title="We couldn't load your notifications"
              description="Nothing has been lost. Try again and we'll reload your notification history."
              onRetry={() => refetch()}
            />
          ) : (data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={Bell}
              title="No notifications yet"
              description="Notifications appear when something needs your attention — a deadline approaching, an analysis completing, or a milestone worth celebrating."
              action={
                <Link
                  href="/settings"
                  className="btn-base h-[42px] rounded-[10px] bg-navy px-[18px] text-[14px] font-medium text-white hover:bg-navy-dark dark:bg-navy dark:text-[#0d1117]"
                >
                  Configure notification preferences
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {(data ?? []).map((notification, i) => {
                const Icon = typeIcon[notification.type] ?? Bell;
                return (
                  <Reveal key={notification.id} delay={i * 0.05}>
                    <div
                      className={cn(
                        "group flex flex-col gap-4 rounded-[12px] border p-5 transition-colors sm:flex-row sm:items-start",
                        notification.readAt
                          ? "border-rule bg-panel"
                          : "border-navy/22 bg-navy-wash/32",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] border",
                          notification.readAt
                            ? "border-rule bg-paper-2"
                            : "border-navy/22 bg-navy text-white",
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-[16px] w-[16px]",
                            notification.readAt ? "text-navy" : "text-white",
                          )}
                          strokeWidth={1.8}
                          aria-hidden="true"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            tone={typeTone[notification.type] ?? "neutral"}
                            className="px-2 py-0.5 text-[8px]"
                          >
                            {notification.type.replace(/_/g, " ").toLowerCase()}
                          </Badge>
                          <span className="text-[8.5px] text-warm-2">
                            {relativeTime(notification.createdAt)}
                          </span>
                          {!notification.readAt && (
                            <span className="flex items-center gap-1.5">
                              <span className="h-[5px] w-[5px] rounded-full bg-navy" aria-hidden="true" />
                              <span className="text-[8px] font-semibold uppercase tracking-[0.11em] text-navy">
                                New
                              </span>
                            </span>
                          )}
                        </div>

                        <h2 className="mt-3 text-[13px] font-semibold leading-[1.44] text-ink">
                          {notification.title}
                        </h2>
                        <p className="mt-2 max-w-[72ch] text-[11px] leading-[1.76] text-warm">
                          {notification.body}
                        </p>

                        <button
                          type="button"
                          className="mt-3.5 inline-flex items-center gap-1.5 text-[9.5px] font-semibold text-navy underline-offset-4 hover:underline"
                        >
                          Take action
                          <ArrowUpRight className="h-[10px] w-[10px]" aria-hidden="true" />
                        </button>
                      </div>

                      {!notification.readAt && (
                        <button
                          type="button"
                          className="h-[30px] shrink-0 self-start rounded-[8px] border border-rule px-3 text-[8.5px] font-medium text-warm transition-colors hover:border-navy hover:text-navy"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </Reveal>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="mt-12">
        <SectionLabel index="01">Delivery preferences</SectionLabel>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Deadline reminders",
              desc: "Roadmap tasks due within 3 days",
              enabled: true,
              channel: "In-app · Email",
            },
            {
              title: "Interview reminders",
              desc: "7 days and 1 day before a scheduled interview",
              enabled: true,
              channel: "In-app · Email · Push",
            },
            {
              title: "Weekly progress report",
              desc: "Readiness change, completed tasks and next focus",
              enabled: true,
              channel: "Email",
            },
            {
              title: "Resume analysis complete",
              desc: "When a new analysis finishes processing",
              enabled: true,
              channel: "In-app",
            },
            {
              title: "Milestone alerts",
              desc: "Streaks, readiness bands and skill targets",
              enabled: false,
              channel: "In-app",
            },
            {
              title: "Product updates",
              desc: "New features and improvements to CareerTracker",
              enabled: false,
              channel: "Email",
            },
          ].map((pref) => (
            <div
              key={pref.title}
              className="flex items-start justify-between gap-4 rounded-[12px] border border-rule bg-panel p-5"
            >
              <div>
                <h3 className="text-[11.5px] font-semibold text-ink">{pref.title}</h3>
                <p className="mt-2 text-[9.5px] leading-[1.72] text-warm">{pref.desc}</p>
                <p className="mt-3 text-[8px] uppercase tracking-[0.11em] text-warm-2">
                  {pref.channel}
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={pref.enabled}
                aria-label={`${pref.title} notifications`}
                className={cn(
                  "relative h-[22px] w-[38px] shrink-0 rounded-full border transition-colors",
                  pref.enabled
                    ? "border-navy bg-navy"
                    : "border-rule-strong bg-paper-2",
                )}
              >
                <span
                  className={cn(
                    "absolute top-[2px] h-[16px] w-[16px] rounded-full bg-white shadow-sm transition-transform duration-200",
                    pref.enabled ? "left-[19px]" : "left-[2px]",
                  )}
                  aria-hidden="true"
                />
              </button>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
