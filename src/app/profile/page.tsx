"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Save,
  Target,
  User,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { SectionLabel } from "@/components/ui/badge";
import { SkeletonRows } from "@/components/ui/feedback";
import { useProfile } from "@/hooks/use-api";
import { cn } from "@/lib/utils";

const profileSchema = z.object({
  fullName: z.string().min(2, "Please enter your full name."),
  headline: z.string().max(160, "Keep your headline under 160 characters."),
  college: z.string().min(2, "Tell us where you study."),
  degree: z.string().min(2, "Select your degree."),
  branch: z.string().min(2, "Select your branch."),
  academicYear: z.string().min(1, "Select your academic year."),
  semester: z.coerce.number().min(1).max(12),
  cgpa: z.coerce.number().min(0, "CGPA can't be negative.").max(10, "CGPA is out of 10."),
  targetRole: z.string().min(2, "A target role shapes everything else."),
  targetCompany: z.string(),
  careerGoal: z.string(),
  learningStyle: z.string(),
  studyHoursPerDay: z.coerce.number().min(0).max(16),
  placementTimelineMonths: z.coerce.number().min(1).max(48),
  summary: z.string().max(1200, "Keep your summary under 1200 characters."),
});

type ProfileForm = z.input<typeof profileSchema>;

function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-[11px] font-medium text-ink">
        {label}
      </label>
      {hint && <p className="mt-1.5 text-[9px] text-warm">{hint}</p>}
      <div className="mt-2">{children}</div>
      {error && (
        <p role="alert" className="mt-1.5 text-[9.5px] text-bad">
          {error}
        </p>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { data, isLoading } = useProfile();
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    mode: "onBlur",
    defaultValues: {
      fullName: "Aarav Sharma",
      headline: "Final-year CSE student · Aspiring Backend Engineer",
      college: "Vellore Institute of Technology",
      degree: "B.Tech",
      branch: "Computer Science & Engineering",
      academicYear: "Final year",
      semester: 7,
      cgpa: 8.7,
      targetRole: "Backend Engineer (SDE-1)",
      targetCompany: "Atlassian",
      careerGoal: "Backend engineering at a product-first company",
      learningStyle: "Project-first, then documentation",
      studyHoursPerDay: 2.5,
      placementTimelineMonths: 5,
      summary:
        "I build backend services in Go and TypeScript, and I am preparing for SDE-1 placements with a focus on distributed systems and data-intensive APIs.",
    },
  });

  useEffect(() => {
    if (data?.user) {
      reset((prev) => ({
        ...prev,
        fullName: data.user.fullName,
        headline: data.user.headline ?? prev.headline,
      }));
    }
  }, [data, reset]);

  const onSubmit = async () => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3200);
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Career profile"
        title={
          <>
            Your profile drives <span className="italic text-navy">every</span> recommendation
          </>
        }
        description="Your target role, timeline and study availability determine how your readiness is weighted and how your roadmap is sequenced. Keep it current."
        actions={
          <>
            <button
              type="button"
              className="btn-base h-[42px] rounded-[10px] border border-rule-strong bg-panel px-[18px] text-[14px] font-medium text-ink hover:border-navy hover:text-navy"
            >
              View public profile
            </button>
            <button
              type="submit"
              form="profile-form"
              disabled={isSubmitting}
              className={cn(
                "btn-base h-[42px] rounded-[10px] px-[18px] text-[14px] font-medium",
                isDirty
                  ? "bg-navy text-white hover:bg-navy-dark dark:bg-navy dark:text-[#0d1117]"
                  : "cursor-not-allowed bg-rule text-warm-2",
              )}
            >
              {isSubmitting ? (
                <>
                  <span
                    className="h-[14px] w-[14px] animate-spin rounded-full border-[1.5px] border-current border-t-transparent"
                    aria-hidden="true"
                  />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="h-[15px] w-[15px]" aria-hidden="true" />
                  Save changes
                </>
              )}
            </button>
          </>
        }
      />

      {saved && (
        <div
          role="status"
          className="mb-8 flex items-center gap-3 rounded-[11px] border border-good/25 bg-good-wash px-5 py-4"
        >
          <CheckCircle2 className="h-[16px] w-[16px] shrink-0 text-good" aria-hidden="true" />
          <p className="text-[11.5px] text-good">
            Profile updated. Your readiness score and roadmap recommendations have been recalculated.
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="rounded-[13px] border border-rule bg-panel p-7">
          <SkeletonRows rows={7} />
        </div>
      ) : (
        <form id="profile-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* --------------------------------------------------- PERSONAL */}
          <section className="overflow-hidden rounded-[13px] border border-rule bg-panel">
            <div className="flex items-center gap-3 border-b border-rule px-7 py-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-rule bg-paper-2">
                <User className="h-[15px] w-[15px] text-navy" strokeWidth={1.8} aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-[13px] font-semibold text-ink">Personal information</h2>
                <p className="mt-1 text-[9px] text-warm">
                  How you appear across CareerTracker
                </p>
              </div>
            </div>

            <div className="grid gap-6 px-7 py-8 sm:grid-cols-2">
              <Field label="Full name" error={errors.fullName?.message}>
                <input className="field" aria-invalid={errors.fullName ? "true" : undefined} {...register("fullName")} />
              </Field>

              <Field
                label="Professional headline"
                hint="Shown on your dashboard and shared profile"
                error={errors.headline?.message}
              >
                <input className="field" {...register("headline")} />
              </Field>

              <Field label="College / university" error={errors.college?.message}>
                <input className="field" {...register("college")} />
              </Field>

              <Field label="Degree" error={errors.degree?.message}>
                <input className="field" {...register("degree")} />
              </Field>

              <Field label="Branch / specialisation" error={errors.branch?.message}>
                <input className="field" {...register("branch")} />
              </Field>

              <Field label="Academic year" error={errors.academicYear?.message}>
                <select className="field" {...register("academicYear")}>
                  <option>First year</option>
                  <option>Second year</option>
                  <option>Third year</option>
                  <option>Final year</option>
                  <option>Graduated</option>
                </select>
              </Field>

              <Field label="Semester" error={errors.semester?.message}>
                <input type="number" className="field" {...register("semester")} />
              </Field>

              <Field label="CGPA (out of 10)" error={errors.cgpa?.message}>
                <input type="number" step="0.01" className="field" {...register("cgpa")} />
              </Field>
            </div>
          </section>

          {/* ----------------------------------------------------- CAREER */}
          <section className="mt-8 overflow-hidden rounded-[13px] border border-rule bg-panel">
            <div className="flex items-center gap-3 border-b border-rule px-7 py-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-rule bg-paper-2">
                <Target className="h-[15px] w-[15px] text-navy" strokeWidth={1.8} aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-[13px] font-semibold text-ink">Career goals</h2>
                <p className="mt-1 text-[9px] text-warm">
                  These weight your readiness dimensions and roadmap
                </p>
              </div>
            </div>

            <div className="grid gap-6 px-7 py-8 sm:grid-cols-2">
              <Field
                label="Target role"
                hint="The role your readiness is measured against"
                error={errors.targetRole?.message}
              >
                <input className="field" {...register("targetRole")} />
              </Field>

              <Field label="Dream company" error={errors.targetCompany?.message}>
                <input className="field" {...register("targetCompany")} />
              </Field>

              <Field
                label="Career goal"
                hint="One sentence describing the direction you're working toward"
                className="sm:col-span-2"
              >
                <input className="field" {...register("careerGoal")} />
              </Field>

              <Field
                label="Short summary"
                hint="Used by the AI assistant to personalise its answers"
                error={errors.summary?.message}
                className="sm:col-span-2"
              >
                <textarea rows={4} className="field resize-y" {...register("summary")} />
              </Field>
            </div>
          </section>

          {/* --------------------------------------------------- LEARNING */}
          <section className="mt-8 overflow-hidden rounded-[13px] border border-rule bg-panel">
            <div className="flex items-center gap-3 border-b border-rule px-7 py-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-rule bg-paper-2">
                <GraduationCap
                  className="h-[15px] w-[15px] text-navy"
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
              </div>
              <div>
                <h2 className="text-[13px] font-semibold text-ink">Learning preferences</h2>
                <p className="mt-1 text-[9px] text-warm">
                  How your roadmap is paced and sequenced
                </p>
              </div>
            </div>

            <div className="grid gap-6 px-7 py-8 sm:grid-cols-3">
              <Field label="Learning style">
                <select className="field" {...register("learningStyle")}>
                  <option>Project-first, then documentation</option>
                  <option>Structured courses first</option>
                  <option>Video-led learning</option>
                  <option>Reading and notes</option>
                  <option>Practice problems first</option>
                </select>
              </Field>

              <Field
                label="Study hours per day"
                hint="Used to estimate task deadlines"
                error={errors.studyHoursPerDay?.message}
              >
                <input
                  type="number"
                  step="0.5"
                  className="field"
                  {...register("studyHoursPerDay")}
                />
              </Field>

              <Field
                label="Placement timeline (months)"
                hint="How long until you start applying"
                error={errors.placementTimelineMonths?.message}
              >
                <input
                  type="number"
                  className="field"
                  {...register("placementTimelineMonths")}
                />
              </Field>
            </div>
          </section>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-[12px] border border-rule bg-paper-2 px-7 py-6">
            <div>
              <p className="text-[11px] font-medium text-ink">
                Changes to your target role recalculate your readiness score
              </p>
              <p className="mt-1.5 text-[9.5px] text-warm">
                Skill requirements, roadmap weighting and recommendations are all derived from these
                values.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {isDirty && (
                <span className="text-[9.5px] font-medium text-warn">Unsaved changes</span>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-base h-[40px] rounded-[10px] bg-navy px-5 text-[12.5px] font-medium text-white hover:bg-navy-dark disabled:opacity-50 dark:bg-navy dark:text-[#0d1117]"
              >
                Save changes
                <ArrowRight className="h-[14px] w-[14px]" aria-hidden="true" />
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="mt-10">
        <SectionLabel index="04">Profile completeness</SectionLabel>
        <div className="rounded-[12px] border border-rule bg-panel p-7">
          <div className="flex flex-wrap items-center gap-x-10 gap-y-5">
            {[
              { label: "Personal", value: 100 },
              { label: "Education", value: 100 },
              { label: "Career goals", value: 92 },
              { label: "Skills", value: 78 },
              { label: "Portfolio", value: 64 },
            ].map((segment) => (
              <div key={segment.label} className="min-w-[128px]">
                <div className="flex items-baseline justify-between">
                  <span className="text-[9.5px] text-warm">{segment.label}</span>
                  <span className="tnum text-[11px] font-semibold text-ink">
                    {segment.value}%
                  </span>
                </div>
                <div className="mt-2 h-[4px] w-full overflow-hidden rounded-full bg-rule">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      segment.value >= 90
                        ? "bg-good"
                        : segment.value >= 70
                          ? "bg-navy"
                          : "bg-warn",
                    )}
                    style={{ width: `${segment.value}%` }}
                  />
                </div>
              </div>
            ))}

            <div className="ml-auto">
              <p className="tnum font-display text-[26px] font-semibold leading-none tracking-[-0.028em] text-ink">
                86<span className="text-[12px] font-normal text-warm">%</span>
              </p>
              <p className="mt-2 text-[9px] text-warm">overall completeness</p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
