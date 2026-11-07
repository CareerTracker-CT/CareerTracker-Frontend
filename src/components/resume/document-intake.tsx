"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, FileText, LoaderCircle, UploadCloud, X } from "lucide-react";
import { api } from "@/lib/api";
import type { ApiResponse } from "@/types";

type ExtractedDocument = {
  kind: "resume" | "jobDescription";
  format: "PDF" | "DOCX" | "PASTED_TEXT";
  text: string;
  characterCount: number;
  status: "EXTRACTED" | "EXTRACTED_WITH_WARNINGS";
  warnings: { code: string; message: string }[];
};

type ExtractionResult = { resume: ExtractedDocument; jobDescription: ExtractedDocument };
type Finding = {
  requirement: { id: string; category: string; displayName: string; priority: string; sourceExcerpts: string[]; purpose?: StatementPurpose; sectionHeading?: string };
  evidence: { classification: string; excerpts: { section: string; text: string }[]; explanation: string };
  suggestion: string;
};
type StatementPurpose =
  | "ENTRY_REQUIRED"
  | "ENTRY_PREFERRED"
  | "ROLE_RESPONSIBILITY"
  | "TRAINING_OUTCOME"
  | "SECTION_HEADING"
  | "INFORMATIONAL"
  | "AMBIGUOUS_REQUIREMENT";
type RequirementReviewItem = {
  id: string;
  classification: "unrecognized" | "ambiguous";
  priority: "required" | "preferred" | "unspecified";
  sourceExcerpts: string[];
  explanation: string;
  hardEligibilityConcern: boolean;
  purpose?: StatementPurpose;
  concepts?: string[];
  sectionHeading?: string;
};
type LearningOutcome = {
  id: string;
  excerpt: string;
  concepts: string[];
  conceptIds: string[];
  sectionHeading?: string;
};
type AnalysisResult = {
  jobMatch: {
  engineVersion: string;
  rubricVersion: string;
  coveragePolicyVersion: string;
  score: number | null;
  scoreUnavailableReason?: string;
  interpretationVersion?: string;
  requirementCoverage: {
    status: "complete" | "partial" | "none_detected";
    evaluatedRequirementCount: number;
    reviewRequiredCount: number;
    items: RequirementReviewItem[];
    candidateRequirementCount?: number;
    unsupportedRequirementCount?: number;
    ambiguousRequirementCount?: number;
    trainingOutcomeCount?: number;
    excludedStatementCount?: number;
    statementCounts?: {
      entryRequired: number;
      entryPreferred: number;
      roleResponsibility: number;
      trainingOutcome: number;
      sectionHeading: number;
      informational: number;
      ambiguousRequirement: number;
    };
  };
  requirements: Finding["requirement"][];
  findings: Finding[];
  requirementsNotDemonstrated: Finding[];
  hardEligibilityConcerns: Finding[];
  learningOutcomes?: LearningOutcome[];
  limitations: string[];
  };
  atsReadability: {
    assessmentVersion: string;
    rubricVersion: string;
    status: "partial" | "insufficient";
    score: null;
    qualitativeSummary: "text_extracted" | "text_extracted_with_findings" | "insufficient_evidence";
    coveragePercent: number;
    scoreUnavailableReason: string;
    checks: { id: string; title: string; status: "passed" | "issue" | "warning" | "not_evaluated"; severity: string; evidence: string; explanation: string; recommendation: string }[];
    limitations: string[];
  };
};
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_PASTED_JD_CHARACTERS = 40_000;
const ACCEPTED = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const PURPOSE_LABELS: Record<StatementPurpose, string> = {
  ENTRY_REQUIRED: "Entry requirement",
  ENTRY_PREFERRED: "Preferred qualification",
  ROLE_RESPONSIBILITY: "Role responsibility",
  TRAINING_OUTCOME: "Training outcome",
  SECTION_HEADING: "Section heading",
  INFORMATIONAL: "Informational",
  AMBIGUOUS_REQUIREMENT: "Ambiguous requirement",
};
const EVIDENCE_BADGES: Record<string, string> = {
  demonstrated: "border-good/40 text-good",
  explicit: "border-navy/30 text-navy",
  related: "border-warn/40 text-warn",
  insufficient: "border-warn/40 text-warn",
  uncertain: "border-warn/40 text-warn",
  not_found: "border-bad/40 text-bad",
};

type InputLimits = { maxDocumentBytes: number; maxPastedJobDescriptionCharacters: number };

function validateFile(file: File, maxBytes: number): string | null {
  if (file.size > maxBytes) return `Each document must be ${(maxBytes / (1024 * 1024)).toFixed(2)} MB or smaller.`;
  if (!/\.(pdf|docx)$/i.test(file.name)) return "Choose a PDF or DOCX file.";
  // Browser MIME values are hints only. The backend checks the extension and
  // file signature before parsing, including when the browser reports no MIME.
  return null;
}

export function DocumentIntake() {
  const resumeInput = useRef<HTMLInputElement>(null);
  const jdInput = useRef<HTMLInputElement>(null);
  const [resume, setResume] = useState<File | null>(null);
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [jdText, setJdText] = useState("");
  const [useJdFile, setUseJdFile] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [inputLimits, setInputLimits] = useState<InputLimits>({
    maxDocumentBytes: MAX_BYTES,
    maxPastedJobDescriptionCharacters: MAX_PASTED_JD_CHARACTERS,
  });

  useEffect(() => {
    let active = true;
    api.get<ApiResponse<InputLimits>>("/resumes/limits", { timeout: 10_000 })
      .then((response) => {
        if (active && response.data.success) setInputLimits(response.data.data);
      })
      .catch(() => {
        // Keep the protocol maximum as a fallback. Upload/analyze responses
        // remain authoritative if the protected limits route is unavailable.
      });
    return () => { active = false; };
  }, []);

  function chooseFile(file: File | undefined, target: "resume" | "jd") {
    if (!file || busy) return;
    const issue = validateFile(file, inputLimits.maxDocumentBytes);
    setError(issue ?? "");
    setResult(null);
    setAnalysis(null);
    if (issue) {
      if (target === "resume") setResume(null);
      else setJdFile(null);
      return;
    }
    if (target === "resume") setResume(file);
    else setJdFile(file);
  }

  function clearFile(target: "resume" | "jd") {
    if (target === "resume") {
      setResume(null);
      if (resumeInput.current) resumeInput.current.value = "";
    } else {
      setJdFile(null);
      if (jdInput.current) jdInput.current.value = "";
    }
    setResult(null);
    setAnalysis(null);
    setError("");
  }

  async function extract() {
    setError("");
    setResult(null);
    setAnalysis(null);
    if (!resume) return setError("Choose your resume first.");
    if (useJdFile ? !jdFile : !jdText.trim()) {
      return setError(useJdFile ? "Choose a job description file." : "Paste a job description.");
    }
    if (!useJdFile && Array.from(jdText).length > inputLimits.maxPastedJobDescriptionCharacters) {
      return setError(`The job description must be ${inputLimits.maxPastedJobDescriptionCharacters.toLocaleString()} Unicode code points or fewer.`);
    }
    const body = new FormData();
    body.append("resume", resume);
    if (useJdFile && jdFile) body.append("jobDescriptionFile", jdFile);
    else body.append("jobDescriptionText", jdText);

    setBusy(true);
    try {
      const response = await api.post<ApiResponse<ExtractionResult>>("/resumes/extract", body, {
        timeout: 45_000,
        // Let the browser set the multipart boundary.
        headers: { "Content-Type": undefined },
      });
      if (!response.data.success) throw new Error(response.data.error.message);
      setResult(response.data.data);
    } catch (cause) {
      const data = (cause as { response?: { data?: ApiResponse<unknown> } })?.response?.data;
      const message = data && !data.success ? data.error.message : null;
      setError(message || (cause instanceof Error ? cause.message : "Document extraction failed. Try again."));
    } finally {
      setBusy(false);
    }
  }

  async function analyze() {
    setError("");
    setAnalysis(null);
    if (!result) return setError("Extract and preview both documents before analysis.");
    if (!resume) return setError("Choose your resume first.");
    if (!useJdFile && Array.from(jdText).length > inputLimits.maxPastedJobDescriptionCharacters) {
      return setError(`The job description must be ${inputLimits.maxPastedJobDescriptionCharacters.toLocaleString()} Unicode code points or fewer.`);
    }
    const body = new FormData();
    body.append("resume", resume);
    if (useJdFile && jdFile) body.append("jobDescriptionFile", jdFile);
    else if (jdText.trim()) body.append("jobDescriptionText", jdText);
    else return setError("Provide a job description before analysis.");
    setBusy(true);
    try {
      const response = await api.post<ApiResponse<AnalysisResult>>("/resumes/analyze", body, {
        timeout: 45_000,
        headers: { "Content-Type": undefined },
      });
      if (!response.data.success) throw new Error(response.data.error.message);
      setAnalysis(response.data.data);
    } catch (cause) {
      const data = (cause as { response?: { data?: ApiResponse<unknown> } })?.response?.data;
      const message = data && !data.success ? data.error.message : null;
      setError(message || (cause instanceof Error ? cause.message : "Analysis failed. Try again."));
    } finally {
      setBusy(false);
    }
  }

  function renderAtsChecks(title: string, statuses: string[]) {
    const checks = analysis?.atsReadability.checks.filter((check) => statuses.includes(check.status)) ?? [];
    if (checks.length === 0) return null;
    return <div className="mt-4">
      <h5 className="text-[12px] font-semibold text-ink">{title}</h5>
      <ul className="mt-2 space-y-3">
        {checks.map((check) => (
          <li key={check.id} className="rounded-[9px] border border-rule bg-paper p-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><h6 className="text-[12px] font-semibold text-ink">{check.title}</h6><span className={`rounded-full border px-2 py-1 text-[10px] capitalize ${check.status === "issue" ? "border-bad/40 text-bad" : check.status === "warning" ? "border-warn/40 text-warn" : "border-rule text-warm"}`}>{check.status.replaceAll("_", " ")}</span></div>
            <p className="mt-2 text-[11px] text-warm"><strong className="text-ink">Evidence:</strong> {check.evidence}</p>
            <p className="mt-1 text-[11px] leading-5 text-warm">{check.explanation}</p>
            {check.status !== "passed" && <p className="mt-1 text-[11px] text-navy">{check.recommendation}</p>}
          </li>
        ))}
      </ul>
    </div>;
  }

  const match = analysis?.jobMatch;
  const findings = match?.findings ?? [];
  const learningOutcomes = match?.learningOutcomes ?? [];
  const demonstratedCount = findings.filter((finding) => ["demonstrated", "explicit"].includes(finding.evidence.classification)).length;
  const gapFindings = findings.filter((finding) => ["not_found", "insufficient"].includes(finding.evidence.classification));
  const highImpactGaps = findings
    .filter((finding) => finding.requirement.priority === "required" && ["not_found", "insufficient"].includes(finding.evidence.classification))
    .slice(0, 5);
  const unresolvedItems = [
    ...new Map(
      (match?.requirementCoverage.items ?? []).map((item) => [
        `${item.classification}|${(item.sourceExcerpts[0] ?? "").replace(/\s+/g, " ").trim()}`,
        item,
      ]),
    ).values(),
  ];
  const unresolvedGroups = [
    { classification: "unrecognized" as const, title: "Outside the supported vocabulary", items: unresolvedItems.filter((item) => item.classification === "unrecognized") },
    { classification: "ambiguous" as const, title: "Ambiguous wording", items: unresolvedItems.filter((item) => item.classification === "ambiguous") },
  ];
  const totalStatements = match?.requirementCoverage.statementCounts
    ? Object.values(match.requirementCoverage.statementCounts).reduce((total, count) => total + count, 0)
    : 0;

  return (
    <section aria-labelledby="document-intake-title" className="mt-10 rounded-[13px] border border-rule bg-panel p-6 sm:p-8">
      <div className="flex items-start gap-3">
        <div className="rounded-[9px] border border-rule bg-paper-2 p-2.5"><UploadCloud className="h-5 w-5 text-navy" aria-hidden="true" /></div>
        <div>
          <h2 id="document-intake-title" className="text-[18px] font-semibold text-ink">Preview resume and job description</h2>
          <p className="mt-2 max-w-[70ch] text-[12px] leading-6 text-warm">Documents are analyzed in memory for this request only. Job match and ATS readability are separate platform assessments; neither is a hiring prediction.</p>
        </div>
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-2">
        <div>
          <label className="label-caps text-warm" htmlFor="resume-file">Resume (required)</label>
          <input ref={resumeInput} id="resume-file" type="file" accept={ACCEPTED} className="sr-only" onChange={(event) => { chooseFile(event.currentTarget.files?.[0], "resume"); event.currentTarget.value = ""; }} />
          <div
            onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
            onDrop={(event) => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files[0], "resume"); }}
            className={`mt-2 rounded-[10px] border-2 border-dashed p-3 transition-colors ${dragging ? "border-navy bg-navy-wash/30" : "border-rule-strong bg-paper"}`}
          >
            <button type="button" disabled={busy} onClick={() => resumeInput.current?.click()} className="flex min-h-12 w-full items-center gap-3 text-left text-[12px] text-ink focus-visible:outline-2 focus-visible:outline-navy disabled:opacity-60">
              <FileText className="h-4 w-4 shrink-0 text-navy" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{resume?.name ?? `Drop a resume here or choose PDF/DOCX (up to ${(inputLimits.maxDocumentBytes / (1024 * 1024)).toFixed(2)} MB)`}</span>
            </button>
            {resume && <div className="mt-1 flex items-center justify-between gap-2 pl-7 text-[10px] text-warm"><span>{(resume.size / 1024).toFixed(0)} KB · {resume.type || "type checked by file signature"}</span><button type="button" disabled={busy} onClick={() => clearFile("resume")} className="inline-flex items-center gap-1 rounded px-2 py-1 text-warm hover:text-bad disabled:opacity-50" aria-label="Remove resume"><X className="h-3 w-3" aria-hidden="true" />Remove</button></div>}
          </div>
        </div>
        <div>
          <span className="label-caps text-warm">Job description (required)</span>
          <div className="mt-2 flex gap-2" role="group" aria-label="Job description source">
            <button type="button" disabled={busy} aria-pressed={!useJdFile} onClick={() => { setUseJdFile(false); setError(""); setResult(null); setAnalysis(null); }} className={`rounded-[8px] px-3 py-2 text-[11px] disabled:opacity-50 ${!useJdFile ? "bg-navy text-white" : "border border-rule text-warm"}`}>Paste text</button>
            <button type="button" disabled={busy} aria-pressed={useJdFile} onClick={() => { setUseJdFile(true); setError(""); setResult(null); setAnalysis(null); }} className={`rounded-[8px] px-3 py-2 text-[11px] disabled:opacity-50 ${useJdFile ? "bg-navy text-white" : "border border-rule text-warm"}`}>Upload PDF/DOCX</button>
          </div>
          {useJdFile ? (
            <>
              <input ref={jdInput} id="job-description-file" type="file" accept={ACCEPTED} className="sr-only" onChange={(event) => { chooseFile(event.currentTarget.files?.[0], "jd"); event.currentTarget.value = ""; }} />
              <div className="mt-2 flex min-h-14 items-center gap-3 rounded-[10px] border border-rule-strong bg-paper px-4 text-[12px] text-ink">
                <FileText className="h-4 w-4 shrink-0 text-navy" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{jdFile?.name ?? "No job description file selected"}</span>
                <button type="button" disabled={busy} onClick={() => jdInput.current?.click()} className="shrink-0 text-[11px] font-medium text-navy underline underline-offset-2 disabled:opacity-50">{jdFile ? "Replace" : "Choose file"}</button>
                {jdFile && <button type="button" disabled={busy} onClick={() => clearFile("jd")} className="inline-flex shrink-0 items-center gap-1 text-[10px] text-warm hover:text-bad disabled:opacity-50" aria-label="Remove job description file"><X className="h-3.5 w-3.5" aria-hidden="true" />Remove</button>}
              </div>
              {jdFile && <p className="mt-1 text-[10px] text-warm">{(jdFile.size / 1024).toFixed(0)} KB · {jdFile.type || "type checked by file signature"}</p>}
            </>
          ) : (
            <textarea aria-label="Job description text" value={jdText} onChange={(event) => { setJdText(event.target.value); setResult(null); setAnalysis(null); setError(""); }} disabled={busy} rows={5} placeholder="Paste the job description here…" className="mt-2 w-full resize-y rounded-[10px] border border-rule-strong bg-paper p-3 text-[12px] leading-5 text-ink placeholder:text-warm-2 focus:border-navy focus:outline-none disabled:opacity-60" />
          )}
          {!useJdFile && <p className={`mt-1 text-right text-[10px] ${Array.from(jdText).length > inputLimits.maxPastedJobDescriptionCharacters ? "text-bad" : "text-warm"}`}>{Array.from(jdText).length.toLocaleString()} / {inputLimits.maxPastedJobDescriptionCharacters.toLocaleString()} Unicode code points</p>}
        </div>
      </div>

      {error && <p role="alert" className="mt-5 flex items-center gap-2 text-[12px] text-bad"><AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />{error}</p>}
      <button type="button" onClick={extract} disabled={busy} className="btn-base mt-6 h-[42px] rounded-[10px] bg-navy px-5 text-[13px] font-medium text-white hover:bg-navy-dark disabled:cursor-wait disabled:opacity-60">
        {busy ? <><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Extracting…</> : "Extract text for preview"}
      </button>

      {result && <div aria-live="polite" className="mt-8 space-y-5">
        {[result.resume, result.jobDescription].map((document) => (
          <article key={document.kind} className="overflow-hidden rounded-[10px] border border-rule">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule bg-paper-2 px-4 py-3">
              <h3 className="text-[12px] font-semibold text-ink">{document.kind === "resume" ? "Resume" : "Job description"} · {document.format}</h3>
              <span className="flex items-center gap-1.5 text-[10px] text-good"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />{document.characterCount.toLocaleString()} characters extracted</span>
            </div>
            {document.warnings.map((warning, index) => <p key={`${warning.code}-${index}`} className="px-4 pt-3 text-[11px] text-warn">{warning.message}</p>)}
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words p-4 text-[11px] leading-5 text-ink">{document.text}</pre>
          </article>
        ))}
        <p className="text-[10px] text-warm">Preview data is held in this page’s memory and cleared when you leave or refresh.</p>
        <button type="button" onClick={analyze} disabled={busy} className="btn-base h-[42px] rounded-[10px] bg-navy px-5 text-[13px] font-medium text-white hover:bg-navy-dark disabled:cursor-wait disabled:opacity-60">
          {busy ? <><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Analyzing…</> : analysis ? "Analyze again" : "Analyze resume against this job"}
        </button>
      </div>}
      {analysis && <section aria-labelledby="analysis-title" aria-live="polite" className="mt-8 space-y-5">
        <div className="rounded-[12px] border border-rule bg-paper-2 p-5">
          <p className="label-caps text-navy">JD evidence match</p>
          <h3 id="analysis-title" className="mt-2 text-[18px] font-semibold text-ink">{analysis.jobMatch.score === null ? "Job match score unavailable" : `Job match score · ${analysis.jobMatch.score}/100`}</h3>
          {analysis.jobMatch.scoreUnavailableReason && <p className="mt-2 max-w-[70ch] text-[12px] leading-5 text-warm">{analysis.jobMatch.scoreUnavailableReason}</p>}

          <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {[
              ["Requirements evaluated", `${analysis.jobMatch.requirementCoverage.evaluatedRequirementCount}`],
              ["Demonstrated or mentioned", `${demonstratedCount}`],
              ["Missing or insufficient", `${gapFindings.length}`],
              ["Unresolved", `${analysis.jobMatch.requirementCoverage.reviewRequiredCount}`],
              ["Training outcomes excluded", `${learningOutcomes.length}`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[9px] border border-rule bg-panel px-3 py-2">
                <dt className="text-[10px] leading-4 text-warm">{label}</dt>
                <dd className="mt-0.5 text-[16px] font-semibold text-ink">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[10px] leading-5 text-warm">
            {analysis.jobMatch.requirementCoverage.candidateRequirementCount ?? analysis.jobMatch.requirementCoverage.evaluatedRequirementCount} candidate qualification statements identified
            {totalStatements > 0 ? ` across ${totalStatements} analyzed statements` : ""}. {analysis.jobMatch.requirementCoverage.excludedStatementCount ?? 0} headings or informational statements were excluded from scoring.
            These counts are detection results, not a confidence percentage or candidate rating.
          </p>
          <p className="mt-2 text-[10px] text-warm">Rubric {analysis.jobMatch.rubricVersion} · Engine {analysis.jobMatch.engineVersion}{analysis.jobMatch.interpretationVersion ? ` · Interpretation ${analysis.jobMatch.interpretationVersion}` : ""}. This summary describes resume evidence against this job description; it is not an ATS score, hiring prediction, or proficiency assessment.</p>
        </div>

        {analysis.jobMatch.requirementCoverage.status === "partial" && <p role="status" className="rounded-[10px] border border-warn/40 bg-warn/5 px-4 py-3 text-[12px] leading-5 text-ink">
          Some candidate-qualification statements could not be evaluated reliably. They are listed as unresolved below and are not assumed to be met or missing.
        </p>}

        {highImpactGaps.length > 0 && <section aria-labelledby="priority-findings-title" className="rounded-[12px] border border-warn/40 bg-warn/5 p-5">
          <h4 id="priority-findings-title" className="text-[14px] font-semibold text-ink">Most important qualification gaps</h4>
          <p className="mt-2 text-[11px] leading-5 text-warm">Required statements with no clear evidence in this resume. A gap means the evidence was not found here, not that the capability is absent.</p>
          <ul className="mt-3 space-y-3">
            {highImpactGaps.map((finding) => <li key={finding.requirement.id} className="rounded-[9px] border border-rule bg-panel p-3">
              <p className="text-[12px] font-semibold text-ink">{finding.requirement.displayName} <span className="font-normal text-warm">· {finding.requirement.priority} · {finding.evidence.classification.replaceAll("_", " ")}</span></p>
              <p className="mt-1 text-[11px] leading-5 text-warm">{finding.evidence.explanation}</p>
              {finding.requirement.sourceExcerpts[0] && <blockquote className="mt-2 border-l-2 border-navy/30 pl-3 text-[11px] italic text-warm">JD: {finding.requirement.sourceExcerpts[0]}</blockquote>}
            </li>)}
          </ul>
        </section>}

        {analysis.jobMatch.hardEligibilityConcerns.length > 0 && <section aria-labelledby="eligibility-title" className="rounded-[10px] border border-warn/40 bg-warn/5 p-4">
          <h4 id="eligibility-title" className="text-[13px] font-semibold text-ink">Explicit eligibility requirements to review</h4>
          <ul className="mt-3 space-y-3">{analysis.jobMatch.hardEligibilityConcerns.map((finding) => <li key={finding.requirement.id} className="text-[12px] text-ink"><strong>{finding.requirement.displayName}:</strong> {finding.evidence.explanation} {finding.requirement.sourceExcerpts[0] && <span className="text-warm">{finding.requirement.sourceExcerpts[0]}</span>}</li>)}</ul>
        </section>}

        <section aria-labelledby="unresolved-title" className="rounded-[12px] border border-rule bg-panel p-5">
          <h4 id="unresolved-title" className="text-[14px] font-semibold text-ink">Unresolved candidate requirements</h4>
          <p className="mt-2 text-[11px] leading-5 text-warm">
            {analysis.jobMatch.requirementCoverage.unsupportedRequirementCount ?? 0} statement(s) outside the supported vocabulary and {analysis.jobMatch.requirementCoverage.ambiguousRequirementCount ?? 0} ambiguous statement(s).
            These are candidate qualifications, not headings or training outcomes. They are not scored as met or missing.
          </p>
          {unresolvedItems.length === 0
            ? <p className="mt-2 text-[11px] text-warm">No entry-qualification statement was left unresolved. This does not guarantee that every possible requirement was understood.</p>
            : <div className="mt-3 space-y-2">{unresolvedGroups.map((group) => group.items.length > 0 && (
              <details key={group.classification} className="rounded-[9px] border border-rule bg-paper">
                <summary className="cursor-pointer px-3 py-2 text-[12px] font-semibold text-ink">
                  {group.title} <span className="font-normal text-warm">({group.items.length})</span>
                </summary>
                <ul className="space-y-3 px-3 pb-3">
                  {group.items.map((item) => <li key={item.id} className="rounded-[8px] border border-rule bg-panel p-3 text-[11px]">
                    <p className="font-semibold text-ink">{PURPOSE_LABELS[item.purpose ?? "ENTRY_REQUIRED"]} · {item.priority}{item.concepts && item.concepts.length > 0 ? ` · ${item.concepts.join(", ")}` : ""}{item.hardEligibilityConcern ? " · possible mandatory qualification" : ""}</p>
                    <p className="mt-1 leading-5 text-warm">{item.explanation}</p>
                    {item.sectionHeading && <p className="mt-1 text-[10px] text-warm">Section: {item.sectionHeading}</p>}
                    {item.sourceExcerpts.map((excerpt, index) => <blockquote key={`${item.id}-${index}`} className="mt-2 border-l-2 border-navy/30 pl-3 italic text-warm">JD: {excerpt}</blockquote>)}
                  </li>)}
                </ul>
              </details>
            ))}</div>}
        </section>

        <section aria-labelledby="detailed-evidence-title" className="space-y-2">
          <h4 id="detailed-evidence-title" className="text-[14px] font-semibold text-ink">Requirements and resume evidence</h4>
          <p className="text-[11px] leading-5 text-warm">Expand a requirement to see the exact job-description and resume text behind its classification.</p>
          {findings.length === 0
            ? <p className="rounded-[10px] border border-rule bg-panel p-4 text-[12px] text-warm">No requirements could be reliably extracted. Review the job description text and try again.</p>
            : findings.map((finding) => <details key={finding.requirement.id} className="rounded-[10px] border border-rule bg-panel">
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-4 py-3">
                <span className="text-[12px] font-semibold text-ink">{finding.requirement.displayName}{finding.requirement.purpose === "ROLE_RESPONSIBILITY" ? " (role context)" : ""}</span>
                <span className={`rounded-full border px-2 py-1 text-[10px] capitalize ${EVIDENCE_BADGES[finding.evidence.classification] ?? "border-rule text-warm"}`}>{finding.requirement.priority} · {finding.evidence.classification.replaceAll("_", " ")}</span>
              </summary>
              <div className="border-t border-rule px-4 py-3">
                <p className="text-[12px] leading-5 text-warm">{finding.evidence.explanation}</p>
                {finding.requirement.sectionHeading && <p className="mt-2 text-[10px] text-warm">JD section: {finding.requirement.sectionHeading}</p>}
                {finding.requirement.sourceExcerpts.map((excerpt, index) => <blockquote key={`jd-${index}`} className="mt-2 border-l-2 border-navy/30 pl-3 text-[11px] italic text-warm">JD: {excerpt}</blockquote>)}
                {finding.evidence.excerpts.map((excerpt, index) => <blockquote key={`resume-${index}`} className="mt-2 border-l-2 border-good/40 pl-3 text-[11px] text-ink">Resume · {excerpt.section}: {excerpt.text}</blockquote>)}
                {finding.requirement.purpose === "ROLE_RESPONSIBILITY" && <p className="mt-2 text-[10px] leading-5 text-warm">This comes from an assigned responsibility. It is kept for role context and is not counted as a pre-entry qualification gap.</p>}
                {(finding.evidence.classification === "not_found" || finding.evidence.classification === "related" || finding.evidence.classification === "insufficient") && <p className="mt-2 text-[11px] leading-5 text-navy">{finding.suggestion}</p>}
              </div>
            </details>)}
        </section>

        {learningOutcomes.length > 0 && <details className="rounded-[12px] border border-rule bg-panel">
          <summary className="cursor-pointer px-5 py-4 text-[13px] font-semibold text-ink">
            Training and learning outcomes excluded from scoring <span className="font-normal text-warm">({learningOutcomes.length})</span>
          </summary>
          <div className="border-t border-rule px-5 py-4">
            <p className="text-[11px] leading-5 text-warm">These statements describe what a program, role, or onboarding will teach. They are listed for transparency and are never treated as mandatory pre-entry skills.</p>
            <ul className="mt-3 space-y-3">{learningOutcomes.map((outcome) => <li key={outcome.id} className="rounded-[9px] border border-rule bg-paper p-3">
              <blockquote className="text-[11px] italic text-warm">JD: {outcome.excerpt}</blockquote>
              {outcome.concepts.length > 0 && <p className="mt-1 text-[11px] text-ink">Recognized concepts: {outcome.concepts.join(", ")}</p>}
              {outcome.sectionHeading && <p className="mt-1 text-[10px] text-warm">Section: {outcome.sectionHeading}</p>}
            </li>)}</ul>
          </div>
        </details>}

        <details className="rounded-[12px] border border-rule bg-panel">
          <summary className="cursor-pointer px-5 py-4">
            <span className="label-caps text-navy">Document inspection</span>
            <span className="mt-1 block text-[17px] font-semibold text-ink">ATS Readability Assessment</span>
            <span className="mt-1 block text-[11px] text-warm">Expand for parser-supported findings, checks not performed, and why no numeric ATS score is provided.</span>
          </summary>
          <div className="border-t border-rule p-5">
            <p className="text-[12px] text-ink">{analysis.atsReadability.qualitativeSummary === "text_extracted" ? "Readable text was extracted; this does not confirm visual layout or ATS compatibility." : analysis.atsReadability.qualitativeSummary === "text_extracted_with_findings" ? "Text was extracted with document inspection findings to review." : "There is not enough extracted text to assess readability."}</p>
            <p className="mt-2 text-[11px] text-warm">Inspection coverage: {analysis.atsReadability.coveragePercent}% · {analysis.atsReadability.status} inspection · rubric {analysis.atsReadability.rubricVersion}. Coverage describes available parser checks, not document quality.</p>
            <p role="status" className="mt-2 text-[11px] text-warn">No numeric ATS score is provided. {analysis.atsReadability.scoreUnavailableReason}</p>
            <p className="mt-2 text-[11px] text-warm">This platform-defined assessment is not an official employer ATS score or a hiring prediction.</p>
            {renderAtsChecks("Confirmed extraction findings", ["issue"])}
            {renderAtsChecks("Warnings to review", ["warning"])}
            {renderAtsChecks("Checks not performed", ["not_evaluated"])}
            {renderAtsChecks("Checks completed without a finding", ["passed"])}
            <ul className="mt-4 list-disc space-y-1 pl-5 text-[10px] leading-5 text-warm">{analysis.atsReadability.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul>
          </div>
        </details>

        <ul className="list-disc space-y-1 pl-5 text-[10px] leading-5 text-warm">{analysis.jobMatch.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul>
        <p className="text-[10px] text-warm">Analysis is not saved and is cleared when you leave or refresh.</p>
      </section>}
    </section>
  );
}
