# Phase 2 — Full Clinical Platform: Plan

Each task group is a self-contained deliverable. Work top to bottom; later groups depend on earlier ones.

---

## Group 0 — Tailwind → PicoCSS Migration

- Remove `tailwindcss`, `postcss`, `autoprefixer` from `package.json`; delete `tailwind.config.*` and `postcss.config.*`
- Install `@picocss/pico@^2`; import in `app/layout.tsx` (e.g. `import '@picocss/pico/css/pico.min.css'`)
- Migrate `app/layout.tsx`: replace Tailwind utility classes with semantic HTML structure PicoCSS targets (`<main>`, `<nav>`, wrapper `<div>` with max-width CSS variable)
- Migrate `app/components/NavMenu.tsx`: replace Tailwind responsive variants with a CSS class toggle for hamburger open/close; move breakpoint media query to a CSS module
- Migrate `/dashboard` shell page: replace Tailwind classes with semantic elements and a CSS module for layout
- Verify `npm run dev` loads without Tailwind errors and pages render correctly at 375px and 1280px
- Vitest: existing Phase 1 tests must still pass after migration (no styling assertions in tests, so this is a smoke check)

## Group 1 — Schema Extensions

- Add `visits` table: `id`, `patient_id`, `status` (TRIAGE | DIAGNOSED | PRESCRIBED | AWAITING_FOLLOWUP | RESOLVED | EXPIRED), `severity` (1–4), `symptoms_text`, `created_at`, `resolved_at`
- Add `diagnoses` table: `visit_id`, `ailment_code`, `confidence`, `is_primary`
- Add `prescriptions` table: `visit_id`, `treatment_code`, `rationale`, `sequence`
- Add `followups` table: `visit_id`, `outcome` (RESOLVED | PARTIAL | FAILED), `notes`, `submitted_at`
- Add `referrals` table: `id`, `visit_id`, `patient_id`, `ailment_code`, `reason`, `acknowledged_at`
- Add `chronic_conditions` table: `patient_id`, `ailment_code`, `first_flagged_at`, `recurrence_count`
- Add `ailments` table: `code`, `name`, `category`, `is_custom`, `verified`, `created_at`
- Add `treatments` table: `code`, `name`, `description`, `contraindications`
- Add `ailment_treatments` table: `ailment_code`, `treatment_code`, `effectiveness_score`
- Run `drizzle-kit generate` and apply migrations; verify seed populates 10 ailments + 10 treatments

## Group 2 — Patient Management API

- `POST /api/patients` — validate body, duplicate detection (`agent_name` + `owner`), insert, return `patient_id`
- `GET /api/patients` — list with `?status=`, `?owner=`, `?tag=` filters; paginated
- `GET /api/patients/:id` — 404 if not found
- `PATCH /api/patients/:id` — partial update of `model`, `version`, `environment`, `status`
- `GET /api/patients/:id/history` — paginated visit list
- API key middleware: all `/api/*` except `/api/health` require `Authorization: Bearer <key>`; 401 if missing/invalid; skip check if `AGENTCLINIC_API_KEY` unset (dev mode)
- Vitest: CRUD tests with in-memory SQLite; auth middleware unit tests

## Group 3 — Ailment & Treatment Catalog API

- `GET /api/ailments` — list all (custom and standard)
- `POST /api/ailments` — create custom ailment; validate required fields
- `GET /api/ailments/:code` — 404 if not found
- `GET /api/treatments` — list all
- `GET /api/treatments/:code` — treatment detail with per-ailment effectiveness scores
- Vitest: CRUD tests; seed data assertions

## Group 4 — Visit Pipeline (LLM Mocked)

- `POST /api/visits`:
  1. Validate patient exists; enforce rate limit (10 visits/hour via DB count)
  2. LLM Call 1 mock: return `{ severity, diagnoses: [{ ailment_code, confidence }] }` — pick highest-confidence match ≥ 0.4; auto-create custom ailment if no match
  3. Set recurrence flag if same primary ailment was RESOLVED within 7 days
  4. LLM Call 2 mock: return `{ prescriptions: [{ treatment_code, rationale }] }` — filtered from `ailment_treatments`; trigger referral if no treatments available
  5. Persist visit, diagnoses, prescriptions in one DB transaction; return full visit record
- `GET /api/visits/:id` — visit record with diagnoses and prescriptions
- `GET /api/visits` — list with `?patient_id=`, `?status=`, `?ailment_code=` filters
- `POST /api/visits/:id/followup` — validate status AWAITING_FOLLOWUP; insert followup; update effectiveness scores; set visit RESOLVED
- LLM mock strategy: `vi.mock('@anthropic-ai/sdk')` in all tests; `mockLLMResponse()` helper in `tests/helpers/llm.ts`
- Vitest: pipeline integration tests (full flow in-memory), rate limit, recurrence flag, custom ailment creation, referral trigger

## Group 5 — SSE Event Bus

- In-memory singleton `EventBus` in `src/lib/event-bus.ts` — subscribe, emit, cleanup on disconnect
- `GET /api/events` — SSE endpoint; streams `visit_created`, `visit_resolved`, `referral_created`, `chronic_flagged` events as `data: <JSON>\n\n`
- Emit events from visit pipeline and background jobs
- Vitest: EventBus unit tests (subscribe, emit, unsubscribe)

## Group 6 — Analytics Endpoints

- `GET /api/analytics/overview` — total patients, active visits, resolved today, referrals pending
- `GET /api/analytics/ailments` — ailment frequency, severity breakdown, top ailments by recurrence
- `GET /api/analytics/treatments` — effectiveness scores, treatment usage count
- `GET /api/analytics/patients/:id` — per-patient visit history summary, chronic conditions, treatment outcomes
- Vitest: analytics endpoint tests with seeded data

## Group 7 — Background Jobs

- `src/instrumentation.ts` (Next.js instrumentation hook):
  - Visit expiration: every `EXPIRE_CHECK_INTERVAL_MINUTES` minutes, set AWAITING_FOLLOWUP → EXPIRED where `created_at` is older than `FOLLOWUP_WINDOW_HOURS`
  - Chronic flagging: count same-ailment recurrences per patient in 30-day window; if ≥ 3, insert/update `chronic_conditions`, emit `chronic_flagged`
- Vitest: job logic as pure functions with clock injection; assert DB state after each run

## Group 8 — Dashboard Pages (RSC)

- `/dashboard` (Overview): stat cards (patients, active visits, resolved today, pending referrals), ailment distribution bar chart (Recharts), severity donut (Recharts), recent visits table; auto-refresh on SSE event
- `/dashboard/patients`: table with name, model, owner, status; link to detail
- `/dashboard/patients/[id]`: visit timeline, treatment history panel, chronic condition badges
- `/dashboard/ailments`: trending chart, ailment × severity heatmap, effectiveness table, custom ailment review queue (Verify / Merge / Dismiss actions via server actions)
- `/dashboard/alerts`: referral queue with Acknowledge action, chronic condition list
- All pages: responsive (mobile-first, hamburger nav below 768px, single-column mobile → CSS Grid multi-column at ≥ 768px via media queries in CSS modules)
- Vitest: page-level snapshot tests for empty state and populated state (mocked fetch)

## Group 9 — Phase 2 Validation Suite

- `tests/validation/phase2.test.ts`: automated checklist mirroring `validation.md`
- Register patient → submit visit → receive diagnosis + prescription → submit followup → assert RESOLVED
- Assert referral row created when treatments exhausted
- Assert `chronic_conditions` row after 3 same-ailment visits in 30 days
- Assert SSE event names match spec
- Assert analytics endpoint shapes
