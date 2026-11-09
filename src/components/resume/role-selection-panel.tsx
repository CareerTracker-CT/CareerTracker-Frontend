"use client";

import { LoaderCircle, TriangleAlert } from "lucide-react";
import type { RoleSelection } from "@/lib/resume-analysis.mjs";

function RoleSummary({ role }: { role: RoleSelection["roles"][number] }) {
  return (
    <>
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="break-words text-[12px] font-semibold text-ink">{role.title}</span>
        <span className="rounded-full border border-rule px-1.5 py-0.5 text-[8.5px] font-medium uppercase tracking-[0.08em] text-warm">
          {role.confidence === "high" ? "Detected position" : "Possible position"}
        </span>
      </span>
      <span className="mt-1 block line-clamp-2 text-[10px] leading-4 text-warm">
        {role.excerpt.replace(/\s+/g, " ").slice(0, 180)}
      </span>
      <span className="mt-1 block text-[9.5px] text-warm-2">
        {role.requirementHintCount} qualification line
        {role.requirementHintCount === 1 ? "" : "s"} in this section
      </span>
    </>
  );
}

export function RoleSelectionPanel({
  selection,
  selectedId,
  onSelect,
  onAnalyze,
  onEditInputs,
  busy,
}: {
  selection: RoleSelection;
  selectedId: string;
  onSelect: (id: string) => void;
  onAnalyze: () => void;
  onEditInputs: () => void;
  busy: boolean;
}) {
  const ambiguous = selection.ambiguous;
  const canAnalyze = selection.canAnalyze ?? selection.roles.length > 0;
  const unresolved = selection.uncertainty === "possible_multiple" || !canAnalyze;
  const selectedCandidate = selection.roles.find((role) => role.id === selectedId);
  const canSubmit = canAnalyze && Boolean(selectedCandidate?.selectable);
  const guidanceId = "role-selection-guidance";
  const detailsId = "role-selection-uncertainty";

  return (
    <section
      aria-labelledby="role-selection-title"
      aria-describedby={`${guidanceId}${unresolved ? ` ${detailsId}` : ""}`}
      className="mt-4 rounded-[11px] border border-navy/20 bg-navy-wash/20 p-4 sm:p-5"
    >
      <p className="label-caps text-navy">
        {unresolved
          ? "Position boundaries need review"
          : ambiguous
            ? "Position boundaries need review"
            : "Position selection required"}
      </p>
      <h3 id="role-selection-title" className="mt-1.5 text-[14px] font-semibold text-ink">
        {unresolved
          ? selection.roles.length === 0
            ? "More than one position may be described"
            : "The detected sections do not have reliable boundaries"
          : ambiguous
            ? "This notice may describe more than one position"
            : `This job description describes ${selection.detectedRoleCount} positions`}
      </h3>
      <p id={guidanceId} className="mt-1.5 max-w-[78ch] text-[11px] leading-5 text-warm">
        {selection.guidance}
      </p>

      {selection.truncated && (
        <p className="mt-2.5 flex items-start gap-2 rounded-[8px] border border-warn/30 bg-warn-wash/40 px-3 py-2 text-[10.5px] leading-5 text-ink-soft">
          <TriangleAlert className="mt-[2px] h-3.5 w-3.5 shrink-0 text-warn" aria-hidden="true" />
          More positions may exist than are shown here. If your position is missing, provide a job
          description for that one position instead of selecting a different role.
        </p>
      )}

      {unresolved && (
        <div
          id={detailsId}
          className="mt-2.5 rounded-[8px] border border-warn/30 bg-warn-wash/40 px-3 py-2"
        >
          <p className="flex items-start gap-2 text-[10.5px] leading-5 text-ink-soft">
            <TriangleAlert className="mt-[2px] h-3.5 w-3.5 shrink-0 text-warn" aria-hidden="true" />
            No position is offered for scoring here. A reliable split could not be established, so
            combining every qualification into one score would be unsafe. Paste a description for
            the single position you are applying for.
          </p>
          {selection.signals && selection.signals.length > 0 && (
            <details className="mt-2 border-t border-warn/20 pt-2">
              <summary className="cursor-pointer text-[10px] font-medium text-warm">
                Why this was detected
              </summary>
              <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[10px] leading-4 text-warm">
                {selection.signals.map((signal) => (
                  <li key={signal}>{signal}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {!unresolved && ambiguous && (
        <p className="mt-2.5 flex items-start gap-2 rounded-[8px] border border-warn/30 bg-warn-wash/40 px-3 py-2 text-[10.5px] leading-5 text-ink-soft">
          <TriangleAlert className="mt-[2px] h-3.5 w-3.5 shrink-0 text-warn" aria-hidden="true" />
          The detected sections are shown for review, not as a reliable split. Only a section with
          its own qualification text can be selected. If the boundaries look wrong, provide a job
          description for one position.
        </p>
      )}

      {canAnalyze ? (
        <fieldset className="mt-4">
          <legend className="sr-only">Choose the position you are applying for</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {selection.roles.map((role) => {
              const inputId = `job-role-${role.index}`;
              const checked = selectedId === role.id;
              const selectable = role.selectable !== false;
              return (
                <label
                  key={role.id}
                  htmlFor={inputId}
                  className={`flex items-start gap-2.5 rounded-[9px] border p-3 transition-colors ${
                    checked
                      ? "border-navy bg-panel ring-1 ring-inset ring-navy"
                      : "border-rule bg-panel/70 hover:border-navy/50"
                  } ${selectable ? "cursor-pointer" : "cursor-not-allowed opacity-70"}`}
                >
                  <input
                    id={inputId}
                    type="radio"
                    name="job-role"
                    value={role.id}
                    checked={checked}
                    disabled={!selectable}
                    onChange={() => onSelect(role.id)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-navy"
                  />
                  <span className="min-w-0">
                    <RoleSummary role={role} />
                    {!selectable && (
                      <span className="mt-1 block text-[9.5px] font-medium text-warn">
                        No qualification text in this section; not offered for scoring.
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : (
        selection.roles.length > 0 && (
          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-warm">
              Sections detected for review only
            </p>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {selection.roles.map((role) => (
                <li
                  key={role.id}
                  className="rounded-[9px] border border-rule bg-panel/70 p-3 opacity-80"
                >
                  <RoleSummary role={role} />
                </li>
              ))}
            </ul>
          </div>
        )
      )}

      {selection.shared && selection.shared.entryHintCount > 0 && (
        <div className="mt-3 rounded-[8px] border border-rule bg-panel px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-warm">
            Before the positions
          </p>
          <p className="mt-1 text-[10.5px] leading-5 text-ink-soft">{selection.shared.note}</p>
          <p className="mt-1 line-clamp-2 text-[9.5px] leading-4 text-warm-2">
            {selection.shared.excerpt.replace(/\s+/g, " ")}
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2.5 border-t border-rule pt-4">
        {canAnalyze ? (
          <button
            type="button"
            onClick={onAnalyze}
            disabled={!canSubmit || busy}
            className="btn-base h-10 rounded-[9px] bg-navy px-4 text-[12px] font-medium text-white hover:bg-navy-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                Analyzing…
              </>
            ) : (
              "Analyze selected position"
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={onEditInputs}
            disabled={busy}
            className="btn-base h-10 rounded-[9px] bg-navy px-4 text-[12px] font-medium text-white hover:bg-navy-dark disabled:opacity-60"
          >
            Provide a one-position description
          </button>
        )}
        {canAnalyze && (
          <button
            type="button"
            onClick={onEditInputs}
            disabled={busy}
            className="btn-base h-10 rounded-[9px] border border-rule-strong bg-panel px-3.5 text-[11px] font-medium text-ink hover:border-navy hover:text-navy disabled:opacity-60"
          >
            Use a different job description
          </button>
        )}
        {canAnalyze && !canSubmit && (
          <p className="text-[10px] text-warm">
            {selectedCandidate && !selectedCandidate.selectable
              ? "That section has no qualification text. Choose another position or provide a one-position description."
              : "Choose one position to continue. None is selected for you."}
          </p>
        )}
      </div>
    </section>
  );
}
