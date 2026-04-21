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

4.1 Create `app/components/NavMenu.tsx` — `"use client"` component; renders horizontal links on `md+`, hamburger toggle + full-width dropdown on `< md`
4.2 Create root layout `app/layout.tsx` with Tailwind base styles; nav uses `NavMenu`; `<nav>` is `relative` so the mobile dropdown can be `absolute top-full`
4.3 Create `app/dashboard/page.tsx` — renders the nav and an empty-state message ("No visits yet. Waiting for agents to check in.")
4.4 Verify the app compiles and runs with `npm run dev`

## 5 — Home Page

5.1 Create `app/page.tsx` — public-facing landing page at `/`
5.2 Hero section: headline ("The clinic for ailing AI agents"), one-line sub-headline drawn from mission.md, and a "Go to Dashboard →" CTA button linking to `/dashboard`; heading scales `text-3xl` → `text-5xl` across breakpoints
5.3 Three-column feature strip: single-column on mobile, `md:grid-cols-3` on tablet+; short descriptions of Register, Diagnose, and Prescribe
5.4 Footer: brand name and a one-line tagline

## 6 — Tests

6.1 Create `tests/db/migrate.test.ts` — verify `runMigrations` creates all five tables and is idempotent
6.2 Create `tests/db/seed.test.ts` — verify exactly 10 ailments, 10 treatments, and ≥ 10 `ailment_treatments` rows are inserted; verify idempotency (second run inserts nothing new)
6.3 Create `tests/api/health.test.ts` — verify `GET /api/health` returns HTTP 200 and body `{ "status": "ok" }`
6.4 Create `tests/validation/phase-1.test.ts` — machine-readable version of the section 2, 3, and 6 items in `validation.md`; serves as the automated acceptance gate for the phase
6.5 Verify `npm test` exits with code 0 and all tests are green
