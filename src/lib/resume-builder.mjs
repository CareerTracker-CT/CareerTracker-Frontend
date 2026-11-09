/**
 * Structured resume document model (content schema v2) for the resume builder.
 *
 * These helpers are pure: no API calls, no DOM, no state. They normalise a
 * stored version into an editable document, apply immutable list edits, mirror
 * the server's content bounds for early feedback, and produce the exact
 * payload `POST /resumes/library/:id/versions` expects.
 *
 * The document body is unchanged from schema v1. Schema v2 only adds an
 * optional `layout` object (`pageSize`, `sectionOrder`), so v1 versions open
 * with default layout values and nothing is lost.
 */

import { buildEvidenceRows } from "./resume-analysis.mjs";

export const SECTION_KEYS = [
  "summary",
  "education",
  "experience",
  "projects",
  "skills",
  "certifications",
  "sections",
];

export const SECTION_LABELS = {
  summary: "Summary",
  education: "Education",
  experience: "Experience",
  projects: "Projects",
  skills: "Skills",
  certifications: "Certifications",
  sections: "Additional sections",
};

export const PAGE_SIZES = ["A4", "LETTER"];

/** Point dimensions (1pt = 1/72in) used by the preview and the PDF writer. */
export const PAGE_DIMENSIONS = {
  A4: { width: 595.28, height: 841.89, label: "A4 · 210 × 297 mm" },
  LETTER: { width: 612, height: 792, label: "US Letter · 8.5 × 11 in" },
};

/** Mirrors resume-content.validator.ts so the UI can fail fast. */
export const DOCUMENT_LIMITS = {
  contactField: 200,
  email: 190,
  phone: 40,
  links: 10,
  summary: 4000,
  education: 20,
  experience: 20,
  bulletsPerExperience: 20,
  projects: 30,
  skills: 120,
  skill: 80,
  certifications: 30,
  certification: 200,
  sections: 12,
  linesPerSection: 30,
  sectionTitle: 120,
  entryField: 200,
  bullet: 1000,
  contentBytes: 64 * 1024,
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function text(value) {
  return typeof value === "string" ? value : "";
}

function textList(value) {
  return asArray(value).map((item) => (typeof item === "string" ? item : ""));
}

function uniqueStrings(list) {
  const seen = new Set();
  const result = [];
  for (const item of list) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

/** A blank document with every array present and a complete default order. */
export function emptyResumeDocument() {
  return {
    contact: {},
    summary: "",
    education: [],
    experience: [],
    projects: [],
    skills: [],
    certifications: [],
    sections: [],
    layout: { pageSize: "A4", sectionOrder: [...SECTION_KEYS] },
  };
}

/**
 * Coerce a stored version (v1 or v2, complete or partial) into the editable
 * shape. Unknown keys are dropped because the server rejects them; known
 * values are preserved verbatim, including blank in-progress entries.
 */
export function normalizeResumeDocument(value) {
  const input = asObject(value);
  const contact = asObject(input.contact);
  const layout = asObject(input.layout);
  const order = uniqueStrings(
    asArray(layout.sectionOrder).filter(
      (key) => typeof key === "string" && SECTION_KEYS.includes(key),
    ),
  );
  return {
    contact: {
      fullName: text(contact.fullName),
      headline: text(contact.headline),
      email: text(contact.email),
      phone: text(contact.phone),
      location: text(contact.location),
      links: textList(contact.links),
    },
    summary: text(input.summary),
    education: asArray(input.education).map((entry) => {
      const item = asObject(entry);
      return {
        institution: text(item.institution),
        degree: text(item.degree),
        field: text(item.field),
        start: text(item.start),
        end: text(item.end),
        notes: text(item.notes),
      };
    }),
    experience: asArray(input.experience).map((entry) => {
      const item = asObject(entry);
      return {
        title: text(item.title),
        company: text(item.company),
        location: text(item.location),
        start: text(item.start),
        end: text(item.end),
        bullets: textList(item.bullets),
      };
    }),
    projects: asArray(input.projects).map((entry) => {
      const item = asObject(entry);
      return {
        name: text(item.name),
        description: text(item.description),
        url: text(item.url),
        technologies: textList(item.technologies),
      };
    }),
    skills: textList(input.skills),
    certifications: textList(input.certifications),
    sections: asArray(input.sections).map((entry) => {
      const item = asObject(entry);
      return { title: text(item.title), lines: textList(item.lines) };
    }),
    layout: {
      pageSize: PAGE_SIZES.includes(layout.pageSize) ? layout.pageSize : "A4",
      sectionOrder: order.length > 0 ? order : [...SECTION_KEYS],
    },
  };
}

export function newEducationItem() {
  return { institution: "", degree: "", field: "", start: "", end: "", notes: "" };
}

export function newExperienceItem() {
  return { title: "", company: "", location: "", start: "", end: "", bullets: [""] };
}

export function newProjectItem() {
  return { name: "", description: "", url: "", technologies: [] };
}

export function newSection() {
  return { title: "", lines: [""] };
}

/** Immutable list helpers: every editor action returns a new array. */
export function moveInList(list, index, delta) {
  const items = asArray(list);
  const target = index + delta;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) {
    return items;
  }
  const next = items.slice();
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved);
  return next;
}

export function updateListItem(list, index, patch) {
  return asArray(list).map((item, position) =>
    position === index ? { ...asObject(item), ...asObject(patch) } : item,
  );
}

export function replaceInList(list, index, value) {
  return asArray(list).map((item, position) => (position === index ? value : item));
}

export function removeListItem(list, index) {
  return asArray(list).filter((_item, position) => position !== index);
}

export function appendListItem(list, item) {
  return [...asArray(list), item];
}

/** Section keys in rendering order, with any unlisted keys appended. */
export function orderedSections(document) {
  const doc = normalizeResumeDocument(document);
  const listed = doc.layout.sectionOrder.filter((key) => SECTION_KEYS.includes(key));
  return [...listed, ...SECTION_KEYS.filter((key) => !listed.includes(key))];
}

/** Move one section up/down in the saved order. */
export function moveSection(document, key, delta) {
  const doc = normalizeResumeDocument(document);
  const order = orderedSections(doc);
  const index = order.indexOf(key);
  const moved = moveInList(order, index, delta);
  return { ...doc, layout: { ...doc.layout, sectionOrder: moved } };
}

const isBlank = (value) => text(value).trim().length === 0;

function cleanEntry(entry, listKeys) {
  const result = {};
  for (const [key, value] of Object.entries(entry)) {
    if (listKeys.has(key)) {
      result[key] = textList(value)
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
      continue;
    }
    const trimmed = text(value).trim();
    if (trimmed) result[key] = trimmed;
  }
  return result;
}

/**
 * Apply the server's rules to the editor document.
 *
 * Completely blank entries are dropped (an empty row is an unfinished thought,
 * not invalid data). Partly filled entries must satisfy their required field,
 * which is reported by `path` so the form can focus the exact input.
 */
export function validateResumeDocument(value) {
  const doc = normalizeResumeDocument(value);
  const errors = [];
  const push = (path, message) => errors.push({ path, message });

  const contact = doc.contact;
  for (const [key, max] of [
    ["fullName", DOCUMENT_LIMITS.contactField],
    ["headline", DOCUMENT_LIMITS.contactField],
    ["location", DOCUMENT_LIMITS.contactField],
  ]) {
    if (contact[key].trim().length > max) {
      push(`contact.${key}`, `Keep this under ${max} characters.`);
    }
  }
  if (contact.phone.trim().length > DOCUMENT_LIMITS.phone) {
    push("contact.phone", `Keep the phone number under ${DOCUMENT_LIMITS.phone} characters.`);
  }
  if (contact.email.trim().length > DOCUMENT_LIMITS.email) {
    push("contact.email", `Keep the email under ${DOCUMENT_LIMITS.email} characters.`);
  }
  if (contact.email.trim() && !EMAIL.test(contact.email.trim())) {
    push("contact.email", "This email address is not valid.");
  }
  const links = contact.links.map((link) => link.trim()).filter(Boolean);
  if (links.length > DOCUMENT_LIMITS.links) {
    push("contact.links", `Keep at most ${DOCUMENT_LIMITS.links} links.`);
  }
  if (links.some((link) => link.length > DOCUMENT_LIMITS.contactField)) {
    push("contact.links", `Each link must be under ${DOCUMENT_LIMITS.contactField} characters.`);
  }

  if (doc.summary.trim().length > DOCUMENT_LIMITS.summary) {
    push("summary", `The summary must be under ${DOCUMENT_LIMITS.summary} characters.`);
  }

  const education = doc.education.filter((entry) => Object.values(entry).some((value) => !isBlank(value)));
  if (education.length > DOCUMENT_LIMITS.education) {
    push("education", `Keep at most ${DOCUMENT_LIMITS.education} education entries.`);
  }
  education.forEach((entry, index) => {
    const label = `Education ${index + 1}`;
    if (isBlank(entry.institution)) {
      push(`education.${index}.institution`, `${label} needs a school or institution.`);
    }
    for (const key of ["institution", "degree", "field", "start", "end"]) {
      if (entry[key].trim().length > DOCUMENT_LIMITS.entryField) {
        push(`education.${index}.${key}`, `${label}: keep this under ${DOCUMENT_LIMITS.entryField} characters.`);
      }
    }
    if (entry.notes.trim().length > DOCUMENT_LIMITS.bullet) {
      push(`education.${index}.notes`, `${label}: notes must be under ${DOCUMENT_LIMITS.bullet} characters.`);
    }
  });

  const experience = doc.experience.filter(
    (entry) => Object.values(entry).some((value) => (Array.isArray(value) ? value.some((item) => !isBlank(item)) : !isBlank(value))),
  );
  if (experience.length > DOCUMENT_LIMITS.experience) {
    push("experience", `Keep at most ${DOCUMENT_LIMITS.experience} experience entries.`);
  }
  experience.forEach((entry, index) => {
    const label = `Experience ${index + 1}`;
    if (isBlank(entry.title)) {
      push(`experience.${index}.title`, `${label} needs a job title.`);
    }
    for (const key of ["title", "company", "location", "start", "end"]) {
      if (entry[key].trim().length > DOCUMENT_LIMITS.entryField) {
        push(`experience.${index}.${key}`, `${label}: keep this under ${DOCUMENT_LIMITS.entryField} characters.`);
      }
    }
    const bullets = entry.bullets.filter((bullet) => !isBlank(bullet));
    if (bullets.length > DOCUMENT_LIMITS.bulletsPerExperience) {
      push(`experience.${index}.bullets`, `${label}: keep at most ${DOCUMENT_LIMITS.bulletsPerExperience} bullets.`);
    }
    if (bullets.some((bullet) => bullet.trim().length > DOCUMENT_LIMITS.bullet)) {
      push(`experience.${index}.bullets`, `${label}: each bullet must be under ${DOCUMENT_LIMITS.bullet} characters.`);
    }
  });

  const projects = doc.projects.filter((entry) => Object.values(entry).some((value) => (Array.isArray(value) ? value.length > 0 : !isBlank(value))));
  if (projects.length > DOCUMENT_LIMITS.projects) {
    push("projects", `Keep at most ${DOCUMENT_LIMITS.projects} projects.`);
  }
  projects.forEach((entry, index) => {
    const label = `Project ${index + 1}`;
    if (isBlank(entry.name)) {
      push(`projects.${index}.name`, `${label} needs a name.`);
    }
    for (const key of ["name", "url"]) {
      if (entry[key].trim().length > DOCUMENT_LIMITS.entryField) {
        push(`projects.${index}.${key}`, `${label}: keep this under ${DOCUMENT_LIMITS.entryField} characters.`);
      }
    }
    if (entry.description.trim().length > DOCUMENT_LIMITS.bullet) {
      push(`projects.${index}.description`, `${label}: keep the description under ${DOCUMENT_LIMITS.bullet} characters.`);
    }
    if (entry.technologies.length > DOCUMENT_LIMITS.skills) {
      push(`projects.${index}.technologies`, `${label}: keep at most ${DOCUMENT_LIMITS.skills} technologies.`);
    }
    if (entry.technologies.some((item) => item.trim().length > DOCUMENT_LIMITS.skill)) {
      push(`projects.${index}.technologies`, `${label}: each technology must be under ${DOCUMENT_LIMITS.skill} characters.`);
    }
  });

  const skills = doc.skills.map((skill) => skill.trim()).filter(Boolean);
  if (skills.length > DOCUMENT_LIMITS.skills) {
    push("skills", `Keep the skills list at ${DOCUMENT_LIMITS.skills} items or fewer.`);
  }
  if (skills.some((skill) => skill.length > DOCUMENT_LIMITS.skill)) {
    push("skills", `Each skill must be under ${DOCUMENT_LIMITS.skill} characters.`);
  }

  const certifications = doc.certifications.map((item) => item.trim()).filter(Boolean);
  if (certifications.length > DOCUMENT_LIMITS.certifications) {
    push("certifications", `Keep at most ${DOCUMENT_LIMITS.certifications} certifications.`);
  }
  if (certifications.some((item) => item.length > DOCUMENT_LIMITS.certification)) {
    push("certifications", `Each certification must be under ${DOCUMENT_LIMITS.certification} characters.`);
  }

  const sections = doc.sections.filter(
    (entry) => !isBlank(entry.title) || entry.lines.some((line) => !isBlank(line)),
  );
  if (sections.length > DOCUMENT_LIMITS.sections) {
    push("sections", `Keep at most ${DOCUMENT_LIMITS.sections} additional sections.`);
  }
  sections.forEach((entry, index) => {
    const label = `Section ${index + 1}`;
    if (isBlank(entry.title)) {
      push(`sections.${index}.title`, `${label} needs a title.`);
    }
    if (entry.title.trim().length > DOCUMENT_LIMITS.sectionTitle) {
      push(`sections.${index}.title`, `${label}: keep the title under ${DOCUMENT_LIMITS.sectionTitle} characters.`);
    }
    const lines = entry.lines.filter((line) => !isBlank(line));
    if (lines.length > DOCUMENT_LIMITS.linesPerSection) {
      push(`sections.${index}.lines`, `${label}: keep at most ${DOCUMENT_LIMITS.linesPerSection} lines.`);
    }
    if (lines.some((line) => line.trim().length > DOCUMENT_LIMITS.bullet)) {
      push(`sections.${index}.lines`, `${label}: each line must be under ${DOCUMENT_LIMITS.bullet} characters.`);
    }
  });

  const content = pruneDocument(doc, { education, experience, projects, sections });
  const bytes = new TextEncoder().encode(JSON.stringify(content)).length;
  if (bytes > DOCUMENT_LIMITS.contentBytes) {
    push(
      "document",
      `This resume is ${Math.round(bytes / 1024)} KB; the limit is ${DOCUMENT_LIMITS.contentBytes / 1024} KB. Shorten a section to save.`,
    );
  }

  return { ok: errors.length === 0, errors, content };
}

function pruneDocument(doc, lists) {
  const contact = {};
  for (const [key, value] of Object.entries(doc.contact)) {
    if (Array.isArray(value)) {
      const links = value.map((link) => link.trim()).filter(Boolean);
      if (links.length > 0) contact[key] = uniqueStrings(links);
      continue;
    }
    const trimmed = value.trim();
    if (trimmed) contact[key] = trimmed;
  }

  const content = {
    education: lists.education.map((entry) => cleanEntry(entry, new Set())),
    experience: lists.experience.map((entry) => {
      const cleaned = cleanEntry(entry, new Set(["bullets"]));
      return { ...cleaned, bullets: cleaned.bullets ?? [] };
    }),
    projects: lists.projects.map((entry) => {
      const cleaned = cleanEntry(entry, new Set(["technologies"]));
      return { ...cleaned, technologies: cleaned.technologies ?? [] };
    }),
    skills: uniqueStrings(doc.skills.map((skill) => skill.trim()).filter(Boolean)),
    certifications: doc.certifications.map((item) => item.trim()).filter(Boolean),
    sections: lists.sections.map((entry) => ({
      title: entry.title.trim(),
      lines: entry.lines.map((line) => line.trim()).filter(Boolean),
    })),
    layout: {
      pageSize: doc.layout.pageSize,
      sectionOrder: orderedSections(doc),
    },
  };

  const summary = doc.summary.trim();
  return {
    ...(Object.keys(contact).length > 0 ? { contact } : {}),
    ...(summary ? { summary } : {}),
    ...content,
  };
}

/** The exact API payload for a save. Safe to call only after validation. */
export function documentToContent(document) {
  return validateResumeDocument(document).content;
}

/** Stable comparison key for the unsaved-changes guard. */
export function documentFingerprint(document) {
  return JSON.stringify(normalizeResumeDocument(document));
}

export function documentStats(document) {
  const doc = normalizeResumeDocument(document);
  return {
    education: doc.education.filter((entry) => entry.institution.trim()).length,
    experience: doc.experience.filter((entry) => entry.title.trim()).length,
    projects: doc.projects.filter((entry) => entry.name.trim()).length,
    skills: doc.skills.filter((skill) => skill.trim()).length,
    certifications: doc.certifications.filter((item) => item.trim()).length,
    sections: doc.sections.filter((entry) => entry.title.trim()).length,
    words: countWords(doc),
  };
}

function countWords(doc) {
  const parts = [
    doc.summary,
    ...doc.contact.links,
    doc.contact.headline,
    ...doc.experience.flatMap((entry) => [entry.title, entry.company, ...entry.bullets]),
    ...doc.projects.flatMap((entry) => [entry.name, entry.description]),
    ...doc.sections.flatMap((entry) => [entry.title, ...entry.lines]),
    ...doc.certifications,
  ];
  return parts
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
}

export function slugifyFileName(name) {
  const base = text(name)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "resume"}.pdf`;
}

/**
 * Skills the analysis actually found evidence for in this resume.
 *
 * Only `demonstrated` and `mentioned` rows qualify; related-only or missing
 * requirements are deliberately excluded so a role-specific copy never gains a
 * skill the user cannot back up. Nothing else about the resume is invented.
 */
export function skillsFromEvidence(match) {
  const rows = buildEvidenceRows(match);
  const skills = [];
  const seen = new Set();
  for (const row of rows) {
    if (row.kind !== "finding") continue;
    if (row.state !== "demonstrated" && row.state !== "mentioned") continue;
    const name = text(row.title).trim();
    if (!name || name.length > DOCUMENT_LIMITS.skill) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    skills.push(name);
    if (skills.length >= DOCUMENT_LIMITS.skills) break;
  }
  return skills;
}

/** Role label for a handoff copy, bounded to the server's 120 characters. */
export function roleLabelFromMatch(match) {
  const scope = asObject(asObject(match).roleScope);
  const title = text(asObject(scope.selectedRole).title).trim();
  return title.slice(0, 120);
}
