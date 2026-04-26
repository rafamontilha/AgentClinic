# Roadmap

Each phase delivers a testable capability. Phases are sized for 1–3 days of focused work. A phase is complete when its deliverables can be manually verified end-to-end.

**Cross-cutting requirement — Responsive design:** Every phase that ships UI must be fully usable on mobile (≥ 320px), tablet (≥ 768px), and desktop (≥ 1024px). Responsiveness is a merge blocker. See `tech-stack.md` — Responsive Design section — for breakpoint standards and the nav hamburger pattern.

---

## Phase 1 — Hello Next.js

**Goal:** Server running, baseline structure in place.

- Next.js 15 project scaffolded with TypeScript and Tailwind
- `GET /api/health` returns `{ status: "ok" }`
- SQLite database initializes on startup (file created, migrations run)
- Drizzle schema defined for all core tables (patients, visits, ailments, treatments, ailment_treatments)
- Seed script populates 10 core ailments and 10 core treatments with effectiveness mappings
- Dashboard shell renders at `/dashboard` (nav, empty state message)

**Done when:** `npm run dev` starts, `/api/health` responds, `/dashboard` loads in browser.

---

## Phase 2 — Full Clinical Platform

**Goal:** End-to-end clinic operational: patients register, visits run the full AI pipeline, operators monitor in real time, and the ailment catalog is manageable.

### Patient management
- `POST /api/patients` — register a new agent patient, return `patient_id`
- `GET /api/patients/:id` — retrieve patient record
- `GET /api/patients` — list patients with `?status=`, `?owner=`, `?tag=` filters
- `PATCH /api/patients/:id` — update metadata (model, version, environment, status)
- `GET /api/patients/:id/history` — paginated visit history
- Duplicate detection: same `agent_name` + `owner` returns existing record
- API key auth middleware on all `/api/*` routes except `/api/health`
- Patient directory page at `/dashboard/patients` (table with name, model, owner, status)
- Patient detail page (`/dashboard/patients/[id]`) — visit timeline, treatment history panel, chronic condition badges

### Visit workflow (core clinical pipeline)
- `POST /api/visits` — runs the full pipeline synchronously:
  - Validate patient, check rate limit (DB count, 10/hour)
  - LLM Call 1: triage + diagnosis (severity 1–4, ailment matching with confidence scores)
  - LLM Call 2: prescription + rationale (treatment selection, conflict resolution)
  - Returns complete visit record with diagnoses and prescriptions
- `GET /api/visits/:id` — retrieve visit record
- `GET /api/visits` — list with filters
- `POST /api/visits/:id/followup` — submit outcome, update effectiveness scores
- Recurrence flag set at visit creation if same ailment was RESOLVED within 7 days
- Custom ailment auto-created if no catalog match reaches 0.4 confidence

### Dashboard & real-time updates
- Overview page (`/dashboard`) — stat cards, ailment distribution bar chart, severity donut, recent visits table
- SSE endpoint `GET /api/events` — emits `visit_created`, `visit_resolved`, `referral_created`, `chronic_flagged`
- Overview page auto-refreshes on SSE events (re-fetches analytics data)
- Background jobs via `setInterval` in `instrumentation.ts`:
  - Visit expiration: AWAITING_FOLLOWUP → EXPIRED after `FOLLOWUP_WINDOW_HOURS`
  - Chronic flagging: 3+ recurrences of same ailment within 30 days → `chronic_conditions`

### Analytics, alerts & catalog management
- Ailment analytics page (`/dashboard/ailments`) — trending chart, ailment × severity heatmap, treatment effectiveness table, custom ailment review queue (Verify / Merge / Dismiss)
- Alerts page (`/dashboard/alerts`) — referral queue with Acknowledge action, chronic condition alerts
- `GET /api/analytics/overview`, `/ailments`, `/treatments`, `/patients/:id` — analytics endpoints
- `GET /api/ailments`, `POST /api/ailments`, `GET /api/ailments/:code` — catalog management
- `GET /api/treatments`, `GET /api/treatments/:code` — treatment detail with per-ailment effectiveness
- Referrals table in schema — tracks exhaustion events and operator acknowledgements

**Done when:** register a patient, submit a symptom, receive a diagnosis and prescription, submit a follow-up, see the dashboard update live, exhaust all treatments for an ailment, and see the referral appear in the alerts page.

---

---

## Phase 4 — Staff Dashboard Auth

**Goal:** The operator dashboard has a login gate. Unprotected `/dashboard/*` is no longer acceptable for any shared or public deployment.

- Add session-cookie middleware to all `/dashboard/*` routes (Next.js middleware.ts)
- Login page at `/login` — accepts a single staff password stored as `STAFF_PASSWORD` env var (bcrypt-hashed at startup)
- Successful login sets a signed, httpOnly session cookie (`MAX_AGE = 8 hours`)
- `/api/*` routes are unaffected (already protected by `AGENTCLINIC_API_KEY`)
- `/api/health` remains public (no auth)
- Logout route clears the cookie and redirects to `/login`
- No user management UI — single shared password for MVP

**Done when:** Navigating to `/dashboard` without a session redirects to `/login`; after login, dashboard is accessible; `/api/health` is still public.

---

## Phase 5 — Postgres Migration

**Goal:** SQLite is replaced with PostgreSQL. This is the hard prerequisite for Phase 6 deployment.

- Add `postgres` and `@neondatabase/serverless` (or `pg`) as dependencies
- Update `drizzle.config.ts` to support both SQLite (dev) and Postgres (prod) via `DATABASE_URL` env var
- Review all Drizzle schema definitions for dialect compatibility (text vs varchar, JSON storage, etc.)
- Run `drizzle-kit generate` against Postgres dialect; apply migrations to a local Postgres instance
- Update all repository tests to run against in-memory SQLite (unit) and a real Postgres test DB (integration, opt-in)
- Remove all SQLite-specific workarounds from production code paths
- Update `.env.example` with `DATABASE_URL` replacing `DATABASE_PATH`

**Done when:** `npm run dev` with `DATABASE_URL=postgres://...` starts against Postgres with all tests passing.

---

## Phase 6 — Deployment

**Goal:** The application runs in a production environment accessible to external users. Deployment target must be chosen before this phase begins (see `tech-stack.md` — Known Gaps).

- Choose deployment target (Vercel + Neon / Railway / self-hosted Docker) and record decision in `tech-stack.md`
- Write `Dockerfile` (if self-hosted) or `vercel.json` (if Vercel), with health check
- Set all required env vars in the target environment
- Confirm `GET /api/health` returns 200 from a public URL
- Confirm `/dashboard` is protected and accessible only after login
- Confirm a test patient can register and complete a visit end-to-end via the deployed API
- Add a `DEPLOYMENT.md` to the project root documenting the target, env vars, and rollback steps

**Done when:** End-to-end smoke test passes against the live deployment URL.

---

## Post-MVP (Deferred)

The following are explicitly out of scope for the initial release (Phases 1–6):

- npm publishing of `@agentclinic/sdk` (SDK built in Phase 3, published post-launch)
- Multi-tenant auth (per-team API keys, RBAC)
- Webhooks / push notifications to external systems (built in Phase 3, post-MVP to expose via UI)
- Treatment A/B testing with randomized assignment
- SSE ring buffer for replay on reconnect
- Embeddings-based diagnosis (LLM calls used for MVP)
- Historical log import
- Billing and usage metering
- Proactive check-ups or scheduled agent outreach (confirmed out of scope: clinic is passive/reactive)
