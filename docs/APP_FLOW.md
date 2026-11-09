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
```
Upload resume + JD
      │
      ▼
Extract both documents in memory
      │
      ▼
Detect advertised positions in the JD
      ├── 0 or 1 position ──► whole-JD evidence analysis ──► Overview / Evidence / Inspection
      │                         (no title shows a neutral “no position title” note)
      ├── 2+ confident positions ──► compact role-selection panel (no preselection)
      │                              └── choose one + Analyze ──► server validates token
      │                                                          and scores only that position
      ├── possible multiple, <2 reliable boundaries
      │        └── no score; review-only sections; “Provide a one-position description”
      └── unreliable boundaries (≥2 headings, one unsupported)
               └── only supported sections are selectable; others are review-only

Results header shows the analyzed position.
“Change position” clears the score, keeps the files, and reopens the selection panel.
```

- **User Actions**: Upload a resume and JD, review extracted text, select one advertised position when required, analyze, change the selected position without re-uploading, inspect requirement evidence, inspect document readability, review saved-record history separately.
- **Scope safety**: qualifications from other positions are excluded; preamble requirements are inherited only when they explicitly cover all positions. Unsupported or ambiguous statements in the selected position still withhold the score. If the notice announces more than one position but a reliable split cannot be established, the score is withheld entirely; the UI does not invent boundaries or offer an aggregate.

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
| **Multiple Positions in JD** | Shows compact selection panel; returns no aggregate score and preselects nothing | Choose the position you are applying for |
| **Possible Multiple Positions, No Reliable Split** | Shows a neutral structural-uncertainty explanation, no radios and no Analyze action; explicit status is `possible_multiple` | Paste/upload a description for one position |
| **Unreliable Position Boundaries** | Shows all sections for review but only enables sections with their own qualification text; status is `unreliable_boundaries` | Choose a supported section or supply a single-position JD |
| **One Identified Position / No Recognized Title** | Whole-JD analysis proceeds; Overview says “Position identified” or neutrally notes that no title was recognized | Confirm the description covers one position |
| **Stale / Invalid Position Selection** | Server rejects `ROLE_SELECTION_INVALID`; no score from another role is shown | Re-select from the current document |
| **Unresolved Boundary Token** | Server rejects `ROLE_BOUNDARIES_UNRESOLVED` and never falls back to an aggregate | Supply a one-position description |
| **Role Changed After Analysis** | Previous score is cleared immediately; files and candidates are retained | Analyze the newly selected position |
| **No Skill Gaps Found** | Displays positive completion state badge | Action button: `Explore Advanced Electives` |
| **AI Service Downtime** | Fallback to deterministic grounded rule engine | Displays info banner: *"Using Grounded Engine"* |
| **No Roadmap Created** | Displays initial roadmap builder callout | Action button: `Generate My Roadmap` |
| **Network Failure** | Renders stale-while-revalidate cached UI data | Toast alert + `Retry Connection` button |

---

## 5. Core Navigation Rule

> **The Golden Flow Rule:** Every screen and action must follow:
> $$\text{Screen} \longrightarrow \text{User Action} \longrightarrow \text{Result} \longrightarrow \text{Next Recommended Action}$$
> The user should **never** reach a dead end.
