# 🗄 Backend Schema Blueprint — CareerTracker

---

## 1. Entity Relationship Overview

```
                      ┌──────────────────────┐
                      │        User          │
                      └──────────┬───────────┘
                                 │
     ┌───────────────────┬───────┴───────┬───────────────────┐
     │ 1:1               │ 1:N           │ 1:N               │ 1:N
     ▼                   ▼               ▼                   ▼
┌─────────┐         ┌─────────┐     ┌─────────┐         ┌─────────┐
│ Career  │         │ Resume  │     │ Skill   │         │ Roadmap │
│ Profile │         └────┬────┘     └─────────┘         │ Task    │
└─────────┘              │ 1:N                          └─────────┘
                         ▼
                    ┌─────────┐
                    │ Resume  │
                    │ Finding │
                    └─────────┘
```

---

## 2. Core Entity Definitions

### `users`
- `id` (UUID, Primary Key)
- `full_name` (VarChar 150, Not Null)
- `email` (VarChar 255, Unique, Index)
- `password_hash` (Text, Nullable for OAuth)
- `avatar_url` (Text, Nullable)
- `role` (Enum: `STUDENT`, `MENTOR`, `RECRUITER`, `COLLEGE_ADMIN`, `PLATFORM_ADMIN`, `SUPER_ADMIN`)
- `streak_days` (Integer, Default: 0)
- `onboarding_step` (Integer, Default: 0)
- `created_at` (Timestamp), `updated_at` (Timestamp), `deleted_at` (Timestamp, Soft Delete)

### `career_profiles`
- `id` (UUID, Primary Key)
- `user_id` (UUID, Unique FK → `users.id`, Cascade Delete)
- `college` (VarChar 160), `degree` (VarChar 120), `branch` (VarChar 120)
- `academic_year` (VarChar 40), `semester` (Integer), `cgpa` (Float)
- `career_goal` (VarChar 160), `target_role` (VarChar 120), `target_company` (VarChar 120)
- `preferred_stack` (Text Array / JSONB), `learning_style` (VarChar 60)
- `study_hours_per_day` (Float), `placement_timeline_months` (Integer)

### `resumes`
- `id` (UUID, Primary Key)
- `user_id` (UUID, FK → `users.id`, Cascade Delete)
- `file_name` (VarChar 190), `storage_key` (VarChar 255), `file_size_bytes` (Integer)
- `status` (Enum: `PENDING`, `PROCESSING`, `ANALYSED`, `FAILED`)
- `ats_score` (Integer 0-100), `resume_health` (VarChar 24)
- `keyword_coverage` (Integer), `quantified_impact_count` (Integer)
- `version` (Integer), `is_current` (Boolean)

### `resume_findings`
- `id` (UUID, Primary Key)
- `resume_id` (UUID, FK → `resumes.id`, Cascade Delete)
- `category` (VarChar 30), `severity` (Enum: `HIGH`, `MEDIUM`, `LOW`)
- `title` (VarChar 160), `detail` (Text), `recommendation` (Text)

### `skills`
- `id` (UUID, Primary Key)
- `user_id` (UUID, FK → `users.id`, Cascade Delete)
- `name` (VarChar 80), `category` (VarChar 60)
- `current_level` (Integer 1-10), `required_level` (Integer 1-10)
- `priority` (Enum: `HIGH`, `MEDIUM`, `LOW`), `progress` (Integer 0-100)

### `roadmap_tasks`
- `id` (UUID, Primary Key)
- `user_id` (UUID, FK → `users.id`, Cascade Delete)
- `phase` (Integer), `phase_name` (VarChar 80), `title` (VarChar 160)
- `difficulty` (VarChar 16), `estimated_hours` (Integer), `deadline` (Timestamp)
- `status` (Enum: `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`, `SKIPPED`)

### Additional Entities
`projects`, `applications`, `notifications`, `activity_events`, `ai_messages`, `certifications`, `learning_resources`, `achievements`.

---

## 3. Data Integrity & Security Rules

1. **UUID Primary Keys**: All tables use UUIDv4 primary keys.
2. **Foreign Key Integrity**: Enforce ON DELETE CASCADE for user-owned records.
3. **Indexing Strategy**: Indexes placed on lookup columns (`user_id`, `status`, `target_role`, `email`).
4. **Soft Deletes**: Retain deleted user assets (`deletedAt` timestamps).
5. **Secret Masking**: Password hashes and refresh tokens are strictly excluded from API response serializers.
