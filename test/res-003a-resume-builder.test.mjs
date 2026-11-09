import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DOCUMENT_LIMITS,
  SECTION_KEYS,
  documentFingerprint,
  documentStats,
  documentToContent,
  emptyResumeDocument,
  moveInList,
  moveSection,
  newEducationItem,
  normalizeResumeDocument,
  orderedSections,
  removeListItem,
  roleLabelFromMatch,
  skillsFromEvidence,
  slugifyFileName,
  updateListItem,
  validateResumeDocument,
} from "../src/lib/resume-builder.mjs";

const document = () => ({
  contact: {
    fullName: "Ada Lovelace",
    email: "ada@example.com",
    phone: "+44 20 0000 0000",
    location: "London, UK",
    headline: "Backend engineer",
    links: ["example.com/ada"],
  },
  summary: "Backend engineer focused on reliable data systems.",
  education: [
    {
      institution: "Example University",
      degree: "BSc",
      field: "Computer Science",
      start: "2018",
      end: "2021",
      notes: "",
    },
  ],
  experience: [
    {
      title: "Software Engineer",
      company: "Example Co",
      location: "London",
      start: "2021",
      end: "Present",
      bullets: ["Shipped a billing service.", "  "],
    },
  ],
  projects: [
    { name: "Tracker", description: "A private job tracker.", url: "example.com", technologies: ["TypeScript"] },
  ],
  skills: ["TypeScript", "PostgreSQL"],
  certifications: ["AWS Cloud Practitioner"],
  sections: [{ title: "Volunteering", lines: ["Mentored juniors."] }],
  layout: { pageSize: "A4", sectionOrder: [...SECTION_KEYS] },
});

describe("resume document model", () => {
  it("normalises schema v1 content without losing data", () => {
    const v1 = {
      contact: { fullName: "Ada" },
      summary: "Engineer",
      education: [{ institution: "Example University", degree: "BSc" }],
      experience: [{ title: "Engineer", bullets: ["Did work"] }],
      projects: [{ name: "Tracker", technologies: ["TS"] }],
      skills: ["TS"],
      certifications: ["Cert"],
      sections: [{ title: "Awards", lines: ["One"] }],
    };
    const doc = normalizeResumeDocument(v1);
    assert.equal(doc.contact.fullName, "Ada");
    assert.equal(doc.contact.headline, "");
    assert.equal(doc.education[0].institution, "Example University");
    assert.deepEqual(doc.experience[0].bullets, ["Did work"]);
    assert.deepEqual(doc.projects[0].technologies, ["TS"]);
    assert.equal(doc.layout.pageSize, "A4");
    assert.deepEqual(doc.layout.sectionOrder, [...SECTION_KEYS]);
  });

  it("drops unknown keys and invalid layout values", () => {
    const doc = normalizeResumeDocument({
      skills: ["TS"],
      injected: true,
      layout: { pageSize: "A5", sectionOrder: ["skills", "hobbies", "skills"] },
    });
    assert.equal("injected" in doc, false);
    assert.equal(doc.layout.pageSize, "A4");
    assert.deepEqual(doc.layout.sectionOrder, ["skills"]);
  });

  it("keeps an empty document valid and complete", () => {
    const validation = validateResumeDocument(emptyResumeDocument());
    assert.equal(validation.ok, true);
    assert.deepEqual(validation.errors, []);
    const content = validation.content;
    assert.deepEqual(content.education, []);
    assert.deepEqual(content.skills, []);
    assert.equal("summary" in content, false);
    assert.deepEqual(content.layout.sectionOrder, [...SECTION_KEYS]);
  });

  it("trims strings, drops blank entries and prunes blank bullets", () => {
    const validation = validateResumeDocument({
      ...document(),
      summary: "  Padded summary.  ",
      experience: [
        ...document().experience,
        { title: "", company: "", location: "", start: "", end: "", bullets: [""] },
      ],
    });
    assert.equal(validation.ok, true);
    assert.equal(validation.content.summary, "Padded summary.");
    assert.equal(validation.content.experience.length, 1);
    assert.deepEqual(validation.content.experience[0].bullets, ["Shipped a billing service."]);
  });

  it("requires the fields the server requires and reports exact paths", () => {
    const validation = validateResumeDocument({
      education: [{ institution: "", degree: "BSc" }],
      experience: [{ title: "", company: "Example Co" }],
      projects: [{ name: "", description: "x" }],
      sections: [{ title: "", lines: ["line"] }],
    });
    assert.equal(validation.ok, false);
    const paths = validation.errors.map((error) => error.path);
    assert.deepEqual(paths.sort(), [
      "education.0.institution",
      "experience.0.title",
      "projects.0.name",
      "sections.0.title",
    ]);
  });

  it("rejects malformed email, over-long values and too many items", () => {
    assert.equal(validateResumeDocument({ contact: { email: "not-an-email" } }).ok, false);
    assert.equal(
      validateResumeDocument({ summary: "x".repeat(DOCUMENT_LIMITS.summary + 1) }).ok,
      false,
    );
    assert.equal(
      validateResumeDocument({ skills: ["x".repeat(DOCUMENT_LIMITS.skill + 1)] }).ok,
      false,
    );
    const tooMany = validateResumeDocument({
      skills: Array.from({ length: DOCUMENT_LIMITS.skills + 1 }, (_v, i) => `skill-${i}`),
    });
    assert.equal(tooMany.ok, false);
    assert.ok(tooMany.errors.some((error) => error.path === "skills"));
  });

  it("flags a document whose serialized content exceeds the byte cap", () => {
    const bullets = Array.from({ length: 20 }, () => "x".repeat(1000));
    const experience = Array.from({ length: 20 }, () => ({ title: "Engineer", bullets }));
    const validation = validateResumeDocument({ experience });
    assert.equal(validation.ok, false);
    assert.ok(validation.errors.some((error) => error.path === "document"));
  });

  it("applies list edits immutably and ignores out-of-range moves", () => {
    const items = ["a", "b", "c"];
    assert.deepEqual(moveInList(items, 2, -1), ["a", "c", "b"]);
    assert.deepEqual(moveInList(items, 0, -1), items);
    assert.deepEqual(moveInList(items, 2, 1), items);
    assert.deepEqual(items, ["a", "b", "c"]);

    const entries = [{ title: "One" }, { title: "Two" }];
    const updated = updateListItem(entries, 1, { title: "Changed" });
    assert.equal(updated[1].title, "Changed");
    assert.equal(entries[1].title, "Two");
    assert.deepEqual(removeListItem(entries, 0), [{ title: "Two" }]);
  });

  it("reorders sections and appends any unlisted key", () => {
    const doc = document();
    const moved = moveSection(doc, "skills", -1);
    const order = orderedSections(moved);
    assert.equal(order.indexOf("skills"), order.indexOf("projects") - 1);
    assert.deepEqual(moved.layout.sectionOrder, order);

    const partial = normalizeResumeDocument({
      layout: { sectionOrder: ["skills"] },
    });
    assert.deepEqual(orderedSections(partial), [
      "skills",
      "summary",
      "education",
      "experience",
      "projects",
      "certifications",
      "sections",
    ]);
  });

  it("produces a stable fingerprint for the unsaved-changes guard", () => {
    assert.equal(documentFingerprint(document()), documentFingerprint(document()));
    const edited = { ...document(), summary: "Changed" };
    assert.notEqual(documentFingerprint(document()), documentFingerprint(edited));
    assert.equal(documentFingerprint(document()), documentFingerprint(normalizeResumeDocument(document())));
  });

  it("builds the save payload with default layout and no blank fields", () => {
    const content = documentToContent({
      contact: { fullName: "Ada", email: "", links: ["", " "] },
      summary: "   ",
      skills: ["TS", "ts", "PostgreSQL"],
    });
    assert.equal("contact" in content, true);
    assert.equal("summary" in content, false);
    assert.deepEqual(content.skills, ["TS", "PostgreSQL"]);
    assert.equal(content.layout.pageSize, "A4");
    assert.equal(content.layout.sectionOrder.length, 7);
  });

  it("counts populated entries and words for the sidebar", () => {
    const stats = documentStats(document());
    assert.equal(stats.experience, 1);
    assert.equal(stats.education, 1);
    assert.equal(stats.skills, 2);
    assert.ok(stats.words > 10);
  });

  it("derives safe file names", () => {
    assert.equal(slugifyFileName("Ada Lovelace — Backend"), "ada-lovelace-backend.pdf");
    assert.equal(slugifyFileName("  "), "resume.pdf");
    assert.equal(slugifyFileName("José's Résumé"), "jose-s-resume.pdf");
  });
});

describe("analyzer to builder handoff", () => {
  const finding = (id, displayName, classification) => ({
    requirement: {
      id,
      displayName,
      category: "skill",
      priority: "required",
      sourceExcerpts: [],
    },
    evidence: { classification, excerpts: [{ section: "Skills", text: displayName }], explanation: "" },
    suggestion: "",
  });

  const match = {
    findings: [
      finding("1", "TypeScript", "demonstrated"),
      finding("2", "PostgreSQL", "explicit"),
      finding("3", "Kubernetes", "related"),
      finding("4", "Terraform", "not_found"),
      finding("5", "typescript", "demonstrated"),
    ],
    requirementCoverage: {
      items: [
        { id: "r1", classification: "unrecognized", sourceExcerpts: ["Familiar with Rust"] },
      ],
    },
    hardEligibilityConcerns: [],
    roleScope: { selectedRole: { title: "Backend Engineer" } },
  };

  it("copies only skills with demonstrated or mentioned evidence", () => {
    assert.deepEqual(skillsFromEvidence(match), ["TypeScript", "PostgreSQL"]);
  });

  it("never invents skills when nothing is evidenced", () => {
    assert.deepEqual(skillsFromEvidence({ findings: [] }), []);
    assert.deepEqual(skillsFromEvidence(null), []);
  });

  it("uses the selected role as the copy label without exceeding the limit", () => {
    assert.equal(roleLabelFromMatch(match), "Backend Engineer");
    assert.equal(roleLabelFromMatch({}), "");
    assert.equal(roleLabelFromMatch({ roleScope: { selectedRole: { title: "x".repeat(200) } } }).length, 120);
  });

  it("creates a valid document from the evidenced skills", () => {
    const doc = normalizeResumeDocument({
      skills: skillsFromEvidence(match),
      layout: { pageSize: "A4", sectionOrder: [...SECTION_KEYS] },
    });
    const validation = validateResumeDocument(doc);
    assert.equal(validation.ok, true);
    assert.deepEqual(validation.content.skills, ["TypeScript", "PostgreSQL"]);
    assert.equal("experience" in validation.content, true);
    assert.deepEqual(validation.content.experience, []);
  });

  it("starts new education rows blank so nothing is fabricated", () => {
    assert.deepEqual(newEducationItem(), {
      institution: "",
      degree: "",
      field: "",
      start: "",
      end: "",
      notes: "",
    });
  });
});
