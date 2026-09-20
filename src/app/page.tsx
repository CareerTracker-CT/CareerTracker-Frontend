import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Compass,
  FileSearch,
  GitBranch,
  MessageSquare,
  Route,
  Target,
} from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Enter, Reveal, Stagger, StaggerItem } from "@/components/shared/motion";
import { ReadinessRing } from "@/components/charts/readiness-ring";
import { LedgerBar } from "@/components/charts/skill-bar";
import { SectionLabel } from "@/components/ui/badge";

export const metadata = {
  title: "CareerTracker — Track Skills. Build Your Career. Get Hired.",
  description:
    "Understand your career readiness, close your skill gaps and know exactly what to do next.",
};

const steps = [
  {
    n: "01",
    title: "Tell us where you're headed",
    body: "Your target role, branch, semester, study hours and placement timeline. Every recommendation downstream is anchored to these.",
    icon: Compass,
    width: "lg:col-span-4",
  },
  {
    n: "02",
    title: "Upload your resume",
    body: "CareerTracker extracts your skills, measures ATS compatibility and explains every finding — including why it matters.",
    icon: FileSearch,
    width: "lg:col-span-3",
  },
  {
    n: "03",
    title: "See the real gap",
    body: "Your current level against the level your target role actually expects, skill by skill, with priority ordering.",
    icon: Target,
    width: "lg:col-span-2",
  },
  {
    n: "04",
    title: "Follow the plan",
    body: "A phased roadmap that adapts to your deadlines and available hours — and tells you what to do today.",
    icon: Route,
    width: "lg:col-span-3",
  },
];

const dimensions = [
  { label: "Resume", value: 71, note: "2 high-severity findings open" },
  { label: "Skills", value: 62, note: "Coverage against target role" },
  { label: "Projects", value: 78, note: "4 projects, 2 shipped" },
  { label: "Learning", value: 54, note: "Roadmap consistency" },
  { label: "Interview prep", value: 38, note: "Weakest dimension today" },
  { label: "Applications", value: 66, note: "3 active pipelines" },
];

const gapRows = [
  { skill: "Distributed Systems", current: 27, required: 78, priority: "High", progress: 33 },
  { skill: "System Design", current: 34, required: 80, priority: "High", progress: 42 },
  { skill: "PostgreSQL & Query Tuning", current: 61, required: 82, priority: "High", progress: 68 },
  { skill: "Go (Golang)", current: 52, required: 78, priority: "Medium", progress: 61 },
  { skill: "Docker & Kubernetes", current: 44, required: 75, priority: "Medium", progress: 55 },
];

export default function LandingPage() {
  return (
    <div className="relative">
      <SiteHeader />

      <main id="main-content">
        {/* ---------------------------------------------------------- HERO */}
        <section className="relative overflow-hidden pb-20 pt-[112px] lg:pb-28 lg:pt-[140px]">
          <div className="grid-paper grid-drift pointer-events-none absolute inset-0 opacity-[0.55]" aria-hidden="true" />
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-[520px]"
            style={{
              background:
                "radial-gradient(900px 380px at 18% 6%, color-mix(in srgb, var(--navy-wash) 62%, transparent), transparent 72%)",
            }}
            aria-hidden="true"
          />

          <div className="relative mx-auto w-full max-w-[1240px] px-6 lg:px-10">
            <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-10">
              {/* Copy — left weighted 7 cols */}
              <div className="lg:col-span-7">
                <Enter delay={0.04}>
                  <div className="inline-flex items-center gap-2.5 rounded-full border border-rule bg-panel/80 py-1.5 pl-1.5 pr-4">
                    <span className="rounded-full bg-navy px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-white">
                      New
                    </span>
                    <span className="text-[12.5px] text-warm">
                      Transparent readiness scoring — see exactly how it&apos;s calculated
                    </span>
                  </div>
                </Enter>

                <Enter delay={0.1}>
                  <h1 className="mt-8 text-[clamp(2.75rem,7.2vw,5.05rem)] font-semibold leading-[0.96] tracking-[-0.038em] text-ink">
                    Track skills.
                    <br />
                    Build your career.
                    <br />
                    <span className="italic text-navy">Get hired.</span>
                  </h1>
                </Enter>

                <Enter delay={0.16}>
                  <p className="mt-8 max-w-[52ch] text-[17px] leading-[1.68] text-warm lg:text-[18.5px]">
                    CareerTracker measures your career readiness across six dimensions, shows you
                    precisely what&apos;s missing against your target role, and turns it into a
                    plan for this week — not someday.
                  </p>
                </Enter>

                <Enter delay={0.22}>
                  <div className="mt-9 flex flex-wrap items-center gap-3">
                    <Link
                      href="/login"
                      className="btn-base group h-[52px] rounded-[11px] bg-navy px-7 text-[15px] font-medium text-white shadow-[0_12px_28px_-14px_rgba(27,58,87,0.65)] hover:bg-navy-dark dark:bg-navy dark:text-[#0d1117]"
                    >
                      Get started free
                      <ArrowRight
                        className="h-[17px] w-[17px] transition-transform duration-200 group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </Link>
                    <Link
                      href="#how-it-works"
                      className="btn-base h-[52px] rounded-[11px] border border-rule-strong bg-panel/70 px-6 text-[15px] font-medium text-ink hover:border-navy hover:text-navy"
                    >
                      Explore CareerTracker
                    </Link>
                  </div>
                </Enter>

                <Enter delay={0.28}>
                  <dl className="mt-12 grid max-w-[560px] grid-cols-3 gap-px overflow-hidden rounded-[12px] border border-rule bg-rule">
                    {[
                      { k: "Readiness model", v: "6", s: "weighted dimensions" },
                      { k: "Roadmap tasks", v: "12", s: "phased & deadline-aware" },
                      { k: "Setup time", v: "~4", s: "minutes to first insight" },
                    ].map((item) => (
                      <div key={item.k} className="bg-panel px-5 py-5">
                        <dt className="label-caps">{item.k}</dt>
                        <dd className="mt-2.5">
                          <span className="tnum font-display text-[30px] font-semibold leading-none tracking-[-0.03em] text-ink">
                            {item.v}
                          </span>
                          <p className="mt-1.5 text-[11.5px] leading-[1.5] text-warm">{item.s}</p>
                        </dd>
                      </div>
                    ))}
                  </dl>
                </Enter>
              </div>

              {/* Product surface — bleeds past the container edge */}
              <Enter delay={0.18} className="lg:col-span-5">
                <div className="relative lg:-mr-[132px] lg:w-[calc(100%+132px)]">
                  <div className="grain relative aspect-[4/5] overflow-hidden rounded-[16px] border border-rule shadow-[0_40px_90px_-42px_rgba(20,22,25,0.5)] sm:aspect-[16/11] lg:aspect-[4/4.4]">
                    <Image
                      src="/images/hero-surface.svg"
                      alt="A printed career readiness dossier on a desk in warm morning light"
                      fill
                      priority
                      sizes="(max-width: 1024px) 100vw, 46vw"
                      className="object-cover"
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(200deg, color-mix(in srgb, var(--navy-dark) 24%, transparent) 0%, transparent 42%, color-mix(in srgb, var(--paper) 16%, transparent) 100%)",
                      }}
                    />

                    {/* Floating readiness ledger — real UI, not decoration */}
                    <div className="absolute bottom-5 left-5 right-5 rounded-[13px] border border-white/14 bg-[#14161acc] p-5 backdrop-blur-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-white/55">
                            Career readiness
                          </p>
                          <p className="tnum mt-2 font-display text-[38px] font-semibold leading-none tracking-[-0.03em] text-white">
                            62<span className="text-[17px] text-white/50"> /100</span>
                          </p>
                          <p className="mt-1.5 text-[11px] text-white/60">
                            Building momentum · +3 this week
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-[7px]">
                          {[
                            { l: "Resume", v: 71 },
                            { l: "Skills", v: 62 },
                            { l: "Interviews", v: 38 },
                          ].map((row) => (
                            <div key={row.l} className="flex items-center gap-2.5">
                              <span className="w-[74px] text-right text-[9.5px] uppercase tracking-[0.11em] text-white/55">
                                {row.l}
                              </span>
                              <span className="h-[4px] w-[52px] overflow-hidden rounded-full bg-white/18">
                                <span
                                  className="block h-full rounded-full bg-white/85"
                                  style={{ width: `${row.v}%` }}
                                />
                              </span>
                              <span className="tnum w-[20px] text-[10px] font-semibold text-white">
                                {row.v}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Enter>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------ TRUST BAR */}
        <section className="border-y border-rule bg-panel/50">
          <div className="mx-auto w-full max-w-[1240px] px-6 lg:px-10">
            <div className="grid divide-y divide-rule sm:grid-cols-2 sm:divide-x lg:grid-cols-4">
              {[
                {
                  icon: BarChart3,
                  title: "Scores you can inspect",
                  body: "Every readiness dimension publishes its weight and the data behind it.",
                },
                {
                  icon: GitBranch,
                  title: "Plans that adapt",
                  body: "Roadmaps recompute when your deadlines, hours or skills change.",
                },
                {
                  icon: CheckCircle2,
                  title: "No fake analytics",
                  body: "If we haven't measured it, we won't show it — and we'll say so.",
                },
                {
                  icon: MessageSquare,
                  title: "Context-aware guidance",
                  body: "The assistant reads your actual profile, not a generic playbook.",
                },
              ].map((item) => (
                <div key={item.title} className="px-1 py-8 sm:px-7">
                  <item.icon className="h-[19px] w-[19px] text-navy" strokeWidth={1.7} aria-hidden="true" />
                  <h3 className="mt-4 text-[15px] font-semibold text-ink">{item.title}</h3>
                  <p className="mt-2 text-[13px] leading-[1.68] text-warm">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --------------------------------------------------- HOW IT WORKS */}
        <section id="how-it-works" className="relative scroll-mt-24 py-24 lg:py-32">
          <div className="mx-auto w-full max-w-[1240px] px-6 lg:px-10">
            <div className="grid gap-10 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <SectionLabel index="01">How CareerTracker works</SectionLabel>
                <h2 className="text-[clamp(2.1rem,4.3vw,3.35rem)] font-semibold leading-[1.06] tracking-[-0.032em] text-ink">
                  Four steps between
                  <span className="text-warm"> uncertainty</span> and
                  <span className="italic text-navy"> a plan</span>.
                </h2>
              </div>
              <div className="flex items-end lg:col-span-7 lg:pl-12">
                <p className="max-w-[58ch] text-[16px] leading-[1.78] text-warm">
                  Most career tools give you a number and leave you to interpret it. CareerTracker
                  is built the other way round: the number exists only to point you at the next
                  useful action, and every step is reversible as your goals change.
                </p>
              </div>
            </div>

            {/* Continuous ruled sequence — deliberately uneven column widths */}
            <div className="mt-14 border-t-2 border-ink/85">
              <Stagger className="grid gap-px lg:grid-cols-12">
                {steps.map((step) => (
                  <StaggerItem key={step.n} className={`${step.width} group relative`}>
                    <div className="relative h-full px-0 pb-10 pt-8 lg:px-7 lg:first:pl-0">
                      <div className="absolute left-0 top-0 h-[2px] w-0 bg-navy transition-all duration-500 group-hover:w-full lg:left-7 lg:w-0 lg:group-hover:w-[calc(100%-56px)]" />
                      <div className="flex items-start gap-5">
                        <span className="tnum font-mono text-[11px] font-medium tracking-[0.16em] text-navy">
                          {step.n}
                        </span>
                        <step.icon
                          className="mt-[1px] h-[18px] w-[18px] text-warm transition-colors duration-300 group-hover:text-navy"
                          strokeWidth={1.7}
                          aria-hidden="true"
                        />
                      </div>
                      <h3 className="mt-6 text-[19px] font-semibold leading-[1.32] tracking-[-0.018em] text-ink lg:pr-4">
                        {step.title}
                      </h3>
                      <p className="mt-3.5 text-[13.5px] leading-[1.72] text-warm lg:pr-2">
                        {step.body}
                      </p>
                    </div>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------ READINESS */}
        <section id="readiness" className="relative scroll-mt-24 overflow-hidden border-y border-rule bg-panel py-24 lg:py-32">
          <div className="grid-paper pointer-events-none absolute inset-0 opacity-[0.4]" aria-hidden="true" />
          <div className="relative mx-auto w-full max-w-[1240px] px-6 lg:px-10">
            <div className="grid items-center gap-16 lg:grid-cols-2">
              <div>
                <SectionLabel index="02">Career readiness</SectionLabel>
                <h2 className="text-[clamp(2.1rem,4.3vw,3.35rem)] font-semibold leading-[1.06] tracking-[-0.032em] text-ink">
                  A score that
                  <span className="italic text-navy"> shows its working</span>.
                </h2>
                <p className="mt-7 max-w-[52ch] text-[16px] leading-[1.78] text-warm">
                  Six dimensions, each weighted, each traceable back to real records — your resume
                  analysis, your skill log, your roadmap, your applications. Open any dimension and
                  you&apos;ll see what&apos;s missing and the exact next action to take.
                </p>

                <ul className="mt-9 space-y-0 border-t border-rule">
                  {[
                    "Published weighting: Skills 25% · Resume 20% · Projects 18% · Learning 15% · Interview 14% · Applications 8%",
                    "Every dimension lists its missing items, not just a percentage",
                    "Recalculated as your data changes — no stale dashboards",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3.5 border-b border-rule py-4">
                      <CheckCircle2
                        className="mt-[3px] h-[16px] w-[16px] shrink-0 text-navy"
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                      <span className="text-[13.5px] leading-[1.72] text-ink-soft">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Reveal>
                <div className="panel relative overflow-hidden p-8 shadow-[0_32px_70px_-38px_rgba(20,22,25,0.34)] lg:p-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="label-caps">Sample assessment</p>
                      <p className="mt-2 text-[13px] text-warm">
                        Backend Engineer (SDE-1) · Final year
                      </p>
                    </div>
                    <span className="rounded-full bg-warn-wash px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.11em] text-warn">
                      Building momentum
                    </span>
                  </div>

                  <div className="mt-8 flex flex-col items-center gap-9 sm:flex-row">
                    <ReadinessRing
                      value={62}
                      size={196}
                      segments={dimensions.map((d, i) => ({
                        key: `dim-${i}`,
                        label: d.label,
                        value: d.value,
                      }))}
                    />
                    <div className="w-full flex-1 space-y-3.5">
                      {dimensions.slice(0, 5).map((dim) => (
                        <div key={dim.label}>
                          <div className="flex items-baseline justify-between">
                            <span className="text-[12px] font-medium text-ink-soft">{dim.label}</span>
                            <span className="tnum text-[11px] text-warm">
                              {dim.value}
                              <span className="text-warm-2">%</span>
                            </span>
                          </div>
                          <div className="mt-1.5">
                            <LedgerBar
                              value={dim.value}
                              tone={dim.value >= 70 ? "good" : dim.value >= 50 ? "navy" : "warn"}
                              height={5}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-9 rounded-[10px] border border-navy/18 bg-navy-wash/55 p-4">
                    <p className="label-caps text-navy">Recommended next action</p>
                    <p className="mt-2 text-[13px] leading-[1.68] text-ink">
                      Complete two timed mock rounds this week — interview preparation is your
                      weakest dimension at 38%, and your target-role interview is in 24 days.
                    </p>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------- RESUME */}
        <section id="resume" className="relative scroll-mt-24 py-24 lg:py-32">
          <div className="mx-auto w-full max-w-[1240px] px-6 lg:px-10">
            <div className="grid items-start gap-16 lg:grid-cols-2">
              <Reveal className="order-2 lg:order-1">
                <div className="space-y-px overflow-hidden rounded-[14px] border border-rule">
                  {[
                    {
                      sev: "High",
                      tone: "bad",
                      title: "Project bullets describe features, not outcomes",
                      why: "Recruiters scan for evidence of impact in seconds — a measurable result is what separates a memorable bullet from a generic one.",
                    },
                    {
                      sev: "High",
                      tone: "bad",
                      title: "Missing role-specific keywords for SDE-1 postings",
                      why: "Most first-pass screening is keyword-driven. Missing core terms means your resume can be filtered before a human reads it.",
                    },
                    {
                      sev: "Medium",
                      tone: "warn",
                      title: "Skills section mixes proficiency levels without evidence",
                      why: "An undifferentiated list invites questions you may not be ready for, and dilutes the signal of your genuinely strong skills.",
                    },
                  ].map((finding) => (
                    <div key={finding.title} className="bg-panel p-6">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`h-[7px] w-[7px] rounded-full ${
                            finding.tone === "bad" ? "bg-bad" : "bg-warn"
                          }`}
                          aria-hidden="true"
                        />
                        <span className="label-caps">{finding.sev} severity</span>
                      </div>
                      <h3 className="mt-3.5 text-[15.5px] font-semibold leading-[1.42] text-ink">
                        {finding.title}
                      </h3>
                      <p className="mt-2.5 text-[12.5px] leading-[1.72] text-warm">
                        <span className="font-medium text-ink-soft">Why it matters: </span>
                        {finding.why}
                      </p>
                    </div>
                  ))}
                  <div className="flex items-center justify-between bg-navy px-6 py-5">
                    <p className="text-[12.5px] font-medium text-white">
                      Ready to see your own analysis?
                    </p>
                    <Link
                      href="/resume"
                      className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-white underline-offset-4 hover:underline"
                    >
                      Open resume analysis
                      <ArrowUpRight className="h-[14px] w-[14px]" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </Reveal>

              <div className="order-1 lg:order-2 lg:pl-10">
                <SectionLabel index="03">Resume intelligence</SectionLabel>
                <h2 className="text-[clamp(2.1rem,4.3vw,3.35rem)] font-semibold leading-[1.06] tracking-[-0.032em] text-ink">
                  Every finding,
                  <span className="italic text-navy"> explained</span>.
                </h2>
                <p className="mt-7 max-w-[50ch] text-[16px] leading-[1.78] text-warm">
                  An ATS score on its own is trivia. CareerTracker pairs each finding with the
                  reason it affects your chances and a concrete rewrite — so you know which of the
                  twenty suggestions actually moves the needle.
                </p>

                <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-[12px] border border-rule bg-rule">
                  {[
                    { k: "ATS compatibility", v: "71", s: "scored against 40 checks" },
                    { k: "Keyword coverage", v: "64%", s: "vs. your target role" },
                    { k: "Quantified impact", v: "5", s: "measurable achievements" },
                    { k: "High-severity issues", v: "2", s: "fix these first" },
                  ].map((stat) => (
                    <div key={stat.k} className="bg-panel p-5">
                      <p className="label-caps">{stat.k}</p>
                      <p className="tnum mt-2.5 font-display text-[27px] font-semibold leading-none tracking-[-0.028em] text-ink">
                        {stat.v}
                      </p>
                      <p className="mt-2 text-[11px] text-warm">{stat.s}</p>
                    </div>
                  ))}
                </div>

                <Link
                  href="/resume"
                  className="group mt-9 inline-flex items-center gap-2 text-[14px] font-medium text-navy"
                >
                  See the full analysis breakdown
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-navy/30 transition-transform duration-200 group-hover:translate-x-1">
                    <ArrowRight className="h-[13px] w-[13px]" aria-hidden="true" />
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------ SKILL GAP */}
        <section id="skill-gap" className="relative scroll-mt-24 overflow-hidden border-y border-rule bg-paper-2 py-24 lg:py-32">
          <div className="mx-auto w-full max-w-[1240px] px-6 lg:px-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-[620px]">
                <SectionLabel index="04">Skill gap analysis</SectionLabel>
                <h2 className="text-[clamp(2.1rem,4.3vw,3.35rem)] font-semibold leading-[1.06] tracking-[-0.032em] text-ink">
                  Know the gap
                  <span className="italic text-navy"> before the interviewer does</span>.
                </h2>
              </div>
              <p className="max-w-[380px] text-[14.5px] leading-[1.76] text-warm">
                Not a wishlist — a measured comparison between what you can demonstrate today and
                what your target role expects, ordered by how much it matters.
              </p>
            </div>

            {/* Ledger table */}
            <div className="mt-14 overflow-hidden rounded-[14px] border border-rule bg-panel">
              <div className="hidden grid-cols-[1.6fr_1.7fr_0.7fr_0.8fr] items-center gap-6 border-b border-rule px-7 py-4 md:grid">
                <span className="label-caps">Skill</span>
                <span className="label-caps">Current vs. required level</span>
                <span className="label-caps">Priority</span>
                <span className="label-caps text-right">Progress</span>
              </div>

              {gapRows.map((row, i) => (
                <Reveal key={row.skill} delay={i * 0.05}>
                  <div className="grid grid-cols-1 items-center gap-4 border-b border-rule px-7 py-6 transition-colors last:border-0 hover:bg-navy-wash/25 md:grid-cols-[1.6fr_1.7fr_0.7fr_0.8fr] md:gap-6">
                    <div>
                      <p className="text-[14.5px] font-medium leading-snug text-ink">{row.skill}</p>
                      <p className="mt-1 text-[11px] text-warm">
                        Gap of {row.required - row.current} points
                      </p>
                    </div>

                    <div>
                      <div className="relative h-[7px] w-full rounded-full bg-rule">
                        <div
                          className="h-full rounded-full bg-navy"
                          style={{ width: `${row.current}%` }}
                        />
                        <div
                          className="absolute top-1/2 h-[15px] w-[2px] -translate-y-1/2 rounded-full bg-ink"
                          style={{ left: `calc(${row.required}% - 1px)` }}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="tnum text-[10.5px] text-warm">
                          Current <strong className="font-semibold text-ink">{row.current}%</strong>
                        </span>
                        <span className="tnum text-[10.5px] text-warm">
                          Required <strong className="font-semibold text-ink">{row.required}%</strong>
                        </span>
                      </div>
                    </div>

                    <div>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.09em] ${
                          row.priority === "High"
                            ? "bg-bad-wash text-bad"
                            : "bg-warn-wash text-warn"
                        }`}
                      >
                        <span
                          className={`h-[5px] w-[5px] rounded-full ${
                            row.priority === "High" ? "bg-bad" : "bg-warn"
                          }`}
                          aria-hidden="true"
                        />
                        {row.priority}
                      </span>
                    </div>

                    <div className="flex items-center justify-start gap-2.5 md:justify-end">
                      <span className="tnum text-[16px] font-semibold leading-none text-ink">
                        {row.progress}
                        <span className="text-[11px] font-normal text-warm">%</span>
                      </span>
                    </div>
                  </div>
                </Reveal>
              ))}

              <div className="flex flex-wrap items-center justify-between gap-4 bg-paper-2 px-7 py-5">
                <p className="text-[12.5px] text-warm">
                  Showing 5 of 12 tracked skills · recalculated from your latest activity
                </p>
                <Link
                  href="/skills"
                  className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-navy underline-offset-4 hover:underline"
                >
                  View all skill gaps
                  <ArrowUpRight className="h-[14px] w-[14px]" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------- ROADMAP */}
        <section id="roadmap" className="relative scroll-mt-24 overflow-hidden py-24 lg:py-32">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.16]"
            style={{
              maskImage: "radial-gradient(760px 420px at 78% 32%, #000, transparent 72%)",
              WebkitMaskImage: "radial-gradient(760px 420px at 78% 32%, #000, transparent 72%)",
            }}
            aria-hidden="true"
          >
            <Image
              src="/images/hero-surface.svg"
              alt=""
              fill
              sizes="100vw"
              className="object-cover"
            />
          </div>

          <div className="relative mx-auto w-full max-w-[1240px] px-6 lg:px-10">
            <div className="max-w-[640px]">
              <SectionLabel index="05">Personalised roadmap</SectionLabel>
              <h2 className="text-[clamp(2.1rem,4.3vw,3.35rem)] font-semibold leading-[1.06] tracking-[-0.032em] text-ink">
                Five phases.
                <span className="italic text-navy"> One clear next step</span>.
              </h2>
              <p className="mt-7 max-w-[52ch] text-[16px] leading-[1.78] text-warm">
                Your roadmap is generated from your target role, semester, available study hours
                and placement timeline — then sequenced so today&apos;s task is never arbitrary.
              </p>
            </div>

            <div className="mt-16 grid gap-px lg:grid-cols-5">
              {[
                {
                  phase: "Phase 1",
                  name: "Foundations",
                  state: "done",
                  detail: "Core data structures, complexity analysis, workspace setup.",
                  hours: "23h",
                },
                {
                  phase: "Phase 2",
                  name: "Core skills",
                  state: "active",
                  detail: "Query planning, caching strategy, containerisation.",
                  hours: "26h",
                },
                {
                  phase: "Phase 3",
                  name: "Projects",
                  state: "next",
                  detail: "Ship the distributed scheduler with observability.",
                  hours: "33h",
                },
                {
                  phase: "Phase 4",
                  name: "Interview prep",
                  state: "next",
                  detail: "Timed mock rounds, system design prompts, behavioural.",
                  hours: "54h",
                },
                {
                  phase: "Phase 5",
                  name: "Placement ready",
                  state: "next",
                  detail: "Final resume audit, portfolio, offer negotiation.",
                  hours: "5h",
                },
              ].map((item, i) => (
                <Reveal key={item.phase} delay={i * 0.07}>
                  <div className="relative h-full border-t-2 border-rule-strong pt-7">
                    {item.state === "active" && (
                      <div className="absolute inset-x-0 top-0 h-[2px] bg-navy" aria-hidden="true" />
                    )}
                    <div className="flex items-center justify-between">
                      <span className="tnum font-mono text-[10px] font-medium uppercase tracking-[0.15em] text-warm">
                        {item.phase}
                      </span>
                      {item.state === "done" && (
                        <CheckCircle2 className="h-[15px] w-[15px] text-good" aria-hidden="true" />
                      )}
                      {item.state === "active" && (
                        <span className="rounded-full bg-navy px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-white">
                          Now
                        </span>
                      )}
                    </div>
                    <h3 className="mt-4 text-[18px] font-semibold leading-[1.28] tracking-[-0.02em] text-ink">
                      {item.name}
                    </h3>
                    <p className="mt-3 text-[12.5px] leading-[1.72] text-warm">{item.detail}</p>
                    <p className="tnum mt-5 text-[11px] font-medium text-navy">
                      {item.hours} estimated
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------- ASSISTANT */}
        <section id="assistant" className="relative scroll-mt-24 overflow-hidden bg-[#12161c] py-24 lg:py-32">
          <div
            className="light-sweep pointer-events-none absolute inset-0 overflow-hidden opacity-40"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -right-40 top-1/2 h-[620px] w-[620px] -translate-y-1/2 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(127,178,224,0.16) 0%, transparent 66%)",
            }}
            aria-hidden="true"
          />

          <div className="relative mx-auto w-full max-w-[1240px] px-6 lg:px-10">
            <div className="grid items-center gap-16 lg:grid-cols-2">
              <div>
                <div className="flex items-center gap-3">
                  <span className="tnum font-mono text-[10.5px] font-medium tracking-[0.14em] text-[#7fb2e0]">
                    06
                  </span>
                  <span className="h-px w-10 bg-white/18" aria-hidden="true" />
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.115em] text-white/55">
                    AI career assistant
                  </span>
                </div>

                <h2 className="mt-8 text-[clamp(2.1rem,4.3vw,3.35rem)] font-semibold leading-[1.06] tracking-[-0.032em] text-white">
                  It reads
                  <span className="italic text-[#9cc4ea]"> your data</span>, not the internet.
                </h2>

                <p className="mt-7 max-w-[50ch] text-[16px] leading-[1.78] text-white/62">
                  Ask what to learn today and the answer comes from your roadmap, your deadlines
                  and your study hours. Ask whether you&apos;re ready for an interview and it
                  answers from your actual skills, projects and resume — with the reasoning shown.
                </p>

                <div className="mt-10 flex flex-wrap gap-2.5">
                  {[
                    "What should I learn today?",
                    "Am I ready for an SDE interview?",
                    "Which resume fix matters most?",
                    "How should I split my study time?",
                  ].map((q) => (
                    <span
                      key={q}
                      className="rounded-full border border-white/12 bg-white/[0.055] px-4 py-2 text-[12px] text-white/72"
                    >
                      {q}
                    </span>
                  ))}
                </div>
              </div>

              {/* Conversation mock */}
              <Reveal>
                <div className="overflow-hidden rounded-[16px] border border-white/10 bg-white/[0.045] backdrop-blur-sm">
                  <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
                    <div className="flex items-center gap-2.5">
                      <span className="h-[7px] w-[7px] rounded-full bg-[#56bd8b]" aria-hidden="true" />
                      <span className="text-[11px] font-medium uppercase tracking-[0.13em] text-white/55">
                        Contextual session
                      </span>
                    </div>
                    <span className="rounded-full bg-white/8 px-2.5 py-1 text-[9.5px] font-medium uppercase tracking-[0.12em] text-white/50">
                      Grounded in your profile
                    </span>
                  </div>

                  <div className="space-y-5 px-6 py-7">
                    <div className="flex justify-end">
                      <p className="max-w-[80%] rounded-[13px] rounded-br-[4px] bg-[#7fb2e0] px-4.5 py-3 text-[13px] leading-[1.62] text-[#0f1c28]">
                        What should I learn today?
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <div className="mt-[3px] h-[26px] w-[26px] shrink-0 rounded-[8px] border border-white/12 bg-white/8" />
                      <div className="max-w-[86%] space-y-3.5 rounded-[13px] rounded-tl-[4px] border border-white/9 bg-white/[0.045] px-4.5 py-4">
                        <p className="text-[13px] leading-[1.72] text-white/82">
                          Your highest-leverage work today is{" "}
                          <strong className="font-semibold text-white">
                            PostgreSQL indexing and query planning
                          </strong>
                          . It&apos;s due in 3 days, sits at 40%, and targets your second-largest
                          skill gap against the Backend Engineer (SDE-1) role.
                        </p>

                        <div className="space-y-2 rounded-[9px] border border-white/8 bg-white/[0.035] p-3.5">
                          {[
                            { k: "Readiness impact", v: "Skills · 25% weight" },
                            { k: "Deadline", v: "In 3 days" },
                            { k: "Current level", v: "61% vs 82% required" },
                          ].map((row) => (
                            <div key={row.k} className="flex items-center justify-between">
                              <span className="text-[10px] uppercase tracking-[0.11em] text-white/42">
                                {row.k}
                              </span>
                              <span className="tnum text-[11px] font-medium text-white/78">
                                {row.v}
                              </span>
                            </div>
                          ))}
                        </div>

                        <p className="text-[12px] leading-[1.68] text-white/55">
                          Next action: run EXPLAIN ANALYZE on three queries from your placement
                          portal project (~45 min at your current pace).
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/8 px-6 py-4">
                    <div className="flex items-center gap-2.5 rounded-[10px] border border-white/10 bg-white/[0.03] px-4 py-3">
                      <span className="text-[12px] text-white/32">Ask a follow-up…</span>
                      <span className="ml-auto h-[26px] w-[26px] rounded-[7px] bg-white/10" aria-hidden="true" />
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------- CTA */}
        <section className="relative overflow-hidden border-t border-rule py-24 lg:py-32">
          <div className="grid-paper grid-drift pointer-events-none absolute inset-0 opacity-[0.5]" aria-hidden="true" />
          <div className="relative mx-auto w-full max-w-[1240px] px-6 text-center lg:px-10">
            <Reveal>
              <h2 className="mx-auto max-w-[16ch] text-[clamp(2.5rem,6vw,4.6rem)] font-semibold leading-[1.02] tracking-[-0.038em] text-ink">
                Know exactly
                <span className="italic text-navy"> what to do next</span>.
              </h2>
              <p className="mx-auto mt-8 max-w-[52ch] text-[17px] leading-[1.72] text-warm">
                Set up your profile, upload a resume, and get your first readiness assessment in
                minutes. No credit card, no guesswork.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/login"
                  className="btn-base group h-[52px] rounded-[11px] bg-navy px-8 text-[15px] font-medium text-white hover:bg-navy-dark dark:bg-navy dark:text-[#0d1117]"
                >
                  Get started
                  <ArrowRight
                    className="h-[17px] w-[17px] transition-transform duration-200 group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </Link>
                <Link
                  href="/dashboard"
                  className="btn-base h-[52px] rounded-[11px] border border-rule-strong bg-panel px-7 text-[15px] font-medium text-ink hover:border-navy hover:text-navy"
                >
                  View the live demo
                </Link>
              </div>
              <p className="mt-7 text-[12px] text-warm-2">
                Free for students · Transparent scoring · Export your data anytime
              </p>
            </Reveal>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
