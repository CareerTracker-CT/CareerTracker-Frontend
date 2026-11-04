"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Pencil,
  Plus,
  Search,
  Target,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { MetricCell, PageHeader } from "@/components/layout/page-header";
import { SkillGapBar } from "@/components/charts/skill-bar";
import { MiniRing } from "@/components/charts/readiness-ring";
import { Badge, SectionLabel } from "@/components/ui/badge";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/feedback";
import { Reveal } from "@/components/shared/motion";
import {
  useCreateSkill,
  useDeleteSkill,
  useSkills,
  useUpdateSkill,
} from "@/hooks/use-api";
import { describeError } from "@/lib/errors";
import type { SkillRecord } from "@/types";
import { cn } from "@/lib/utils";

type PriorityFilter = "ALL" | "HIGH" | "MEDIUM" | "LOW";

const skillSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Skill name must be at least 2 characters.")
      .max(80, "Skill name must be under 80 characters."),
    category: z.string().trim().max(60, "Category must be under 60 characters."),
    currentLevel: z.coerce
      .number({ message: "Current level must be a number." })
      .int("Levels are whole numbers.")
      .min(0, "Current level cannot be negative.")
      .max(100, "Current level cannot exceed 100."),
    requiredLevel: z.coerce
      .number({ message: "Required level must be a number." })
      .int("Levels are whole numbers.")
      .min(0, "Required level cannot be negative.")
      .max(100, "Required level cannot exceed 100."),
    priority: z.enum(["HIGH", "MEDIUM", "LOW"], {
      message: "Priority must be HIGH, MEDIUM or LOW.",
    }),
  })
  .refine((values) => values.requiredLevel >= values.currentLevel, {
    message: "Required level cannot be lower than the current level.",
    path: ["requiredLevel"],
  });

/** Input shape (react-hook-form) — zod transforms the number strings at submit. */
type SkillForm = z.input<typeof skillSchema>;

const PRIORITY_OPTIONS: SkillForm["priority"][] = ["HIGH", "MEDIUM", "LOW"];

interface FieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
}

function Field({ label, error, children }: FieldProps) {
  return (
    <label className="block">
      <span className="label-caps">{label}</span>
      <div className="mt-2">{children}</div>
      {error && <p className="mt-1.5 text-[10.5px] font-medium text-bad">{error}</p>}
    </label>
  );
}

function SkillErrorNote({ message }: { message: string }) {
  return (
    <p className="mt-1 text-[10.5px] font-medium text-bad">{message}</p>
  );
}

/** Shared create/edit form fields: add panel and inline row editor use the same grid. */
function SkillFormFields({
  register,
  errors,
  categories,
}: {
  register: ReturnType<typeof useForm<SkillForm>>["register"];
  errors: ReturnType<typeof useForm<SkillForm>>["formState"]["errors"];
  categories: string[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
      <div className="lg:col-span-4">
        <Field label="Skill" error={errors.name?.message}>
          <input
            className="field h-[42px] text-[12.5px]"
            placeholder="e.g. Distributed systems"
            aria-invalid={errors.name ? "true" : undefined}
            {...register("name")}
          />
        </Field>
      </div>
      <div className="lg:col-span-3">
        <Field label="Category (optional)" error={errors.category?.message}>
          <input
            className="field h-[42px] text-[12.5px]"
            list="skill-category-suggestions"
            placeholder="Defaults to Other"
            aria-invalid={errors.category ? "true" : undefined}
            {...register("category")}
          />
          {categories.length > 0 && (
            <datalist id="skill-category-suggestions">
              {categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          )}
        </Field>
      </div>
      <div className="lg:col-span-2">
        <Field label="Current %" error={errors.currentLevel?.message}>
          <input
            type="number"
            min={0}
            max={100}
            className="field tnum h-[42px] text-[12.5px]"
            aria-invalid={errors.currentLevel ? "true" : undefined}
            {...register("currentLevel")}
          />
        </Field>
      </div>
      <div className="lg:col-span-2">
        <Field label="Target %" error={errors.requiredLevel?.message}>
          <input
            type="number"
            min={0}
            max={100}
            className="field tnum h-[42px] text-[12.5px]"
            aria-invalid={errors.requiredLevel ? "true" : undefined}
            {...register("requiredLevel")}
          />
        </Field>
      </div>
      <div className="lg:col-span-1">
        <Field label="Priority" error={errors.priority?.message}>
          <select
            className="field h-[42px] text-[12.5px]"
            aria-invalid={errors.priority ? "true" : undefined}
            {...register("priority")}
          >
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option[0] + option.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </div>
  );
}

function AddSkillPanel({
  categories,
  onCreated,
  onCancel,
}: {
  categories: string[];
  onCreated: (name: string) => void;
  onCancel: () => void;
}) {
  const createSkill = useCreateSkill();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SkillForm>({
    resolver: zodResolver(skillSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      category: "",
      currentLevel: 30,
      requiredLevel: 80,
      priority: "MEDIUM",
    },
  });

  const onSubmit = async (values: SkillForm) => {
    try {
      setSubmitError(null);
      const created = await createSkill.mutateAsync({
        name: values.name.trim(),
        category: values.category.trim() || undefined,
        currentLevel: Number(values.currentLevel),
        requiredLevel: Number(values.requiredLevel),
        priority: values.priority,
      });
      onCreated(created.name);
    } catch (error) {
      setSubmitError(
        describeError(error, "We couldn't add that skill. Try again in a moment."),
      );
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-[13px] border border-rule bg-panel px-7 py-6"
      noValidate
    >
      <div className="flex items-center justify-between gap-4">
        <p className="label-caps text-navy">Track a new skill</p>
        <button
          type="button"
          onClick={onCancel}
          className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-warm hover:text-ink"
          aria-label="Close the add-skill form"
        >
          Close
        </button>
      </div>

      <div className="mt-5">
        <SkillFormFields register={register} errors={errors} categories={categories} />
      </div>

      {submitError && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-3 rounded-[10px] border border-bad/25 bg-bad-wash px-5 py-3.5"
        >
          <AlertTriangle className="mt-[1px] h-[15px] w-[15px] shrink-0 text-bad" aria-hidden="true" />
          <p className="text-[11.5px] text-bad">{submitError}</p>
        </div>
      )}

      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="btn-base h-[40px] rounded-[10px] border border-rule-strong bg-transparent px-4 text-[12px] font-medium text-ink hover:border-navy hover:text-navy"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-base h-[40px] rounded-[10px] bg-navy px-5 text-[12px] font-medium text-white hover:bg-navy-dark dark:bg-navy dark:text-[#0d1117] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Tracking…" : "Start tracking"}
        </button>
      </div>
    </form>
  );
}

function SkillRow({
  skill,
  index,
  onRemoved,
}: {
  skill: SkillRecord;
  index: number;
  onRemoved: (name: string) => void;
}) {
  const updateSkill = useUpdateSkill();
  const deleteSkill = useDeleteSkill();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SkillForm>({
    resolver: zodResolver(skillSchema),
    mode: "onBlur",
    defaultValues: {
      name: skill.name,
      category: skill.category,
      currentLevel: skill.currentLevel,
      requiredLevel: skill.requiredLevel,
      priority: skill.priority,
    },
  });

  const startEdit = () => {
    setConfirming(false);
    setRowError(null);
    reset({
      name: skill.name,
      category: skill.category,
      currentLevel: skill.currentLevel,
      requiredLevel: skill.requiredLevel,
      priority: skill.priority,
    });
    setEditing(true);
  };

  const onEdit = async (values: SkillForm) => {
    try {
      setBusy(true);
      setRowError(null);
      await updateSkill.mutateAsync({
        skillId: skill.id,
        payload: {
          name: values.name.trim(),
          category: values.category.trim() || undefined,
          currentLevel: Number(values.currentLevel),
          requiredLevel: Number(values.requiredLevel),
          priority: values.priority,
        },
      });
      setEditing(false);
    } catch (error) {
      setRowError(
        describeError(error, "We couldn't save that change. Try again in a moment."),
      );
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    try {
      setBusy(true);
      setRowError(null);
      await deleteSkill.mutateAsync(skill.id);
      onRemoved(skill.name);
    } catch (error) {
      setRowError(
        describeError(error, "We couldn't remove that skill. Try again in a moment."),
      );
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <div className="border-b border-rule px-7 py-6 last:border-0">
        <p className="label-caps text-navy">
          Editing {skill.name.length > 28 ? skill.name.slice(0, 28) + "…" : skill.name}
        </p>
        <form onSubmit={handleSubmit(onEdit)} className="mt-4" noValidate>
          <SkillFormFields register={register} errors={errors} categories={[]} />
          {rowError && <div className="mt-4"><SkillErrorNote message={rowError} /></div>}
          <div className="mt-5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setRowError(null);
              }}
              className="btn-base h-[36px] rounded-[10px] border border-rule-strong bg-transparent px-4 text-[11px] font-medium text-ink hover:border-navy hover:text-navy"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || busy}
              className="btn-base h-[36px] rounded-[10px] bg-navy px-4 text-[11px] font-medium text-white hover:bg-navy-dark dark:bg-navy dark:text-[#0d1117] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting || busy ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <Reveal delay={Math.min(index * 0.035, 0.3)}>
      <div className="border-b border-rule px-7 py-6 transition-colors last:border-0 hover:bg-navy-wash/22">
        {rowError && (
          <div role="alert" className="mb-4">
            <SkillErrorNote message={rowError} />
          </div>
        )}
        <div className="grid grid-cols-1 items-center gap-5 lg:grid-cols-[1.5fr_1.6fr_0.75fr_0.6fr_0.65fr] lg:gap-6">
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
              Gap of {Math.max(0, skill.requiredLevel - skill.currentLevel)} points
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

          <div className="flex items-center justify-between gap-2.5 lg:justify-end">
            <div className="flex items-center gap-2">
              <MiniRing value={skill.progress} size={30} />
              <span className="tnum text-[11px] font-semibold text-ink">
                {skill.progress}%
              </span>
            </div>
            {confirming ? (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-warm">Remove?</span>
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={busy}
                  className="rounded-[7px] border border-bad/40 px-2 py-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-bad hover:bg-bad-wash disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? "…" : "Delete"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="rounded-[7px] px-2 py-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-warm hover:text-ink"
                >
                  Keep
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={startEdit}
                  className="rounded-[7px] border border-transparent p-1.5 text-warm transition-colors hover:border-rule hover:text-navy"
                  aria-label={`Edit ${skill.name}`}
                >
                  <Pencil className="h-[13px] w-[13px]" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className="rounded-[7px] border border-transparent p-1.5 text-warm transition-colors hover:border-rule hover:text-bad"
                  aria-label={`Remove ${skill.name}`}
                >
                  <Trash2 className="h-[13px] w-[13px]" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Reveal>
  );
}

export default function SkillsPage() {
  const { data, isLoading, isError, refetch } = useSkills();
  const [filter, setFilter] = useState<PriorityFilter>("ALL");
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [banner, setBanner] = useState<{ tone: "good" | "bad"; text: string } | null>(null);

  const skills = (data ?? []).filter(
    (s) =>
      (filter === "ALL" || s.priority === filter) &&
      (query.trim() === "" ||
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.category.toLowerCase().includes(query.toLowerCase())),
  );

  const categorySuggestions = useMemo(
    () => Array.from(new Set((data ?? []).map((s) => s.category))).sort(),
    [data],
  );

  const openAdd = () => {
    setBanner(null);
    setAddOpen(true);
  };

  const handleCreated = (name: string) => {
    setAddOpen(false);
    setBanner({ tone: "good", text: `You're now tracking ${name}.` });
    window.setTimeout(() => setBanner(null), 3200);
  };

  const handleRemoved = (name: string) => {
    setBanner({ tone: "good", text: `${name} removed from your ledger.` });
    window.setTimeout(() => setBanner(null), 3200);
  };

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
              disabled
              title="Resume import arrives with the resume upload feature"
              aria-disabled="true"
              className="btn-base h-[42px] cursor-not-allowed rounded-[10px] border border-rule bg-panel px-[18px] text-[14px] font-medium text-warm-2"
            >
              Import from resume
            </button>
            <button
              type="button"
              onClick={openAdd}
              className="btn-base h-[42px] rounded-[10px] bg-navy px-[18px] text-[14px] font-medium text-white hover:bg-navy-dark dark:bg-navy dark:text-[#0d1117]"
            >
              <Plus className="h-[15px] w-[15px]" aria-hidden="true" />
              Add skill
            </button>
          </>
        }
      />

      {banner && (
        <div
          role={banner.tone === "good" ? "status" : "alert"}
          className={cn(
            "mb-8 flex items-center gap-3 rounded-[11px] border px-5 py-4",
            banner.tone === "good"
              ? "border-good/25 bg-good-wash"
              : "border-bad/25 bg-bad-wash",
          )}
        >
          {banner.tone === "good" ? (
            <CheckCircle2 className="h-[16px] w-[16px] shrink-0 text-good" aria-hidden="true" />
          ) : (
            <AlertTriangle className="h-[16px] w-[16px] shrink-0 text-bad" aria-hidden="true" />
          )}
          <p
            className={cn(
              "text-[11.5px]",
              banner.tone === "good" ? "text-good" : "text-bad",
            )}
          >
            {banner.text}
          </p>
        </div>
      )}

      {addOpen && (
        <section className="mb-10">
          <AddSkillPanel
            categories={categorySuggestions}
            onCreated={handleCreated}
            onCancel={() => setAddOpen(false)}
          />
        </section>
      )}

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
        ) : skills.length === 0 && data?.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No skills tracked yet"
            description="Add the skills you already have so CareerTracker can compare them against what your target role expects — without a baseline there is nothing to measure."
            action={
              <button
                type="button"
                onClick={openAdd}
                className="btn-base h-[42px] rounded-[10px] bg-navy px-[18px] text-[14px] font-medium text-white hover:bg-navy-dark dark:bg-navy dark:text-[#0d1117]"
              >
                Add your first skill
              </button>
            }
          />
        ) : skills.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No skills match those filters"
            description="Adjust your search or filter to see the rest of your tracked skills. Clearing the filters will show them all."
            action={
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
            }
          />
        ) : (
          <div className="overflow-hidden rounded-[13px] border border-rule bg-panel">
            <div className="hidden grid-cols-[1.5fr_1.6fr_0.75fr_0.6fr_0.65fr] items-center gap-6 border-b border-rule px-7 py-4 lg:grid">
              <span className="label-caps">Skill</span>
              <span className="label-caps">Current vs. required</span>
              <span className="label-caps">Priority</span>
              <span className="label-caps">Trend</span>
              <span className="label-caps text-right">Progress</span>
            </div>

            {skills.map((skill, i) => (
              <SkillRow
                key={skill.id}
                skill={skill}
                index={i}
                onRemoved={handleRemoved}
              />
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
