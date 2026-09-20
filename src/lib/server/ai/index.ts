import { getDashboard, getResumeRecords, getRoadmapTasks, getSkillRecords } from "@/lib/server/queries";
import type { DashboardPayload, RoadmapTask, SkillRecord } from "@/types";

/**
 * ---------------------------------------------------------------------------
 * AI provider abstraction.
 *
 * The application depends on the `AIProvider` contract, never on a concrete
 * vendor. Adding Claude, Gemini or Grok means implementing this interface and
 * registering it below — no business logic changes are required.
 * ---------------------------------------------------------------------------
 */

export interface AICompletionInput {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIProvider {
  readonly id: string;
  readonly label: string;
  readonly model: string;
  isAvailable(): boolean;
  complete(input: AICompletionInput): Promise<string>;
}

class OpenAIProvider implements AIProvider {
  readonly id = "openai";
  readonly label = "OpenAI";
  readonly model = process.env.OPENAI_MODEL ?? "gpt-5.5";

  isAvailable() {
    return Boolean(process.env.OPENAI_API_KEY);
  }

  async complete(input: AICompletionInput): Promise<string> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.user },
        ],
        max_tokens: input.maxTokens ?? 700,
        temperature: input.temperature ?? 0.4,
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!response.ok) {
      throw new Error(`Provider returned ${response.status}`);
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("Provider returned an empty completion");
    return content;
  }
}

/** Registered providers, in priority order. */
export const providers: AIProvider[] = [new OpenAIProvider()];

export function getActiveProvider(): AIProvider | null {
  return providers.find((p) => p.isAvailable()) ?? null;
}

export interface CareerAnswer {
  answer: string;
  provider: string;
  model: string;
  groundedIn: string[];
  followUps: string[];
  /** True when the answer came from the deterministic engine rather than a model. */
  degraded: boolean;
}

interface CareerContext {
  dashboard: DashboardPayload;
  skills: SkillRecord[];
  tasks: RoadmapTask[];
  resumeSummary: string;
}

async function loadContext(): Promise<CareerContext> {
  const [dashboard, skills, tasks, resumes] = await Promise.all([
    getDashboard(),
    getSkillRecords(),
    getRoadmapTasks(),
    getResumeRecords(),
  ]);

  const current = resumes.find((r) => r.isCurrent) ?? resumes[0];

  const resumeSummary = current
    ? `ATS score ${current.atsScore}/100, keyword coverage ${current.keywordCoverage}%, ${current.quantifiedImpactCount} quantified achievement(s), ${current.findings.filter((f) => f.severity === "HIGH").length} high-severity finding(s).`
    : "No resume has been uploaded yet.";

  return { dashboard, skills, tasks, resumeSummary };
}

function buildSystemPrompt(ctx: CareerContext): string {
  const { dashboard, skills, tasks } = ctx;
  return [
    "You are the CareerTracker career assistant: a precise, evidence-driven placement coach for students.",
    "Rules:",
    "- Answer only from the user data provided. Never invent scores, dates, employers or progress.",
    "- Be specific: name the exact skill, task, project or metric that supports your answer.",
    "- Always finish with a concrete next action the user can take today.",
    "- Keep answers under 220 words, using short paragraphs and bullets where helpful.",
    "",
    `Target role: ${dashboard.profile?.targetRole ?? "not set"}.`,
    `Target company: ${dashboard.profile?.targetCompany ?? "not set"}.`,
    `Career readiness: ${dashboard.readiness.overall}/100 (${dashboard.readiness.band}).`,
    `Resume: ${ctx.resumeSummary}`,
    `Skill coverage against target role: ${skills.length} skills tracked.`,
    `Top skill gaps: ${dashboard.skillGaps
      .slice(0, 5)
      .map((s) => `${s.name} (${s.currentLevel}/${s.requiredLevel})`)
      .join(", ")}.`,
    `Roadmap: ${tasks.length} tasks; ${tasks.filter((t) => t.status === "COMPLETED").length} completed.`,
    `Study availability: ${dashboard.profile?.studyHoursPerDay ?? "unknown"} hours/day.`,
    `Placement timeline: ${dashboard.profile?.placementTimelineMonths ?? "unknown"} months.`,
  ].join("\n");
}

function topicOf(message: string) {
  const m = message.toLowerCase();
  if (/today|now|next|focus/.test(m)) return "focus";
  if (/ready|prepare|preparation|interview/.test(m)) return "interview";
  if (/resume|cv|ats/.test(m)) return "resume";
  if (/skill|learn|study|gap/.test(m)) return "skill";
  if (/project|portfolio|build/.test(m)) return "project";
  if (/apply|application|job|company/.test(m)) return "application";
  return "general";
}

/**
 * Deterministic, data-grounded answer engine.
 * Used when no model credential is configured, and as the safety net when a
 * provider call fails — the user is always told which one they are getting.
 */
function buildGroundedAnswer(message: string, ctx: CareerContext): CareerAnswer {
  const { dashboard, skills, tasks } = ctx;
  const topic = topicOf(message);
  const target = dashboard.profile?.targetRole ?? "your target role";
  const topGap = dashboard.skillGaps[0];
  const dueTask = dashboard.todayTasks[0];
  const taskSkill = dueTask?.skillTag
    ? skills.find((s) => s.name === dueTask.skillTag)
    : undefined;
  const grounded = [
    `Readiness ${dashboard.readiness.overall}/100`,
    `Resume ATS ${dashboard.metrics.atsScore ?? "—"}`,
    `${dashboard.metrics.tasksCompleted}/${dashboard.metrics.tasksTotal} roadmap tasks complete`,
    `${skills.length} skills tracked`,
  ];

  const paragraphs: Record<string, string[]> = {
    focus: [
      `Your overall readiness is **${dashboard.readiness.overall}/100** (${dashboard.readiness.band}). The single highest-leverage thing you can do today is:`,
      `**${dueTask?.title ?? "Open your roadmap and start the first task"}** — ${
        dueTask
          ? `${dueTask.phaseName}, ${dueTask.progress}% complete, due ${new Date(dueTask.deadline ?? Date.now()).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}.`
          : "it is the first open item ordered by deadline."
      }`,
      `Why this one: your readiness model weights skills at 25% and learning consistency at 15%. This task targets **${taskSkill?.name ?? dueTask?.skillTag ?? "your highest-weight skill"}**, which is currently at ${
        taskSkill
          ? `${taskSkill.currentLevel} against a required ${taskSkill.requiredLevel}`
          : topGap
            ? `${topGap.currentLevel} against a required ${topGap.requiredLevel}`
            : "a level below the target"
      } for ${target}.${
        topGap && taskSkill && topGap.name !== taskSkill.name
          ? ` Your single largest gap remains **${topGap.name}** (${topGap.currentLevel}/${topGap.requiredLevel}).`
          : ""
      }`,
    ],
    interview: [
      `Based on your actual data, here is the honest picture for **${target}**:`,
      `- Interview preparation is at **${dashboard.metrics.interviewPrep}%** — ${
        dashboard.metrics.interviewPrep >= 60 ? "solid ground" : "this is your weakest dimension"
      }.`,
      `- Your resume clears at **${dashboard.metrics.atsScore ?? "—"}** ATS, so you are getting some screening traction (you have ${dashboard.metrics.applicationsActive} active application(s)).`,
      `- The gaps that will actually come up in an interview: ${
        dashboard.skillGaps
          .slice(0, 3)
          .map((s) => `${s.name} (${s.currentLevel}/${s.requiredLevel})`)
          .join(", ")
      }.`,
      `**Next action:** complete two timed mock rounds this week on the highest-gap area, then review only the questions you missed.`,
    ],
    resume: [
      `Your current resume scores **${dashboard.metrics.atsScore ?? "—"}** with keyword coverage at ${ctx.resumeSummary.match(/keyword coverage (\d+)%/)?.[1] ?? "—"}%.`,
      `Resume carries a 20% weight in your readiness score, so this is one of the faster levers you have.`,
      `**Next action:** work through the high-severity findings first — they are the ones that change screening outcomes — then re-run the analysis so the score reflects the new version.`,
    ],
    skill: [
      `You are tracking **${skills.length} skills** against ${target}. Coverage against the required levels is ${dashboard.skillGaps.length ? "shown in your readiness score" : "not yet calculated"}.`,
      `Largest gaps right now:`,
      ...dashboard.skillGaps
        .slice(0, 3)
        .map((s) => `- **${s.name}** — ${s.currentLevel} now, ${s.requiredLevel} required, priority ${s.priority}.`),
      `**Next action:** pick the top gap and schedule one focused 90-minute block this week; at ${dashboard.profile?.studyHoursPerDay ?? 2.5} hours/day that fits without displacing your roadmap.`,
    ],
    project: [
      `You have **${dashboard.metrics.projectsCount} project(s)** recorded, contributing ${
        dashboard.readiness.dimensions.find((d) => d.key === "projects")?.value ?? 0
      }% in the projects dimension.`,
      `Projects are worth 18% of readiness because they are the evidence recruiters actually verify.`,
      `**Next action:** ship the in-progress project with a measurable outcome (latency, users, cost) and put that number into your resume — quantified impact is your highest-severity resume finding.`,
    ],
    application: [
      `You have **${dashboard.metrics.applicationsCount} applications** recorded, with ${dashboard.metrics.applicationsActive} currently active.`,
      `Applications carry only 8% of readiness — deliberately, because applying without closing skill gaps rarely converts.`,
      `**Next action:** keep two targeted applications per week and make sure each one has a resume variant matching the posting's keywords.`,
    ],
    general: [
      `Here is where you actually stand, from your own data:`,
      `- Career readiness **${dashboard.readiness.overall}/100** — ${dashboard.readiness.band}.`,
      `- Resume ATS **${dashboard.metrics.atsScore ?? "—"}**.`, 
      `- Roadmap **${dashboard.metrics.roadmapProgress}%** complete (${dashboard.metrics.tasksCompleted}/${dashboard.metrics.tasksTotal} tasks).`,
      `- **${dashboard.metrics.skillsOnTrack}/${dashboard.metrics.skillsTotal}** skills are on track.`,
      `**Next action:** ask me "what should I learn today?" and I will answer against your roadmap, deadlines and study time.`,
    ],
  };

  return {
    answer: paragraphs[topic].join("\n\n"),
    provider: "careertracker-grounded",
    model: "rule-engine-1",
    groundedIn: grounded,
    followUps: [
      "What should I learn today?",
      "Am I ready for an SDE interview?",
      "Which resume fix has the biggest impact?",
      "How should I split my study time this week?",
    ],
    degraded: true,
  };
}

/**
 * Entry point used by the /api/v1/ai/chat route.
 * Always resolves — provider failures fall back to the grounded engine rather
 * than leaving the user without an answer.
 */
export async function generateCareerAnswer(message: string): Promise<CareerAnswer> {
  const ctx = await loadContext();
  const provider = getActiveProvider();

  if (!provider) {
    return buildGroundedAnswer(message, ctx);
  }

  try {
    const answer = await provider.complete({
      system: buildSystemPrompt(ctx),
      user: message,
      maxTokens: 700,
      temperature: 0.4,
    });

    return {
      answer,
      provider: provider.id,
      model: provider.model,
      groundedIn: [
        `Readiness ${ctx.dashboard.readiness.overall}/100`,
        `Resume ATS ${ctx.dashboard.metrics.atsScore ?? "—"}`,
        `${ctx.skills.length} skills`,
        `${ctx.tasks.length} roadmap tasks`,
      ],
      followUps: [
        "What should I focus on this week?",
        "Which skill gap should I close first?",
        "How can I improve my resume fastest?",
      ],
      degraded: false,
    };
  } catch (error) {
    console.error("[ai] provider call failed, falling back to grounded engine", {
      provider: provider.id,
      message: error instanceof Error ? error.message : "unknown",
    });
    return buildGroundedAnswer(message, ctx);
  }
}
