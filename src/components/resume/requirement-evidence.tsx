"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronRight, Search, X } from "lucide-react";
import { EVIDENCE_GROUPS, filterEvidenceGroups } from "@/lib/resume-analysis.mjs";
import type { EvidenceGroup, EvidenceRow, FocusRequest } from "@/lib/resume-analysis.mjs";
import { cn } from "@/lib/utils";

const STATE_STYLES: Record<EvidenceRow["state"], string> = {
  demonstrated: "border-good/40 bg-good-wash/60 text-good",
  mentioned: "border-navy/25 bg-navy-wash/50 text-navy",
  partial: "border-warn/40 bg-warn-wash/60 text-warn",
  not_demonstrated: "border-bad/35 bg-bad-wash/50 text-bad",
  not_evaluated: "border-rule-strong bg-paper-2 text-warm",
};

const FILTERS = [
  { key: "all", label: "All" },
  ...EVIDENCE_GROUPS.map((group) => ({ key: group.key, label: group.label })),
];

function categoryLabel(row: EvidenceRow) {
  if (row.kind === "review") {
    return row.classification === "ambiguous" ? "ambiguous statement" : "unsupported statement";
  }
  return row.category.replaceAll("_", " ");
}

function EvidenceRowItem({ row }: { row: EvidenceRow }) {
  return (
    <details
      data-evidence-key={row.key}
      className="group border-t border-rule first:border-t-0"
    >
      <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-3 hover:bg-paper-2/50 [&::-webkit-details-marker]:hidden">
        <ChevronRight
          className="mt-[3px] h-3.5 w-3.5 shrink-0 text-warm motion-safe:transition-transform group-open:rotate-90"
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1">
          <span className="block break-words text-[12px] font-semibold leading-5 text-ink">
            {row.title}
          </span>
          <span className="mt-0.5 block text-[10px] capitalize text-warm">
            {row.priority} · {categoryLabel(row)}
            {row.sectionHeading ? ` · ${row.sectionHeading}` : ""}
          </span>
        </span>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-1 text-[9.5px] font-semibold leading-none",
            STATE_STYLES[row.state],
          )}
        >
          {row.stateLabel}
        </span>
      </summary>
      <div className="border-t border-rule bg-paper-2/35 px-4 py-4">
        <p className="break-words text-[11.5px] leading-6 text-ink-soft">{row.explanation}</p>

        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div className="min-w-0">
            <p className="label-caps">Job description</p>
            {row.jdExcerpts.length > 0 ? (
              row.jdExcerpts.map((excerpt, index) => (
                <blockquote
                  key={`${row.key}-jd-${index}`}
                  className="mt-1.5 break-words border-l-2 border-navy/30 pl-3 text-[11px] italic leading-5 text-warm"
                >
                  {excerpt}
                </blockquote>
              ))
            ) : (
              <p className="mt-1.5 text-[10.5px] leading-5 text-warm">
                No job-description excerpt was returned for this requirement.
              </p>
            )}
          </div>
          <div className="min-w-0">
            <p className="label-caps">Resume evidence</p>
            {row.resumeExcerpts.length > 0 ? (
              row.resumeExcerpts.map((excerpt, index) => (
                <blockquote
                  key={`${row.key}-resume-${index}`}
                  className="mt-1.5 break-words border-l-2 border-good/40 pl-3 text-[11px] leading-5 text-ink"
                >
                  <span className="block text-[9.5px] font-semibold uppercase tracking-[0.08em] text-warm">
                    {excerpt.section}
                  </span>
                  {excerpt.text}
                </blockquote>
              ))
            ) : (
              <p className="mt-1.5 text-[10.5px] leading-5 text-warm">
                {row.state === "not_evaluated"
                  ? "Not assessed: this statement was not matched to resume evidence."
                  : "No resume evidence was found for this requirement."}
              </p>
            )}
          </div>
        </div>

        {row.roleContext && (
          <p className="mt-3 text-[10px] leading-5 text-warm">
            Role context: this comes from an assigned responsibility, not a pre-entry qualification.
          </p>
        )}

        {row.suggestion && (
          <div className="mt-3 border-l-2 border-navy/40 pl-3">
            <p className="label-caps text-navy">Truthful next step</p>
            <p className="mt-1 text-[11px] leading-5 text-ink">{row.suggestion}</p>
          </div>
        )}

        {(row.concepts.length > 0 || row.hardEligibilityConcern) && (
          <p className="mt-3 text-[10px] leading-4 text-warm-2">
            {row.concepts.length > 0 && <>Recognized concepts: {row.concepts.join(", ")}. </>}
            {row.hardEligibilityConcern && "Potentially mandatory qualification — review the source wording."}
          </p>
        )}
      </div>
    </details>
  );
}

export function RequirementEvidence({
  groups,
  focusRequest,
}: {
  groups: EvidenceGroup[];
  focusRequest: FocusRequest | null;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState(
    focusRequest?.state && focusRequest.state !== "all" ? focusRequest.state : "all",
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const total = useMemo(() => groups.reduce((count, group) => count + group.rows.length, 0), [groups]);
  const counts = useMemo(
    () => Object.fromEntries(groups.map((group) => [group.key, group.rows.length])),
    [groups],
  );
  const filteredGroups = useMemo(
    () => filterEvidenceGroups(groups, { query, state: filter }),
    [groups, query, filter],
  );
  const visibleGroups = filteredGroups.filter((group) => group.rows.length > 0);
  const visibleCount = filteredGroups.reduce((count, group) => count + group.rows.length, 0);

  // Direct navigation remounts this view with the requested filter, so the
  // target row opens and receives focus without a synchronised state reset.
  useEffect(() => {
    if (!focusRequest?.key) return;
    const container = containerRef.current;
    if (!container) return;
    const target = container.querySelector<HTMLDetailsElement>(
      `details[data-evidence-key="${focusRequest.key}"]`,
    );
    if (!target) return;
    target.open = true;
    target.scrollIntoView({ block: "center" });
    target.querySelector<HTMLElement>("summary")?.focus({ preventScroll: true });
  }, [focusRequest]);

  function clearFilters() {
    setQuery("");
    setFilter("all");
  }

  return (
    <div ref={containerRef}>
      <div className="flex flex-col gap-3 border-b border-rule pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1 sm:max-w-[420px]">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-warm"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search requirements, skills or excerpt text"
            aria-label="Search requirements and resume evidence"
            className="field h-9 py-0 pl-9 pr-8 text-[11.5px]"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-warm hover:text-ink"
              aria-label="Clear requirement search"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
        <p className="tnum shrink-0 text-[10.5px] text-warm" aria-live="polite">
          Showing {visibleCount} of {total} requirement{total === 1 ? "" : "s"}
        </p>
      </div>

      <div
        role="group"
        aria-label="Filter by evidence state"
        className="flex flex-wrap gap-1.5 border-b border-rule py-3"
      >
        {FILTERS.map((option) => {
          const selected = filter === option.key;
          const count = option.key === "all" ? total : (counts[option.key] ?? 0);
          if (option.key !== "all" && count === 0) return null;
          return (
            <button
              key={option.key}
              type="button"
              aria-pressed={selected}
              onClick={() => setFilter(option.key)}
              className={cn(
                "btn-base h-7 rounded-full border px-2.5 text-[10px] font-medium",
                selected
                  ? "border-navy bg-navy text-white"
                  : "border-rule bg-panel text-warm hover:border-navy/40 hover:text-navy",
              )}
            >
              {option.label}
              <span className="tnum text-[9px] opacity-75">{count}</span>
            </button>
          );
        })}
      </div>

      {total === 0 ? (
        <p className="rounded-[9px] border border-rule bg-paper px-4 py-6 text-[11.5px] leading-5 text-warm">
          No requirement rows were returned for this job description. Review the source text and try
          again — this does not mean every possible requirement was understood.
        </p>
      ) : visibleCount === 0 ? (
        <div className="rounded-[9px] border border-rule bg-paper px-4 py-6 text-center">
          <p className="text-[11.5px] leading-5 text-warm">
            No requirement matches this search and filter.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-2 text-[10.5px] font-semibold text-navy underline-offset-2 hover:underline"
          >
            Clear search and filter
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {visibleGroups.map((group) => (
            <section key={group.key} aria-labelledby={`evidence-group-${group.key}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h3
                  id={`evidence-group-${group.key}`}
                  className="text-[12.5px] font-semibold text-ink"
                >
                  {group.label}
                  <span className="tnum ml-1.5 font-normal text-warm">({group.rows.length})</span>
                </h3>
                {group.key === "not_evaluated" && (
                  <span className="text-[9.5px] font-medium uppercase tracking-[0.08em] text-warm">
                    Not counted as met or missing
                  </span>
                )}
              </div>
              <p className="mb-2 mt-0.5 text-[10.5px] leading-5 text-warm">{group.description}</p>
              <div className="overflow-hidden rounded-[10px] border border-rule bg-panel">
                {group.rows.map((row) => (
                  <EvidenceRowItem key={row.key} row={row} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="mt-5 flex items-center gap-1.5 text-[10px] leading-4 text-warm-2">
        <ArrowRight className="h-3 w-3 shrink-0" aria-hidden="true" />
        Each row opens its exact job-description and resume sources. Requirement details stay
        collapsed until you open them.
      </p>
    </div>
  );
}
