"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, LoaderCircle } from "lucide-react";
import {
  AnalysisWorkspace,
  type AnalysisView,
} from "@/components/resume/analysis-workspace";
import { DocumentSummaryBar } from "@/components/resume/document-summary-bar";
import { ExtractedTextDrawer } from "@/components/resume/extracted-text-drawer";
import { IntakeFields } from "@/components/resume/intake-fields";
import { RoleSelectionPanel } from "@/components/resume/role-selection-panel";
import {
  MAX_BYTES,
  MAX_PASTED_JD_CHARACTERS,
  type EvidenceCopyState,
  type ExtractionLimits,
  type ExtractionResult,
} from "@/components/resume/analysis-types";
import { useCreateResumeLibrary } from "@/hooks/use-api";
import { api } from "@/lib/api";
import {
  emptyResumeDocument,
  roleLabelFromMatch,
  skillsFromEvidence,
} from "@/lib/resume-builder.mjs";
import { requestResumeOpen } from "@/lib/resume-events.mjs";
import { describeResumeLibraryError } from "@/lib/resume-library.mjs";
import type {
  AnalyzeResponse,
  FocusRequest,
  ResumeAnalysisPayload,
  RoleSelection,
} from "@/lib/resume-analysis.mjs";
import type { ApiResponse } from "@/types";
import { cn } from "@/lib/utils";

type Target = "resume" | "jobDescription";
type Busy = "extract" | "analyze" | null;

const PRIMARY_BUTTON =
  "btn-base h-10 rounded-[10px] bg-navy px-4 text-[12.5px] font-medium text-white hover:bg-navy-dark disabled:cursor-not-allowed disabled:opacity-60";
const SECONDARY_BUTTON =
  "btn-base h-10 rounded-[10px] border border-rule-strong bg-panel px-4 text-[12px] font-medium text-ink hover:border-navy hover:text-navy disabled:opacity-60";
const GHOST_BUTTON =
  "btn-base h-10 rounded-[10px] px-3 text-[12px] font-medium text-warm hover:bg-navy-wash/40 hover:text-navy disabled:opacity-60";

function validateFile(file: File, maxBytes: number): string | null {
  if (file.size > maxBytes) {
    return `Each document must be ${(maxBytes / (1024 * 1024)).toFixed(2)} MB or smaller.`;
  }
  if (!/\.(pdf|docx)$/i.test(file.name)) return "Choose a PDF or DOCX file.";
  // Browser MIME values are hints only. The backend checks the extension and
  // file signature before parsing, including when the browser reports no MIME.
  return null;
}

export function DocumentIntake() {
  const sectionRef = useRef<HTMLElement>(null);
  const focusSeq = useRef(0);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [jdText, setJdText] = useState("");
  const [useJdFile, setUseJdFile] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [analysis, setAnalysis] = useState<ResumeAnalysisPayload | null>(null);
  const [roleSelection, setRoleSelection] = useState<RoleSelection | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<Busy>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [view, setView] = useState<AnalysisView>("overview");
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const createEvidenceCopy = useCreateResumeLibrary();
  const [copyState, setCopyState] = useState<
    EvidenceCopyState & { forAnalysis: ResumeAnalysisPayload | null }
  >({ busy: false, error: null, created: null, forAnalysis: null });
  // A new analysis replaces the offer; a previous copy stays in the library.
  const visibleCopyState: EvidenceCopyState =
    copyState.forAnalysis === analysis
      ? copyState
      : { busy: false, error: null, created: null };

  async function handoffToBuilder() {
    if (!analysis || createEvidenceCopy.isPending) return;
    const skills = skillsFromEvidence(analysis.jobMatch);
    const role = roleLabelFromMatch(analysis.jobMatch);
    const name = (role ? `${role} - role copy` : "Role-specific resume copy").slice(0, 120);
    setCopyState({ busy: true, error: null, created: null, forAnalysis: analysis });
    try {
      const created = await createEvidenceCopy.mutateAsync({
        name,
        targetRoleLabel: role || undefined,
        content: { ...emptyResumeDocument(), skills },
      });
      setCopyState({
        busy: false,
        error: null,
        created: { id: created.id, name: created.name },
        forAnalysis: analysis,
      });
    } catch (error) {
      setCopyState({
        busy: false,
        error: describeResumeLibraryError(error).message,
        created: null,
        forAnalysis: analysis,
      });
    }
  }

  function openCopyInBuilder() {
    if (visibleCopyState.created) requestResumeOpen(visibleCopyState.created.id);
  }
  const [inputLimits, setInputLimits] = useState<ExtractionLimits>({
    maxDocumentBytes: MAX_BYTES,
    maxPastedJobDescriptionCharacters: MAX_PASTED_JD_CHARACTERS,
  });

  useEffect(() => {
    let active = true;
    api
      .get<ApiResponse<ExtractionLimits>>("/resumes/limits", { timeout: 10_000 })
      .then((response) => {
        if (active && response.data.success) setInputLimits(response.data.data);
      })
      .catch(() => {
        // Keep the protocol maximum as a fallback. Upload/analyze responses
        // remain authoritative if the protected limits route is unavailable.
      });
    return () => {
      active = false;
    };
  }, []);

  const isBusy = busy !== null;

  function clearOutputs() {
    setResult(null);
    setAnalysis(null);
    setRoleSelection(null);
    setSelectedRoleId("");
    setPreviewOpen(false);
    setEditing(false);
    setView("overview");
    setFocusRequest(null);
  }

  function chooseFile(file: File | undefined, target: Target) {
    if (!file || isBusy) return;
    const issue = validateFile(file, inputLimits.maxDocumentBytes);
    setError(issue ?? "");
    if (issue) {
      if (target === "resume") setResumeFile(null);
      else setJdFile(null);
      clearOutputs();
      return;
    }
    if (target === "resume") setResumeFile(file);
    else setJdFile(file);
    clearOutputs();
  }

  function clearFile(target: Target) {
    if (target === "resume") setResumeFile(null);
    else setJdFile(null);
    setError("");
    clearOutputs();
  }

  function changeJdText(value: string) {
    setJdText(value);
    setError("");
    clearOutputs();
  }

  function changeJdSource(nextUseFile: boolean) {
    setUseJdFile(nextUseFile);
    setError("");
    clearOutputs();
  }

  async function extract() {
    setError("");
    setResult(null);
    setAnalysis(null);
    setRoleSelection(null);
    setSelectedRoleId("");
    setPreviewOpen(false);
    if (!resumeFile) return setError("Choose your resume first.");
    if (useJdFile ? !jdFile : !jdText.trim()) {
      return setError(useJdFile ? "Choose a job description file." : "Paste a job description.");
    }
    if (
      !useJdFile &&
      Array.from(jdText).length > inputLimits.maxPastedJobDescriptionCharacters
    ) {
      return setError(
        `The job description must be ${inputLimits.maxPastedJobDescriptionCharacters.toLocaleString()} Unicode code points or fewer.`,
      );
    }
    const body = new FormData();
    body.append("resume", resumeFile);
    if (useJdFile && jdFile) body.append("jobDescriptionFile", jdFile);
    else body.append("jobDescriptionText", jdText);

    setBusy("extract");
    try {
      const response = await api.post<ApiResponse<ExtractionResult>>("/resumes/extract", body, {
        timeout: 45_000,
        // Let the browser set the multipart boundary.
        headers: { "Content-Type": undefined },
      });
      if (!response.data.success) throw new Error(response.data.error.message);
      setResult(response.data.data);
      setEditing(false);
      setView("overview");
      setFocusRequest(null);
    } catch (cause) {
      const data = (cause as { response?: { data?: ApiResponse<unknown> } })?.response?.data;
      const message = data && !data.success ? data.error.message : null;
      setError(
        message || (cause instanceof Error ? cause.message : "Document extraction failed. Try again."),
      );
    } finally {
      setBusy(null);
    }
  }

  async function analyze(roleId?: string) {
    setError("");
    setAnalysis(null);
    if (!result) return setError("Extract and preview both documents before analysis.");
    if (!resumeFile) return setError("Choose your resume first.");
    if (
      !useJdFile &&
      Array.from(jdText).length > inputLimits.maxPastedJobDescriptionCharacters
    ) {
      return setError(
        `The job description must be ${inputLimits.maxPastedJobDescriptionCharacters.toLocaleString()} Unicode code points or fewer.`,
      );
    }
    const body = new FormData();
    body.append("resume", resumeFile);
    if (useJdFile && jdFile) body.append("jobDescriptionFile", jdFile);
    else if (jdText.trim()) body.append("jobDescriptionText", jdText);
    else return setError("Provide a job description before analysis.");
    if (roleId) body.append("jobRoleId", roleId);

    setBusy("analyze");
    try {
      const response = await api.post<ApiResponse<AnalyzeResponse>>("/resumes/analyze", body, {
        timeout: 45_000,
        headers: { "Content-Type": undefined },
      });
      if (!response.data.success) throw new Error(response.data.error.message);
      const data = response.data.data;
      setRoleSelection(data.roleSelection ?? null);
      if (!data.jobMatch) {
        setAnalysis(null);
        setEditing(false);
        setView("overview");
        setFocusRequest(null);
        return;
      }
      setAnalysis({
        jobMatch: data.jobMatch,
        atsReadability: data.atsReadability,
        ...(data.roleSelection ? { roleSelection: data.roleSelection } : {}),
      });
      setEditing(false);
      setView("overview");
      setFocusRequest(null);
    } catch (cause) {
      const data = (cause as { response?: { data?: ApiResponse<unknown> } })?.response?.data;
      const message = data && !data.success ? data.error.message : null;
      setError(message || (cause instanceof Error ? cause.message : "Analysis failed. Try again."));
    } finally {
      setBusy(null);
    }
  }

  function openEvidence(target?: { key?: string | null; state?: string }) {
    focusSeq.current += 1;
    setFocusRequest({
      key: target?.key ?? null,
      state: target?.state ?? "all",
      seq: focusSeq.current,
    });
    setView("evidence");
  }

  function startEditing() {
    setEditing(true);
    requestAnimationFrame(() => sectionRef.current?.scrollIntoView({ block: "start" }));
  }

  function changeRole() {
    if (!analysis) return;
    // The previous role's score must not survive a scope change.
    setAnalysis(null);
    setView("overview");
    setFocusRequest(null);
    requestAnimationFrame(() => sectionRef.current?.scrollIntoView({ block: "start" }));
  }

  const liveMessage =
    busy === "extract"
      ? "Extracting document text."
      : busy === "analyze"
        ? "Comparing resume evidence with the job description."
        : analysis
          ? "Analysis complete. Overview, requirement evidence and document inspection are available."
          : result
            ? "Text extracted. Ready to analyze."
            : "";

  return (
    <>
      <section
        ref={sectionRef}
        aria-labelledby="document-intake-title"
        className="scroll-mt-24 rounded-[14px] border border-rule bg-panel"
      >
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-rule px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="label-caps text-navy">
              {result ? "Analysis inputs" : "Resume workspace"}
            </p>
            <h2 id="document-intake-title" className="mt-1.5 text-[17px] font-semibold text-ink">
              {result ? "Documents in this analysis" : "Add a resume and a job description"}
            </h2>
            <p className="mt-2 max-w-[76ch] text-[11.5px] leading-5 text-warm">
              {result
                ? "Switch between views below without losing your inputs or results. The extracted text is available on demand."
                : "Upload a PDF or DOCX resume and provide the job description as text or a file. Both are parsed in memory for this request only."}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-rule px-2.5 py-1 text-[9.5px] font-medium uppercase tracking-[0.1em] text-warm">
            <span className="h-[5px] w-[5px] rounded-full bg-warn" aria-hidden="true" />
            Not saved
          </span>
        </div>

        <div className="px-5 py-5 sm:px-6">
          <p className="sr-only" aria-live="polite">
            {liveMessage}
          </p>

          {!result ? (
            <IntakeFields
              resume={resumeFile}
              jdFile={jdFile}
              jdText={jdText}
              useJdFile={useJdFile}
              limits={inputLimits}
              busy={isBusy}
              onChooseFile={chooseFile}
              onClearFile={clearFile}
              onJdTextChange={changeJdText}
              onJdSourceChange={changeJdSource}
            />
          ) : (
            <DocumentSummaryBar
              result={result}
              resumeFile={resumeFile}
              jdFile={jdFile}
              useJdFile={useJdFile}
              jdText={jdText}
              busy={isBusy}
              hasAnalysis={Boolean(analysis)}
              onReviewText={() => setPreviewOpen(true)}
              onEditInputs={startEditing}
              onAnalyze={() => analyze(selectedRoleId || undefined)}
            />
          )}

          {result && analysis && analysis.jobMatch.roleScope?.mode === "selected" && (
            <div className="mt-4 flex flex-wrap items-start justify-between gap-3 rounded-[10px] border border-rule bg-navy-wash/25 px-3.5 py-3">
              <div className="min-w-0">
                <p className="label-caps text-navy">Position analyzed</p>
                <p className="mt-1 break-words text-[12px] font-semibold text-ink">
                  {analysis.jobMatch.roleScope.selectedRole?.title ?? "Selected position"}
                </p>
                <p className="mt-1 max-w-[76ch] text-[10.5px] leading-5 text-warm">
                  Only this position&apos;s qualifications are scored.{" "}
                  {Math.max(analysis.jobMatch.roleScope.detectedRoleCount - 1, 0)} other detected
                  position
                  {analysis.jobMatch.roleScope.detectedRoleCount - 1 === 1 ? " is" : "s are"}{" "}
                  excluded.
                  {analysis.jobMatch.roleScope.ambiguous
                    ? " The detected boundaries were uncertain; review the source text before relying on this result."
                    : ""}
                </p>
              </div>
              {roleSelection && (
                <button
                  type="button"
                  onClick={changeRole}
                  className="btn-base h-9 shrink-0 rounded-[8px] border border-rule-strong bg-panel px-3 text-[11px] font-medium text-ink hover:border-navy hover:text-navy"
                >
                  Change position
                </button>
              )}
            </div>
          )}

          {result && roleSelection && !analysis && !isBusy && (
            <RoleSelectionPanel
              selection={roleSelection}
              selectedId={selectedRoleId}
              onSelect={setSelectedRoleId}
              onAnalyze={() => analyze(selectedRoleId)}
              onEditInputs={startEditing}
              busy={isBusy}
            />
          )}

          {error && (
            <p
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-[9px] border border-bad/30 bg-bad-wash/40 px-3 py-2.5 text-[11.5px] leading-5 text-bad"
            >
              <AlertCircle className="mt-[2px] h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}

          {result && editing && (
            <div className="mt-4 rounded-[11px] border border-rule bg-paper-2/40 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="label-caps">Replace inputs</p>
                  <p className="mt-1.5 text-[11px] leading-5 text-warm">
                    Changing a document or the pasted text clears the current extraction and
                    analysis.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="btn-base h-8 rounded-[8px] border border-rule-strong px-3 text-[11px] text-ink hover:border-navy hover:text-navy"
                >
                  Done
                </button>
              </div>
              <div className="mt-4">
                <IntakeFields
                  resume={resumeFile}
                  jdFile={jdFile}
                  jdText={jdText}
                  useJdFile={useJdFile}
                  limits={inputLimits}
                  busy={isBusy}
                  onChooseFile={chooseFile}
                  onClearFile={clearFile}
                  onJdTextChange={changeJdText}
                  onJdSourceChange={changeJdSource}
                />
              </div>
            </div>
          )}

          {!analysis && (
            <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-rule pt-5">
              {result && !roleSelection && (
                <button
                  type="button"
                  onClick={() => analyze()}
                  disabled={isBusy}
                  className={PRIMARY_BUTTON}
                >
                  {busy === "analyze" ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Analyzing…
                    </>
                  ) : (
                    "Analyze resume against this job"
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={extract}
                disabled={isBusy}
                className={cn(result ? SECONDARY_BUTTON : PRIMARY_BUTTON)}
              >
                {busy === "extract" ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Extracting…
                  </>
                ) : result ? (
                  "Extract again"
                ) : (
                  "Extract text for preview"
                )}
              </button>
              {result && (
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  disabled={isBusy}
                  className={GHOST_BUTTON}
                >
                  Review extracted text
                </button>
              )}
            </div>
          )}

          {result && (
            <p className="mt-4 text-[10px] leading-4 text-warm-2">
              Documents and results are held in this page&apos;s memory, cleared on refresh, and
              never saved by this analyzer.
            </p>
          )}
        </div>
      </section>

      {analysis && (
        <div className="mt-6">
          <AnalysisWorkspace
            analysis={analysis}
            activeView={view}
            onViewChange={setView}
            focusRequest={focusRequest}
            onOpenEvidence={openEvidence}
            copyState={visibleCopyState}
            onCreateEvidenceCopy={() => void handoffToBuilder()}
            onOpenEvidenceCopy={openCopyInBuilder}
          />
        </div>
      )}

      {previewOpen && result && (
        <ExtractedTextDrawer result={result} onClose={() => setPreviewOpen(false)} />
      )}
    </>
  );
}
