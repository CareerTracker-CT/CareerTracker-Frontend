# 🎨 CareerTracker Frontend Web Application

A high-performance, modern career development and placement preparation platform built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**, **Tailwind CSS v4**, **TanStack Query**, and **Zustand**. Designed for maximum accessibility, smooth motion transitions, responsive layout controls, and real-time placement tracking.

---

## 📑 Documentation Quick Links

- 📜 **[API Contract Specification](./docs/API_CONTRACT.md)** — Frontend REST API Request & Response payload contract schemas.
- 📄 **[Product Requirements Document (PRD)](../docs/PRD.md)** — Core product pitch, target audience, MVP features & non-goals.
- 🛠️ **[Technical Requirements Document (TRD)](../docs/TRD.md)** — Technical stack rules, AI pipeline, caching, and CI/CD.
- 🧭 **[App Flow & Navigation Logic](../docs/APP_FLOW.md)** — Navigation journeys, user flows, and edge-case matrix.
- 🎨 **[UI/UX Design Brief](../docs/UI_UX_DESIGN_BRIEF.md)** — Design tokens, 8pt spacing grid, typography, and accessibility rules.
- 🗄️ **[Backend Schema Blueprint](../docs/BACKEND_SCHEMA.md)** — Database models, entity relationships, and indexes.
- 🚀 **[Phased Implementation Plan](../docs/IMPLEMENTATION_PLAN.md)** — 15-phase implementation roadmap and execution rules.

---

## 📑 Table of Contents

- [Architectural Principles & Rules](#-architectural-principles--rules)
- [Tech Stack & Tools](#-tech-stack--tools)
- [Directory & Component Layout](#-directory--component-layout)
- [Application Pages & Features](#-application-pages--features)
- [State Management & Data Flow](#-state-management--data-flow)
- [Design Tokens & UI System](#-design-tokens--ui-system)
- [Environment Configuration](#-environment-configuration)
- [Getting Started & Local Setup](#-getting-started--local-setup)
- [Available Scripts](#-available-scripts)

---

## 🏛 Architectural Principles & Rules

The frontend application strictly enforces 5 core engineering rules to maintain high code quality, predictability, and maintainability across the codebase:

```
                                  ┌───────────────────────────┐
                                  │   React 19 UI Component   │
                                  └─────────────┬─────────────┘
                                                │
                     ┌──────────────────────────┴──────────────────────────┐
                     │                                                     │
                     ▼ (Server State)                                      ▼ (Ephemeral UI State)
       ┌───────────────────────────┐                         ┌───────────────────────────┐
       │   TanStack Query Hook     │                         │   Zustand Store           │
       │   (useQuery / useMutation)│                         │   ([src/store/ui.ts](./src/store/ui.ts))│
       └─────────────┬─────────────┘                         └───────────────────────────┘
                     │
                     ▼ HTTP / REST (Axios)
       ┌───────────────────────────┐
       │     [src/lib/api.ts](./src/lib/api.ts)       │
       └─────────────┬─────────────┘
                     │ Interceptor catches 401 --> emits 'ct:session-expired'
                     ▼
       ┌───────────────────────────┐
       │     /api/v1/* Routes      │
       └─────────────┬─────────────┘
                     │
          ┌──────────┴───────────────────────┐
          ▼                                  ▼
┌──────────────────┐               ┌──────────────────┐
│ Next.js Handlers │               │  NestJS Backend  │
│  (Drizzle ORM)   │               │   (Port 4000)    │
└──────────────────┘               └──────────────────┘
```

### 🎯 The 5 Core Architecture Rules

1. **Zero Direct DB Access from Components**: UI components never touch database layers or ORMs directly. All data operations are requested via `/api/v1/*` using versioned endpoints specified in [`docs/API_CONTRACT.md`](./docs/API_CONTRACT.md).
2. **Feature-First Component Organization**: Code is structured into dedicated modular directories under [`src/components/`](./src/components):
   - [`src/components/layout/`](./src/components/layout) — App shell, site header, page headers, navigation footers.
   - [`src/components/charts/`](./src/components/charts) — Readiness score rings, skill bar distributions, analytics graphs.
   - [`src/components/brand/`](./src/components/brand) — Logos, identity icons, brand tokens.
   - [`src/components/ui/`](./src/components/ui) — Atomic UI primitives (buttons, badges, feedback state cards).
   - [`src/components/shared/`](./src/components/shared) — Motion wrappers, theme toggles, modal dialogs.
3. **Strict State Segregation**: Server state is exclusively managed by **TanStack Query** (caching, revalidation, optimistic updates). **Zustand** is reserved strictly for client-side ephemeral UI state ([`src/store/ui.ts`](./src/store/ui.ts)).
4. **Comprehensive UX State Standard**: Every screen and widget implements 3 non-negotiable UX states:
   - **Skeleton Loading**: Accessible layout pulse placeholders while data fetches.
   - **Informative Empty State**: Explains *what is missing → why it matters → clear action button to get started*.
   - **Resilient Error State**: User-friendly error message paired with an immediate retry/recovery button.
5. **Uncompromised Accessibility (WCAG)**: Visible focus rings on interactable elements, semantic HTML5 landmarks (`main`, `nav`, `header`), full keyboard nav compliance, tabular numbers (`font-mono` / `tnum`) for metrics, and color contrast standards.

---

## 🛠 Tech Stack & Tools

| Category | Technology / Library | Purpose |
| :--- | :--- | :--- |
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) | Modern React framework with Server Components, SSR, and API route handlers |
| **UI Library** | [React 19](https://react.dev/) | Component-based UI library with Concurrent Features and Server Actions |
| **Language** | [TypeScript 5.9](https://www.typescriptlang.org/) | Type-safe development with strict compiler flags |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) + PostCSS | Utility-first CSS engine with custom CareerTracker design tokens |
| **Server State** | [TanStack Query v5](https://tanstack.com/query) | Async data fetching, caching, background refetching, and state management |
| **Client UI State** | [Zustand v5](https://zustand-demo.pmnd.rs/) | Minimalist client-side store for UI drawer state and user preferences |
| **Forms & Validation** | [React Hook Form](https://react-hook-form.com/) + [Zod v4](https://zod.dev/) | Type-safe form controls with runtime schema validation |
| **HTTP Client** | [Axios](https://axios-http.com/) | Centralized HTTP client configured with response interceptors for 401 handling |
| **Icons & Motion** | [Lucide React](https://lucide.dev/) + [Framer Motion](https://www.framer.com/motion/) | Iconography and hardware-accelerated UI transitions |
| **Standalone Database**| [Drizzle ORM](https://orm.drizzle.team/) + `pg` | Lightweight ORM powering Next.js route handler fallbacks |

---

## 📂 Directory & Component Layout

```
frontend/
├── docs/
│   └── API_CONTRACT.md         # Full REST API payload & response specification
├── drizzle.config.json         # Drizzle ORM configuration for local development
├── eslint.config.mjs           # ESLint rules and Next.js preset configuration
├── next.config.ts              # Next.js configuration & environment settings
├── package.json                # Frontend dependencies and scripts
├── postcss.config.mjs          # PostCSS configuration for Tailwind CSS v4
├── tsconfig.json               # Strict TypeScript configuration
└── src/
    ├── app/                    # Next.js App Router Page Directory
    │   ├── api/                # API Route Handlers (/api/v1/*)
    │   │   └── v1/             # Endpoints (auth, profile, roadmap, skills, ai, etc.)
    │   ├── layout.tsx          # Root layout wrapping providers, fonts, and theme
    │   ├── page.tsx            # Root landing page / redirect handler
    │   ├── login/              # Sign in and authentication screen
    │   ├── onboarding/         # Initial career target setup wizard
    │   ├── dashboard/          # Main dashboard (Readiness score, streak, quick actions)
    │   ├── roadmap/            # Phase-by-phase learning roadmap & tasks
    │   ├── skills/             # Skill matrix & proficiency tracker
    │   ├── resume/             # ATS Resume parser & health score analyzer
    │   ├── projects/           # Portfolio project manager & readiness impact
    │   ├── applications/       # Job application pipeline (Kanban / Table view)
    │   ├── assistant/          # AI Career Coach chat interface
    │   ├── interviews/         # Mock interview preparation suite
    │   ├── learning/           # Daily study log and learning resource tracker
    │   ├── notifications/      # Real-time alert notifications center
    │   ├── profile/            # User profile and academic configuration
    │   ├── progress/           # Placement readiness analytics & historical charts
    │   └── settings/           # User account and preference settings
    ├── components/             # Reusable UI Component Library
    │   ├── brand/              # Logo SVG primitives and identity graphics
    │   ├── charts/             # Readiness ring gauge and skill distribution bars
    │   ├── layout/             # AppShell navigation frame, headers, and footers
    │   ├── shared/             # Motion wrappers, theme toggles, modal dialogs
    │   └── ui/                 # Atomic design buttons, badges, and feedback components
    ├── db/                     # Drizzle ORM Schema & Local PostgreSQL Client
    │   ├── index.ts            # Database client connection entrypoint
    │   └── schema.ts           # Drizzle table definitions (users, skills, resumes, etc.)
    ├── hooks/                  # Custom React hooks (queries, media queries, debounce)
    ├── lib/                    # Core utilities and API clients
    │   ├── api.ts              # Centralized Axios instance & request unwrappers
    │   ├── api-client.ts       # Type-safe wrapper for REST calls
    │   ├── api-envelope.ts     # Standard success/failure envelope utilities
    │   └── utils.ts            # Classnames merger (`clsx` + `tailwind-merge`)
    ├── store/                  # Client-side state management
    │   └── ui.ts               # Zustand store for theme, sidebar, and drawer state
    └── types/                  # Global TypeScript type definitions & interfaces
```

---

## 💻 Application Pages & Features

- 🏠 **Dashboard ([`src/app/dashboard/page.tsx`](./src/app/dashboard/page.tsx))**: Placement control center displaying overall readiness score (0-100), streak, target role, and top skill gaps.
- 🎯 **Career Onboarding ([`src/app/onboarding/page.tsx`](./src/app/onboarding/page.tsx))**: Multi-step setup wizard for selecting target role, target company, study availability, and timeline.
- 🗺️ **Learning Roadmap ([`src/app/roadmap/page.tsx`](./src/app/roadmap/page.tsx))**: Phase-by-phase learning curriculum customized to career goals with progress indicators.
- ⚡ **Skill Matrix ([`src/app/skills/page.tsx`](./src/app/skills/page.tsx))**: Technical competency matrix comparing current levels vs required target levels.
- 📄 **ATS Resume Audit ([`src/app/resume/page.tsx`](./src/app/resume/page.tsx))**: Resume health analyzer with ATS score, keyword coverage, and repair findings.
- 📁 **Project Portfolio ([`src/app/projects/page.tsx`](./src/app/projects/page.tsx))**: Personal project showcase manager with tech tags, live links, and GitHub URLs.
- 💼 **Job Application Pipeline ([`src/app/applications/page.tsx`](./src/app/applications/page.tsx))**: Job application tracker across pipeline stages (*Saved, Applied, Interview, Offer*).
- 🤖 **AI Career Coach ([`src/app/assistant/page.tsx`](./src/app/assistant/page.tsx))**: Interactive AI chat interface grounded in actual student metrics.
- 🎤 **Interview Prep ([`src/app/interviews/page.tsx`](./src/app/interviews/page.tsx))**: Question banks and mock interview drills.
- 📈 **Progress Analytics ([`src/app/progress/page.tsx`](./src/app/progress/page.tsx))**: Placement readiness trajectory and skill growth graphs.

For complete UI/UX Design System rules, see **[UI_UX_DESIGN_BRIEF.md](../docs/UI_UX_DESIGN_BRIEF.md)** and navigation journeys in **[APP_FLOW.md](../docs/APP_FLOW.md)**.

---

## ⚡ State Management & Data Flow

### Server State (TanStack Query)
Server-side data (user profile, skill matrix, roadmap tasks, applications) is queried using custom hooks wrapping TanStack Query `useQuery` and `useMutation`.
- **Automatic Caching**: Background refetching on window focus is enabled for fresh metrics.
- **Optimistic UI Updates**: Application status toggles update immediately on the UI before backend confirmation, reverting gracefully on network errors.

### Client UI State (Zustand)
Ephemeral state that does not need database persistence is handled in [`src/store/ui.ts`](./src/store/ui.ts):
- Mobile sidebar navigation toggle state.
- Dark / Light / System theme preference.
- Unsaved draft forms during onboarding.

### Session Lifecycle Management
The centralized Axios client in [`src/lib/api.ts`](./src/lib/api.ts) listens to HTTP responses:
```ts
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ct:session-expired"));
      }
    }
    return Promise.reject(error);
  }
);
```
When a `401 Unauthorized` status occurs, the application captures `ct:session-expired` globally and routes the user to the `/login` screen without breaking UI state.

---

## 🎨 Design Tokens & UI System

The application uses **Tailwind CSS v4** configured with customized CareerTracker design tokens:

- **Color Palette**: Professional deep dark backgrounds with crisp dark-mode support, high-contrast text, vibrant indigo/violet brand accents, and status-specific indicators (*Emerald* for shipped/completed, *Amber* for in-progress, *Rose* for critical gaps).
- **Typography**: Clean sans-serif primary typography combined with `font-mono` tabular numbers (`tnum`) for scores and performance statistics.
- **Motion Primitives**: Framer Motion primitives wrapped in [`src/components/shared/motion.tsx`](./src/components/shared/motion.tsx) respect the browser's global `prefers-reduced-motion` setting.

---

## ⚙️ Environment Configuration

Copy `.env.example` to `.env` inside the `frontend/` directory:

```bash
cp .env.example .env
```

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string for standalone Next.js routes | `postgresql://postgres:postgres@127.0.0.1:5432/careertracker` |
| `NEXT_PUBLIC_API_URL` | Base URL for REST API endpoints | `/api/v1` (or `http://localhost:4000/api/v1` for NestJS proxy) |

---

## 🚀 Getting Started & Local Setup

### Prerequisites

- **Node.js**: v20.x or v22.x LTS
- **npm**: v10.x or higher

### Step-by-Step Instructions

1. **Navigate to the Frontend Directory**:
   ```bash
   cd frontend
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to: **`http://localhost:3000`**

5. **Type Checking & Linting**:
   ```bash
   # Run TypeScript compilation check
   npm run typecheck

   # Run ESLint check
   npm run lint
   ```

---

## 📜 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts Next.js development server with Turbopack / Fast Refresh at `http://localhost:3000` |
| `npm run build` | Builds optimized production bundle |
| `npm run start` | Starts Next.js production server |
| `npm run lint` | Runs ESLint check across all TSX components and utility files |
| `npm run typecheck` | Runs `tsc --noEmit` to verify type safety across the entire application |
