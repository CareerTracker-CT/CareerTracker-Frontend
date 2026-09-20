import { db } from "@/db";
import {
  activityEvents,
  aiMessages,
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
import { eq } from "drizzle-orm";

export const DEMO_EMAIL = "aarav.sharma@vitstudent.ac.in";

const day = 86_400_000;
const fromNow = (days: number) => new Date(Date.now() + days * day);

let cachedUserId: string | null = null;
let seeding: Promise<string> | null = null;

/**
 * Idempotent demo-tenant seed.
 * The dashboard only ever renders rows that actually exist in the database —
 * this keeps every metric, chart and recommendation backed by real records.
 */
export function ensureSeed(): Promise<string> {
  if (cachedUserId) return Promise.resolve(cachedUserId);
  if (seeding) return seeding;

  seeding = (async () => {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, DEMO_EMAIL))
      .limit(1);

    if (existing[0]) {
      cachedUserId = existing[0].id;
      return cachedUserId;
    }

    const [user] = await db
      .insert(users)
      .values({
        fullName: "Aarav Sharma",
        email: DEMO_EMAIL,
        emailVerifiedAt: new Date(),
        role: "STUDENT",
        headline: "Final-year CSE student · Aspiring Backend Engineer",
        streakDays: 12,
        onboardingStep: 4,
        createdAt: fromNow(-112),
      })
      .returning({ id: users.id });

    const userId = user.id;

    await db.insert(careerProfiles).values({
      userId,
      college: "Vellore Institute of Technology",
      degree: "B.Tech",
      branch: "Computer Science & Engineering",
      academicYear: "Final year",
      semester: 7,
      cgpa: 8.7,
      careerGoal: "Backend engineering at a product-first company",
      targetRole: "Backend Engineer (SDE-1)",
      targetCompany: "Atlassian",
      preferredStack: ["TypeScript", "Go", "PostgreSQL", "Redis", "Docker", "Kafka"],
      learningStyle: "Project-first, then documentation",
      studyHoursPerDay: 2.5,
      placementTimelineMonths: 5,
      summary:
        "I build backend services in Go and TypeScript, and I am preparing for SDE-1 placements with a focus on distributed systems and data-intensive APIs.",
    });

    const [resume] = await db
      .insert(resumes)
      .values({
        userId,
        fileName: "Aarav_Sharma_Resume_v4.pdf",
        fileSizeBytes: 284_112,
        mimeType: "application/pdf",
        status: "ANALYSED",
        atsScore: 71,
        resumeHealth: "GOOD",
        pageCount: 1,
        wordCount: 612,
        keywordCoverage: 64,
        quantifiedImpactCount: 5,
        summaryStrength: 58,
        parsedName: "Aarav Sharma",
        parsedEmail: DEMO_EMAIL,
        parsedPhone: "+91 98••• ••214",
        version: 4,
        isCurrent: true,
        createdAt: fromNow(-9),
      })
      .returning({ id: resumes.id });

    await db.insert(resumeFindings).values([
      {
        resumeId: resume.id,
        category: "IMPACT",
        severity: "HIGH",
        title: "Project bullets describe features, not outcomes",
        detail:
          "Four of the eleven bullets across your two strongest projects state what was built but not what changed as a result.",
        whyItMatters:
          "Recruiters scan for evidence of impact in seconds. A measurable outcome (latency, cost, adoption) is what separates a memorable bullet from a generic one.",
        recommendation:
          "Rewrite those four bullets using the pattern: action → technical approach → measurable result (e.g. “cut p95 latency from 480 ms to 120 ms”).",
      },
      {
        resumeId: resume.id,
        category: "KEYWORDS",
        severity: "HIGH",
        title: "Missing role-specific keywords for SDE-1 postings",
        detail:
          "Your resume does not mention: message queues, observability, load testing, or API versioning — all frequent requirements in the 18 SDE-1 postings analysed for your target role.",
        whyItMatters:
          "Most first-pass screening is keyword-driven. Missing core terms means your resume can be filtered out before a human reads it.",
        recommendation:
          "Add these terms only where genuinely true, then back each with a project detail rather than listing them in a skills block.",
      },
      {
        resumeId: resume.id,
        category: "STRUCTURE",
        severity: "MEDIUM",
        title: "Skills section mixes proficiency levels without evidence",
        detail:
          "Twenty-two technologies are listed flat, with no differentiation between production experience and coursework exposure.",
        whyItMatters:
          "An undifferentiated list invites questions you may not be ready for in an interview, and reduces the signal of the skills you are genuinely strong in.",
        recommendation:
          "Group into ‘Production experience’, ‘Working knowledge’ and ‘Familiar’, capped at five items each.",
      },
      {
        resumeId: resume.id,
        category: "SUMMARY",
        severity: "MEDIUM",
        title: "Professional summary is generic",
        detail:
          "The opening statement reads: “Hardworking engineer passionate about technology and solving problems.”",
        whyItMatters:
          "The summary is the first thing a recruiter reads. Generic phrasing uses prime space without differentiating you from the next applicant.",
        recommendation:
          "Lead with role, domain and one quantified signature achievement — e.g. “Backend engineer shipping Go services handling 2 M requests/day.”",
      },
      {
        resumeId: resume.id,
        category: "FORMATTING",
        severity: "LOW",
        title: "Inconsistent date formatting",
        detail: "Two entries use “2023 – Present” while others use “Aug 2023 – May 2024”.",
        whyItMatters:
          "Inconsistent formatting is read as inattention to detail, and some parsers mis-handle mixed date styles.",
        recommendation: "Standardise every date range to “Mon YYYY – Mon YYYY”.",
      },
      {
        resumeId: resume.id,
        category: "EDUCATION",
        severity: "LOW",
        title: "Relevant coursework is listed but not linked to projects",
        detail: "Distributed Systems and Databases appear as coursework only.",
        whyItMatters:
          "Linking coursework to concrete work converts a passive list into evidence that you can apply what you learned.",
        recommendation: "Mention the strongest course project inline under the education entry.",
      },
      {
        resumeId: resume.id,
        category: "LINKS",
        severity: "LOW",
        title: "GitHub profile has no pinned repositories",
        detail: "Your resume links to GitHub, but no repositories are pinned or described.",
        whyItMatters:
          "Around 4 in 10 technical recruiters open the GitHub link. An empty landing page wastes a chance to prove your work.",
        recommendation: "Pin your two strongest repositories and write a four-line README for each.",
      },
    ]);

    await db.insert(skills).values([
      {
        userId,
        name: "Data Structures & Algorithms",
        category: "Computer science fundamentals",
        currentLevel: 68,
        requiredLevel: 85,
        priority: "HIGH",
        progress: 74,
        trendDelta: 9,
        verifiedBy: "Practice log",
        lastPracticedAt: fromNow(-1),
      },
      {
        userId,
        name: "Distributed Systems",
        category: "Architecture",
        currentLevel: 27,
        requiredLevel: 78,
        priority: "HIGH",
        progress: 33,
        trendDelta: 3,
        verifiedBy: "Self assessment",
        lastPracticedAt: fromNow(-6),
      },
      {
        userId,
        name: "System Design",
        category: "Architecture",
        currentLevel: 34,
        requiredLevel: 80,
        priority: "HIGH",
        progress: 42,
        trendDelta: 5,
        verifiedBy: "Mock interview",
        lastPracticedAt: fromNow(-3),
      },
      {
        userId,
        name: "PostgreSQL & Query Tuning",
        category: "Data",
        currentLevel: 61,
        requiredLevel: 82,
        priority: "HIGH",
        progress: 68,
        trendDelta: 7,
        verifiedBy: "Project work",
        lastPracticedAt: fromNow(-2),
      },
      {
        userId,
        name: "Go (Golang)",
        category: "Languages",
        currentLevel: 52,
        requiredLevel: 78,
        priority: "MEDIUM",
        progress: 61,
        trendDelta: 11,
        verifiedBy: "Project work",
        lastPracticedAt: fromNow(-2),
      },
      {
        userId,
        name: "Redis & Caching",
        category: "Data",
        currentLevel: 38,
        requiredLevel: 72,
        priority: "MEDIUM",
        progress: 47,
        trendDelta: 4,
        verifiedBy: "Self assessment",
        lastPracticedAt: fromNow(-8),
      },
      {
        userId,
        name: "Docker & Kubernetes",
        category: "DevOps",
        currentLevel: 44,
        requiredLevel: 75,
        priority: "MEDIUM",
        progress: 55,
        trendDelta: 6,
        verifiedBy: "Project work",
        lastPracticedAt: fromNow(-4),
      },
      {
        userId,
        name: "REST API Design",
        category: "Backend",
        currentLevel: 72,
        requiredLevel: 84,
        priority: "MEDIUM",
        progress: 82,
        trendDelta: 2,
        verifiedBy: "Project work",
        lastPracticedAt: fromNow(-1),
      },
      {
        userId,
        name: "Testing (Unit + Integration)",
        category: "Quality",
        currentLevel: 46,
        requiredLevel: 80,
        priority: "MEDIUM",
        progress: 57,
        trendDelta: 8,
        verifiedBy: "Project work",
        lastPracticedAt: fromNow(-5),
      },
      {
        userId,
        name: "CI/CD Pipelines",
        category: "DevOps",
        currentLevel: 29,
        requiredLevel: 70,
        priority: "LOW",
        progress: 36,
        trendDelta: 1,
        verifiedBy: "Self assessment",
        lastPracticedAt: fromNow(-14),
      },
      {
        userId,
        name: "Linux & Bash",
        category: "DevOps",
        currentLevel: 41,
        requiredLevel: 70,
        priority: "LOW",
        progress: 52,
        trendDelta: 2,
        verifiedBy: "Self assessment",
        lastPracticedAt: fromNow(-9),
      },
      {
        userId,
        name: "Communication & Behavioural",
        category: "Professional",
        currentLevel: 63,
        requiredLevel: 80,
        priority: "LOW",
        progress: 71,
        trendDelta: 5,
        verifiedBy: "Mock interview",
        lastPracticedAt: fromNow(-7),
      },
    ]);

    await db.insert(roadmapTasks).values([
      {
        userId,
        phase: 1,
        phaseName: "Foundations",
        title: "Rebuild core data structures from scratch",
        description:
          "Implement hash maps, LRU cache, and a balanced BST in Go without library shortcuts, with unit tests for edge cases.",
        priority: "HIGH",
        difficulty: "Intermediate",
        estimatedHours: 12,
        deadline: fromNow(6),
        status: "IN_PROGRESS",
        progress: 65,
        skillTag: "Data Structures & Algorithms",
      },
      {
        userId,
        phase: 1,
        phaseName: "Foundations",
        title: "Master complexity analysis for recursive algorithms",
        description:
          "Work through 25 recursion problems, writing the time and space bound for each before coding the solution.",
        priority: "MEDIUM",
        difficulty: "Intermediate",
        estimatedHours: 8,
        deadline: fromNow(11),
        status: "NOT_STARTED",
        progress: 0,
        skillTag: "Data Structures & Algorithms",
      },
      {
        userId,
        phase: 2,
        phaseName: "Core Skills",
        title: "PostgreSQL indexing and query planning deep dive",
        description:
          "Use EXPLAIN ANALYZE on 10 real queries from your projects, add the right indexes, and document the before/after timings.",
        priority: "HIGH",
        difficulty: "Advanced",
        estimatedHours: 10,
        deadline: fromNow(3),
        status: "IN_PROGRESS",
        progress: 40,
        skillTag: "PostgreSQL & Query Tuning",
      },
      {
        userId,
        phase: 2,
        phaseName: "Core Skills",
        title: "Design a cache-aside layer with Redis",
        description:
          "Add a Redis cache to your placement portal project, including invalidation strategy, TTL policy and a load test showing the hit-rate improvement.",
        priority: "HIGH",
        difficulty: "Intermediate",
        estimatedHours: 9,
        deadline: fromNow(15),
        status: "NOT_STARTED",
        progress: 0,
        skillTag: "Redis & Caching",
      },
      {
        userId,
        phase: 2,
        phaseName: "Core Skills",
        title: "Containerise every service with Docker Compose",
        description:
          "Move your three services behind Compose with health checks, environment isolation and a single-command bootstrap.",
        priority: "MEDIUM",
        difficulty: "Intermediate",
        estimatedHours: 7,
        deadline: fromNow(19),
        status: "NOT_STARTED",
        progress: 15,
        skillTag: "Docker & Kubernetes",
      },
      {
        userId,
        phase: 3,
        phaseName: "Projects",
        title: "Ship the distributed job scheduler to production",
        description:
          "Complete the retry semantics, add observability with structured logs and metrics, and write an architecture README.",
        priority: "HIGH",
        difficulty: "Advanced",
        estimatedHours: 22,
        deadline: fromNow(26),
        status: "IN_PROGRESS",
        progress: 32,
        skillTag: "Distributed Systems",
      },
      {
        userId,
        phase: 3,
        phaseName: "Projects",
        title: "Add integration test coverage above 70%",
        description:
          "Cover the critical paths of your two strongest projects with integration tests running in CI on every push.",
        priority: "MEDIUM",
        difficulty: "Intermediate",
        estimatedHours: 11,
        deadline: fromNow(33),
        status: "NOT_STARTED",
        progress: 0,
        skillTag: "Testing (Unit + Integration)",
      },
      {
        userId,
        phase: 4,
        phaseName: "Interview Preparation",
        title: "Complete 40 timed mock coding rounds",
        description:
          "Two 45-minute timed sessions per week with post-round review notes on the patterns you missed.",
        priority: "HIGH",
        difficulty: "Advanced",
        estimatedHours: 30,
        deadline: fromNow(44),
        status: "IN_PROGRESS",
        progress: 22,
        skillTag: "Data Structures & Algorithms",
      },
      {
        userId,
        phase: 4,
        phaseName: "Interview Preparation",
        title: "Practise 8 system design prompts end to end",
        description:
          "Cover rate limiter, URL shortener, chat, news feed, notification service, payment ledger, search autocomplete and file storage.",
        priority: "HIGH",
        difficulty: "Advanced",
        estimatedHours: 18,
        deadline: fromNow(51),
        status: "NOT_STARTED",
        progress: 0,
        skillTag: "System Design",
      },
      {
        userId,
        phase: 4,
        phaseName: "Interview Preparation",
        title: "Record and review behavioural answers",
        description:
          "Write and record STAR answers for 12 leadership and conflict questions, then review for filler words and structure.",
        priority: "LOW",
        difficulty: "Beginner",
        estimatedHours: 6,
        deadline: fromNow(38),
        status: "NOT_STARTED",
        progress: 0,
        skillTag: "Communication & Behavioural",
      },
      {
        userId,
        phase: 5,
        phaseName: "Placement Readiness",
        title: "Final resume and portfolio audit",
        description:
          "Re-run ATS analysis after the project work lands, resolve every high-severity finding, and update the portfolio site.",
        priority: "MEDIUM",
        difficulty: "Intermediate",
        estimatedHours: 5,
        deadline: fromNow(58),
        status: "NOT_STARTED",
        progress: 0,
        skillTag: "Communication & Behavioural",
      },
      {
        userId,
        phase: 1,
        phaseName: "Foundations",
        title: "Set up the placement preparation workspace",
        description:
          "Create the study tracker, template repositories and daily review checklist.",
        priority: "LOW",
        difficulty: "Beginner",
        estimatedHours: 3,
        deadline: fromNow(-12),
        status: "COMPLETED",
        progress: 100,
        skillTag: "Linux & Bash",
      },
    ]);

    await db.insert(projects).values([
      {
        userId,
        name: "Atlas Job Scheduler",
        description:
          "A distributed job scheduler with at-least-once delivery, exponential backoff and a Go worker pool. Handles 40 k scheduled jobs per day on a single node.",
        role: "Sole developer",
        status: "IN_PROGRESS",
        technologies: ["Go", "PostgreSQL", "Redis", "Docker"],
        skillsDemonstrated: ["Distributed Systems", "Go (Golang)", "PostgreSQL & Query Tuning"],
        githubUrl: "https://github.com/aaravsharma/atlas-scheduler",
        liveUrl: null,
        startDate: fromNow(-64),
        endDate: null,
        readinessImpact: 14,
      },
      {
        userId,
        name: "Campus Placement Portal",
        description:
          "Placement management system used by 320+ students in the department. Role-based access, application tracking and recruiter dashboards.",
        role: "Backend lead (team of 4)",
        status: "SHIPPED",
        technologies: ["TypeScript", "Node.js", "PostgreSQL", "React"],
        skillsDemonstrated: ["REST API Design", "Testing (Unit + Integration)", "PostgreSQL & Query Tuning"],
        githubUrl: "https://github.com/aaravsharma/placement-portal",
        liveUrl: "https://placement.vitdemo.dev",
        startDate: fromNow(-142),
        endDate: fromNow(-38),
        readinessImpact: 18,
      },
      {
        userId,
        name: "CacheBench",
        description:
          "An open-source benchmarking CLI comparing Redis, Memcached and in-process caching under six realistic access patterns.",
        role: "Maintainer",
        status: "SHIPPED",
        technologies: ["Go", "Redis", "GitHub Actions"],
        skillsDemonstrated: ["Redis & Caching", "CI/CD Pipelines", "Go (Golang)"],
        githubUrl: "https://github.com/aaravsharma/cachebench",
        liveUrl: null,
        startDate: fromNow(-96),
        endDate: fromNow(-71),
        readinessImpact: 9,
      },
      {
        userId,
        name: "Logline",
        description:
          "Structured logging and trace-correlation library for Node.js services with zero-dependency JSON output.",
        role: "Sole developer",
        status: "MAINTENANCE",
        technologies: ["TypeScript", "Node.js"],
        skillsDemonstrated: ["REST API Design", "Testing (Unit + Integration)"],
        githubUrl: "https://github.com/aaravsharma/logline",
        liveUrl: "https://www.npmjs.com/package/logline",
        startDate: fromNow(-188),
        endDate: fromNow(-120),
        readinessImpact: 7,
      },
    ]);

    await db.insert(applications).values([
      {
        userId,
        company: "Atlassian",
        role: "Backend Engineer, Intern",
        status: "INTERVIEW",
        appliedAt: fromNow(-16),
        interviewAt: fromNow(4),
        jobUrl: "https://atlassian.com/careers",
        source: "Campus placement cell",
        notes: "Round 2 — system design. Revise rate limiting and consistent hashing.",
        outcome: null,
      },
      {
        userId,
        company: "Zomato",
        role: "SDE-1 Intern",
        status: "SCREENING",
        appliedAt: fromNow(-11),
        interviewAt: null,
        jobUrl: "https://zomato.com/careers",
        source: "Referral — senior from VIT",
        notes: "Follow up with the referral next week if there is no response.",
        outcome: null,
      },
      {
        userId,
        company: "Razorpay",
        role: "Backend Engineering Intern",
        status: "APPLIED",
        appliedAt: fromNow(-7),
        interviewAt: null,
        jobUrl: "https://razorpay.com/careers",
        source: "Company careers page",
        notes: null,
        outcome: null,
      },
      {
        userId,
        company: "Zerodha",
        role: "Software Development Intern",
        status: "SAVED",
        appliedAt: null,
        interviewAt: null,
        jobUrl: "https://zerodha.com/careers",
        source: "Placement portal",
        notes: "Tailor the resume to highlight the market-data project before applying.",
        outcome: null,
      },
      {
        userId,
        company: "Freshworks",
        role: "Software Engineer Intern",
        status: "REJECTED",
        appliedAt: fromNow(-38),
        interviewAt: fromNow(-24),
        jobUrl: "https://freshworks.com/careers",
        source: "Campus drive",
        notes: "Rejected after the coding round — graph problem was not completed in time.",
        outcome: "Coding round — timed out on the graph traversal problem",
      },
      {
        userId,
        company: "Postman",
        role: "Backend Intern",
        status: "WITHDRAWN",
        appliedAt: fromNow(-52),
        interviewAt: null,
        jobUrl: "https://postman.com/company/careers",
        source: "LinkedIn",
        notes: "Withdrew — the role required a 6-month full-time commitment.",
        outcome: "Withdrew voluntarily",
      },
    ]);

    await db.insert(notifications).values([
      {
        userId,
        type: "INTERVIEW_REMINDER",
        title: "Atlassian interview in 4 days",
        body: "Your round-2 system design interview is scheduled. Two preparation tasks are still open in phase 4 of your roadmap.",
        readAt: null,
        createdAt: fromNow(-0.2),
      },
      {
        userId,
        type: "ROADMAP_DEADLINE",
        title: "Query planning task due in 3 days",
        body: "“PostgreSQL indexing and query planning deep dive” is due soon and is currently 40% complete.",
        readAt: null,
        createdAt: fromNow(-1),
      },
      {
        userId,
        type: "RESUME_ANALYSIS",
        title: "Resume v4 analysis complete",
        body: "Your ATS score is 71. Two high-severity findings need attention before you send more applications.",
        readAt: fromNow(-1),
        createdAt: fromNow(-9),
      },
      {
        userId,
        type: "MILESTONE",
        title: "12-day study streak",
        body: "You have studied for at least one hour on 12 consecutive days — your longest streak so far.",
        readAt: fromNow(-2),
        createdAt: fromNow(-2),
      },
      {
        userId,
        type: "WEEKLY_REPORT",
        title: "Your weekly progress report",
        body: "Readiness rose 3 points this week. Distributed systems remains your largest gap against the target role.",
        readAt: fromNow(-3),
        createdAt: fromNow(-3),
      },
    ]);

    await db.insert(activityEvents).values([
      {
        userId,
        type: "SKILL",
        title: "Improved Go (Golang) to 52%",
        detail: "Verified through project work on the Atlas scheduler",
        value: 52,
        createdAt: fromNow(-1),
      },
      {
        userId,
        type: "TASK",
        title: "Completed “Set up the placement preparation workspace”",
        detail: "Phase 1 — Foundations",
        value: 100,
        createdAt: fromNow(-2),
      },
      {
        userId,
        type: "RESUME",
        title: "Uploaded resume version 4",
        detail: "Aarav_Sharma_Resume_v4.pdf · ATS score 71",
        value: 71,
        createdAt: fromNow(-9),
      },
      {
        userId,
        type: "PROJECT",
        title: "Shipped CacheBench v1.2",
        detail: "Added six benchmark scenarios and CI reporting",
        value: 0,
        createdAt: fromNow(-12),
      },
      {
        userId,
        type: "APPLICATION",
        title: "Applied to Razorpay",
        detail: "Backend Engineering Intern",
        value: 0,
        createdAt: fromNow(-7),
      },
      {
        userId,
        type: "STREAK",
        title: "Reached a 12-day study streak",
        detail: "Longest streak to date",
        value: 12,
        createdAt: fromNow(-2),
      },
      {
        userId,
        type: "INTERVIEW",
        title: "Completed mock interview with 7.4/10",
        detail: "System design — rate limiter prompt",
        value: 74,
        createdAt: fromNow(-6),
      },
      {
        userId,
        type: "SKILL",
        title: "Improved PostgreSQL & Query Tuning to 61%",
        detail: "Verified through project work",
        value: 61,
        createdAt: fromNow(-10),
      },
    ]);

    await db.insert(aiMessages).values([
      {
        userId,
        conversationId: "1f6c2f21-0f1c-4d0c-9a2f-1a6bd2f0b211",
        role: "USER",
        content: "What should I learn today?",
        provider: "openai",
        createdAt: fromNow(-1),
      },
      {
        userId,
        conversationId: "1f6c2f21-0f1c-4d0c-9a2f-1a6bd2f0b211",
        role: "ASSISTANT",
        content:
          "Your highest-leverage work today is the PostgreSQL query-planning task: it is due in 3 days, sits at 40%, and targets your second-largest skill gap against the Backend Engineer (SDE-1) role.",
        provider: "rule-based",
        createdAt: fromNow(-1),
      },
    ]);

    cachedUserId = userId;
    return userId;
  })();

  return seeding;
}
