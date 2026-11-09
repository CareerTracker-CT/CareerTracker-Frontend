/** Request/response shapes used by the document intake and extraction steps. */

export type ExtractedDocument = {
  kind: "resume" | "jobDescription";
  format: "PDF" | "DOCX" | "PASTED_TEXT";
  text: string;
  characterCount: number;
  status: "EXTRACTED" | "EXTRACTED_WITH_WARNINGS";
  warnings: { code: string; message: string }[];
};

export type ExtractionResult = {
  resume: ExtractedDocument;
  jobDescription: ExtractedDocument;
};

export type ExtractionLimits = {
  maxDocumentBytes: number;
  maxPastedJobDescriptionCharacters: number;
};

/** Protocol maxima used only until GET /resumes/limits answers. */
export const MAX_BYTES = 5 * 1024 * 1024;
export const MAX_PASTED_JD_CHARACTERS = 40_000;

export const ACCEPTED_DOCUMENTS =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type EvidenceTarget = { key?: string | null; state?: string };
export type OpenEvidence = (target?: EvidenceTarget) => void;

/** Result of the explicit "create a role-specific copy" handoff. */
export type EvidenceCopyState = {
  busy: boolean;
  error: string | null;
  created: { id: string; name: string } | null;
};
