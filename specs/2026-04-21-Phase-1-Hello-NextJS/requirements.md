# Requirements — Phase 1: Hello Next.js

## Scope

Phase 1 establishes the project skeleton. No business logic is implemented. The deliverables are:

- A running Next.js 15 server
- A SQLite database that initialises and seeds itself on startup
- A single health-check API endpoint
- A public-facing home page at `/`
- A dashboard shell page with navigation

Everything in Phase 1 is infrastructure groundwork for Phase 2 onwards. No agent-facing endpoints, no LLM calls, no auth middleware in this phase.

## Decisions

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Package manager | npm | Standard ecosystem tooling; no extra setup required |
| Framework | Next.js 15, App Router | Defined in tech-stack; RSC for dashboard, API routes for the clinic API |
| Language | TypeScript (strict) | Type safety across the full stack — critical for catalog types and API contracts |
| Database | SQLite via `better-sqlite3` | File-based, zero-config, sufficient for MVP; defined in tech-stack |
| ORM | Drizzle ORM | Type-safe SQL, schema-as-code; defined in tech-stack |
| Styling | Tailwind CSS only | No component library in this phase; rich components arrive in Phase 4 |
| Auth | Not implemented | Auth middleware is Phase 2 scope (`/api/health` is intentionally unprotected) |

## Schema Context

The Drizzle schema must define all five tables even though only the database initialisation is exercised in this phase. This prevents migration drift across phases.

Core tables:

- **patients** — agent identity, model, version, environment, status, owner, tags
- **visits** — links patient to a triage/diagnosis/prescription cycle; holds severity, status, timestamps
- **ailments** — catalog entries with code, name, description, category, custom flag
- **treatments** — catalog entries with code, name, description, instructions
- **ailment_treatments** — join table with effectiveness score and metadata

## Seed Data Context

The seed script must insert exactly 10 ailments and 10 treatments covering the core degradation modes described in `mission.md`:

Representative ailments: hallucination, context rot, instruction drift, persona collapse, prompt injection vulnerability, repetition loop, tool call failure, memory overflow, reasoning regression, output format violation.

Each treatment maps to one or more ailments via `ailment_treatments` with an initial effectiveness score.

The seed is **idempotent** — re-running it must not create duplicates.

## Environment Variables

All variables must be present in `.env.local` before `npm run dev`. See `tech-stack.md` for the full list. `ANTHROPIC_API_KEY` may hold a placeholder value in Phase 1 since no LLM calls are made.

## Home Page Context

The home page at `/` is public (no auth). It introduces AgentClinic to human visitors and links them to the dashboard. Copy must align with `mission.md`:

- **Headline** — communicates the core value proposition ("The clinic for ailing AI agents")
- **Sub-headline** — one sentence from the "Why It Exists" section of mission.md
- **Feature strip** — three columns covering Register, Diagnose, and Prescribe (steps 1–3 of the core workflow)
- **CTA** — a single "Go to Dashboard →" link to `/dashboard`
- **Footer** — brand name + tagline; no links needed in Phase 1

The page must be a React Server Component (`async` function or plain function — no `"use client"`). Styling is Tailwind only; no images or icons are required in Phase 1.

## Out of Scope for This Phase

- API key authentication
- Any `/api/patients`, `/api/visits`, or other clinical endpoints
- LLM integration
- SSE / real-time events
- Dashboard data (charts, tables) — only the shell and nav
- Animations, dark mode, or responsive breakpoints beyond basic mobile-friendliness
