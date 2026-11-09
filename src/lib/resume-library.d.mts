export interface ResumeContentV1 {
  contact?: {
    fullName?: string;
    email?: string;
    phone?: string;
    location?: string;
    headline?: string;
    links?: string[];
  };
  summary?: string;
  education: Array<Record<string, string>>;
  experience: Array<Record<string, string | string[]>>;
  projects: Array<Record<string, string | string[]>>;
  skills: string[];
  certifications: string[];
  sections: Array<{ title: string; lines: string[] }>;
}

export interface ResumeLibraryRecord {
  id: string;
  name: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  targetRoleLabel: string | null;
  versionCount: number;
  currentVersionNumber: number;
  contentSchemaVersion: number | null;
}

export interface ResumeLibraryDetail extends ResumeLibraryRecord {
  content: ResumeContentV1 | null;
}

export interface ResumeVersionSummary {
  id: string;
  versionNumber: number;
  contentSchemaVersion: number;
  targetRoleLabel: string | null;
  createdAt: string;
}

export interface ResumeVersionDetail extends ResumeVersionSummary {
  content: ResumeContentV1;
}

export interface LibraryLimits {
  name: number;
  roleLabel: number;
  summary: number;
  skill: number;
  maxSkills: number;
}

export interface LibraryDraftInput {
  name?: string;
  roleLabel?: string;
  summary?: string;
  skillsText?: string;
}

export interface LibraryDraftValue {
  name: string;
  roleLabel: string;
  summary: string;
  skills: string[];
}

export interface LibraryDraftValidation {
  ok: boolean;
  errors: Partial<Record<"name" | "roleLabel" | "summary" | "skills", string>>;
  value: LibraryDraftValue;
}

export interface ContentSummary {
  hasContact: boolean;
  hasSummary: boolean;
  education: number;
  experience: number;
  projects: number;
  skills: number;
  certifications: number;
  sections: number;
}

export interface LibraryErrorDescription {
  code: string | null;
  message: string;
  status: number | null;
  isConflict: boolean;
  isNotFound: boolean;
  currentRevision: number | null;
  currentVersionNumber: number | null;
}

export declare const LIBRARY_LIMITS: LibraryLimits;

export function emptyLibraryContent(): ResumeContentV1;
export function parseSkills(text?: string | null): string[];
export function validateLibraryDraft(draft?: LibraryDraftInput | null): LibraryDraftValidation;
export function applyDraftToContent(
  baseContent: ResumeContentV1 | null | undefined,
  draft: { summary?: string; skills?: string[] } | null | undefined,
): ResumeContentV1;
export function summarizeContent(content: ResumeContentV1 | null | undefined): ContentSummary;
export function formatVersionLabel(versionNumber: number): string;
export function sortVersionsDesc(versions?: ResumeVersionSummary[] | null): ResumeVersionSummary[];
export function describeResumeLibraryError(error: unknown): LibraryErrorDescription;
