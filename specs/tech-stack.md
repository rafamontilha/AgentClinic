# Tech Stack

## Overview

AgentClinic is a **Next.js 15 full-stack application** — one server handles both the REST API (used by agents and orchestrators) and the operator dashboard (React Server Components).

```
Dashboard:   Next.js App Router — React Server Components (/dashboard/*)
API:         Next.js API Routes — REST endpoints (/api/*)
Engine:      TypeScript services — triage, diagnosis, treatment selection, follow-up
LLM:         Anthropic SDK — claude-sonnet (triage + diagnosis, prescription rationale)
Database:    SQLite via better-sqlite3 + Drizzle ORM
Real-time:   Server-Sent Events (SSE) — dashboard live updates
Auth:        Single API key via env var (Bearer token on /api/* routes)
Testing:     Vitest — unit, integration, API route, and phase validation tests
```

## Stack Decisions

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | Next.js 15 (App Router) | Full-stack in one repo: API routes for the clinic API, RSC for the dashboard, server actions for mutations |
| Language | TypeScript | Type safety across the full stack — critical for ailment/treatment catalog types and API contracts |
| Database | SQLite via `better-sqlite3` | File-based, zero-config. Sufficient for MVP scale. Single-file backup/restore. |
| ORM | Drizzle ORM | Type-safe SQL, schema-as-code, strong SQLite support |
| LLM | `@anthropic-ai/sdk` | Powers triage, diagnosis, and prescription rationale generation |
| Styling | Tailwind CSS, mobile-first | Utility-first, consistent with Next.js ecosystem. All UI must be fully usable on mobile, tablet, and desktop using Tailwind's sm/md/lg/xl breakpoints. |
| Charts | Recharts | Dashboard visualizations (ailment frequency, severity distribution) |
| SSE | Native `ReadableStream` in API routes | Live dashboard updates without WebSocket infrastructure |
| Auth (MVP) | Single key via `AGENTCLINIC_API_KEY` env var | Dashboard is unprotected (private deployment assumed). Multi-tenant auth is post-MVP. |
| Testing | Vitest + `@vitest/coverage-v8` | Fast native ESM runner; shares the same TypeScript config. Covers domain logic, SQLite repositories, API route handlers, and phase validation checklists. |

## Key Configuration

Environment variables (`.env`):

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | required | Anthropic API key |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-20250514` | Model for triage/diagnosis and prescription |
| `AGENTCLINIC_API_KEY` | unset = dev mode | API key for `/api/*` routes. Unset disables auth with a startup warning. |
| `DATABASE_PATH` | `data/agentclinic.db` | SQLite file location |
| `FOLLOWUP_WINDOW_HOURS` | `72` | Hours before a visit auto-expires |
| `EXPIRE_CHECK_INTERVAL_MINUTES` | `15` | Background job interval |
| `RATE_LIMIT_VISITS_PER_HOUR` | `10` | Per-patient rate limit (enforced via DB count) |

## Responsive Design

All pages and components follow a **mobile-first** approach. The interface must be fully usable at every standard breakpoint:

| Breakpoint | Min width | Typical context |
|-----------|-----------|----------------|
| (base)    | 0px       | Mobile phones (320px+) |
| `sm`      | 640px     | Large phones |
| `md`      | 768px     | Tablets — layout pivot point |
| `lg`      | 1024px    | Laptops / small desktops |
| `xl`      | 1280px    | Wide desktops |

Navigation pattern:
- **≥ md:** Horizontal nav bar — brand name left, all links inline right.
- **< md:** Brand name left, hamburger button (`☰` / `✕`) right. Tap opens a full-width vertical dropdown; tap a link closes it. Implemented as a `"use client"` component (`app/components/NavMenu.tsx`) to isolate toggle state from the server layout.

Content pattern:
- Single-column stacking on mobile, multi-column grids on `md+`.
- Font sizes and spacing scale with breakpoints (e.g. `text-3xl md:text-5xl`).
- Max content width `max-w-7xl` centered with horizontal padding at all sizes.
- No horizontal scrollbar at any supported viewport (minimum 320px).

Responsiveness is a **merge blocker** for any phase that ships UI.

## Architecture Notes

- **Two LLM calls per visit:** one for triage + diagnosis, one for prescription rationale. Separated so treatment history filtering stays in application code (deterministic, testable) while nuanced reasoning goes to the LLM.
- **Transaction scope:** one transaction per pipeline step. Incomplete visits (left in TRIAGE or DIAGNOSED on LLM failure) are cleaned up by the background expiration job.
- **Rate limiting:** enforced by counting rows in the `visits` table — no in-memory state, survives restarts.
- **SSE:** in-memory event bus singleton. On reconnect, dashboard re-fetches full state via API (ring buffer is post-MVP).
- **Background jobs:** `setInterval` in `src/instrumentation.ts` — visit expiration and chronic condition flagging, every 15 minutes.
- **Referrals table:** lightweight table tracking referral events and operator acknowledgements (separate from the core visit schema).

## Testing Strategy

All tests live under `tests/`, mirroring the source structure:

```
tests/
  db/           # repository / integration tests (in-memory SQLite)
  api/          # API route handler tests (web Request/Response)
  domain/       # pure domain logic — no I/O
  validation/   # automated phase checklists (mirrors specs/*/validation.md)
```

| Layer | What is tested | Approach |
|-------|---------------|----------|
| Domain logic | Triage scoring, effectiveness ranking, rate-limit counting, recurrence flag | Pure function calls — no DB, no HTTP |
| Repository / DB | `runMigrations`, `runSeed`, CRUD queries | `better-sqlite3` with `new Database(':memory:')` — real SQL, isolated per test |
| API routes | Next.js route handlers (`GET /api/health`, etc.) | Direct function calls with `new Request(...)` — no HTTP server needed |
| Phase validation | Key assertions from each `validation.md` checklist | Integration — starts a real DB, calls real handlers, asserts documented criteria |

Scripts:

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests once (`vitest run`) |
| `npm run test:watch` | Interactive watch mode (`vitest`) |
| `npm run test:coverage` | Run with V8 coverage report (`vitest run --coverage`) |

## Dependencies

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "@anthropic-ai/sdk": "^0.30.0",
    "better-sqlite3": "^11.0.0",
    "drizzle-orm": "^0.33.0",
    "recharts": "^2.12.0",
    "uuid": "^10.0.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "drizzle-kit": "^0.24.0",
    "@types/better-sqlite3": "^7.6.0",
    "@types/uuid": "^10.0.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0",
    "vitest": "^2.0.0",
    "@vitest/coverage-v8": "^2.0.0"
  }
}
```
