# 🎨 UI/UX Design Brief — CareerTracker

---

## 1. Design Philosophy & Vibe

**Professional + Minimal + Intelligent**

CareerTracker feels like a high-end SaaS product (inspired by Linear, Notion, GitHub, Stripe, Vercel, and Figma). It prioritizes clean whitespace, crisp typography, and purposeful data visualizations over flashy graphics.

---

## 2. Color System & Theme

### Color Tokens
- **Primary Accent**: Professional Blue (`#2563EB` / `#3B82F6`) — CTA buttons, active state highlights, progress rings.
- **Neutrals**: Slate / Gray palette (`#0F172A`, `#1E293B`, `#475569`, `#94A3B8`, `#F8FAFC`, `#FFFFFF`).
- **Semantic Feedback**:
  - **Success**: Emerald (`#10B981`) — Completed tasks, healthy ATS score.
  - **Warning**: Amber (`#F59E0B`) — Medium priority gaps, approaching deadlines.
  - **Danger**: Rose/Red (`#EF4444`) — Critical ATS missing skills, expired tasks.

### Theme Modes
- **Default**: Professional Light Theme.
- **Dark Mode**: Dedicated dark mode palette (never inverted colors) using deep slate blue tones.

---

## 3. Typography & Spacing System

- **Primary Typeface**: Inter / Geist sans-serif fonts.
- **Hierarchy**:
  - `Display` (32-40px bold)
  - `Heading` (24-28px semibold)
  - `Subheading` (18-20px medium)
  - `Body` (14-16px regular)
  - `Caption` / `Label` (12-13px medium)
  - `Code` / `Metrics` (`font-mono`, tabular numbers `tnum`)

### Spacing Grid (8-Point System)
Allowed spacing units: `4px`, `8px`, `16px`, `24px`, `32px`, `40px`, `48px`, `64px`. Arbitrary pixel offsets are strictly forbidden.

### Border Radius Rules
- **Cards**: `12px` (`rounded-xl`)
- **Buttons & Inputs**: `10px` (`rounded-lg`)
- **Dialogs & Modals**: `16px` (`rounded-2xl`)

---

## 4. Component Design Standards

### Buttons
All buttons support 6 interactive states:
1. `Default`
2. `Hover`
3. `Focus` (Visible focus ring)
4. `Pressed`
5. `Disabled` (Opacity 50%, `cursor-not-allowed`)
6. `Loading` (Inline spinner + label change)

### Skeleton & AI Loading Messages
Every major page renders layout skeletons during data fetches. During AI generation, informative status messages are streamed:
- *"Analyzing your resume format..."*
- *"Building your personalized roadmap..."*
- *"Extracting missing skill gaps..."*
- *"Calculating overall placement readiness score..."*

### Motion & Animations
Hardware-accelerated Framer Motion transitions with duration `150ms – 300ms` for smooth fades, slides, and scaling. Global `prefers-reduced-motion` is strictly respected.

---

## 5. Anti-AI Design Rules

❌ **Never use:**
- Generic dashboard templates or overused UI kits
- Random glowing neon gradients or hard-to-read backgrounds
- Excessive glassmorphism or muddy blur filters
- Giant empty cards with single numbers
- Placeholder *Lorem Ipsum* text
- Misleading fake charts or manufactured statistics
