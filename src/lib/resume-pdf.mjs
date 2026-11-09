/**
 * Resume layout + PDF writer.
 *
 * One layout pass produces page geometry that both the on-screen preview and
 * the PDF writer consume, so what the user sees is what the file contains.
 *
 * The writer targets PDF 1.4 with the two standard Helvetica core fonts. Core
 * fonts are never embedded, so the file stays a few kilobytes, text stays
 * selectable and searchable, and no font binary is shipped or downloaded.
 * Non-WinAnsi characters are transliterated to their closest ASCII form and
 * otherwise dropped, which is documented as an export limitation.
 *
 * Pure module: no DOM, no network, no dependencies.
 */

import {
  PAGE_DIMENSIONS,
  PAGE_SIZES,
  normalizeResumeDocument,
  orderedSections,
} from "./resume-builder.mjs";

export const LAYOUT = {
  margin: 48,
  bodySize: 9.6,
  bodyLeading: 12.8,
  headingSize: 10,
  nameSize: 21,
  smallSize: 8.8,
  bulletIndent: 11,
  entryGap: 7,
  sectionGap: 13,
};

/** Helvetica advance widths (1/1000 em) for printable ASCII. */
const HELVETICA_WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];

const BOLD_FACTOR = 1.06;

/** WinAnsi-safe transliteration for text the core fonts cannot show. */
const TRANSLITERATE = {
  "\u2018": "'",
  "\u2019": "'",
  "\u201a": ",",
  "\u201b": "'",
  "\u201c": '"',
  "\u201d": '"',
  "\u201e": '"',
  "\u2013": "-",
  "\u2014": "-",
  "\u2212": "-",
  "\u2022": "*",
  "\u2026": "...",
  "\u00a0": " ",
  "\u00b7": "-",
  "\u2192": "->",
  "\u2264": "<=",
  "\u2265": ">=",
  "\u00d7": "x",
  "\ufb01": "fi",
  "\ufb02": "fl",
};

function toWinAnsi(value) {
  const source = String(value ?? "");
  let out = "";
  for (const char of source) {
    const code = char.codePointAt(0) ?? 63;
    if (code === 9) {
      out += " ";
      continue;
    }
    if (code < 32) continue;
    if (code <= 126) {
      out += char;
      continue;
    }
    if (TRANSLITERATE[char]) {
      out += TRANSLITERATE[char];
      continue;
    }
    if (code >= 160 && code <= 255) {
      out += char;
      continue;
    }
    const stripped = char.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
    if (stripped && /^[\x20-\x7e]+$/.test(stripped)) {
      out += stripped;
    }
  }
  return out;
}

/** Approximate advance width in points. Bold widths are scaled up so wrapping
 *  errs on the side of a shorter line and never overflows the margin. */
export function measureText(text, size, bold = false) {
  const width = toWinAnsi(text)
    .split("")
    .reduce((total, char) => {
      const code = char.charCodeAt(0);
      const measured = code >= 32 && code <= 126 ? HELVETICA_WIDTHS[code - 32] : 556;
      return total + measured;
    }, 0);
  return (width / 1000) * size * (bold ? BOLD_FACTOR : 1);
}

function wrapText(text, width, size, bold) {
  const words = toWinAnsi(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }
    if (measureText(`${current} ${word}`, size, bold) <= width) {
      current = `${current} ${word}`;
      continue;
    }
    lines.push(current);
    current = word;
  }
  if (current) lines.push(current);

  // A single token wider than the column is split so nothing runs off-page.
  const fitted = [];
  for (const line of lines) {
    if (measureText(line, size, bold) <= width) {
      fitted.push(line);
      continue;
    }
    let chunk = "";
    for (const char of line) {
      if (measureText(chunk + char, size, bold) > width && chunk) {
        fitted.push(chunk);
        chunk = char;
      } else {
        chunk += char;
      }
    }
    if (chunk) fitted.push(chunk);
  }
  return fitted.length > 0 ? fitted : [""];
}

function lines(items) {
  return items.filter((item) => typeof item === "string" && item.trim().length > 0);
}

function dated(start, end) {
  const from = String(start ?? "").trim();
  const to = String(end ?? "").trim();
  if (from && to) return `${from} - ${to}`;
  return from || to;
}

/**
 * Lay a document out into pages of positioned text and rules.
 * `y` is measured from the top of the page, which is what CSS wants.
 */
export function layoutResume(document, options = {}) {
  const doc = normalizeResumeDocument(document);
  const pageSize = PAGE_SIZES.includes(options.pageSize)
    ? options.pageSize
    : PAGE_SIZES.includes(doc.layout.pageSize)
      ? doc.layout.pageSize
      : "A4";
  const dims = PAGE_DIMENSIONS[pageSize] ?? PAGE_DIMENSIONS.A4;
  const margin = Number.isFinite(options.margin) ? Number(options.margin) : LAYOUT.margin;
  const width = dims.width;
  const height = dims.height;
  const column = width - margin * 2;

  const pages = [];
  let page = null;
  let y = margin;

  function startPage() {
    page = { width, height, blocks: [] };
    pages.push(page);
    y = margin;
  }

  function ensureSpace(needed) {
    if (!page) startPage();
    if (y + needed > height - margin) startPage();
  }

  function textLine(value, { x = margin, size = LAYOUT.bodySize, bold = false } = {}) {
    const clean = toWinAnsi(value);
    if (!clean) return;
    ensureSpace(size * 1.35);
    page.blocks.push({ kind: "text", x, y, size, bold, text: clean });
    y += size * 1.35;
  }

  function paragraph(value, { x = margin, width: box = column, size = LAYOUT.bodySize, bold = false, leading = LAYOUT.bodyLeading } = {}) {
    for (const line of wrapText(value, box, size, bold)) {
      ensureSpace(leading);
      page.blocks.push({ kind: "text", x, y, size, bold, text: line });
      y += leading;
    }
  }

  function rule({ gap = 0 } = {}) {
    ensureSpace(gap + 2);
    y += gap;
    page.blocks.push({ kind: "rule", x1: margin, x2: margin + column, y });
    y += 2;
  }

  function heading(label) {
    const wrapped = wrapText(label.toUpperCase(), column, LAYOUT.headingSize, true);
    // Keep a heading with at least one body line on the same page.
    ensureSpace(
      wrapped.length * LAYOUT.headingSize * 1.35 + LAYOUT.sectionGap + LAYOUT.bodyLeading,
    );
    y += LAYOUT.sectionGap;
    for (const line of wrapped) {
      textLine(line, { size: LAYOUT.headingSize, bold: true });
    }
    y += 2.5;
    page.blocks.push({ kind: "rule", x1: margin, x2: margin + column, y });
    y += 6;
  }

  function rightAligned(value, { size = LAYOUT.smallSize, bold = false } = {}) {
    const clean = toWinAnsi(value);
    if (!clean) return;
    const box = Math.min(measureText(clean, size, bold), column - 120);
    const x = margin + column - box;
    ensureSpace(size * 1.35);
    page.blocks.push({ kind: "text", x, y, size, bold, text: clean });
  }

  function entryLine(leftValue, rightValue, { size = LAYOUT.bodySize, bold = true } = {}) {
    const leading = size * 1.4;
    const left = toWinAnsi(leftValue);
    const right = toWinAnsi(rightValue);
    const rightWidth = right ? measureText(right, LAYOUT.smallSize, false) : 0;
    // Reserve room for the dates only when they genuinely fit beside the title.
    const inlineDates = rightWidth > 0 && rightWidth + 40 < column;
    const wrapped = wrapText(left, column - (inlineDates ? rightWidth + 24 : 0), size, bold);
    const dateOnOwnLine = right && !inlineDates;
    ensureSpace(
      leading * wrapped.length +
        (dateOnOwnLine ? LAYOUT.smallSize * 1.4 : 0),
    );
    const top = y;
    if (right) {
      page.blocks.push({
        kind: "text",
        x: margin + column - rightWidth,
        y: dateOnOwnLine ? top + leading * wrapped.length : top,
        size: LAYOUT.smallSize,
        bold: false,
        text: right,
      });
    }
    wrapped.forEach((line, index) => {
      page.blocks.push({ kind: "text", x: margin, y: top + index * leading, size, bold, text: line });
    });
    y = top + leading * wrapped.length + (dateOnOwnLine ? LAYOUT.smallSize * 1.4 : 0);
  }

  function bullet(value, { size = LAYOUT.bodySize } = {}) {
    const marker = "-";
    const box = column - LAYOUT.bulletIndent;
    const wrapped = wrapText(value, box, size, false);
    wrapped.forEach((line, index) => {
      ensureSpace(LAYOUT.bodyLeading);
      if (index === 0) {
        page.blocks.push({ kind: "text", x: margin, y, size, bold: false, text: marker });
      }
      page.blocks.push({
        kind: "text",
        x: margin + LAYOUT.bulletIndent,
        y,
        size,
        bold: false,
        text: line,
      });
      y += LAYOUT.bodyLeading;
    });
  }

  const contact = doc.contact;
  const name = contact.fullName.trim();
  const headerParts = lines([
    contact.email,
    contact.phone,
    contact.location,
    ...contact.links,
  ]);

  if (name) {
    for (const line of wrapText(name, column, LAYOUT.nameSize, true)) {
      textLine(line, { size: LAYOUT.nameSize, bold: true });
    }
  }
  if (contact.headline.trim()) {
    textLine(contact.headline, { size: LAYOUT.bodySize + 0.6 });
  }
  if (headerParts.length > 0) {
    paragraph(headerParts.join("  |  "), { size: LAYOUT.smallSize, leading: 11.5 });
  }
  if (name || contact.headline.trim() || headerParts.length > 0) rule({ gap: 4 });

  const hasBody =
    doc.summary.trim().length > 0 ||
    doc.education.length > 0 ||
    doc.experience.length > 0 ||
    doc.projects.length > 0 ||
    doc.skills.length > 0 ||
    doc.certifications.length > 0 ||
    doc.sections.length > 0;

  if (!hasBody && !name && !contact.headline.trim() && headerParts.length === 0) {
    paragraph("This resume is empty.", { size: LAYOUT.bodySize });
  }

  for (const key of orderedSections(doc)) {
    if (key === "summary") {
      if (!doc.summary.trim()) continue;
      heading("Summary");
      paragraph(doc.summary);
      continue;
    }

    if (key === "education") {
      const entries = doc.education.filter((entry) => entry.institution.trim());
      if (entries.length === 0) continue;
      heading("Education");
      entries.forEach((entry, index) => {
        if (index > 0) y += LAYOUT.entryGap;
        entryLine(entry.institution, dated(entry.start, entry.end));
        const detail = [entry.degree, entry.field].map((part) => part.trim()).filter(Boolean).join(", ");
        if (detail) paragraph(detail);
        if (entry.notes.trim()) paragraph(entry.notes);
      });
      continue;
    }

    if (key === "experience") {
      const entries = doc.experience.filter((entry) => entry.title.trim());
      if (entries.length === 0) continue;
      heading("Experience");
      entries.forEach((entry, index) => {
        if (index > 0) y += LAYOUT.entryGap;
        entryLine(entry.title, dated(entry.start, entry.end));
        const where = [entry.company, entry.location].map((part) => part.trim()).filter(Boolean).join(", ");
        if (where) paragraph(where);
        for (const item of lines(entry.bullets)) bullet(item);
      });
      continue;
    }

    if (key === "projects") {
      const entries = doc.projects.filter((entry) => entry.name.trim());
      if (entries.length === 0) continue;
      heading("Projects");
      entries.forEach((entry, index) => {
        if (index > 0) y += LAYOUT.entryGap;
        entryLine(entry.name, entry.url.trim());
        const tech = lines(entry.technologies).join(" - ");
        if (tech) textLine(tech, { size: LAYOUT.smallSize });
        if (entry.description.trim()) paragraph(entry.description);
      });
      continue;
    }

    if (key === "skills") {
      const skills = lines(doc.skills);
      if (skills.length === 0) continue;
      heading("Skills");
      paragraph(skills.join(" - "));
      continue;
    }

    if (key === "certifications") {
      const items = lines(doc.certifications);
      if (items.length === 0) continue;
      heading("Certifications");
      for (const item of items) bullet(item);
      continue;
    }

    if (key === "sections") {
      for (const section of doc.sections) {
        if (!section.title.trim()) continue;
        heading(section.title);
        for (const line of lines(section.lines)) bullet(line);
      }
    }
  }

  return {
    pageSize,
    width,
    height,
    margin,
    pages,
  };
}

function escapePdfText(value) {
  return toWinAnsi(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function formatNumber(value) {
  return Number.isFinite(value) ? value.toFixed(2).replace(/\.00$/, "") : "0";
}

function contentStream(page) {
  const commands = ["q", "0.55 w", "0.62 g"];
  for (const block of page.blocks) {
    if (block.kind !== "rule") continue;
    const y = page.height - block.y;
    commands.push(`${formatNumber(block.x1)} ${formatNumber(y)} m`);
    commands.push(`${formatNumber(block.x2)} ${formatNumber(y)} l`);
  }
  commands.push("S", "0 g");

  for (const block of page.blocks) {
    if (block.kind !== "text") continue;
    const baseline = page.height - (block.y + block.size * 0.82);
    commands.push("BT");
    commands.push(`${block.bold ? "/F2" : "/F1"} ${formatNumber(block.size)} Tf`);
    commands.push(`1 0 0 1 ${formatNumber(block.x)} ${formatNumber(baseline)} Tm`);
    commands.push(`(${escapePdfText(block.text)}) Tj`);
    commands.push("ET");
  }
  commands.push("Q");
  return `${commands.join("\n")}\n`;
}

/**
 * Render a resume document to PDF bytes.
 * Returns a `Uint8Array`; the caller decides how to download it.
 */
export function renderResumePdf(document, options = {}) {
  const layout = layoutResume(document, options);
  const pageCount = layout.pages.length;
  const objects = [];

  const fontRegularId = 3;
  const fontBoldId = 4;
  const firstPageId = 5;

  const pageIds = layout.pages.map((_page, index) => firstPageId + index * 2);

  objects.push({
    id: 1,
    body: "<< /Type /Catalog /Pages 2 0 R >>",
  });
  objects.push({
    id: 2,
    body: `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageCount} >>`,
  });
  objects.push({
    id: fontRegularId,
    body: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  });
  objects.push({
    id: fontBoldId,
    body: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  });

  layout.pages.forEach((page, index) => {
    const pageId = firstPageId + index * 2;
    const streamId = pageId + 1;
    const stream = contentStream(page);
    objects.push({
      id: pageId,
      body: [
        "<< /Type /Page",
        "/Parent 2 0 R",
        `/MediaBox [0 0 ${formatNumber(page.width)} ${formatNumber(page.height)}]`,
        `/Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >>`,
        `/Contents ${streamId} 0 R >>`,
      ].join(" "),
    });
    objects.push({
      id: streamId,
      body: `<< /Length ${stream.length} >>\nstream\n${stream}endstream`,
    });
  });

  objects.sort((a, b) => a.id - b.id);

  const maxId = objects.reduce((max, object) => Math.max(max, object.id), 1);
  let out = "%PDF-1.4\n";
  const offsets = new Array(maxId + 1).fill(0);
  for (const object of objects) {
    offsets[object.id] = out.length;
    out += `${object.id} 0 obj\n${object.body}\nendobj\n`;
  }
  const xrefOffset = out.length;
  out += `xref\n0 ${maxId + 1}\n`;
  out += "0000000000 65535 f \n";
  for (let id = 1; id <= maxId; id += 1) {
    out += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  out += `trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  const bytes = new Uint8Array(out.length);
  for (let index = 0; index < out.length; index += 1) {
    bytes[index] = out.charCodeAt(index) & 0xff;
  }
  return bytes;
}

/** Convenience for the browser: a real PDF file, not a screenshot. */
export function resumePdfBlob(document, options = {}) {
  const bytes = renderResumePdf(document, options);
  return new Blob([bytes], { type: "application/pdf" });
}
