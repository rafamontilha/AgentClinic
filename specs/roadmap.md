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

## Post-MVP (Deferred)

The following are explicitly out of scope for the initial release:

- Multi-tenant auth (per-team API keys, RBAC)
- Client SDK / auto follow-up submission
- Webhooks / push notifications to external systems
- Treatment A/B testing with randomized assignment
- SSE ring buffer for replay on reconnect
- Embeddings-based diagnosis (LLM calls used for MVP)
- Historical log import
- Billing and usage metering
