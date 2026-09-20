"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  GraduationCap,
  Sparkles,
  Target,
  Timer,
  UploadCloud,
} from "lucide-react";
import { Wordmark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { cn } from "@/lib/utils";

const steps = [
  {
    id: 0,
    title: "Where are you studying?",
    subtitle: "This shapes the roadmap phasing and the roles we compare you against.",
    icon: GraduationCap,
  },
  {
    id: 1,
    title: "What are you aiming for?",
    subtitle: "Your target role determines how every readiness dimension is weighted.",
    icon: Target,
  },
  {
    id: 2,
    title: "How do you like to learn?",
    subtitle: "We'll pace your roadmap around the time you actually have.",
    icon: Timer,
  },
  {
    id: 3,
    title: "Add your resume",
    subtitle: "Optional for now — you can upload it later and we'll analyse it then.",
    icon: UploadCloud,
  },
  {
    id: 4,
    title: "You're all set",
    subtitle: "Your workspace is ready. Everything can be edited later.",
    icon: Sparkles,
  },
];

function OptionCard({
  selected,
  label,
  hint,
  onSelect,
}: {
  selected: boolean;
  label: string;
  hint?: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-start gap-3 rounded-[11px] border p-4 text-left transition-colors",
        selected
          ? "border-navy bg-navy-wash/55"
          : "border-rule bg-panel hover:border-navy/45 hover:bg-navy-wash/22",
      )}
    >
      <span
        className={cn(
          "mt-[1px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors",
          selected ? "border-navy bg-navy text-white" : "border-rule-strong",
        )}
        aria-hidden="true"
      >
        {selected && <Check className="h-[10px] w-[10px]" />}
      </span>
      <span>
        <span className="block text-[12px] font-medium text-ink">{label}</span>
        {hint && <span className="mt-1.5 block text-[9.5px] leading-[1.62] text-warm">{hint}</span>}
      </span>
    </button>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState<Record<string, string>>({
    degree: "B.Tech",
    year: "Final year",
    targetRole: "Backend Engineer (SDE-1)",
    timeline: "5 months",
    learningStyle: "Project-first, then documentation",
    studyTime: "2–3 hours per day",
  });

  const set = (key: string, value: string) => setSelections((s) => ({ ...s, [key]: value }));
  const current = steps[step];
  const progress = ((step + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-paper">
      {/* Header */}
      <header className="border-b border-rule">
        <div className="mx-auto flex h-[68px] w-full max-w-[1180px] items-center justify-between px-6 lg:px-10">
          <Link href="/" aria-label="CareerTracker home">
            <Wordmark monogramSize={26} />
          </Link>

          <div className="flex items-center gap-5">
            <div className="hidden items-center gap-2.5 sm:flex">
              {steps.map((s, i) => (
                <span
                  key={s.id}
                  className={cn(
                    "h-[5px] rounded-full transition-all duration-300",
                    i < step ? "w-[22px] bg-navy" : i === step ? "w-[32px] bg-navy" : "w-[14px] bg-rule-strong",
                  )}
                  aria-hidden="true"
                />
              ))}
            </div>
            <span className="tnum text-[10px] font-medium text-warm">
              Step {step + 1} of {steps.length}
            </span>
            <ThemeToggle compact />
          </div>
        </div>
        <div className="h-[2px] w-full bg-rule">
          <motion.div
            className="h-full bg-navy"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: reduce ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </header>

      <main id="main-content" className="mx-auto w-full max-w-[1180px] px-6 py-14 lg:px-10 lg:py-20">
        <div className="grid gap-14 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
          {/* Form side */}
          <div>
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: reduce ? 0 : 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduce ? 0 : -8 }}
                transition={{ duration: reduce ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-navy/22 bg-navy-wash">
                    <current.icon className="h-[15px] w-[15px] text-navy" strokeWidth={1.8} aria-hidden="true" />
                  </div>
                  <p className="label-caps">Step {step + 1}</p>
                </div>

                <h1 className="mt-7 max-w-[18ch] text-[clamp(2rem,4vw,2.95rem)] font-semibold leading-[1.08] tracking-[-0.032em] text-ink">
                  {current.title}
                </h1>
                <p className="mt-4 max-w-[48ch] text-[14.5px] leading-[1.76] text-warm">
                  {current.subtitle}
                </p>

                <div className="mt-11">
                  {step === 0 && (
                    <div className="space-y-7">
                      <div>
                        <p className="label-caps mb-3.5">Degree programme</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {["B.Tech", "B.E.", "B.Sc", "BCA", "M.Tech", "MCA"].map((option) => (
                            <OptionCard
                              key={option}
                              label={option}
                              selected={selections.degree === option}
                              onSelect={() => set("degree", option)}
                            />
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="label-caps mb-3.5">Academic year</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {["First year", "Second year", "Third year", "Final year"].map((option) => (
                            <OptionCard
                              key={option}
                              label={option}
                              selected={selections.year === option}
                              onSelect={() => set("year", option)}
                            />
                          ))}
                        </div>
                      </div>

                      <div>
                        <label htmlFor="college" className="label-caps mb-3.5 block">
                          College / university
                        </label>
                        <input
                          id="college"
                          defaultValue="Vellore Institute of Technology"
                          className="field"
                          placeholder="Start typing your institution…"
                        />
                      </div>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <label htmlFor="branch" className="label-caps mb-3.5 block">
                            Branch
                          </label>
                          <input
                            id="branch"
                            defaultValue="Computer Science & Engineering"
                            className="field"
                          />
                        </div>
                        <div>
                          <label htmlFor="cgpa" className="label-caps mb-3.5 block">
                            CGPA (out of 10)
                          </label>
                          <input id="cgpa" type="number" step="0.01" defaultValue="8.7" className="field" />
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 1 && (
                    <div className="space-y-8">
                      <div>
                        <p className="label-caps mb-3.5">Target role</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {[
                            "Backend Engineer (SDE-1)",
                            "Frontend Engineer",
                            "Full-stack Engineer",
                            "Data Analyst",
                            "DevOps / SRE",
                            "Product Manager",
                          ].map((option) => (
                            <OptionCard
                              key={option}
                              label={option}
                              selected={selections.targetRole === option}
                              onSelect={() => set("targetRole", option)}
                            />
                          ))}
                        </div>
                      </div>

                      <div>
                        <label htmlFor="company" className="label-caps mb-3.5 block">
                          Dream company
                        </label>
                        <input
                          id="company"
                          defaultValue="Atlassian"
                          className="field"
                          placeholder="Where would you love to work?"
                        />
                        <p className="mt-2 text-[9px] text-warm">
                          We use this to tailor skill requirements and interview preparation — it
                          never limits what you can track.
                        </p>
                      </div>

                      <div>
                        <p className="label-caps mb-3.5">Preferred technologies</p>
                        <div className="flex flex-wrap gap-2">
                          {[
                            "TypeScript",
                            "Go",
                            "Python",
                            "Java",
                            "PostgreSQL",
                            "Redis",
                            "Docker",
                            "React",
                            "Node.js",
                            "Kafka",
                            "AWS",
                          ].map((tech, i) => (
                            <button
                              key={tech}
                              type="button"
                              className={cn(
                                "rounded-full border px-3.5 py-1.5 text-[10px] font-medium transition-colors",
                                i < 5
                                  ? "border-navy bg-navy text-white"
                                  : "border-rule text-warm hover:border-navy/45 hover:text-ink",
                              )}
                              aria-pressed={i < 5}
                            >
                              {tech}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-8">
                      <div>
                        <p className="label-caps mb-3.5">Learning style</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {[
                            "Project-first, then documentation",
                            "Structured courses first",
                            "Video-led learning",
                            "Reading and notes",
                            "Practice problems first",
                            "Mixed, depending on the topic",
                          ].map((option) => (
                            <OptionCard
                              key={option}
                              label={option}
                              selected={selections.learningStyle === option}
                              onSelect={() => set("learningStyle", option)}
                            />
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="label-caps mb-3.5">Daily study availability</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {[
                            "Less than 1 hour per day",
                            "1–2 hours per day",
                            "2–3 hours per day",
                            "3–4 hours per day",
                            "More than 4 hours per day",
                            "Weekends only",
                          ].map((option) => (
                            <OptionCard
                              key={option}
                              label={option}
                              selected={selections.studyTime === option}
                              onSelect={() => set("studyTime", option)}
                            />
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="label-caps mb-3.5">Placement timeline</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {["Within 3 months", "5 months", "6–9 months", "Next year", "Not sure yet"].map(
                            (option) => (
                              <OptionCard
                                key={option}
                                label={option}
                                selected={selections.timeline === option}
                                onSelect={() => set("timeline", option)}
                              />
                            ),
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-7">
                      <div className="relative overflow-hidden rounded-[13px] border-2 border-dashed border-rule-strong bg-panel/60 px-8 py-12 text-center transition-colors hover:border-navy/50">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[11px] border border-rule bg-paper">
                          <UploadCloud
                            className="h-[20px] w-[20px] text-navy"
                            strokeWidth={1.7}
                            aria-hidden="true"
                          />
                        </div>
                        <h2 className="mt-5 text-[15px] font-semibold text-ink">
                          Drop your resume here
                        </h2>
                        <p className="mx-auto mt-2.5 max-w-[42ch] text-[11.5px] leading-[1.72] text-warm">
                          PDF or DOCX, up to 10 MB. We&apos;ll extract your skills, calculate an
                          ATS score and identify what to improve.
                        </p>
                        <button
                          type="button"
                          className="btn-base mt-6 h-[40px] rounded-[10px] bg-navy px-5 text-[12.5px] font-medium text-white hover:bg-navy-dark dark:bg-navy dark:text-[#0d1117]"
                        >
                          Choose file
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setStep(4)}
                        className="btn-base h-[42px] w-full rounded-[10px] border border-rule-strong bg-panel text-[13px] font-medium text-ink hover:border-navy hover:text-navy"
                      >
                        Skip for now — I&apos;ll add it later
                      </button>

                      <div className="rounded-[11px] border border-navy/18 bg-navy-wash/42 p-4">
                        <div className="flex items-start gap-2.5">
                          <Compass className="mt-[2px] h-[13px] w-[13px] shrink-0 text-navy" aria-hidden="true" />
                          <p className="text-[10px] leading-[1.72] text-navy">
                            You can still explore everything without a resume — but your readiness
                            score will stay incomplete until one is analysed, since resume quality
                            carries 20% of the calculation.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 4 && (
                    <div className="space-y-8">
                      <div className="rounded-[13px] border border-rule bg-panel p-7">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-good-wash">
                            <Check className="h-[17px] w-[17px] text-good" aria-hidden="true" />
                          </div>
                          <div>
                            <h2 className="text-[15px] font-semibold text-ink">
                              Your workspace is ready
                            </h2>
                            <p className="mt-1.5 text-[10px] text-warm">
                              Everything below can be changed at any time from your profile.
                            </p>
                          </div>
                        </div>

                        <div className="mt-7 space-y-px overflow-hidden rounded-[10px] border border-rule">
                          {[
                            { label: "Degree", value: selections.degree },
                            { label: "Academic year", value: selections.year },
                            { label: "Target role", value: selections.targetRole },
                            {
                              value: selections.learningStyle,
                              label: "Learning style",
                            },
                            { label: "Study availability", value: selections.studyTime },
                            { label: "Placement timeline", value: selections.timeline },
                          ].map((row) => (
                            <div
                              key={row.label}
                              className="flex items-center justify-between bg-panel px-5 py-3.5"
                            >
                              <span className="text-[9.5px] text-warm">{row.label}</span>
                              <span className="text-[10px] font-medium text-ink">{row.value}</span>
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => router.push("/dashboard")}
                          className="btn-base mt-7 h-[46px] w-full rounded-[10px] bg-navy text-[13.5px] font-medium text-white hover:bg-navy-dark dark:bg-navy dark:text-[#0d1117]"
                        >
                          Go to my dashboard
                          <ArrowRight className="h-[15px] w-[15px]" aria-hidden="true" />
                        </button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        {[
                          { title: "Readiness", value: "41", suffix: "/100" },
                          { title: "Tasks queued", value: "12", suffix: "" },
                          { title: "Skills tracked", value: "0", suffix: "" },
                        ].map((stat) => (
                          <div
                            key={stat.title}
                            className="rounded-[11px] border border-rule bg-paper-2 px-5 py-5"
                          >
                            <p className="label-caps text-[8px]">{stat.title}</p>
                            <p className="tnum mt-2.5 font-display text-[23px] font-semibold leading-none tracking-[-0.028em] text-ink">
                              {stat.value}
                              <span className="text-[10px] font-normal text-warm">
                                {stat.suffix}
                              </span>
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Navigation */}
                {step < 4 && (
                  <div className="mt-12 flex items-center justify-between border-t border-rule pt-8">
                    <button
                      type="button"
                      onClick={() => setStep((s) => Math.max(s - 1, 0))}
                      disabled={step === 0}
                      className={cn(
                        "btn-base h-[42px] rounded-[10px] border px-5 text-[12.5px] font-medium",
                        step === 0
                          ? "cursor-not-allowed border-rule text-warm-2 opacity-50"
                          : "border-rule-strong text-ink hover:border-navy hover:text-navy",
                      )}
                    >
                      <ArrowLeft className="h-[14px] w-[14px]" aria-hidden="true" />
                      Back
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep((s) => Math.min(s + 1, steps.length - 1))}
                      className="btn-base h-[42px] rounded-[10px] bg-navy px-6 text-[12.5px] font-medium text-white hover:bg-navy-dark dark:bg-navy dark:text-[#0d1117]"
                    >
                      Continue
                      <ArrowRight className="h-[14px] w-[14px]" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Context rail */}
          <aside className="lg:pt-2">
            <div className="sticky top-10 space-y-6">
              <div className="relative overflow-hidden rounded-[14px] border border-rule bg-navy-wash/32 p-7">
                <div className="grid-paper absolute inset-0 opacity-50" aria-hidden="true" />
                <div className="relative">
                  <Compass className="h-[18px] w-[18px] text-navy" strokeWidth={1.8} aria-hidden="true" />
                  <h2 className="mt-5 text-[17px] font-semibold leading-[1.3] tracking-[-0.022em] text-ink">
                    Why we ask these questions
                  </h2>
                  <div className="mt-6 space-y-5">
                    {[
                      {
                        title: "Your target role sets the bar",
                        body: "Readiness is measured against what your specific role expects — not a generic standard.",
                      },
                      {
                        title: "Your available time sets the pace",
                        body: "Deadlines on your roadmap are estimated from the hours you actually have.",
                      },
                      {
                        title: "Your timeline sets the order",
                        body: "With placements close, high-impact skills are sequenced first.",
                      },
                    ].map((item) => (
                      <div key={item.title} className="border-t border-rule pt-4">
                        <p className="text-[10px] font-semibold text-ink">{item.title}</p>
                        <p className="mt-2 text-[9px] leading-[1.76] text-warm">{item.body}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-7 rounded-[10px] border border-rule bg-panel/70 px-4 py-3.5">
                    <p className="text-[8.5px] leading-[1.72] text-warm">
                      You can change any of this later — nothing here is permanent, and your
                      readiness recalculates automatically when you do.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[12px] border border-rule bg-panel px-6 py-5">
                <div className="flex items-center gap-2.5">
                  <span className="h-[6px] w-[6px] rounded-full bg-good" aria-hidden="true" />
                  <p className="text-[9.5px] font-medium text-ink">
                    Your progress is saved automatically
                  </p>
                </div>
                <p className="mt-2.5 text-[8.5px] leading-[1.72] text-warm">
                  Close the tab and come back — you&apos;ll pick up exactly where you left off.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
