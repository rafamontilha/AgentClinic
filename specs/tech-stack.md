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
```

## Stack Decisions

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | Next.js 15 (App Router) | Full-stack in one repo: API routes for the clinic API, RSC for the dashboard, server actions for mutations |
| Language | TypeScript | Type safety across the full stack — critical for ailment/treatment catalog types and API contracts |
| Database | SQLite via `better-sqlite3` | File-based, zero-config. Sufficient for MVP scale. Single-file backup/restore. |
| ORM | Drizzle ORM | Type-safe SQL, schema-as-code, strong SQLite support |
| LLM | `@anthropic-ai/sdk` | Powers triage, diagnosis, and prescription rationale generation |
| Styling | Tailwind CSS | Utility-first, consistent with Next.js ecosystem |
| Charts | Recharts | Dashboard visualizations (ailment frequency, severity distribution) |
| SSE | Native `ReadableStream` in API routes | Live dashboard updates without WebSocket infrastructure |
| Auth (MVP) | Single key via `AGENTCLINIC_API_KEY` env var | Dashboard is unprotected (private deployment assumed). Multi-tenant auth is post-MVP. |

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

## Architecture Notes

- **Two LLM calls per visit:** one for triage + diagnosis, one for prescription rationale. Separated so treatment history filtering stays in application code (deterministic, testable) while nuanced reasoning goes to the LLM.
- **Transaction scope:** one transaction per pipeline step. Incomplete visits (left in TRIAGE or DIAGNOSED on LLM failure) are cleaned up by the background expiration job.
- **Rate limiting:** enforced by counting rows in the `visits` table — no in-memory state, survives restarts.
- **SSE:** in-memory event bus singleton. On reconnect, dashboard re-fetches full state via API (ring buffer is post-MVP).
- **Background jobs:** `setInterval` in `src/instrumentation.ts` — visit expiration and chronic condition flagging, every 15 minutes.
- **Referrals table:** lightweight table tracking referral events and operator acknowledgements (separate from the core visit schema).

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
    "@types/react": "^18.3.0"
  }
}
```
