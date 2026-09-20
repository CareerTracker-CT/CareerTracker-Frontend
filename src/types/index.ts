/**
 * Shared API contract types used by both the frontend service layer and the
 * versioned REST handlers under /api/v1.
 */

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiFailure {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export type Role =
  | "STUDENT"
  | "MENTOR"
  | "RECRUITER"
  | "COLLEGE_ADMIN"
  | "PLATFORM_ADMIN"
  | "SUPER_ADMIN";

export type Priority = "HIGH" | "MEDIUM" | "LOW";
export type TaskStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED";
export type ApplicationStatus =
  | "SAVED"
  | "APPLIED"
  | "SCREENING"
  | "INTERVIEW"
  | "OFFER"
  | "REJECTED"
  | "WITHDRAWN";

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  headline: string | null;
  streakDays: number;
  onboardingStep: number;
  createdAt: string;
}

export interface CareerProfile {
  college: string | null;
  degree: string | null;
  branch: string | null;
  academicYear: string | null;
  semester: number | null;
  cgpa: number | null;
  careerGoal: string | null;
  targetRole: string | null;
  targetCompany: string | null;
  preferredStack: string[];
  learningStyle: string | null;
  studyHoursPerDay: number | null;
  placementTimelineMonths: number | null;
  summary: string | null;
}

export interface ResumeFinding {
  id: string;
  category: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  detail: string;
  whyItMatters: string;
  recommendation: string;
}

export interface ResumeRecord {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  status: string;
  atsScore: number | null;
  resumeHealth: string | null;
  pageCount: number | null;
  wordCount: number | null;
  keywordCoverage: number | null;
  quantifiedImpactCount: number | null;
  summaryStrength: number | null;
  version: number;
  isCurrent: boolean;
  createdAt: string;
  findings: ResumeFinding[];
}

export interface SkillRecord {
  id: string;
  name: string;
  category: string;
  currentLevel: number;
  requiredLevel: number;
  priority: Priority;
  progress: number;
  trendDelta: number;
  verifiedBy: string | null;
  lastPracticedAt: string | null;
}

export interface RoadmapTask {
  id: string;
  phase: number;
  phaseName: string;
  title: string;
  description: string;
  priority: Priority;
  difficulty: string;
  estimatedHours: number;
  deadline: string | null;
  status: TaskStatus;
  progress: number;
  skillTag: string | null;
}

export interface ProjectRecord {
  id: string;
  name: string;
  description: string;
  role: string | null;
  status: string;
  technologies: string[];
  skillsDemonstrated: string[];
  githubUrl: string | null;
  liveUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  readinessImpact: number;
}

export interface ApplicationRecord {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  appliedAt: string | null;
  interviewAt: string | null;
  jobUrl: string | null;
  source: string | null;
  notes: string | null;
  outcome: string | null;
}

export interface NotificationRecord {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export interface ActivityEvent {
  id: string;
  type: string;
  title: string;
  detail: string | null;
  value: number | null;
  createdAt: string;
}

export interface ReadinessDimension {
  key: string;
  label: string;
  value: number;
  weight: number;
  status: string;
  missingItems: string[];
  nextAction: string;
}

export interface DashboardPayload {
  user: UserProfile;
  profile: CareerProfile | null;
  readiness: {
    overall: number;
    band: string;
    methodology: string;
    dimensions: ReadinessDimension[];
  };
  metrics: {
    atsScore: number | null;
    skillsOnTrack: number;
    skillsTotal: number;
    roadmapProgress: number;
    tasksCompleted: number;
    tasksTotal: number;
    projectsCount: number;
    interviewPrep: number;
    applicationsCount: number;
    applicationsActive: number;
    studyHoursThisWeek: number;
  };
  todayTasks: RoadmapTask[];
  skillGaps: SkillRecord[];
  recommendations: {
    id: string;
    title: string;
    reason: string;
    actionLabel: string;
    href: string;
    impact: "high" | "medium" | "low";
  }[];
  activity: ActivityEvent[];
  milestones: {
    id: string;
    title: string;
    detail: string;
    achievedAt: string | null;
    progress: number;
    threshold: number;
    unit: string;
  }[];
  weeklyProgress: { week: string; readiness: number; hoursStudied: number }[];
}
