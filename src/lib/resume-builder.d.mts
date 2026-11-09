import type { JobMatchResult } from "./resume-analysis.mjs";

export type SectionKey =
  | "summary"
  | "education"
  | "experience"
  | "projects"
  | "skills"
  | "certifications"
  | "sections";

export type PageSize = "A4" | "LETTER";

export interface ResumeContact {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  links: string[];
}

export interface EducationItem {
  institution: string;
  degree: string;
  field: string;
  start: string;
  end: string;
  notes: string;
}

export interface ExperienceItem {
  title: string;
  company: string;
  location: string;
  start: string;
  end: string;
  bullets: string[];
}

export interface ProjectItem {
  name: string;
  description: string;
  url: string;
  technologies: string[];
}

export interface ExtraSectionItem {
  title: string;
  lines: string[];
}

export interface ResumeLayout {
  pageSize: PageSize;
  sectionOrder: SectionKey[];
}

/** The editable document. Every field is present, so inputs are controlled. */
export interface ResumeDocument {
  contact: ResumeContact;
  summary: string;
  education: EducationItem[];
  experience: ExperienceItem[];
  projects: ProjectItem[];
  skills: string[];
  certifications: string[];
  sections: ExtraSectionItem[];
  layout: ResumeLayout;
}

/** The exact `content` payload for a library create/save request. */
export interface ResumeContentPayload {
  contact?: Partial<ResumeContact>;
  summary?: string;
  education: Array<Partial<EducationItem>>;
  experience: Array<Partial<ExperienceItem> & { bullets: string[] }>;
  projects: Array<Partial<ProjectItem> & { technologies: string[] }>;
  skills: string[];
  certifications: string[];
  sections: ExtraSectionItem[];
  layout: ResumeLayout;
}

export interface DocumentError {
  path: string;
  message: string;
}

export interface DocumentValidation {
  ok: boolean;
  errors: DocumentError[];
  content: ResumeContentPayload;
}

export interface DocumentStats {
  education: number;
  experience: number;
  projects: number;
  skills: number;
  certifications: number;
  sections: number;
  words: number;
}

export declare const SECTION_KEYS: readonly SectionKey[];
export declare const SECTION_LABELS: Record<SectionKey, string>;
export declare const PAGE_SIZES: readonly PageSize[];
export declare const PAGE_DIMENSIONS: Record<
  PageSize,
  { width: number; height: number; label: string }
>;
export declare const DOCUMENT_LIMITS: {
  contactField: number;
  email: number;
  phone: number;
  links: number;
  summary: number;
  education: number;
  experience: number;
  bulletsPerExperience: number;
  projects: number;
  skills: number;
  skill: number;
  certifications: number;
  certification: number;
  sections: number;
  linesPerSection: number;
  sectionTitle: number;
  entryField: number;
  bullet: number;
  contentBytes: number;
};

export function emptyResumeDocument(): ResumeDocument;
export function normalizeResumeDocument(value?: unknown): ResumeDocument;
export function newEducationItem(): EducationItem;
export function newExperienceItem(): ExperienceItem;
export function newProjectItem(): ProjectItem;
export function newSection(): ExtraSectionItem;
export function moveInList<T>(list: readonly T[] | null | undefined, index: number, delta: number): T[];
export function updateListItem<T extends object>(
  list: readonly T[] | null | undefined,
  index: number,
  patch: Partial<T>,
): T[];
export function replaceInList<T>(list: readonly T[] | null | undefined, index: number, value: T): T[];
export function removeListItem<T>(list: readonly T[] | null | undefined, index: number): T[];
export function appendListItem<T>(list: readonly T[] | null | undefined, item: T): T[];
export function orderedSections(document: ResumeDocument | unknown): SectionKey[];
export function moveSection(document: ResumeDocument, key: SectionKey, delta: number): ResumeDocument;
export function validateResumeDocument(value: unknown): DocumentValidation;
export function documentToContent(document: unknown): ResumeContentPayload;
export function documentFingerprint(document: unknown): string;
export function documentStats(document: unknown): DocumentStats;
export function slugifyFileName(name?: string | null): string;
export function skillsFromEvidence(match?: JobMatchResult | null): string[];
export function roleLabelFromMatch(match?: JobMatchResult | null): string;
