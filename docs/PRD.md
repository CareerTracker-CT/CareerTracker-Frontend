# 📄 Product Requirements Document (PRD) — CareerTracker

---

## 1. App Name & One-Line Pitch

**CareerTracker** — AI-powered career development and placement preparation platform that helps students identify skill gaps, improve resumes, build personalized career roadmaps, prepare for interviews, and become placement-ready.

> **Tagline:** Track Skills. Build Your Career. Get Hired.

---

## 2. Problem Statement

Students preparing for internships and placements often struggle to understand:

- What skills they are currently missing
- Whether their resume is actually ATS-friendly
- What they should learn next
- Which projects they should build
- How prepared they are for placements
- How to prepare for specific companies and roles
- Whether their preparation is actually improving

**CareerTracker** solves this by acting as an **AI Career Mentor** that understands the student's resume, skills, academic background, career goals, progress, and preparation timeline.

> **Core Objective:** The objective is not simply learning. The objective is **measurable placement readiness**.

---

## 3. Target Audience

### Primary Users
- College students
- University students
- Final-year students
- Fresh graduates
- Internship seekers
- Placement-seeking students

### Institutional Users
- Colleges & Universities
- Training institutes
- Placement cells & career centers

### Future Users
- Mentors & Alumni
- Recruiters & HR teams
- Career coaches

---

## 4. Core MVP Features

### 1. Authentication
- Email/password registration & login
- Google OAuth & GitHub OAuth integration
- Email verification & password reset flows
- Secure session management with HTTP-only cookies

### 2. Career Profile
Students provide:
- Academic year, semester, degree, branch, college, CGPA
- Career goal & dream target companies
- Preferred programming languages & technologies
- Preferred learning style, daily study availability, placement timeline

### 3. Resume Analysis
Users can:
- Upload resumes (PDF/DOCX)
- Parse resume structure and skills using AI
- Receive an overall ATS compatibility score & resume health metrics
- View missing skills and granular improvement recommendations
- Track analysis history across resume iterations

### 4. Skill Gap Analysis
CareerTracker compares:
$$\text{Current Skills} \longrightarrow \text{Target Role Requirements} \longrightarrow \text{Skill Gaps}$$
Users can view:
- Current proficiency level vs. target required level
- Skill priority rating (High / Medium / Low)
- Growth progress percentage & trend deltas
- Recommended curated learning resources

### 5. Personalized Roadmap
AI generates a tailored roadmap based on:
- Career goal, resume content, extracted skills, academic semester, branch, current progress, and placement timeline.

Each roadmap task contains:
- Phase & Task title
- Detailed task description
- Priority & Difficulty rating
- Estimated completion hours
- Target deadline & completion status

### 6. Dashboard & Progress
The dashboard displays:
- Overall Career Readiness Score (0-100)
- ATS Resume Health Score
- Skill Growth progress ring & bar distributions
- Today's prioritized tasks
- Personalized roadmap progress
- Recommended portfolio projects & learning resources
- Recent activity feed & upcoming placement milestones

### 7. AI Career Assistant
An interactive AI placement assistant that uses full student context to answer career questions.
It understands:
- User profile, career goals, resume content, ATS report, skill matrix, learning roadmap, portfolio projects, learning progress, recent activity, and conversation history.

---

## 5. Future Features (Phase 2+)

- **Recruiter Portal**: Candidate search, skill verification, job postings.
- **Mentor Portal**: Student guidance, mock interview reviews.
- **College Dashboard**: Batch readiness analytics, placement cell tracking.
- **Mobile Applications**: Native iOS & Android apps.
- **Community & Collaboration**: Discussion forums, study groups, coding challenges, peer reviews.
- **Gamification**: Leaderboards, milestone badges, activity streak rewards.
- **Enterprise Integrations**: LMS and college portal connectors.

---

## 6. Non-Goals

CareerTracker MVP will **NOT**:
- Become a generic Learning Management System (LMS)
- Provide unnecessary entertainment features or distracting clutter
- Use fake placement statistics or manufactured growth numbers
- Generate misleading analytics without underlying user data
- Add random AI features without clear product value
- Become a social media platform
- Overload the dashboard with unnecessary cards or information
- Use generic AI-generated UI templates

---

## 7. Success Metrics

Product success is tracked via real, empirical user telemetry:
- Resume uploads & analysis completion rates
- ATS score improvements over time
- Skill-gap resolution and completion counts
- Roadmap task completion velocity
- Daily/Weekly active learning activity
- Portfolio project completion rate
- User retention and placement preparation progress

---

## 8. Product Principles

- **Simplicity**: Clear, clutter-free user interfaces focused on action.
- **Personalization**: Every recommendation is tailored to the specific user's goals.
- **Transparency**: Every recommendation explains *why* it exists and *how* it helps.
- **Professionalism**: Clean, enterprise-grade aesthetic for serious career growth.
- **Speed**: Snappy transitions, skeleton loaders, and instant UI feedback.
- **Trust**: Honest data without fake figures or vanity metrics.

---

## 9. Monetization Model

Monetization remains configurable rather than hardcoded into the MVP:
- **Free Student Tier**: Core profiling, basic ATS scoring, basic roadmap.
- **Premium AI Tier**: Unlimited AI coaching, deep ATS structural audits, custom interview drills.
- **Institutional Plans**: College-wide dashboards, batch analytics, placement cell reports.
- **Recruiter Plans**: Candidate sourcing and verified skill talent pipelines.

---

## 10. Definition of Success

A successful CareerTracker user should feel:
> *"This platform understands my career goals."*
> *"I know exactly what to do next."*
> *"I can clearly see my progress."*
> *"My recommendations are personalized."*
> *"I feel more confident about placements."*

CareerTracker succeeds when it evolves from a placement-preparation tool into a comprehensive **AI Career Operating System**.
