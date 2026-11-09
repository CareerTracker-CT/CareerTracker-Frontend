import assert from "node:assert/strict";
import test from "node:test";

import {
  applyDraftToContent,
  describeResumeLibraryError,
  emptyLibraryContent,
  formatVersionLabel,
  parseSkills,
  sortVersionsDesc,
  summarizeContent,
  validateLibraryDraft,
} from "../src/lib/resume-library.mjs";

function apiError(code, details = {}, status = 409) {
  return {
    response: {
      status,
      data: { error: { code: "API_ERROR", message: "Request failed.", details: { code, ...details } } },
    },
  };
}

test("emptyLibraryContent returns a fresh blank document", () => {
  const first = emptyLibraryContent();
  first.skills.push("mutated");
  assert.deepEqual(emptyLibraryContent().skills, []);
  assert.deepEqual(emptyLibraryContent().sections, []);
});

test("parseSkills splits on commas/newlines, trims, and dedupes case-insensitively", () => {
  assert.deepEqual(parseSkills("TypeScript, Node.js\nReact, typescript ,  "), [
    "TypeScript",
    "Node.js",
    "React",
  ]);
  assert.deepEqual(parseSkills(""), []);
  assert.deepEqual(parseSkills(null), []);
});

test("validateLibraryDraft accepts a well-formed draft", () => {
  const result = validateLibraryDraft({
    name: "  Backend resume  ",
    roleLabel: "Backend Engineer",
    summary: "Engineer.",
    skillsText: "TypeScript, Node.js",
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, {
    name: "Backend resume",
    roleLabel: "Backend Engineer",
    summary: "Engineer.",
    skills: ["TypeScript", "Node.js"],
  });
});

test("validateLibraryDraft flags missing names and bound violations per field", () => {
  const result = validateLibraryDraft({
    name: "   ",
    roleLabel: "r".repeat(121),
    summary: "s".repeat(4001),
    skillsText: Array.from({ length: 121 }, (_, i) => `skill-${i}`).join(","),
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.name, /name/i);
  assert.match(result.errors.roleLabel, /characters/i);
  assert.match(result.errors.summary, /characters/i);
  assert.match(result.errors.skills, /items or fewer|characters/i);
});

test("validateLibraryDraft rejects an over-long single skill", () => {
  const result = validateLibraryDraft({ name: "x", skillsText: "s".repeat(81) });
  assert.equal(result.ok, false);
  assert.match(result.errors.skills, /characters/i);
});

test("applyDraftToContent replaces summary/skills and preserves untouched sections", () => {
  const base = {
    contact: { fullName: "Synthetic Person" },
    summary: "Old",
    education: [{ institution: "Example University" }],
    experience: [{ title: "Engineer", bullets: ["Shipped."] }],
    projects: [{ name: "Tracker", technologies: ["TypeScript"] }],
    skills: ["Old"],
    certifications: ["AWS"],
    sections: [{ title: "Awards", lines: ["Hackathon"] }],
  };
  const next = applyDraftToContent(base, { summary: "  New  ", skills: ["React"] });
  assert.equal(next.summary, "New");
  assert.deepEqual(next.skills, ["React"]);
  assert.deepEqual(next.contact, base.contact);
  assert.deepEqual(next.experience, base.experience);
  assert.deepEqual(next.sections, base.sections);

  const cleared = applyDraftToContent(base, { summary: "", skills: [] });
  assert.equal("summary" in cleared, false);
  assert.deepEqual(cleared.skills, []);
});

test("summarizeContent counts sections and ignores malformed input", () => {
  const summary = summarizeContent({
    contact: { fullName: "A" },
    summary: "  ",
    education: [{ institution: "U" }],
    experience: [],
    projects: [{ name: "P", technologies: [] }, { name: "Q", technologies: [] }],
    skills: ["a", "b"],
    certifications: [],
    sections: [{ title: "Awards", lines: [] }],
  });
  assert.deepEqual(summary, {
    hasContact: true,
    hasSummary: false,
    education: 1,
    experience: 0,
    projects: 2,
    skills: 2,
    certifications: 0,
    sections: 1,
  });
  assert.equal(summarizeContent(null).skills, 0);
});

test("version helpers format labels and sort newest first safely", () => {
  assert.equal(formatVersionLabel(3), "Version 3");
  const sorted = sortVersionsDesc([
    { id: "a", versionNumber: 1 },
    { id: "b", versionNumber: 3 },
    { id: "c", versionNumber: 2 },
    { id: "bad" },
    null,
  ]);
  assert.deepEqual(sorted.map((v) => v.versionNumber), [3, 2, 1]);
  assert.deepEqual(sortVersionsDesc(undefined), []);
});

test("describeResumeLibraryError maps conflict codes with server revision info", () => {
  const described = describeResumeLibraryError(
    apiError("RESUME_EDIT_CONFLICT", { currentRevision: 2, currentVersionNumber: 2 }),
  );
  assert.equal(described.isConflict, true);
  assert.equal(described.currentRevision, 2);
  assert.equal(described.currentVersionNumber, 2);
  assert.match(described.message, /changed since you opened it/i);
});

test("describeResumeLibraryError maps not-found, quota, and generic failures", () => {
  assert.equal(
    describeResumeLibraryError(apiError("RESUME_NOT_FOUND", {}, 404)).isNotFound,
    true,
  );
  assert.match(
    describeResumeLibraryError(apiError("RESUME_LIMIT_REACHED")).message,
    /full/i,
  );
  assert.match(
    describeResumeLibraryError(apiError("RESUME_CONTENT_TOO_LARGE", {}, 400)).message,
    /too large/i,
  );
  const generic = describeResumeLibraryError(new Error("boom"));
  assert.equal(generic.code, null);
  assert.match(generic.message, /try again/i);
});
