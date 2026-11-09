/**
 * Pure view-model helpers for the RES-003A private resume library.
 *
 * These functions never call the API, never write state and never invent
 * data. They mirror the server's content bounds (so the UI can flag invalid
 * input before sending it), build version payloads from the edit form, and
 * translate the API's stable error codes into user-facing copy. They are
 * unit-tested with node --test like resume-analysis.mjs.
 */

export const LIBRARY_LIMITS = {
  name: 120,
  roleLabel: 120,
  summary: 4000,
  skill: 80,
  maxSkills: 120,
};

/** A blank structured document (schema v1) ready for the edit form. */
export function emptyLibraryContent() {
  return {
    education: [],
    experience: [],
    projects: [],
    skills: [],
    certifications: [],
    sections: [],
  };
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

/** "TypeScript, Node.js\nReact" -> ["TypeScript", "Node.js", "React"]. */
export function parseSkills(text) {
  const seen = new Set();
  const skills = [];
  for (const part of String(text ?? "").split(/[,\n]/)) {
    const skill = part.trim();
    if (!skill || seen.has(skill.toLowerCase())) continue;
    seen.add(skill.toLowerCase());
    skills.push(skill);
  }
  return skills;
}

/**
 * Validate the create/edit form against the same bounds the server enforces.
 * Returns per-field messages so the UI can mark fields without a round trip;
 * the server still re-validates everything.
 */
export function validateLibraryDraft(draft) {
  const input = asObject(draft);
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const roleLabel = typeof input.roleLabel === "string" ? input.roleLabel.trim() : "";
  const summary = typeof input.summary === "string" ? input.summary.trim() : "";
  const skills = parseSkills(input.skillsText);
  const errors = {};

  if (!name) errors.name = "Give this resume a name.";
  else if (name.length > LIBRARY_LIMITS.name) {
    errors.name = `Names are limited to ${LIBRARY_LIMITS.name} characters.`;
  }
  if (roleLabel.length > LIBRARY_LIMITS.roleLabel) {
    errors.roleLabel = `Target roles are limited to ${LIBRARY_LIMITS.roleLabel} characters.`;
  }
  if (summary.length > LIBRARY_LIMITS.summary) {
    errors.summary = `Summaries are limited to ${LIBRARY_LIMITS.summary} characters.`;
  }
  if (skills.length > LIBRARY_LIMITS.maxSkills) {
    errors.skills = `Keep the skills list at ${LIBRARY_LIMITS.maxSkills} items or fewer.`;
  }
  const tooLong = skills.find((skill) => skill.length > LIBRARY_LIMITS.skill);
  if (tooLong) {
    errors.skills = `Each skill must be under ${LIBRARY_LIMITS.skill} characters.`;
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value: { name, roleLabel, summary, skills },
  };
}

/**
 * Build the version payload from the edit form, preserving every section of
 * the loaded document that the form does not edit. The summary is replaced
 * (empty clears it); skills are replaced wholesale.
 */
export function applyDraftToContent(baseContent, draft) {
  const base = asObject(baseContent);
  const summary = typeof draft?.summary === "string" ? draft.summary.trim() : "";
  const skills = asArray(draft?.skills);
  const content = {
    ...(base.contact ? { contact: base.contact } : {}),
    ...(summary ? { summary } : {}),
    education: asArray(base.education),
    experience: asArray(base.experience),
    projects: asArray(base.projects),
    skills,
    certifications: asArray(base.certifications),
    sections: asArray(base.sections),
  };
  return content;
}

/** Counts of the sections a version contains, for metadata display. */
export function summarizeContent(content) {
  const value = asObject(content);
  return {
    hasContact: Boolean(value.contact && typeof value.contact === "object"),
    hasSummary: typeof value.summary === "string" && value.summary.trim().length > 0,
    education: asArray(value.education).length,
    experience: asArray(value.experience).length,
    projects: asArray(value.projects).length,
    skills: asArray(value.skills).length,
    certifications: asArray(value.certifications).length,
    sections: asArray(value.sections).length,
  };
}

/** "Version 3" — the single label used everywhere a version is shown. */
export function formatVersionLabel(versionNumber) {
  return `Version ${versionNumber}`;
}

/** Newest first; tolerates missing/partial rows without throwing. */
export function sortVersionsDesc(versions) {
  return asArray(versions)
    .filter((version) => version && Number.isInteger(version.versionNumber))
    .slice()
    .sort((a, b) => b.versionNumber - a.versionNumber);
}

const ERROR_COPY = {
  RESUME_EDIT_CONFLICT:
    "This resume was changed since you opened it. Reload the latest version before saving again.",
  RESUME_NOT_FOUND: "That resume could not be found.",
  RESUME_VERSION_NOT_FOUND: "That resume version could not be found.",
  RESUME_VERSION_INVALID: "That version number is not valid.",
  RESUME_LIMIT_REACHED: "Your resume library is full. Delete a resume to save another.",
  RESUME_VERSION_LIMIT_REACHED: "This resume already has the maximum number of versions.",
  RESUME_NAME_INVALID: "Give this resume a name.",
  RESUME_CONTENT_INVALID: "That resume content could not be saved. Check the fields and try again.",
  RESUME_CONTENT_TOO_LARGE: "That resume is too large to save.",
};

function readApiError(error) {
  const response = asObject(error?.response);
  const data = asObject(response.data);
  const apiError = asObject(data.error);
  const details = asObject(apiError.details);
  return {
    status: Number(response.status),
    code: typeof details.code === "string" ? details.code : null,
    message: typeof apiError.message === "string" && apiError.message ? apiError.message : null,
    currentRevision: Number.isInteger(details.currentRevision) ? details.currentRevision : null,
    currentVersionNumber: Number.isInteger(details.currentVersionNumber)
      ? details.currentVersionNumber
      : null,
  };
}

/**
 * Translate any request failure into stable copy. Known library codes get
 * tailored messages; unknown server messages are shown as-is only when they
 * exist, otherwise a generic line is used. Never leaks internals.
 */
export function describeResumeLibraryError(error) {
  const api = readApiError(error);
  const code = api.code;
  const message =
    (code && ERROR_COPY[code]) ||
    api.message ||
    "Your resume library is unavailable right now. Please try again.";
  return {
    code,
    message,
    status: Number.isFinite(api.status) && api.status > 0 ? api.status : null,
    isConflict: code === "RESUME_EDIT_CONFLICT",
    isNotFound: code === "RESUME_NOT_FOUND" || code === "RESUME_VERSION_NOT_FOUND",
    currentRevision: api.currentRevision,
    currentVersionNumber: api.currentVersionNumber,
  };
}
