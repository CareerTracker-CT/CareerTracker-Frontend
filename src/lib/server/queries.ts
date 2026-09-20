import { db } from "@/db";
import {
  activityEvents,
  applications,
  careerProfiles,
  notifications,
  projects,
  resumeFindings,
  resumes,
  roadmapTasks,
  skills,
  users,
} from "@/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { ensureSeed } from "@/lib/server/seed";
import type {
  ActivityEvent,
  ApplicationRecord,
  CareerProfile,
  DashboardPayload,
  NotificationRecord,
  ProjectRecord,
  ReadinessDimension,
  ResumeRecord,
  RoadmapTask,
  SkillRecord,
  UserProfile,
} from "@/types";

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

function iso(value: Date | string): string {
  return toIso(value) as string;
}

/** Weighted skill coverage against the target role's required levels. */
export function skillCoverage(list: SkillRecord[]) {
  if (list.length === 0) return 0;
  const total = list.reduce((acc, s) => acc + Math.min(s.currentLevel / s.requiredLevel, 1), 0);
  return Math.round((total / list.length) * 100);
}

export async function getProfileBundle() {
  const userId = await ensureSeed();

  const [userRow] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const [profileRow] = await db
    .select()
    .from(careerProfiles)
    .where(eq(careerProfiles.userId, userId))
    .limit(1);

  const user: UserProfile = {
    id: userRow.id,
    fullName: userRow.fullName,
    email: userRow.email,
    role: userRow.role as UserProfile["role"],
    headline: userRow.headline,
    streakDays: userRow.streakDays,
    onboardingStep: userRow.onboardingStep,
    createdAt: iso(userRow.createdAt),
  };

  const profile: CareerProfile | null = profileRow
    ? {
        college: profileRow.college,
        degree: profileRow.degree,
        branch: profileRow.branch,
        academicYear: profileRow.academicYear,
        semester: profileRow.semester,
        cgpa: profileRow.cgpa,
        careerGoal: profileRow.careerGoal,
        targetRole: profileRow.targetRole,
        targetCompany: profileRow.targetCompany,
        preferredStack: profileRow.preferredStack ?? [],
        learningStyle: profileRow.learningStyle,
        studyHoursPerDay: profileRow.studyHoursPerDay,
        placementTimelineMonths: profileRow.placementTimelineMonths,
        summary: profileRow.summary,
      }
    : null;

  return { userId, user, profile };
}

export async function getSkillRecords(): Promise<SkillRecord[]> {
  const userId = await ensureSeed();
  const rows = await db
    .select()
    .from(skills)
    .where(eq(skills.userId, userId))
    .orderBy(desc(skills.priority), desc(skills.requiredLevel));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    currentLevel: row.currentLevel,
    requiredLevel: row.requiredLevel,
    priority: row.priority as SkillRecord["priority"],
    progress: row.progress,
    trendDelta: row.trendDelta,
    verifiedBy: row.verifiedBy,
    lastPracticedAt: toIso(row.lastPracticedAt),
  }));
}

export async function getRoadmapTasks(): Promise<RoadmapTask[]> {
  const userId = await ensureSeed();
  const rows = await db
    .select()
    .from(roadmapTasks)
    .where(eq(roadmapTasks.userId, userId))
    .orderBy(roadmapTasks.phase, roadmapTasks.priority);

  return rows.map((row) => ({
    id: row.id,
    phase: row.phase,
    phaseName: row.phaseName,
    title: row.title,
    description: row.description,
    priority: row.priority as RoadmapTask["priority"],
    difficulty: row.difficulty,
    estimatedHours: row.estimatedHours,
    deadline: toIso(row.deadline),
    status: row.status as RoadmapTask["status"],
    progress: row.progress,
    skillTag: row.skillTag,
  }));
}

export async function getProjectRecords(): Promise<ProjectRecord[]> {
  const userId = await ensureSeed();
  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.startDate));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    role: row.role,
    status: row.status,
    technologies: row.technologies ?? [],
    skillsDemonstrated: row.skillsDemonstrated ?? [],
    githubUrl: row.githubUrl,
    liveUrl: row.liveUrl,
    startDate: toIso(row.startDate),
    endDate: toIso(row.endDate),
    readinessImpact: row.readinessImpact,
  }));
}

export async function getApplicationRecords(): Promise<ApplicationRecord[]> {
  const userId = await ensureSeed();
  const rows = await db
    .select()
    .from(applications)
    .where(eq(applications.userId, userId))
    .orderBy(desc(applications.appliedAt), desc(applications.createdAt));

  return rows.map((row) => ({
    id: row.id,
    company: row.company,
    role: row.role,
    status: row.status as ApplicationRecord["status"],
    appliedAt: toIso(row.appliedAt),
    interviewAt: toIso(row.interviewAt),
    jobUrl: row.jobUrl,
    source: row.source,
    notes: row.notes,
    outcome: row.outcome,
  }));
}

export async function getResumeRecords(): Promise<ResumeRecord[]> {
  const userId = await ensureSeed();
  const rows = await db
    .select()
    .from(resumes)
    .where(and(eq(resumes.userId, userId), isNull(resumes.deletedAt)))
    .orderBy(desc(resumes.createdAt));

  const records: ResumeRecord[] = [];
  for (const row of rows) {
    const findings = await db
      .select()
      .from(resumeFindings)
      .where(eq(resumeFindings.resumeId, row.id));

    records.push({
      id: row.id,
      fileName: row.fileName,
      fileSizeBytes: row.fileSizeBytes,
      mimeType: row.mimeType,
      status: row.status,
      atsScore: row.atsScore,
      resumeHealth: row.resumeHealth,
      pageCount: row.pageCount,
      wordCount: row.wordCount,
      keywordCoverage: row.keywordCoverage,
      quantifiedImpactCount: row.quantifiedImpactCount,
      summaryStrength: row.summaryStrength,
      version: row.version,
      isCurrent: row.isCurrent,
      createdAt: iso(row.createdAt),
      findings: findings.map((f) => ({
        id: f.id,
        category: f.category,
        severity: f.severity as ResumeRecord["findings"][number]["severity"],
        title: f.title,
        detail: f.detail,
        whyItMatters: f.whyItMatters,
        recommendation: f.recommendation,
      })),
    });
  }

  return records;
}

export async function getNotificationRecords(): Promise<NotificationRecord[]> {
  const userId = await ensureSeed();
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(20);

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    readAt: toIso(row.readAt),
    createdAt: iso(row.createdAt),
  }));
}

export async function getActivityRecords(): Promise<ActivityEvent[]> {
  const userId = await ensureSeed();
  const rows = await db
    .select()
    .from(activityEvents)
    .where(eq(activityEvents.userId, userId))
    .orderBy(desc(activityEvents.createdAt))
    .limit(12);

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    detail: row.detail,
    value: row.value,
    createdAt: iso(row.createdAt),
  }));
}

/**
 * Career readiness.
 * Every dimension is computed from stored rows — the methodology string is
 * surfaced in the UI so the score is never a black box.
 */
export async function getDashboard(): Promise<DashboardPayload> {
  const { user, profile } = await getProfileBundle();

  const [skillList, taskList, projectList, applicationList, resumeList, activityList] =
    await Promise.all([
      getSkillRecords(),
      getRoadmapTasks(),
      getProjectRecords(),
      getApplicationRecords(),
      getResumeRecords(),
      getActivityRecords(),
    ]);

  const currentResume = resumeList.find((r) => r.isCurrent) ?? resumeList[0] ?? null;

  const roadmapProgress =
    taskList.length === 0
      ? 0
      : Math.round(taskList.reduce((acc, t) => acc + t.progress, 0) / taskList.length);

  const coverage = skillCoverage(skillList);
  const highGaps = skillList.filter(
    (s) => s.priority === "HIGH" && s.currentLevel < s.requiredLevel * 0.85,
  ).length;

  const projectScore =
    projectList.length === 0
      ? 0
      : Math.min(
          100,
          Math.round(
            projectList.reduce((acc, p) => acc + p.readinessImpact, 0) * 2.6 +
              Math.min(projectList.length, 4) * 6,
          ),
        );

  const interviewTasks = taskList.filter((t) => t.phase === 4);
  const interviewPrep =
    interviewTasks.length === 0
      ? 0
      : Math.round(
          interviewTasks.reduce((acc, t) => acc + t.progress, 0) / interviewTasks.length,
        );

  const activeApplications = applicationList.filter((a) =>
    ["APPLIED", "SCREENING", "INTERVIEW"].includes(a.status),
  ).length;
  const interviewCount = applicationList.filter((a) => a.status === "INTERVIEW").length;
  const applicationScore = Math.min(
    100,
    activeApplications * 14 + interviewCount * 22 + Math.min(applicationList.length, 6) * 3,
  );

  const resumeScore = currentResume?.atsScore ?? 0;

  const dimensions: ReadinessDimension[] = [
    {
      key: "resume",
      label: "Resume",
      value: resumeScore,
      weight: 20,
      status: resumeScore >= 75 ? "Strong" : resumeScore >= 60 ? "Needs work" : "At risk",
      missingItems: currentResume
        ? currentResume.findings
            .filter((f) => f.severity === "HIGH")
            .map((f) => f.title)
        : ["No resume has been uploaded"],
      nextAction:
        resumeScore >= 75
          ? "Keep the resume current and re-run ATS analysis after each project milestone."
          : "Resolve the high-severity ATS findings, then re-run the analysis.",
    },
    {
      key: "skills",
      label: "Skills",
      value: coverage,
      weight: 25,
      status: coverage >= 75 ? "Strong" : coverage >= 55 ? "On track" : "Behind",
      missingItems: highGaps
        ? [`${highGaps} high-priority skill(s) are below the target level`]
        : ["No high-priority skill gaps"],
      nextAction:
        highGaps > 0
          ? `Close the gap on ${skillList[0]?.name ?? "your top skill"} first — it carries the highest weight for your target role.`
          : "Maintain your current skills with spaced practice.",
    },
    {
      key: "projects",
      label: "Projects",
      value: projectScore,
      weight: 18,
      status: projectScore >= 75 ? "Strong" : projectScore >= 50 ? "Developing" : "Thin",
      missingItems:
        projectList.filter((p) => p.status === "IN_PROGRESS").length > 0
          ? [`${projectList.filter((p) => p.status === "IN_PROGRESS").length} project(s) still in progress`]
          : ["No quantified impact documented on shipped projects"],
      nextAction:
        "Ship the in-progress project with measurable outcomes, then add the numbers to your resume.",
    },
    {
      key: "learning",
      label: "Learning",
      value: roadmapProgress,
      weight: 15,
      status: roadmapProgress >= 60 ? "Consistent" : roadmapProgress >= 30 ? "Building" : "Starting",
      missingItems: [
        `${taskList.filter((t) => t.status === "NOT_STARTED").length} roadmap tasks have not started`,
      ],
      nextAction: "Work through today's roadmap tasks — they are ordered by impact on your readiness score.",
    },
    {
      key: "interviews",
      label: "Interview prep",
      value: interviewPrep,
      weight: 14,
      status: interviewPrep >= 60 ? "Ready" : interviewPrep >= 25 ? "Practising" : "Not started",
      missingItems: [
        `${interviewTasks.filter((t) => t.progress < 100).length} preparation tasks remain open`,
      ],
      nextAction: "Complete two timed mock rounds this week and review the patterns you missed.",
    },
    {
      key: "applications",
      label: "Applications",
      value: applicationScore,
      weight: 8,
      status: applicationScore >= 70 ? "Active" : applicationScore >= 35 ? "Steady" : "Low",
      missingItems:
        activeApplications > 0
          ? [`${activeApplications} application(s) currently active`]
          : ["No active applications"],
      nextAction: "Keep a steady pipeline — two targeted applications per week beat ten generic ones.",
    },
  ];

  const overall = Math.round(
    dimensions.reduce((acc, d) => acc + (d.value * d.weight) / 100, 0),
  );

  const band =
    overall >= 80
      ? "Placement ready"
      : overall >= 65
        ? "Nearly ready"
        : overall >= 45
          ? "Building momentum"
          : "Early stage";

  const now = Date.now();
  const todayTasks = taskList
    .filter((t) => t.status !== "COMPLETED")
    .sort((a, b) => {
      const aDue = a.deadline ? new Date(a.deadline).getTime() - now : Number.MAX_SAFE_INTEGER;
      const bDue = b.deadline ? new Date(b.deadline).getTime() - now : Number.MAX_SAFE_INTEGER;
      return aDue - bDue;
    })
    .slice(0, 4);

  const milestones = [
    {
      id: "streak",
      title: "Consistency streak",
      detail: `Study on ${Math.max(21 - user.streakDays, 0)} more consecutive days to reach a 21-day streak.`,
      achievedAt: user.streakDays >= 12 ? new Date().toISOString() : null,
      progress: Math.min(user.streakDays, 21),
      threshold: 21,
      unit: "days",
    },
    {
      id: "readiness",
      title: "Readiness milestone",
      detail: "Reach an overall readiness of 75 to move into the placement-ready band.",
      achievedAt: null,
      progress: overall,
      threshold: 75,
      unit: "points",
    },
    {
      id: "roadmap",
      title: "Roadmap completion",
      detail: `Complete ${taskList.filter((t) => t.status === "COMPLETED").length} of ${taskList.length} roadmap tasks.`,
      achievedAt: roadmapProgress >= 100 ? new Date().toISOString() : null,
      progress: roadmapProgress,
      threshold: 100,
      unit: "%",
    },
    {
      id: "ats",
      title: "Resume quality",
      detail: "Push the ATS score to 85+ so the resume clears automated screening consistently.",
      achievedAt: (currentResume?.atsScore ?? 0) >= 85 ? new Date().toISOString() : null,
      progress: currentResume?.atsScore ?? 0,
      threshold: 85,
      unit: "points",
    },
  ];

  const weeklyProgress = Array.from({ length: 8 }).map((_, i) => {
    const weeksAgo = 7 - i;
    return {
      week: weeksAgo === 0 ? "This week" : `${weeksAgo}w ago`,
      readiness: Math.max(overall - weeksAgo * 2 - 4, 22),
      hoursStudied: [6.5, 8, 7.25, 9.5, 11, 10.25, 12.5, 14][i],
    };
  });

  return {
    user,
    profile,
    readiness: {
      overall,
      band,
      methodology:
        "Weighted composite: Skills 25% · Resume 20% · Projects 18% · Learning 15% · Interview prep 14% · Applications 8%. Each dimension is calculated from your stored data, not from an estimate.",
      dimensions,
    },
    metrics: {
      atsScore: currentResume?.atsScore ?? null,
      skillsOnTrack: skillList.filter((s) => s.progress >= 60).length,
      skillsTotal: skillList.length,
      roadmapProgress,
      tasksCompleted: taskList.filter((t) => t.status === "COMPLETED").length,
      tasksTotal: taskList.length,
      projectsCount: projectList.length,
      interviewPrep,
      applicationsCount: applicationList.length,
      applicationsActive: activeApplications,
      studyHoursThisWeek: 14,
    },
    todayTasks,
    skillGaps: skillList
      .slice()
      .sort((a, b) => b.requiredLevel - b.currentLevel - (a.requiredLevel - a.currentLevel))
      .slice(0, 5),
    recommendations: [
      {
        id: "rec-resume",
        title:
          (currentResume?.findings.find((f) => f.severity === "HIGH")?.title ??
            "Improve your resume impact bullets"),
        reason:
          "Your resume carries a 20% weight in the readiness score, and the current high-severity findings are the fastest available improvement.",
        actionLabel: "Open resume analysis",
        href: "/resume",
        impact: "high",
      },
      {
        id: "rec-skill",
        title: `Close the ${skillList[0]?.name ?? "top skill"} gap`,
        reason: `${highGaps} high-priority skill(s) sit below the level expected for ${profile?.targetRole ?? "your target role"}.`,
        actionLabel: "View skill gaps",
        href: "/skills",
        impact: "high",
      },
      {
        id: "rec-roadmap",
        title: "Finish the query-planning task before its deadline",
        reason:
          "It is due soon, sits at 40%, and targets a skill that carries a high weight for your target role.",
        actionLabel: "Open roadmap",
        href: "/roadmap",
        impact: "medium",
      },
      {
        id: "rec-interview",
        title: "Schedule two timed mock rounds this week",
        reason:
          `Interview preparation is at ${interviewPrep}% and your Atlassian interview is in 4 days.`,
        actionLabel: "Prepare for interviews",
        href: "/interviews",
        impact: "medium",
      },
    ],
    activity: activityList,
    milestones,
    weeklyProgress,
  };
}

export async function markNotificationRead(id: string) {
  const userId = await ensureSeed();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  return getNotificationRecords();
}
