/**
 * Pure view-model helpers for the RES-UX-001 resume analysis workspace.
 *
 * These functions never call the API, never write state and never invent a
 * score or confidence value. They group the additive API fields for display so
 * that the rendering components stay declarative and the grouping rules can be
 * unit-tested without a browser.
 */

export const EVIDENCE_GROUPS = [
  {
    key: "demonstrated",
    label: "Demonstrated",
    description: "An experience or project excerpt supports this requirement.",
  },
  {
    key: "mentioned",
    label: "Mentioned only",
    description: "The skill is named, but the resume does not show how it was applied.",
  },
  {
    key: "partial",
    label: "Partial or related",
    description: "Related or weak evidence. Related technology never counts as an exact match.",
  },
  {
    key: "not_demonstrated",
    label: "Not demonstrated",
    description: "No supporting evidence was found in this resume. That is not proof the capability is absent.",
  },
  {
    key: "not_evaluated",
    label: "Not evaluated",
    description: "The job-description wording could not be assessed reliably. It was not scored as met or missing.",
  },
];

export const EVIDENCE_CLASSIFICATION_LABELS = {
  demonstrated: "Demonstrated",
  explicit: "Mentioned only",
  related: "Related evidence",
  insufficient: "Insufficient evidence",
  uncertain: "Uncertain evidence",
  not_found: "Not demonstrated",
};

const CLASSIFICATION_GROUPS = {
  demonstrated: "demonstrated",
  explicit: "mentioned",
  related: "partial",
  insufficient: "partial",
  uncertain: "partial",
  not_found: "not_demonstrated",
};

const PRIORITY_RANK = { required: 0, preferred: 1, unspecified: 2 };

function numberOr(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeSearch(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function stringList(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string" && item.length > 0) : [];
}

export function evidenceGroupForClassification(classification) {
  return CLASSIFICATION_GROUPS[classification] ?? "partial";
}

function searchTextFor(row) {
  return normalizeSearch(
    [
      row.title,
      row.category,
      row.priority,
      row.sectionHeading ?? "",
      row.stateLabel,
      row.explanation,
      ...row.jdExcerpts,
      ...row.resumeExcerpts.map((excerpt) => `${excerpt.section} ${excerpt.text}`),
      ...row.concepts,
    ].join(" "),
  );
}

/**
 * One row per evaluated requirement and one row per unresolved candidate
 * statement. Duplicate review statements are merged exactly as the previous
 * screen did, so the visible count matches what the user can open.
 */
export function buildEvidenceRows(match) {
  const findings = Array.isArray(match?.findings) ? match.findings : [];
  const reviewItems = Array.isArray(match?.requirementCoverage?.items)
    ? match.requirementCoverage.items
    : [];
  const concernIds = new Set(
    (Array.isArray(match?.hardEligibilityConcerns) ? match.hardEligibilityConcerns : [])
      .map((finding) => finding?.requirement?.id)
      .filter(Boolean),
  );
  const rows = [];
  const seenFindings = new Set();

  findings.forEach((finding, index) => {
    const requirement = finding?.requirement ?? {};
    const id = typeof requirement.id === "string" && requirement.id ? requirement.id : `finding-${index + 1}`;
    if (seenFindings.has(id)) return;
    seenFindings.add(id);
    const classification = typeof finding?.evidence?.classification === "string"
      ? finding.evidence.classification
      : "unknown";
    const state = evidenceGroupForClassification(classification);
    const row = {
      key: `finding:${id}`,
      kind: "finding",
      id,
      title: requirement.displayName || "Unnamed requirement",
      category: requirement.category || "requirement",
      priority: requirement.priority || "unspecified",
      purpose: requirement.purpose,
      sectionHeading: requirement.sectionHeading,
      classification,
      state,
      stateLabel: EVIDENCE_CLASSIFICATION_LABELS[classification] ?? "Evidence state unavailable",
      explanation: finding?.evidence?.explanation || "No evidence explanation was returned for this requirement.",
      jdExcerpts: stringList(requirement.sourceExcerpts),
      resumeExcerpts: Array.isArray(finding?.evidence?.excerpts)
        ? finding.evidence.excerpts.filter((excerpt) => excerpt && typeof excerpt.text === "string")
        : [],
      suggestion: typeof finding?.suggestion === "string" ? finding.suggestion : "",
      concepts: [],
      hardEligibilityConcern: concernIds.has(id),
      roleContext: requirement.purpose === "ROLE_RESPONSIBILITY",
    };
    rows.push({ ...row, searchText: searchTextFor(row) });
  });

  const seenReview = new Set();
  reviewItems.forEach((item, index) => {
    if (!item || typeof item !== "object") return;
    const excerpts = stringList(item.sourceExcerpts);
    const excerpt = excerpts[0] || "";
    const classification = item.classification === "ambiguous" ? "ambiguous" : "unrecognized";
    const dedupeKey = `${classification}\0${normalizeSearch(excerpt)}`;
    if (seenReview.has(dedupeKey)) return;
    seenReview.add(dedupeKey);
    const id = typeof item.id === "string" && item.id ? item.id : `review-${index + 1}`;
    const row = {
      key: `review:${id}`,
      kind: "review",
      id,
      title: excerpt || "Unresolved candidate qualification",
      category: "candidate_statement",
      priority: item.priority || "unspecified",
      purpose: item.purpose,
      sectionHeading: item.sectionHeading,
      classification,
      state: "not_evaluated",
      stateLabel:
        classification === "ambiguous"
          ? "Not evaluated — ambiguous wording"
          : "Not evaluated — outside supported vocabulary",
      explanation: item.explanation || "This candidate qualification was not scored as met or missing.",
      jdExcerpts: excerpts,
      resumeExcerpts: [],
      suggestion: "",
      concepts: stringList(item.concepts),
      hardEligibilityConcern: Boolean(item.hardEligibilityConcern),
      roleContext: false,
    };
    rows.push({ ...row, searchText: searchTextFor(row) });
  });

  return rows;
}

export function groupEvidenceRows(rows) {
  const list = Array.isArray(rows) ? rows : [];
  return EVIDENCE_GROUPS.map((group) => ({
    ...group,
    rows: list.filter((row) => row.state === group.key),
  }));
}

export function buildAnalysisSummary(match, rows) {
  const evidenceRows = Array.isArray(rows) ? rows : buildEvidenceRows(match);
  const findings = evidenceRows.filter((row) => row.kind === "finding");
  const coverage = match?.requirementCoverage ?? {};
  const learningOutcomes = Array.isArray(match?.learningOutcomes) ? match.learningOutcomes : [];
  return {
    evaluated: numberOr(
      coverage.evaluatedRequirementCount,
      findings.filter((row) => row.classification !== "uncertain").length,
    ),
    demonstratedOrMentioned: findings.filter(
      (row) => row.state === "demonstrated" || row.state === "mentioned",
    ).length,
    missing: findings.filter(
      (row) => row.classification === "not_found" || row.classification === "insufficient",
    ).length,
    unresolved: evidenceRows.filter((row) => row.state === "not_evaluated").length,
    trainingExcluded: numberOr(coverage.trainingOutcomeCount, learningOutcomes.length),
    totalRows: evidenceRows.length,
  };
}

function byReviewPriority(left, right) {
  if (left.hardEligibilityConcern !== right.hardEligibilityConcern) {
    return left.hardEligibilityConcern ? -1 : 1;
  }
  return (PRIORITY_RANK[left.priority] ?? 3) - (PRIORITY_RANK[right.priority] ?? 3);
}

/**
 * The single issue to surface in the overview. Unresolved candidate statements
 * take precedence because they withhold the score; a required qualification
 * with no evidence is the fallback. Nothing is invented when nothing qualifies.
 */
export function selectPrincipalIssue(match, rows) {
  const evidenceRows = Array.isArray(rows) ? rows : buildEvidenceRows(match);
  const reviews = evidenceRows.filter((row) => row.kind === "review").slice().sort(byReviewPriority);
  if (reviews.length > 0) {
    const issue = reviews[0];
    return {
      key: issue.key,
      kind: issue.kind,
      state: issue.state,
      title: issue.title,
      priority: issue.priority,
      reason: issue.hardEligibilityConcern
        ? "This may be a mandatory qualification, but its wording could not be evaluated reliably. It was not assumed to be met or missing."
        : "This candidate qualification could not be evaluated reliably, so the overall score is withheld.",
      excerpt: issue.jdExcerpts[0],
      hardEligibilityConcern: issue.hardEligibilityConcern,
    };
  }

  const gap = evidenceRows.find(
    (row) =>
      row.kind === "finding" &&
      row.priority === "required" &&
      (row.classification === "not_found" || row.classification === "insufficient"),
  );
  if (!gap) return null;
  return {
    key: gap.key,
    kind: gap.kind,
    state: gap.state,
    title: gap.title,
    priority: gap.priority,
    reason: "This required qualification has no clear evidence in this resume. A gap means evidence was not found here, not that the capability is absent.",
    excerpt: gap.jdExcerpts[0],
    hardEligibilityConcern: gap.hardEligibilityConcern,
  };
}

export function filterEvidenceGroups(groups, options = {}) {
  const list = Array.isArray(groups) ? groups : [];
  const state = options?.state && options.state !== "all" ? options.state : null;
  const query = normalizeSearch(options?.query);
  return list.map((group) => ({
    ...group,
    rows: (Array.isArray(group.rows) ? group.rows : []).filter((row) => {
      if (state && row.state !== state) return false;
      if (!query) return true;
      return normalizeSearch(row.searchText).includes(query);
    }),
  }));
}

/**
 * Parser checks keep their four distinct states. Unsupported checks are grouped
 * by their explanation so the same paragraph is not repeated under every check.
 */
export function groupAtsChecks(checks) {
  const list = Array.isArray(checks)
    ? checks.filter((check) => check && typeof check === "object")
    : [];
  const unsupported = list.filter((check) => check.status === "not_evaluated");
  const groups = new Map();
  for (const check of unsupported) {
    const explanation =
      (typeof check.explanation === "string" && check.explanation.trim()) ||
      (typeof check.recommendation === "string" && check.recommendation.trim()) ||
      "This parser cannot perform this check.";
    if (!groups.has(explanation)) {
      groups.set(explanation, {
        key: `unsupported-${groups.size + 1}`,
        explanation,
        recommendation:
          typeof check.recommendation === "string" && check.recommendation.trim() === explanation
            ? ""
            : check.recommendation || "",
        checks: [],
      });
    }
    groups.get(explanation).checks.push(check);
  }
  return {
    confirmed: list.filter((check) => check.status === "issue"),
    warnings: list.filter((check) => check.status === "warning"),
    passed: list.filter((check) => check.status === "passed"),
    unsupported,
    unsupportedGroups: [...groups.values()],
  };
}

export function uniqueStrings(values) {
  const seen = new Set();
  const result = [];
  for (const value of Array.isArray(values) ? values : []) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

/** A null score stays null; it is never coerced to zero. */
export function scoreDisplay(score, reason) {
  const available = typeof score === "number" && Number.isFinite(score);
  return {
    available,
    value: available ? score : null,
    reason: available
      ? null
      : typeof reason === "string" && reason.trim()
        ? reason
        : "No numeric match score is available for this analysis.",
  };
}

export function matchStatusCopy(status) {
  if (status === "complete") {
    return "Every candidate qualification statement was evaluated against this resume.";
  }
  if (status === "partial") {
    return "At least one candidate qualification statement could not be evaluated. The overall score stays withheld until those items are reviewed.";
  }
  if (status === "none_detected") {
    return "No usable entry-qualification statement was detected. This does not mean the job description was fully understood.";
  }
  return "Coverage status is unavailable for this analysis.";
}
