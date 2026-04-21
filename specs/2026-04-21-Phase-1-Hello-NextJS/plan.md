# Plan — Phase 1: Hello Next.js

## 1 — Scaffold

1.1 Bootstrap project with `npx create-next-app@latest` (TypeScript, App Router, Tailwind CSS, no src/ dir, no ESLint prompt — accept defaults)
1.2 Install production dependencies: `better-sqlite3`, `drizzle-orm`, `uuid`, `@anthropic-ai/sdk`, `recharts`
1.3 Install dev dependencies: `drizzle-kit`, `@types/better-sqlite3`, `@types/uuid`
1.4 Create `.env.local` from the variables defined in tech-stack.md (`ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `AGENTCLINIC_API_KEY`, `DATABASE_PATH`, `FOLLOWUP_WINDOW_HOURS`, `EXPIRE_CHECK_INTERVAL_MINUTES`, `RATE_LIMIT_VISITS_PER_HOUR`)
1.5 Add `data/` to `.gitignore` (SQLite file must not be committed)

## 2 — Database

2.1 Define Drizzle schema in `src/db/schema.ts` for all core tables: `patients`, `visits`, `ailments`, `treatments`, `ailment_treatments`
2.2 Configure `drizzle.config.ts` pointing to `DATABASE_PATH`
2.3 Write migration runner in `src/db/migrate.ts` — creates tables if they don't exist, runs on startup
2.4 Write seed script `src/db/seed.ts` — inserts 10 core ailments and 10 core treatments with effectiveness mappings; idempotent (skip if already seeded)
2.5 Wire migration + seed into Next.js startup via `src/instrumentation.ts`

## 3 — API

3.1 Create `app/api/health/route.ts` — `GET /api/health` returns `{ status: "ok" }` with HTTP 200; no auth required

## 4 — Dashboard Shell

4.1 Create root layout `app/layout.tsx` with Tailwind base styles and a top nav bar (brand name "AgentClinic", placeholder links: Dashboard, Patients, Ailments, Alerts)
4.2 Create `app/dashboard/page.tsx` — renders the nav and an empty-state message ("No visits yet. Waiting for agents to check in.")
4.3 Verify the app compiles and runs with `npm run dev`

## 5 — Home Page

5.1 Create `app/page.tsx` — public-facing landing page at `/`
5.2 Hero section: headline ("The clinic for ailing AI agents"), one-line sub-headline drawn from mission.md, and a "Go to Dashboard →" CTA button linking to `/dashboard`
5.3 Three-column feature strip: short descriptions of Register, Diagnose, and Prescribe (the first three steps from mission.md)
5.4 Footer: brand name and a one-line tagline
