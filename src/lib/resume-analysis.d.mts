export type StatementPurpose =
  | "ENTRY_REQUIRED"
  | "ENTRY_PREFERRED"
  | "ROLE_RESPONSIBILITY"
  | "TRAINING_OUTCOME"
  | "SECTION_HEADING"
  | "INFORMATIONAL"
  | "AMBIGUOUS_REQUIREMENT";

export type RequirementPriority = "required" | "preferred" | "unspecified";

export interface SourceExcerpt {
  section: string;
  text: string;
}

export interface RequirementFinding {
  requirement: {
    id: string;
    category: string;
    displayName: string;
    priority: RequirementPriority | string;
    sourceExcerpts: string[];
    purpose?: StatementPurpose;
    sectionHeading?: string;
    uncertain?: boolean;
  };
  evidence: {
    classification: string;
    excerpts: SourceExcerpt[];
    explanation: string;
  };
  suggestion: string;
}

export interface RequirementReviewItem {
  id: string;
  classification: "unrecognized" | "ambiguous";
  priority: RequirementPriority | string;
  sourceExcerpts: string[];
  explanation: string;
  hardEligibilityConcern: boolean;
  purpose?: StatementPurpose;
  concepts?: string[];
  sectionHeading?: string;
}

export interface RequirementStatementCounts {
  entryRequired: number;
  entryPreferred: number;
  roleResponsibility: number;
  trainingOutcome: number;
  sectionHeading: number;
  informational: number;
  ambiguousRequirement: number;
}

export interface LearningOutcome {
  id: string;
  excerpt: string;
  concepts: string[];
  conceptIds?: string[];
  sectionHeading?: string;
}

export interface RoleScope {
  mode: "single" | "selected";
  positionStatus?: "identified" | "no_title" | "selected";
  detectedRoleCount: number;
  selectedRole: { id: string; title: string; index: number; confidence: "high" | "low" } | null;
  ambiguous: boolean;
  includedStatementCount: number;
  excludedStatementCount: number;
  excludedOtherRoleEntryStatements: number;
  sharedStatementsApplied: number;
  sharedStatementsExcluded: number;
  inheritanceRule: string;
}

export interface JobMatchResult {
  engineVersion: string;
  taxonomyVersion?: string;
  rubricVersion: string;
  coveragePolicyVersion?: string;
  interpretationVersion?: string;
  roleSegmentationVersion?: string;
  roleScope?: RoleScope;
  score: number | null;
  scoreUnavailableReason?: string;
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
    statementCounts?: RequirementStatementCounts;
  };
  requirements?: RequirementFinding["requirement"][];
  findings: RequirementFinding[];
  matchedSkills?: RequirementFinding[];
  partiallySupportedSkills?: RequirementFinding[];
  requirementsNotDemonstrated?: RequirementFinding[];
  preferredSkillGaps?: RequirementFinding[];
  hardEligibilityConcerns: RequirementFinding[];
  learningOutcomes?: LearningOutcome[];
  limitations: string[];
}

export interface AtsCheck {
  id: string;
  title: string;
  status: "passed" | "issue" | "warning" | "not_evaluated";
  severity: string;
  evidence: string;
  explanation: string;
  recommendation: string;
}

export interface AtsReadability {
  assessmentVersion: string;
  rubricVersion: string;
  status: "partial" | "insufficient";
  score: null;
  qualitativeSummary: "text_extracted" | "text_extracted_with_findings" | "insufficient_evidence";
  coveragePercent: number;
  scoreUnavailableReason?: string;
  checks: AtsCheck[];
  limitations: string[];
}

export interface RoleCandidate {
  id: string;
  title: string;
  index: number;
  excerpt: string;
  confidence: "high" | "low";
  requirementHintCount: number;
  selectable?: boolean;
}

export type StructuralUncertainty = "none" | "possible_multiple" | "unreliable_boundaries";

export interface RoleSelection {
  version: string;
  required: true;
  ambiguous: boolean;
  uncertainty?: StructuralUncertainty;
  signals?: string[];
  detectedRoleCount: number;
  truncated: boolean;
  canAnalyze?: boolean;
  guidance: string;
  roles: RoleCandidate[];
  shared: {
    excerpt: string;
    entryHintCount: number;
    globalHeading: boolean;
    note: string;
  } | null;
}

export interface ResumeAnalysisPayload {
  jobMatch: JobMatchResult;
  atsReadability: AtsReadability;
  roleSelection?: RoleSelection;
}

export interface AnalyzeResponse {
  jobMatch: JobMatchResult | null;
  atsReadability: AtsReadability;
  roleSelection?: RoleSelection;
}

export type EvidenceGroupKey =
  | "demonstrated"
  | "mentioned"
  | "partial"
  | "not_demonstrated"
  | "not_evaluated";

export type EvidenceRowKind = "finding" | "review";

export interface EvidenceRow {
  key: string;
  kind: EvidenceRowKind;
  id: string;
  title: string;
  category: string;
  priority: string;
  purpose?: StatementPurpose;
  sectionHeading?: string;
  classification: string;
  state: EvidenceGroupKey;
  stateLabel: string;
  explanation: string;
  jdExcerpts: string[];
  resumeExcerpts: SourceExcerpt[];
  suggestion: string;
  concepts: string[];
  hardEligibilityConcern: boolean;
  roleContext: boolean;
  searchText: string;
}

export interface EvidenceGroup {
  key: EvidenceGroupKey;
  label: string;
  description: string;
  rows: EvidenceRow[];
}

export interface AnalysisSummary {
  evaluated: number;
  demonstratedOrMentioned: number;
  missing: number;
  unresolved: number;
  trainingExcluded: number;
  totalRows: number;
}

export interface PrincipalIssue {
  key: string;
  kind: EvidenceRowKind;
  state: EvidenceGroupKey;
  title: string;
  priority: string;
  reason: string;
  excerpt?: string;
  hardEligibilityConcern: boolean;
}

export interface FocusRequest {
  key: string | null;
  state: string;
  seq: number;
}

export interface ParserCheckGroup {
  key: string;
  explanation: string;
  recommendation: string;
  checks: AtsCheck[];
}

export interface AtsCheckGroups {
  confirmed: AtsCheck[];
  warnings: AtsCheck[];
  passed: AtsCheck[];
  unsupported: AtsCheck[];
  unsupportedGroups: ParserCheckGroup[];
}

export interface EvidenceQuery {
  query?: string;
  state?: string;
}

export interface ScoreDisplay {
  available: boolean;
  value: number | null;
  reason: string | null;
}

export declare const EVIDENCE_GROUPS: ReadonlyArray<{
  key: EvidenceGroupKey;
  label: string;
  description: string;
}>;

export declare const EVIDENCE_CLASSIFICATION_LABELS: Record<string, string>;

export function evidenceGroupForClassification(classification: string): EvidenceGroupKey;
export function buildEvidenceRows(match: JobMatchResult | null | undefined): EvidenceRow[];
export function groupEvidenceRows(rows: EvidenceRow[]): EvidenceGroup[];
export function buildAnalysisSummary(
  match: JobMatchResult | null | undefined,
  rows?: EvidenceRow[],
): AnalysisSummary;
export function selectPrincipalIssue(
  match: JobMatchResult | null | undefined,
  rows?: EvidenceRow[],
): PrincipalIssue | null;
export function filterEvidenceGroups(
  groups: EvidenceGroup[],
  options?: EvidenceQuery,
): EvidenceGroup[];
export function groupAtsChecks(checks?: AtsCheck[] | null): AtsCheckGroups;
export function uniqueStrings(values?: string[] | null): string[];
export function scoreDisplay(score: number | null | undefined, reason?: string | null): ScoreDisplay;
export function matchStatusCopy(status?: string): string;
