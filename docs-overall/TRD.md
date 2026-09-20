# 🛠 Technical Requirements Document (TRD) — CareerTracker

---

## 1. Frontend Stack & Architecture

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4, PostCSS, Lucide React Icons
- **UI Components**: ShadCN UI primitives, custom CareerTracker design system
- **Motion**: Framer Motion (respects `prefers-reduced-motion`)
- **State Management**:
  - **Server State**: TanStack Query v5 (caching, background revalidation)
  - **Client UI State**: Zustand v5 (ephemeral UI drawer, theme, draft state)
- **Forms & Validation**: React Hook Form + Zod validation schemas + `@hookform/resolvers`

### Frontend Rules
- **Strict TypeScript**: No `any` types allowed.
- **Functional Components Only**: Modern React hooks and server/client component paradigms.
- **Feature-Based Architecture**: Modular organization (`components/layout`, `components/charts`, `components/brand`, `components/ui`, `components/shared`).
- **Accessibility & Responsiveness**: WCAG AA standards, mobile-first responsive grid.
- **Zero Generic Templates**: Clean, bespoke UI code matching product guidelines.

---

## 2. Backend Stack & Architecture

- **Core Framework**: NestJS 11 (Modular Monolith) with Node.js & TypeScript
- **Alternative / Fallback**: Next.js API Routes (`src/app/api/v1/*`)
- **Communication Protocol**: RESTful API with versioning (`/api/v1`)
- **JSON Envelope Standard**:
  - Success: `{ "success": true, "data": T, "meta"?: object }`
  - Error: `{ "success": false, "error": { "code": string, "message": string, "details"?: unknown } }`

---

## 3. Database Layer

- **Database Engine**: PostgreSQL 16+ (Supabase / Neon / AWS RDS)
- **ORM & Data Access**: Prisma ORM v6 (Backend) & Drizzle ORM (Frontend API Route fallback)
- **Data Integrity**: UUID primary keys, foreign key constraints with cascade rules, indexed lookup columns, soft deletion support (`deletedAt`).

---

## 4. Authentication & Security

- **Authentication Providers**:
  - Local Email/Password with Argon2id hashing
  - OAuth 2.0 via Google & GitHub
  - Email verification & password reset workflows
- **Token Security**:
  - Short-lived Access Tokens (15 min) in Authorization Bearer headers
  - Long-lived Refresh Tokens (7 days) stored in `HttpOnly`, `SameSite=Strict`, `Secure` cookies
- **Protective Security Controls**:
  - Helmet HTTP security headers (CSP, HSTS, frame-ancestors)
  - Rate limiting via `@nestjs/throttler` (Redis-backed token bucket)
  - CSRF protection, XSS output encoding, and input validation DTOs (`class-validator`)
  - Strict Role-Based Access Control (RBAC)

---

## 5. AI Services & Provider Architecture

- **Primary Provider**: OpenAI GPT-5.5 / GPT-4o
- **Secondary / Optional Providers**: Anthropic Claude, Google Gemini, xAI Grok
- **Pluggable Architecture**: `AIProviderRegistry` interface pattern decoupling core application logic from specific AI vendors.
- **Graceful Fallback**: Automatic retry with exponential backoff (`400ms`, `800ms`); falls back to a deterministic, data-grounded rule engine if AI services are unavailable.

---

## 6. AI Pipeline & Execution Lifecycle

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Resume Upload  │ ──► │  Resume Parsing │ ──► │Skill Extraction │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
┌─────────────────┐     ┌─────────────────┐              ▼
│  Readiness      │ ◄── │ Skill Gap       │ ◄── ┌─────────────────┐
│  Score Calc     │     │ Detection       │     │  ATS Analysis   │
└────────┬────────┘     └─────────────────┘     └─────────────────┘
         │
         ▼              ┌─────────────────┐     ┌─────────────────┐
┌─────────────────┐ ──► │ Dashboard       │ ──► │  AI Summary &   │
│  Roadmap Gen    │     │ Update          │     │  Recommendations│
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

> **Pipeline Guarantee:** Each stage in the pipeline must be independently retryable, observable, and isolated from downstream failures.

---

## 7. API Endpoints Contract Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Register new user account |
| `POST` | `/api/v1/auth/login` | Authenticate user & issue refresh cookie |
| `POST` | `/api/v1/auth/refresh` | Issue new access token |
| `POST` | `/api/v1/auth/logout` | Revoke session & clear cookies |
| `GET` | `/api/v1/profile` | Retrieve user career profile |
| `PUT` / `PATCH` | `/api/v1/profile` | Update profile and placement goals |
| `POST` | `/api/v1/resume/upload` | Upload resume file |
| `POST` | `/api/v1/resume/analyze` | Trigger AI resume ATS analysis |
| `GET` | `/api/v1/resume/history` | Fetch historical resume uploads |
| `GET` | `/api/v1/ats` | Fetch latest ATS audit score & findings |
| `GET` | `/api/v1/dashboard` | Fetch overall student dashboard metrics |
| `POST` | `/api/v1/roadmap/generate`| Generate AI personalized learning roadmap |
| `GET` | `/api/v1/roadmap` | Fetch roadmap phases and tasks |
| `PATCH` | `/api/v1/roadmap/task` | Update task completion status |
| `GET` / `POST` | `/api/v1/projects` | Fetch/Create portfolio projects |
| `GET` | `/api/v1/interviews` | Fetch interview preparation drills |
| `POST` | `/api/v1/chat` | AI Career Coach context interaction |
| `GET` | `/api/v1/notifications` | Fetch user alerts |
| `POST` | `/api/v1/settings` | Update user preferences & security settings |

---

## 8. File Storage & Caching

- **File Storage**: AWS S3 / Cloudflare R2 / Supabase Storage for resume PDFs, avatar images, project screenshots, and certificates. Max file size: 10 MB.
- **Caching**: Redis (IORedis) caching layer for dashboard metrics, roadmap templates, AI response cache, and rate-limiting buckets.

---

## 9. Background Jobs & Queues

- **Queue Framework**: BullMQ + Redis
- **Workers**:
  - Async resume re-analysis and parsing
  - Daily study plan & progress recalculation
  - Weekly AI summary report generation
  - In-app and email notification dispatching

---

## 10. Performance Targets & Code Quality

- **Lighthouse Score**: 95+ across Performance, Accessibility, Best Practices, and SEO.
- **Code Quality**: ESLint, Prettier, Husky pre-commit hooks, Jest unit tests, Supertest E2E integration, GitHub Actions CI/CD pipelines.
- **Strict AI Rule**: Never expose API keys, never invent user metrics in production, centralize prompt templates, and verify every phase before proceeding.
