import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SECTION_KEYS } from "../src/lib/resume-builder.mjs";
import { layoutResume, measureText, renderResumePdf } from "../src/lib/resume-pdf.mjs";

const ascii = (bytes) => Buffer.from(bytes).toString("latin1");
const countPages = (pdf) => (pdf.match(/\/Type \/Page \/Parent/g) ?? []).length;

function textRuns(pdf) {
  const runs = [];
  const pattern = /BT\n\/(F1|F2) ([\d.]+) Tf\n1 0 0 1 ([\d.]+) ([\d.]+) Tm\n\((.*?)\) Tj\nET/g;
  let match;
  while ((match = pattern.exec(pdf))) {
    runs.push({
      font: match[1],
      size: Number(match[2]),
      x: Number(match[3]),
      y: Number(match[4]),
      text: match[5],
    });
  }
  return runs;
}

const baseDocument = () => ({
  contact: {
    fullName: "Ada Lovelace",
    headline: "Backend Engineer",
    email: "ada@example.com",
    phone: "+44 20 0000 0000",
    location: "London, UK",
    links: ["example.com/ada"],
  },
  summary: "Backend engineer focused on reliable data systems and clear interfaces.",
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
      bullets: ["Shipped a billing service used by every customer.", "Reduced report latency."],
    },
  ],
  projects: [
    { name: "Tracker", description: "A private job tracker.", url: "example.com", technologies: ["TypeScript"] },
  ],
  skills: ["TypeScript", "PostgreSQL", "React"],
  certifications: ["AWS Cloud Practitioner"],
  sections: [{ title: "Volunteering", lines: ["Mentored juniors."] }],
  layout: { pageSize: "A4", sectionOrder: [...SECTION_KEYS] },
});

describe("resume PDF export", () => {
  it("produces a real, small PDF with core fonts and no images", () => {
    const pdf = ascii(renderResumePdf(baseDocument()));
    assert.ok(pdf.startsWith("%PDF-1.4"));
    assert.ok(pdf.trimEnd().endsWith("%%EOF"));
    assert.ok(pdf.includes("/BaseFont /Helvetica"));
    assert.ok(pdf.includes("/BaseFont /Helvetica-Bold"));
    assert.ok(pdf.includes("/Encoding /WinAnsiEncoding"));
    assert.equal(/\/Subtype \/Image/.test(pdf), false);
    assert.equal(/DCTDecode|FlateDecode/.test(pdf), false);
    assert.ok(pdf.includes("(Ada Lovelace) Tj"));
    assert.ok(pdf.includes("(SUMMARY) Tj"));
    assert.ok(pdf.includes("(EXPERIENCE) Tj"));
    assert.ok(pdf.includes("(EDUCATION) Tj"));
    assert.ok(pdf.length > 1500 && pdf.length < 40000);
  });

  it("writes a valid cross-reference table and trailer", () => {
    const pdf = ascii(renderResumePdf(baseDocument()));
    const startxref = Number(pdf.match(/startxref\n(\d+)\n%%EOF/)?.[1]);
    assert.ok(Number.isInteger(startxref) && startxref > 0);
    assert.equal(pdf.slice(startxref, startxref + 4), "xref");
    const size = Number(pdf.match(/\/Size (\d+)/)?.[1]);
    const entries = pdf.slice(startxref).match(/^\d{10} \d{5} [nf] $/gm) ?? [];
    assert.equal(entries.length, size);
    assert.ok(pdf.includes("/Count 1"));
  });

  it("uses A4 by default and US Letter when requested", () => {
    const a4 = ascii(renderResumePdf(baseDocument()));
    assert.ok(a4.includes("/MediaBox [0 0 595.28 841.89]"));
    const letter = ascii(
      renderResumePdf({ ...baseDocument(), layout: { pageSize: "LETTER", sectionOrder: [...SECTION_KEYS] } }),
    );
    assert.ok(letter.includes("/MediaBox [0 0 612 792]"));
  });

  it("keeps every text run inside the page margins", () => {
    const pdf = ascii(renderResumePdf(baseDocument()));
    const runs = textRuns(pdf);
    assert.ok(runs.length > 8);
    for (const run of runs) {
      assert.ok(run.x >= 48 - 0.5, `x ${run.x} below margin`);
      assert.ok(run.x + measureText(run.text, run.size, run.font === "F2") <= 595.28 - 48 + 1, "overflow");
      assert.ok(run.y >= 48 && run.y <= 841.89 - 48 + 1, `baseline ${run.y} outside margins`);
    }
  });

  it("wraps an unbroken long token instead of clipping it", () => {
    const document = baseDocument();
    document.experience[0].bullets = ["x".repeat(900)];
    const pdf = ascii(renderResumePdf(document));
    const runs = textRuns(pdf).filter((run) => /^x+$/.test(run.text));
    assert.ok(runs.length > 1, "long token should wrap");
    for (const run of runs) {
      assert.ok(run.x + measureText(run.text, run.size, false) <= 595.28 - 48 + 1);
    }
  });

  it("paginates long resumes without dropping or clipping content", () => {
    const document = baseDocument();
    document.experience = Array.from({ length: 8 }, (_value, index) => ({
      title: `Role ${index + 1}`,
      company: `Company ${index + 1}`,
      location: "Remote",
      start: "2020",
      end: "2021",
      bullets: Array.from(
        { length: 6 },
        (_bullet, bullet) =>
          `Delivered measurable improvement ${bullet + 1} for project ${index + 1} with a long explanatory sentence that wraps across the column.`,
      ),
    }));
    const bytes = renderResumePdf(document);
    const pdf = ascii(bytes);
    const pages = countPages(pdf);
    assert.ok(pages >= 2, `expected multiple pages, got ${pages}`);
    assert.equal(pages, layoutResume(document).pages.length);
    assert.ok(pdf.includes(`/Count ${pages}`));
    for (let index = 1; index <= 8; index += 1) {
      assert.ok(pdf.includes(`(Role ${index}) Tj`), `missing Role ${index}`);
    }
    const runs = textRuns(pdf);
    for (const run of runs) {
      assert.ok(run.y > 40, `clipped baseline ${run.y}`);
    }
  });

  it("renders an empty resume as one valid page", () => {
    const pdf = ascii(renderResumePdf({}));
    assert.ok(pdf.startsWith("%PDF-1.4"));
    assert.equal(countPages(pdf), 1);
    assert.ok(pdf.includes("(This resume is empty.) Tj"));
  });

  it("escapes PDF string metacharacters", () => {
    const document = baseDocument();
    document.experience[0].company = "Acme (Europe) \\ Ltd";
    const pdf = ascii(renderResumePdf(document));
    assert.ok(pdf.includes("Acme \\(Europe\\) \\\\ Ltd"));
  });

  it("keeps Latin-1 names and drops unsupported glyphs safely", () => {
    const document = baseDocument();
    document.contact.fullName = "José Álvarez";
    document.summary = "Engineer with a focus on results and clear prose.";
    document.experience[0].bullets = ["Improved throughput by 20% 🚀 for the team."];
    const pdf = ascii(renderResumePdf(document));
    assert.ok(pdf.includes("José Álvarez"));
    // The emoji is dropped; whitespace is collapsed by the wrapper.
    assert.ok(pdf.includes("Improved throughput by 20% for the team."));
    assert.ok(pdf.trimEnd().endsWith("%%EOF"));
  });

  it("follows the saved section order", () => {
    const document = baseDocument();
    document.layout = { pageSize: "A4", sectionOrder: ["experience", "education", "skills"] };
    const pdf = ascii(renderResumePdf(document));
    const experience = pdf.indexOf("(EXPERIENCE) Tj");
    const education = pdf.indexOf("(EDUCATION) Tj");
    const skills = pdf.indexOf("(SKILLS) Tj");
    assert.ok(experience > 0 && education > experience && skills > education);
    // Unlisted sections follow in default order instead of disappearing.
    assert.ok(pdf.indexOf("(SUMMARY) Tj") > skills);
  });

  it("wraps long names, role titles and section headings instead of clipping them", () => {
    const document = baseDocument();
    document.contact.fullName = "Alexandria Montgomery-Worthington the Third";
    document.experience[0].title =
      "Senior Principal Staff Software Engineer, Platform Reliability and Developer Experience";
    document.sections = [
      {
        title: "Professional affiliations, memberships and community leadership",
        lines: ["Mentored juniors."],
      },
    ];
    const pdf = ascii(renderResumePdf(document));
    const runs = textRuns(pdf);
    for (const run of runs) {
      assert.ok(
        run.x + measureText(run.text, run.size, run.font === "F2") <= 595.28 - 48 + 1,
        "overflow",
      );
      assert.ok(run.y >= 48 && run.y <= 841.89 - 48 + 1, "outside margins");
    }
    const text = runs.map((run) => run.text).join(" ");
    assert.ok(text.includes("Developer Experience"));
    assert.ok(text.includes("PROFESSIONAL AFFILIATIONS"));
    assert.ok(runs.some((run) => run.text.includes("Alexandria")));
  });

  it("reports the same page count as the live preview layout", () => {
    const document = baseDocument();
    const layout = layoutResume(document);
    const pdf = ascii(renderResumePdf(document));
    assert.equal(layout.pages.length, countPages(pdf));
    assert.equal(layout.width, 595.28);
    assert.ok(layout.pages[0].blocks.some((block) => block.kind === "rule"));
  });
});
