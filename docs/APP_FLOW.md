# 🧭 Application Flow & Navigation Logic — CareerTracker

---

## 1. User Onboarding & Navigation Journeys

### First-Time User Flow
```
Landing Page ──► Register ──► Email Verification ──► Login
                                                      │
                                                      ▼
Dashboard ◄── Skill Gap ◄── ATS Analysis ◄── Parse ◄── Resume Upload ◄── Career Profile Modal
```

### Returning User Flow
```
Login ──► Onboarding Complete?
            ├── YES ──► Dashboard
            └── NO  ──► Resume / Profile Completion ──► Dashboard
```

---

## 2. Main Navigation Structure

### Sidebar Navigation Layout
- 📊 **Dashboard** (`/dashboard`): Placement readiness score, streak, today's tasks, quick actions.
- 📄 **Resume Audit** (`/resume`): Resume upload, ATS compatibility score, missing keywords, structural fixes.
- ⚡ **Skill Matrix** (`/skills`): Current skills, target role requirement comparison, priority gaps.
- 🗺️ **Personalized Roadmap** (`/roadmap`): Phase-by-phase learning tasks, progress tracking, deadlines.
- 📁 **Projects Portfolio** (`/projects`): Portfolio project tracker, tech stack tags, live/GitHub links.
- 📚 **Learning Hub** (`/learning`): Curated learning resources, daily study log tracker.
- 🎤 **Interview Prep** (`/interviews`): Role-based interview question banks and mock drills.
- 🤖 **AI Assistant** (`/assistant`): Contextual AI placement coach chat.
- 💼 **Applications** (`/applications`): Internship & job application Kanban/table tracker.
- 📈 **Progress Analytics** (`/progress`): Readiness growth trajectories over time.
- 🔔 **Notifications** (`/notifications`): Real-time activity logs and system alerts.
- ⚙️ **Settings** (`/settings`): Account, security, notifications, AI preferences.
- 👤 **Profile** (`/profile`): User identity, academic background, career target.

---

## 3. Subsystem Detailed Flows

### Resume Analysis Flow
$$\text{Upload Resume} \longrightarrow \text{Validation} \longrightarrow \text{Parsing} \longrightarrow \text{ATS Analysis} \longrightarrow \text{ATS Score} \longrightarrow \text{Findings \& Recommendations}$$

- **User Actions**: Upload new file, re-analyze existing resume, inspect analysis history, view recommendations.

### Skill Gap Flow
$$\text{Current Skills} \longrightarrow \text{Target Role} \longrightarrow \text{Required Skills} \longrightarrow \text{Gap Calculation} \longrightarrow \text{Resource Mapping} \longrightarrow \text{Progress Update}$$

### Roadmap Generation Flow
$$\text{User Request} \longrightarrow \text{Context Builder (Profile + Resume + Skills)} \longrightarrow \text{AI Generation} \longrightarrow \text{Phase Tasks} \longrightarrow \text{Task Complete} \longrightarrow \text{Recalculate Score}$$

### AI Assistant Conversation Flow
$$\text{User Prompt} \longrightarrow \text{Context Assembly} \longrightarrow \text{AI Provider Registry} \longrightarrow \text{Stream Response} \longrightarrow \text{Persist Message}$$

- **Context Assembly**: Injects profile details, career goal, ATS score, top 5 skill gaps, next 3 roadmap tasks, daily study availability, and past conversation history into system prompt.

---

## 4. Edge Cases & Error Handling

| Scenario | System Behavior | Next Recommended Action |
| :--- | :--- | :--- |
| **No Resume Uploaded** | Displays empty state card: *"No resume uploaded yet"* | Primary CTA button: `Upload Resume` |
| **Failed Resume Analysis** | Shows friendly error explaining parsing failure | Action button: `Retry Analysis` |
| **No Skill Gaps Found** | Displays positive completion state badge | Action button: `Explore Advanced Electives` |
| **AI Service Downtime** | Fallback to deterministic grounded rule engine | Displays info banner: *"Using Grounded Engine"* |
| **No Roadmap Created** | Displays initial roadmap builder callout | Action button: `Generate My Roadmap` |
| **Network Failure** | Renders stale-while-revalidate cached UI data | Toast alert + `Retry Connection` button |

---

## 5. Core Navigation Rule

> **The Golden Flow Rule:** Every screen and action must follow:
> $$\text{Screen} \longrightarrow \text{User Action} \longrightarrow \text{Result} \longrightarrow \text{Next Recommended Action}$$
> The user should **never** reach a dead end.
