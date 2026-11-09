import test from "node:test";
import assert from "node:assert/strict";
import {
  EVIDENCE_GROUPS,
  buildAnalysisSummary,
  buildEvidenceRows,
  filterEvidenceGroups,
  groupAtsChecks,
  groupEvidenceRows,
  matchStatusCopy,
  scoreDisplay,
  selectPrincipalIssue,
  uniqueStrings,
} from "../src/lib/resume-analysis.mjs";

function finding({ requirement = {}, evidence = {}, suggestion = "Keep the example specific." } = {}) {
  return {
    requirement: {
      id: "skill:react",
      category: "technical_skill",
      displayName: "React",
      priority: "required",
      sourceExcerpts: ["Experience with React is required."],
      purpose: "ENTRY_REQUIRED",
      sectionHeading: "Requirements",
      ...requirement,
    },
    evidence: {
      classification: "demonstrated",
      excerpts: [{ section: "Projects", text: "Built a React dashboard." }],
      explanation: "An applied project excerpt supports this requirement.",
      ...evidence,
    },
    suggestion,
  };
}

function reviewItem(overrides = {}) {
  return {
    id: "review-1",
    classification: "unrecognized",
    priority: "required",
    sourceExcerpts: ["Experience with Kubernetes operators is required."],
    explanation: "This wording is outside the analyzer's supported vocabulary.",
    hardEligibilityConcern: false,
    purpose: "ENTRY_REQUIRED",
    concepts: ["Kubernetes"],
    ...overrides,
  };
}

function match({
  score = 62,
  findings = [],
  items = [],
  learningOutcomes = [],
  status,
  concerns = [],
} = {}) {
  return {
    engineVersion: "resume-jd-matcher-1.3.0",
    rubricVersion: "resume-jd-rubric-2.1.0",
    score,
    ...(score === null ? { scoreUnavailableReason: "Score withheld because a statement is unresolved." } : {}),
    requirementCoverage: {
      status: status ?? (items.length > 0 ? "partial" : findings.length > 0 ? "complete" : "none_detected"),
      evaluatedRequirementCount: findings.length,
      reviewRequiredCount: items.length,
      items,
      candidateRequirementCount: findings.length + items.length,
      trainingOutcomeCount: learningOutcomes.length,
      excludedStatementCount: 2,
    },
    findings,
    hardEligibilityConcerns: concerns,
    learningOutcomes,
    limitations: ["Not an ATS score."],
  };
}

test("a null score stays unavailable and is never presented as zero", () => {
  const unavailable = scoreDisplay(null, "Score withheld because a statement is unresolved.");
  assert.equal(unavailable.available, false);
  assert.equal(unavailable.value, null);
  assert.equal(unavailable.reason, "Score withheld because a statement is unresolved.");

  const zero = scoreDisplay(0);
  assert.equal(zero.available, true);
  assert.equal(zero.value, 0);

  const missing = scoreDisplay(undefined);
  assert.equal(missing.available, false);
  assert.equal(missing.value, null);
  assert.match(missing.reason, /No numeric match score/);
});

test("requirement rows distinguish not demonstrated from not evaluated", () => {
  const fixture = match({
    findings: [
      finding({
        requirement: { id: "skill:sql", displayName: "SQL" },
        evidence: {
          classification: "not_found",
          excerpts: [],
          explanation: "No SQL evidence was found.",
        },
      }),
    ],
    items: [reviewItem()],
  });
  const groups = groupEvidenceRows(buildEvidenceRows(fixture));
  assert.deepEqual(
    groups.map((group) => group.key),
    EVIDENCE_GROUPS.map((group) => group.key),
  );
  const notDemonstrated = groups.find((group) => group.key === "not_demonstrated");
  const notEvaluated = groups.find((group) => group.key === "not_evaluated");
  assert.equal(notDemonstrated.rows.length, 1);
  assert.equal(notEvaluated.rows.length, 1);
  assert.equal(notDemonstrated.rows[0].stateLabel, "Not demonstrated");
  assert.match(notEvaluated.rows[0].stateLabel, /^Not evaluated/);
  assert.equal(notEvaluated.rows[0].resumeExcerpts.length, 0);
});

test("duplicate unresolved statements are merged into one visible row", () => {
  const duplicated = reviewItem();
  const groups = groupEvidenceRows(
    buildEvidenceRows(match({ items: [duplicated, { ...duplicated, id: "review-2" }] })),
  );
  const notEvaluated = groups.find((group) => group.key === "not_evaluated");
  assert.equal(notEvaluated.rows.length, 1);
});

test("summary counts keep evidence states separate and exclude training outcomes", () => {
  const fixture = match({
    findings: [
      finding({ requirement: { id: "skill:react" } }),
      finding({
        requirement: { id: "skill:node", displayName: "Node.js" },
        evidence: { classification: "explicit", excerpts: [{ section: "Skills", text: "Node.js" }] },
      }),
      finding({
        requirement: { id: "skill:go", displayName: "Go" },
        evidence: { classification: "not_found", excerpts: [], explanation: "No Go evidence." },
      }),
    ],
    items: [reviewItem()],
    learningOutcomes: [
      { id: "lo-1", excerpt: "Learn Docker.", concepts: [], conceptIds: [] },
      { id: "lo-2", excerpt: "Learn CI.", concepts: [], conceptIds: [] },
    ],
  });
  const rows = buildEvidenceRows(fixture);
  const summary = buildAnalysisSummary(fixture, rows);
  assert.equal(summary.evaluated, 3);
  assert.equal(summary.demonstratedOrMentioned, 2);
  assert.equal(summary.missing, 1);
  assert.equal(summary.unresolved, 1);
  assert.equal(summary.trainingExcluded, 2);
  assert.equal(summary.totalRows, 4);
});

test("the overview surfaces the highest-risk unresolved item with a navigable target", () => {
  const fixture = match({
    score: null,
    scoreUnavailableReason: "Score withheld.",
    items: [
      reviewItem({ id: "review-1", priority: "preferred", hardEligibilityConcern: false }),
      reviewItem({
        id: "review-2",
        sourceExcerpts: ["Professional certification is required."],
        hardEligibilityConcern: true,
      }),
    ],
    findings: [
      finding({
        requirement: { id: "skill:go", displayName: "Go" },
        evidence: { classification: "not_found", excerpts: [], explanation: "No Go evidence." },
      }),
    ],
  });
  const rows = buildEvidenceRows(fixture);
  const issue = selectPrincipalIssue(fixture, rows);
  assert.equal(issue.kind, "review");
  assert.equal(issue.key, "review:review-2");
  assert.equal(issue.state, "not_evaluated");
  assert.equal(issue.hardEligibilityConcern, true);
  assert.match(issue.reason, /mandatory qualification/i);

  const gapOnly = match({
    findings: [
      finding({
        requirement: { id: "skill:go", displayName: "Go", priority: "required" },
        evidence: { classification: "not_found", excerpts: [], explanation: "No Go evidence." },
      }),
    ],
  });
  const gapIssue = selectPrincipalIssue(gapOnly, buildEvidenceRows(gapOnly));
  assert.equal(gapIssue.key, "finding:skill:go");
  assert.equal(gapIssue.state, "not_demonstrated");

  assert.equal(selectPrincipalIssue(match(), []), null);
});

test("search and state filters use the exact JD and resume excerpts", () => {
  const fixture = match({
    findings: [
      finding({
        requirement: { id: "skill:react", displayName: "React" },
        evidence: {
          classification: "demonstrated",
          excerpts: [{ section: "Projects", text: "Built an accessible interview scheduler in React." }],
          explanation: "A project excerpt supports React.",
        },
      }),
      finding({
        requirement: { id: "skill:sql", displayName: "SQL" },
        evidence: { classification: "not_found", excerpts: [], explanation: "No SQL evidence." },
      }),
    ],
    items: [reviewItem()],
  });
  const groups = groupEvidenceRows(buildEvidenceRows(fixture));

  const resumeHit = filterEvidenceGroups(groups, { query: "interview scheduler" });
  assert.equal(resumeHit.flatMap((group) => group.rows).length, 1);
  assert.equal(resumeHit[0].rows[0]?.title ?? resumeHit[1].rows[0]?.title, "React");

  const jdHit = filterEvidenceGroups(groups, { query: "kubernetes" });
  assert.equal(jdHit.flatMap((group) => group.rows).length, 1);
  assert.equal(jdHit.find((group) => group.rows.length > 0).key, "not_evaluated");

  const missingOnly = filterEvidenceGroups(groups, { state: "not_demonstrated" });
  assert.equal(missingOnly.flatMap((group) => group.rows).length, 1);
  assert.equal(missingOnly.find((group) => group.rows.length > 0).rows[0].title, "SQL");
});

test("parser checks keep four states and group repeated unsupported explanations", () => {
  const shared = "This parser cannot inspect PDF visual reading order.";
  const checks = [
    { id: "a", title: "Meaningful text", status: "passed", severity: "info", evidence: "1200 characters.", explanation: "", recommendation: "" },
    { id: "b", title: "Encoding", status: "warning", severity: "low", evidence: "Replacement characters.", explanation: "Review encoding.", recommendation: "Export as UTF-8." },
    { id: "c", title: "Header extraction", status: "issue", severity: "high", evidence: "Header omitted.", explanation: "Header text is missing.", recommendation: "Repeat contact details in the body." },
    { id: "d", title: "Visual reading order", status: "not_evaluated", severity: "info", evidence: "", explanation: shared, recommendation: "Inspect the PDF manually." },
    { id: "e", title: "Column order", status: "not_evaluated", severity: "info", evidence: "", explanation: shared, recommendation: "Inspect the PDF manually." },
    { id: "f", title: "DOCX table mapping", status: "not_evaluated", severity: "info", evidence: "", explanation: "DOCX structure checks are unsupported.", recommendation: "" },
  ];
  const grouped = groupAtsChecks(checks);
  assert.equal(grouped.confirmed.length, 1);
  assert.equal(grouped.warnings.length, 1);
  assert.equal(grouped.passed.length, 1);
  assert.equal(grouped.unsupported.length, 3);
  assert.equal(grouped.unsupportedGroups.length, 2);
  const sharedGroup = grouped.unsupportedGroups.find((group) => group.explanation === shared);
  assert.equal(sharedGroup.checks.length, 2);
  assert.deepEqual(sharedGroup.checks.map((check) => check.id), ["d", "e"]);
  assert.equal(grouped.unsupportedGroups.find((group) => group.checks.length === 1).checks[0].id, "f");
});

test("defensive helpers tolerate missing additive fields and empty analyses", () => {
  assert.deepEqual(buildEvidenceRows(null), []);
  assert.deepEqual(buildEvidenceRows({}), []);
  const summary = buildAnalysisSummary({});
  assert.deepEqual(summary, {
    evaluated: 0,
    demonstratedOrMentioned: 0,
    missing: 0,
    unresolved: 0,
    trainingExcluded: 0,
    totalRows: 0,
  });
  assert.equal(selectPrincipalIssue({}), null);
  assert.deepEqual(groupAtsChecks(undefined), {
    confirmed: [],
    warnings: [],
    passed: [],
    unsupported: [],
    unsupportedGroups: [],
  });
  assert.equal(matchStatusCopy(undefined), "Coverage status is unavailable for this analysis.");
  assert.match(matchStatusCopy("none_detected"), /does not mean the job description was fully understood/);
});

test("long excerpts and many requirements remain intact and searchable", () => {
  const longResumeText = `Led a migration ${"with verified detail ".repeat(400)}`.trim();
  const findings = Array.from({ length: 40 }, (_, index) =>
    finding({
      requirement: {
        id: `skill:${index}`,
        displayName: `Requirement ${index}`,
        sourceExcerpts: [`Requirement ${index} is required. ${longResumeText}`],
      },
      evidence: {
        classification: index % 2 === 0 ? "demonstrated" : "not_found",
        excerpts: index % 2 === 0 ? [{ section: "Experience", text: longResumeText }] : [],
        explanation: `Explanation ${index}.`,
      },
    }),
  );
  const rows = buildEvidenceRows(match({ findings }));
  assert.equal(rows.length, 40);
  assert.equal(rows[0].resumeExcerpts[0].text, longResumeText);
  assert.equal(rows[0].jdExcerpts[0], `Requirement 0 is required. ${longResumeText}`);
  const groups = groupEvidenceRows(rows);
  assert.equal(groups.reduce((count, group) => count + group.rows.length, 0), 40);
  const hits = filterEvidenceGroups(groups, { query: "verified detail" });
  assert.equal(hits.flatMap((group) => group.rows).length, 40);
});

test("repeated limitation strings are deduplicated without dropping distinct ones", () => {
  assert.deepEqual(
    uniqueStrings(["Not an ATS score.", " Not an ATS score. ", "", "No OCR.", null, 42]),
    ["Not an ATS score.", "No OCR."],
  );
});
