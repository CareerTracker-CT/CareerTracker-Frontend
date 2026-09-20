"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUp, Bot, Check, Copy, Info, RefreshCw, Sparkles, User } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { SectionLabel } from "@/components/ui/badge";
import { ProcessingNote } from "@/components/ui/feedback";
import { Enter } from "@/components/shared/motion";
import { useDashboard } from "@/hooks/use-api";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  groundedIn?: string[];
  provider?: string;
  degraded?: boolean;
  followUps?: string[];
}

const starterPrompts = [
  {
    label: "What should I learn today?",
    hint: "Uses your roadmap, deadlines and study hours",
  },
  {
    label: "Am I ready for an SDE interview?",
    hint: "Answers from your skills, projects and prep progress",
  },
  {
    label: "Which resume fix has the biggest impact?",
    hint: "Weighs findings against your readiness score",
  },
  {
    label: "How should I split my study time this week?",
    hint: "Balances gaps against your placement timeline",
  },
];

export default function AssistantPage() {
  const { data: dashboard } = useDashboard();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || sending) return;

    setError(null);
    setInput("");
    setSending(true);

    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: message,
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await fetch("/api/v1/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload?.error?.message ?? "Request failed");
      }

      const assistantMessage: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: payload.data.answer,
        groundedIn: payload.data.groundedIn,
        provider: payload.data.provider,
        degraded: payload.data.degraded,
        followUps: payload.data.followUps,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setError(
        "We couldn't reach the career assistant just now. Your conversation is safe — try sending that again.",
      );
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setSending(false);
    }
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="AI career assistant"
        title={
          <>
            Ask about <span className="italic text-navy">your</span> career, not careers in
            general
          </>
        }
        description="Every answer is grounded in your profile, resume analysis, skill gaps, roadmap and application history — with the data it used shown alongside."
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_312px]">
        {/* ------------------------------------------------------ CHAT */}
        <section className="flex min-h-[620px] flex-col overflow-hidden rounded-[14px] border border-rule bg-panel">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-6 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-[26px] w-[26px] items-center justify-center rounded-[8px] bg-navy">
                <Bot className="h-[13px] w-[13px] text-white" aria-hidden="true" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-ink">CareerTracker Assistant</p>
                <p className="mt-0.5 text-[8.5px] text-warm">
                  Context: profile · resume · skills · roadmap · applications
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rule px-2.5 py-1">
                <span className="h-[6px] w-[6px] rounded-full bg-good" aria-hidden="true" />
                <span className="text-[8.5px] font-medium uppercase tracking-[0.11em] text-warm">
                  {dashboard ? "Context loaded" : "Loading context"}
                </span>
              </span>
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMessages([])}
                  className="inline-flex h-[26px] items-center gap-1.5 rounded-full border border-rule px-2.5 text-[8.5px] font-medium uppercase tracking-[0.11em] text-warm transition-colors hover:border-navy hover:text-navy"
                >
                  <RefreshCw className="h-[9px] w-[9px]" aria-hidden="true" />
                  New chat
                </button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="scroll-slim flex-1 overflow-y-auto px-6 py-8">
            {messages.length === 0 ? (
              <Enter>
                <div className="mx-auto max-w-[560px] py-8 text-center">
                  <div className="mx-auto flex h-[52px] w-[52px] items-center justify-center rounded-[13px] border border-navy/20 bg-navy-wash">
                    <Sparkles className="h-[21px] w-[21px] text-navy" strokeWidth={1.7} aria-hidden="true" />
                  </div>
                  <h2 className="mt-6 text-[21px] font-semibold leading-[1.26] tracking-[-0.026em] text-ink">
                    What would you like to know?
                  </h2>
                  <p className="mx-auto mt-3.5 max-w-[42ch] text-[12.5px] leading-[1.76] text-warm">
                    Start with one of these, or ask your own question. The assistant has read your{" "}
                    {dashboard?.metrics.skillsTotal ?? "—"} tracked skills,{" "}
                    {dashboard?.metrics.tasksTotal ?? "—"} roadmap tasks and your latest resume
                    analysis.
                  </p>

                  <div className="mt-9 space-y-2.5 text-left">
                    {starterPrompts.map((prompt, i) => (
                      <Enter key={prompt.label} delay={0.06 * i}>
                        <button
                          type="button"
                          onClick={() => send(prompt.label)}
                          className="group flex w-full items-center justify-between gap-4 rounded-[11px] border border-rule bg-paper-2/50 px-5 py-4 text-left transition-colors hover:border-navy/45 hover:bg-navy-wash/38"
                        >
                          <div>
                            <p className="text-[12px] font-medium text-ink">{prompt.label}</p>
                            <p className="mt-1.5 text-[9.5px] text-warm">{prompt.hint}</p>
                          </div>
                          <ArrowRight
                            className="h-[14px] w-[14px] shrink-0 text-warm transition-transform duration-200 group-hover:translate-x-1 group-hover:text-navy"
                            aria-hidden="true"
                          />
                        </button>
                      </Enter>
                    ))}
                  </div>
                </div>
              </Enter>
            ) : (
              <div className="mx-auto max-w-[720px] space-y-8">
                {messages.map((message) =>
                  message.role === "user" ? (
                    <div key={message.id} className="flex justify-end">
                      <div className="flex max-w-[80%] items-start gap-3">
                        <div className="rounded-[13px] rounded-br-[5px] bg-navy px-4.5 py-3.5">
                          <p className="text-[12.5px] leading-[1.72] text-white">
                            {message.content}
                          </p>
                        </div>
                        <div className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[8px] border border-rule bg-paper-2">
                          <User className="h-[12px] w-[12px] text-warm" aria-hidden="true" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div key={message.id} className="flex items-start gap-3">
                      <div className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[8px] bg-navy">
                        <Bot className="h-[13px] w-[13px] text-white" aria-hidden="true" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-warm">
                            CareerTracker Assistant
                          </p>
                          {message.degraded && (
                            <span className="rounded-full border border-warn/25 bg-warn-wash px-2 py-0.5 text-[7.5px] font-semibold uppercase tracking-[0.11em] text-warm">
                              Grounded engine
                            </span>
                          )}
                        </div>

                        <div className="mt-3 whitespace-pre-line text-[12.5px] leading-[1.86] text-ink-soft">
                          {message.content
                            .split("\n\n")
                            .map((block, i) =>
                              /^\s*[-•]/.test(block) ? (
                                <ul key={i} className="my-2.5 space-y-2">
                                  {block.split("\n").map((line, j) => (
                                    <li key={j} className="flex items-start gap-2.5">
                                      <span
                                        className="mt-[9px] h-[3.5px] w-[3.5px] shrink-0 rounded-full bg-navy"
                                        aria-hidden="true"
                                      />
                                      <span
                                        dangerouslySetInnerHTML={{
                                          __html: line
                                            .replace(/^\s*[-•]\s*/, "")
                                            .replace(
                                              /\*\*(.+?)\*\*/g,
                                              '<strong class="font-semibold text-ink">$1</strong>',
                                            ),
                                        }}
                                      />
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p
                                  key={i}
                                  className="my-2.5"
                                  dangerouslySetInnerHTML={{
                                    __html: block.replace(
                                      /\*\*(.+?)\*\*/g,
                                      '<strong class="font-semibold text-ink">$1</strong>',
                                    ),
                                  }}
                                />
                              ),
                            )}
                        </div>

                        {message.groundedIn && message.groundedIn.length > 0 && (
                          <div className="mt-5 rounded-[10px] border border-rule bg-paper-2/60 p-3.5">
                            <div className="flex items-start gap-2">
                              <Info
                                className="mt-[2px] h-[10px] w-[10px] shrink-0 text-warm"
                                aria-hidden="true"
                              />
                              <div>
                                <p className="text-[8px] font-semibold uppercase tracking-[0.13em] text-warm">
                                  Grounded in your data
                                </p>
                                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5">
                                  {message.groundedIn.map((item) => (
                                    <span
                                      key={item}
                                      className="tnum inline-flex items-center gap-1.5 text-[8.5px] text-warm"
                                    >
                                      <Check
                                        className="h-[9px] w-[9px] text-good"
                                        aria-hidden="true"
                                      />
                                      {item}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="mt-4 flex items-center gap-2">
                          <button
                            type="button"
                            className="inline-flex h-[26px] items-center gap-1.5 rounded-[7px] border border-rule px-2.5 text-[8.5px] font-medium text-warm transition-colors hover:border-navy hover:text-navy"
                          >
                            <Copy className="h-[9px] w-[9px]" aria-hidden="true" />
                            Copy
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-[26px] items-center gap-1.5 rounded-[7px] border border-rule px-2.5 text-[8.5px] font-medium text-warm transition-colors hover:border-navy hover:text-navy"
                          >
                            <RefreshCw className="h-[9px] w-[9px]" aria-hidden="true" />
                            Regenerate
                          </button>
                        </div>

                        {message.followUps && message.followUps.length > 0 && (
                          <div className="mt-5 flex flex-wrap gap-2">
                            {message.followUps.map((followUp) => (
                              <button
                                key={followUp}
                                type="button"
                                onClick={() => send(followUp)}
                                className="rounded-full border border-navy/22 bg-navy-wash/40 px-3.5 py-1.5 text-[9px] font-medium text-navy transition-colors hover:bg-navy-wash"
                              >
                                {followUp}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ),
                )}

                {sending && (
                  <div className="flex items-start gap-3">
                    <div className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[8px] bg-navy">
                      <Bot className="h-[13px] w-[13px] text-white" aria-hidden="true" />
                    </div>
                    <div className="flex-1">
                      <ProcessingNote
                        message="Reading your roadmap, skill gaps and resume analysis…"
                        step="grounding"
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-3 rounded-[11px] border border-bad/25 bg-bad-wash/55 px-5 py-4"
                  >
                    <p className="text-[11px] leading-[1.72] text-bad">{error}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-rule px-6 py-5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="mx-auto flex max-w-[720px] items-end gap-3"
            >
              <div className="relative flex-1">
                <label htmlFor="assistant-input" className="sr-only">
                  Ask the career assistant
                </label>
                <textarea
                  id="assistant-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  rows={1}
                  placeholder="Ask anything about your career preparation…"
                  className="field max-h-[128px] min-h-[52px] resize-none py-4 pr-4 text-[12.5px] leading-[1.62]"
                />
              </div>
              <button
                type="submit"
                disabled={sending || input.trim().length === 0}
                className={cn(
                  "flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[11px] transition-colors",
                  sending || input.trim().length === 0
                    ? "cursor-not-allowed bg-rule text-warm-2"
                    : "bg-navy text-white hover:bg-navy-dark dark:bg-navy dark:text-[#0d1117]",
                )}
                aria-label="Send message"
              >
                <ArrowUp className="h-[18px] w-[18px]" aria-hidden="true" />
              </button>
            </form>
            <p className="mx-auto mt-3 max-w-[720px] text-[8.5px] text-warm-2">
              Answers are generated from your own data and may be incomplete. Verify important
              details before acting on them.
            </p>
          </div>
        </section>

        {/* --------------------------------------------------- SIDE RAIL */}
        <aside className="space-y-6">
          <div className="rounded-[13px] border border-rule bg-panel p-6">
            <SectionLabel index="01" rule={false}>
              Context in use
            </SectionLabel>
            <div className="mt-5 space-y-3.5">
              {[
                { label: "Career profile", value: dashboard?.profile?.targetRole ?? "Not set" },
                {
                  label: "Resume analysis",
                  value: dashboard?.metrics.atsScore
                    ? `ATS ${dashboard.metrics.atsScore}/100`
                    : "Not analysed",
                },
                {
                  label: "Tracked skills",
                  value: `${dashboard?.metrics.skillsTotal ?? 0} skills`,
                },
                {
                  label: "Roadmap",
                  value: `${dashboard?.metrics.roadmapProgress ?? 0}% complete`,
                },
                {
                  label: "Applications",
                  value: `${dashboard?.metrics.applicationsActive ?? 0} active`,
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between border-b border-rule pb-3.5 last:border-0 last:pb-0"
                >
                  <span className="text-[10px] text-warm">{row.label}</span>
                  <span className="text-[10px] font-medium text-ink">{row.value}</span>
                </div>
              ))}
            </div>
            <Link
              href="/profile"
              className="mt-5 inline-flex items-center gap-1.5 text-[10px] font-semibold text-navy underline-offset-4 hover:underline"
            >
              Update what the assistant knows
              <ArrowRight className="h-[10px] w-[10px]" />
            </Link>
          </div>

          <div className="rounded-[13px] border border-navy/18 bg-navy-wash/42 p-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-navy">
              <Info className="h-[15px] w-[15px] text-white" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-[12px] font-semibold text-ink">
              Why answers are specific
            </h3>
            <p className="mt-2.5 text-[10px] leading-[1.74] text-ink-soft">
              Before responding, the assistant reads your readiness dimensions, the open findings
              on your resume, your skill gaps ranked by priority, and the deadlines on your
              roadmap. That&apos;s why it can name the exact task to work on — not a generic study
              tip.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span className="rounded-full border border-navy/22 px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.11em] text-navy">
                Provider abstraction
              </span>
              <span className="rounded-full border border-navy/22 px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.11em] text-navy">
                Retry aware
              </span>
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
