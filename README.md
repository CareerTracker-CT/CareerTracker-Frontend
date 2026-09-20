# CareerTracker Frontend

The runnable Next.js 16 / React 19 / TypeScript application lives in this folder. The
standalone NestJS API lives in [`../backend`](../backend).

## Layout

```
frontend/
├── README.md
├── docs/
│   └── API_CONTRACT.md
├── package.json
├── next.config.ts
└── src/
    ├── app/
    ├── components/
    ├── hooks/
    ├── lib/
    ├── store/
    └── types/
```

## Stack

| Concern            | Choice                                                          |
| ------------------ | --------------------------------------------------------------- |
| Framework          | Next.js 16 (App Router), React 19, strict TypeScript            |
| Styling            | Tailwind CSS v4 with the CareerTracker design tokens            |
| Server state       | TanStack Query                                                   |
| Client state       | Zustand (`src/store/ui.ts`)                                      |
| Forms              | React Hook Form + Zod                                            |
| HTTP               | Axios (`src/lib/api.ts`)                                         |
| Motion             | Framer Motion, `prefers-reduced-motion` respected globally      |
| Icons              | Lucide React                                                     |

## Architecture rules

1. **No component talks to the database.** All data flows through `/api/v1/*`.
2. **Feature-first organisation** — `components/layout`, `components/charts`,
   `components/brand`, `components/ui`, `components/shared`.
3. **Server state never lives in Zustand.** TanStack Query owns it; Zustand is reserved for
   ephemeral UI state (theme, sidebar, onboarding draft).
4. **Every screen has** a loading skeleton, an empty state that says *what is missing →
   why it matters → what to do*, and an error state with a recovery action.
5. **Accessibility is not optional** — visible focus rings, semantic landmarks, labelled
   controls, tabular figures, and colour never carries meaning alone.

## Running

```bash
# from the frontend directory
cd frontend
npm install
npm run dev        # http://localhost:3000
```

The frontend expects the API at `/api/v1`. During a split deployment, requests can be proxied
to the NestJS service in `backend/` via `NEXT_PUBLIC_API_URL`.
