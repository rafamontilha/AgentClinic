# Phase 2 — Full Clinical Platform: Requirements

## Scope

Phase 2 delivers the complete operational clinic on top of the Phase 1 skeleton. When merged, the system supports the full visit lifecycle: patient registration → symptom triage → LLM diagnosis → LLM prescription → follow-up outcome → dashboard monitoring.

### In scope

- Patient CRUD API (`/api/patients/*`)
- Ailment and treatment catalog API (`/api/ailments`, `/api/treatments`)
- Full visit pipeline (`POST /api/visits`): rate limiting, LLM triage, LLM prescription, recurrence detection, referral generation, structured LLM error handling
- Visit retrieval and follow-up (`GET /api/visits`, `POST /api/visits/:id/followup`)
- API key auth middleware on all `/api/*` routes except `/api/health`
- Analytics endpoints (`/api/analytics/*`)
- SSE endpoint (`/api/events`) with in-memory event bus
- Background jobs: visit expiration and chronic condition flagging (`src/instrumentation.ts`)
- Dashboard pages: Overview, Patients, Patient Detail, Ailments, Alerts
- Drizzle schema additions: visits, diagnoses, prescriptions, followups, referrals, chronic_conditions, ailments, treatments, ailment_treatments

### Out of scope (Post-MVP, per roadmap)

- Multi-tenant auth, per-team API keys, RBAC
- Webhooks or push notifications to external systems
- SSE ring buffer / replay on reconnect
- Embeddings-based diagnosis
- Billing and usage metering
- Client SDK

---

## Decisions

### LLM: Fully Mocked

All Anthropic SDK calls are mocked via `vi.mock('@anthropic-ai/sdk')` in the Vitest suite. A `mockLLMResponse(fixture)` helper in `tests/helpers/llm.ts` stubs the `messages.create` method with a fixed JSON payload. The application code must parse the LLM response using a schema validator (Zod or manual parsing with fallback) so that prompt changes don't silently break the pipeline.

**Rationale:** The user does not have an Anthropic key available for development/CI at this stage. The pipeline and prompt structure must be designed so that swapping in a real key later requires zero code changes — only the mock fixture is removed.

### LLM Call Shape

- **Call 1 (triage + diagnosis):** prompt includes `symptoms_text` and ailment catalog codes. Expected response: `{ severity: 1|2|3|4, diagnoses: [{ ailment_code: string, confidence: number }] }`.
- **Call 2 (prescription):** prompt includes primary ailment, patient history, and candidate treatments filtered from `ailment_treatments`. Expected response: `{ prescriptions: [{ treatment_code: string, rationale: string }] }`.
- Both calls use `ANTHROPIC_MODEL` env var (default `claude-sonnet-4-20250514`).
- Route handlers must wrap LLM failures and invalid payload parsing in `try/catch` and return structured JSON errors instead of opaque uncaught 500s. Upstream LLM failures should surface as `502` with an explicit machine-readable error code.

### Auth Middleware

A single `AGENTCLINIC_API_KEY` env var. If unset, auth is skipped with a startup `console.warn`. If set, all `/api/*` routes except `/api/health` require `Authorization: Bearer <key>`; missing or invalid key → `401 Unauthorized`.

Implemented as a Next.js middleware file (`middleware.ts`) or as an inline guard in each route handler. The simpler inline guard is preferred to avoid Next.js middleware edge runtime limitations with `better-sqlite3`.

### Rate Limiting

Enforced by counting `visits` rows for a `patient_id` where `created_at > now - 1 hour`. No in-memory state. Returns `429 Too Many Requests` with `{ error: "rate_limit_exceeded", retry_after_seconds: number }`.

### Recurrence Detection

At visit creation, query `visits` for the same patient + primary ailment where `status = RESOLVED` and `resolved_at > now - 7 days`. If found, set `recurrence_flag = true` on the new visit.

### Custom Ailment Auto-Creation

If the highest-confidence diagnosis match is below 0.4, create an `ailments` row with `is_custom = true`, `verified = false`, and a generated code (`CUSTOM-<uuid-prefix>`). The custom ailment appears in `/dashboard/ailments` review queue.

### Referral Trigger

After treatment selection in Call 2, if `ailment_treatments` has no available treatments for the primary ailment, insert a `referrals` row with `reason = "no_treatments_available"` and emit a `referral_created` SSE event.

### Effectiveness Score Updates

On follow-up submission, insert a `followups` row, set the visit status to match the submitted outcome (`RESOLVED`, `PARTIAL`, or `FAILED`), set `resolved_at` only for `RESOLVED`, and update `ailment_treatments.effectiveness_score` using an exponential moving average: `new_score = 0.8 * old_score + 0.2 * outcome_weight` where `outcome_weight` is `1.0` (RESOLVED), `0.5` (PARTIAL), `0.0` (FAILED).

### Data Integrity

- `visits` includes an `expires_at` timestamp used by expiration jobs; expiration logic must compare against `expires_at`, not `created_at`.
- `ailment_treatments` enforces a composite `UNIQUE (ailment_id, treatment_id)` constraint so effectiveness updates cannot duplicate the same mapping pair.
- Migration helpers may ignore only explicitly recognized "already exists" cases; all other DDL failures must surface and fail startup/tests.

### Background Jobs

Run in `src/instrumentation.ts` using `setInterval`. The job logic is extracted into pure functions in `src/jobs/` so they can be unit-tested without a timer.

### SSE

In-memory singleton `EventBus`. On dashboard connect to `/api/events`, the client subscribes. On disconnect (abort signal), the subscription is cleaned up. No ring buffer — on reconnect, the dashboard re-fetches full state via API calls.

### Dashboard Data Fetching

React Server Components fetch data directly from service/repository functions (no HTTP round-trip for same-process calls). Client components that need SSE auto-refresh use `EventSource` and call `router.refresh()` on event receipt.

Mutations triggered from dashboard server actions must call `revalidatePath()` for the affected route so operator-visible queues refresh immediately after actions such as ailment verification or referral acknowledgement.

### Styling: PicoCSS

Tailwind CSS (used in Phase 1) is replaced by **PicoCSS v2** (`@picocss/pico`). PicoCSS styles semantic HTML elements directly — `<nav>`, `<article>`, `<table>`, `<button>`, `<input>` — with no utility classes.

Phase 2 scope includes migrating Phase 1 components (`NavMenu.tsx`, `app/layout.tsx`, `/dashboard` shell) from Tailwind to PicoCSS before adding new pages.

**Rules for all dashboard components:**
- Use semantic HTML elements so PicoCSS styles apply automatically (`<article>` for cards, `<nav>` for navigation, `<table>` for data tables).
- Responsive layout via `<div class="grid">` (PicoCSS built-in grid) or CSS `@media (min-width: 768px)` overrides in scoped CSS modules (`*.module.css`).
- Custom properties (CSS variables) for any color or spacing that overrides PicoCSS defaults — no inline `style=` attributes.
- The hamburger nav toggle remains a `"use client"` component; show/hide is driven by a CSS class toggled in state, not Tailwind responsive variants. The element referenced by `aria-controls` must always exist in the DOM even when collapsed.
- Date/time text rendered in SSR routes must be deterministic between server and client; avoid locale-dependent hydration output such as raw `toLocaleString()` during hydration.
- SSE-driven refresh components must handle `EventSource` errors explicitly so live updates fail visibly/recoverably rather than silently stopping.
- `app/layout.tsx` exports viewport metadata with `width=device-width, initial-scale=1` and sets `data-theme` on `<html>` for PicoCSS theme support.
- `tailwindcss` and `postcss`/`autoprefixer` Tailwind config are removed from `package.json` and `tailwind.config.*`.

---

## Context

Phase 1 delivered the scaffolding: Next.js 15, TypeScript, SQLite via Drizzle, `/api/health`, seed script (10 ailments, 10 treatments), and the dashboard shell at `/dashboard`. Phase 1 used Tailwind CSS; Phase 2 migrates styling to PicoCSS v2 as its first action before building new features.

The responsive design contract from Phase 1 carries forward: all pages must be fully usable at ≥ 320px. The hamburger nav threshold is 768px; multi-column layout activates at ≥ 768px via CSS Grid and media queries (no Tailwind breakpoint classes).

The Vitest infrastructure from Phase 1 carries forward: `tests/db/`, `tests/api/`, `tests/domain/`, `tests/validation/`. Phase 2 adds tests within the same structure.

Query parameter parsing in API routes must fail safely: invalid numeric params such as `limit=abc` must clamp to a documented default or return `400`, but never flow through as `NaN` into repository/database calls.
