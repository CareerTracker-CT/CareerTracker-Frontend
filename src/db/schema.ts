import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  index,
  real,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * CareerTracker schema.
 * UUID primary keys, FK constraints, indexes on every lookup column used by
 * the dashboard queries, created/updated timestamps, and soft deletion where
 * a record has history value (resumes, projects, applications).
 */

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fullName: varchar("full_name", { length: 120 }).notNull(),
    email: varchar("email", { length: 190 }).notNull().unique(),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    role: varchar("role", { length: 24 }).notNull().default("STUDENT"),
    avatarUrl: text("avatar_url"),
    headline: varchar("headline", { length: 160 }),
    streakDays: integer("streak_days").notNull().default(0),
    onboardingStep: integer("onboarding_step").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("users_email_idx").on(t.email)],
);

export const careerProfiles = pgTable("career_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  college: varchar("college", { length: 160 }),
  degree: varchar("degree", { length: 120 }),
  branch: varchar("branch", { length: 120 }),
  academicYear: varchar("academic_year", { length: 40 }),
  semester: integer("semester"),
  cgpa: real("cgpa"),
  careerGoal: varchar("career_goal", { length: 160 }),
  targetRole: varchar("target_role", { length: 120 }),
  targetCompany: varchar("target_company", { length: 120 }),
  preferredStack: jsonb("preferred_stack").$type<string[]>().notNull().default([]),
  learningStyle: varchar("learning_style", { length: 60 }),
  studyHoursPerDay: real("study_hours_per_day"),
  placementTimelineMonths: integer("placement_timeline_months"),
  summary: text("summary"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const resumes = pgTable(
  "resumes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fileName: varchar("file_name", { length: 190 }).notNull(),
    fileSizeBytes: integer("file_size_bytes").notNull(),
    mimeType: varchar("mime_type", { length: 90 }).notNull(),
    status: varchar("status", { length: 24 }).notNull().default("PENDING"),
    atsScore: integer("ats_score"),
    resumeHealth: varchar("resume_health", { length: 24 }),
    pageCount: integer("page_count"),
    wordCount: integer("word_count"),
    keywordCoverage: integer("keyword_coverage"),
    quantifiedImpactCount: integer("quantified_impact_count"),
    parsedName: varchar("parsed_name", { length: 120 }),
    parsedEmail: varchar("parsed_email", { length: 190 }),
    parsedPhone: varchar("parsed_phone", { length: 40 }),
    summaryStrength: integer("summary_strength"),
    version: integer("version").notNull().default(1),
    isCurrent: boolean("is_current").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("resumes_user_idx").on(t.userId, t.isCurrent)],
);

export const resumeFindings = pgTable(
  "resume_findings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    resumeId: uuid("resume_id")
      .notNull()
      .references(() => resumes.id, { onDelete: "cascade" }),
    category: varchar("category", { length: 30 }).notNull(),
    severity: varchar("severity", { length: 12 }).notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    detail: text("detail").notNull(),
    whyItMatters: text("why_it_matters").notNull(),
    recommendation: text("recommendation").notNull(),
  },
  (t) => [index("resume_findings_resume_idx").on(t.resumeId)],
);

export const skills = pgTable(
  "skills",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 80 }).notNull(),
    category: varchar("category", { length: 60 }).notNull(),
    currentLevel: integer("current_level").notNull(),
    requiredLevel: integer("required_level").notNull(),
    priority: varchar("priority", { length: 12 }).notNull(),
    progress: integer("progress").notNull().default(0),
    trendDelta: integer("trend_delta").notNull().default(0),
    lastPracticedAt: timestamp("last_practiced_at", { withTimezone: true }),
    verifiedBy: varchar("verified_by", { length: 40 }),
  },
  (t) => [index("skills_user_idx").on(t.userId, t.priority)],
);

export const roadmapTasks = pgTable(
  "roadmap_tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    phase: integer("phase").notNull(),
    phaseName: varchar("phase_name", { length: 80 }).notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    description: text("description").notNull(),
    priority: varchar("priority", { length: 12 }).notNull(),
    difficulty: varchar("difficulty", { length: 16 }).notNull(),
    estimatedHours: integer("estimated_hours").notNull(),
    deadline: timestamp("deadline", { withTimezone: true }),
    status: varchar("status", { length: 16 }).notNull().default("NOT_STARTED"),
    progress: integer("progress").notNull().default(0),
    skillTag: varchar("skill_tag", { length: 80 }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [index("roadmap_user_phase_idx").on(t.userId, t.phase)],
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 140 }).notNull(),
    description: text("description").notNull(),
    role: varchar("role", { length: 90 }),
    status: varchar("status", { length: 20 }).notNull(),
    technologies: jsonb("technologies").$type<string[]>().notNull().default([]),
    skillsDemonstrated: jsonb("skills_demonstrated").$type<string[]>().notNull().default([]),
    githubUrl: text("github_url"),
    liveUrl: text("live_url"),
    startDate: timestamp("start_date", { withTimezone: true }),
    endDate: timestamp("end_date", { withTimezone: true }),
    readinessImpact: integer("readiness_impact").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("projects_user_idx").on(t.userId)],
);

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    company: varchar("company", { length: 140 }).notNull(),
    role: varchar("role", { length: 140 }).notNull(),
    status: varchar("status", { length: 16 }).notNull(),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    interviewAt: timestamp("interview_at", { withTimezone: true }),
    jobUrl: text("job_url"),
    source: varchar("source", { length: 80 }),
    notes: text("notes"),
    outcome: varchar("outcome", { length: 180 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("applications_user_idx").on(t.userId, t.status)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 30 }).notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    body: text("body").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.readAt)],
);

export const activityEvents = pgTable(
  "activity_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 30 }).notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    detail: text("detail"),
    value: integer("value"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("activity_user_idx").on(t.userId, t.createdAt)],
);

export const aiMessages = pgTable(
  "ai_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id").notNull(),
    role: varchar("role", { length: 12 }).notNull(),
    content: text("content").notNull(),
    provider: varchar("provider", { length: 30 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ai_messages_conv_idx").on(t.conversationId, t.createdAt)],
);

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(careerProfiles, {
    fields: [users.id],
    references: [careerProfiles.userId],
  }),
  resumes: many(resumes),
  skills: many(skills),
  roadmapTasks: many(roadmapTasks),
  projects: many(projects),
  applications: many(applications),
  notifications: many(notifications),
  activity: many(activityEvents),
}));
