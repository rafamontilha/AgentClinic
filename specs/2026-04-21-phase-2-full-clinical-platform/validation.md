# Phase 2 — Full Clinical Platform: Validation

Phase 2 is ready to merge when **`npm test` passes with zero failures**. The criteria below are the authoritative checklist; `tests/validation/phase2.test.ts` automates all assertions marked `[auto]`. Manual steps are marked `[manual]`.

---

## 1. Schema & Seed

- [auto] `runMigrations()` completes without error on an in-memory SQLite database
- [auto] `runSeed()` inserts exactly 10 ailments and 10 treatments with at least one `ailment_treatments` row each
- [auto] All required tables exist: `patients`, `visits`, `diagnoses`, `prescriptions`, `followups`, `referrals`, `chronic_conditions`, `ailments`, `treatments`, `ailment_treatments`
- [auto] Duplicate `ailment_treatments` pairs for the same ailment + treatment are rejected by the schema

## 2. Patient API

- [auto] `POST /api/patients` with valid body returns `201` and a `patient_id`
- [auto] `POST /api/patients` with the same `agent_name` + `owner` returns the existing `patient_id` (no duplicate)
- [auto] `GET /api/patients/:id` returns the patient record; unknown ID returns `404`
- [auto] `GET /api/patients?status=active` returns only matching patients
- [auto] `PATCH /api/patients/:id` updates `model` and `status` for the requested patient only; returns the updated record
- [auto] `GET /api/patients/:id/history` returns paginated visit list (empty array for new patient)
- [auto] `GET /api/patients/:id/history?limit=abc` does not pass `NaN` into the query layer; it returns a validated fallback or `400`
- [auto] Request without `Authorization: Bearer <key>` (when key is set) returns `401`
- [auto] `/api/health` returns `200` regardless of auth

## 3. Ailment & Treatment Catalog API

- [auto] `GET /api/ailments` returns array of ailments (≥ 10 from seed)
- [auto] `POST /api/ailments` creates a custom ailment; `GET /api/ailments/:code` retrieves it
- [auto] `GET /api/treatments` returns array of treatments (≥ 10 from seed)
- [auto] `GET /api/treatments/:code` returns treatment with per-ailment effectiveness scores

## 4. Visit Pipeline

- [auto] `POST /api/visits` with valid `patient_id` and `symptoms_text`:
  - Returns `201` with `visit_id`, `status: "AWAITING_FOLLOWUP"`, `severity` (1–4), `diagnoses`, `prescriptions`
  - Persists visit, diagnoses, and prescriptions in a single DB transaction
- [auto] LLM or response-parsing failure in `POST /api/visits` returns structured JSON error output (no uncaught opaque 500)
- [auto] Exceeding 10 visits/hour for the same patient returns `429` with `retry_after_seconds`
- [auto] Same primary ailment resolved within 7 days sets `recurrence_flag: true` on new visit
- [auto] LLM mock returns confidence < 0.4 → custom ailment auto-created with `is_custom: true`
- [auto] No `ailment_treatments` rows for primary ailment → `referrals` row created with `reason: "no_treatments_available"`
- [auto] `GET /api/visits/:id` returns the visit record; unknown ID returns `404`
- [auto] `GET /api/visits?patient_id=<id>` returns only that patient's visits
- [auto] `POST /api/visits/:id/followup` with `outcome: "RESOLVED"` sets visit to `RESOLVED` and updates effectiveness score
- [auto] `POST /api/visits/:id/followup` with `outcome: "PARTIAL"` or `outcome: "FAILED"` persists the matching visit status and does not mark the visit as `RESOLVED`
- [auto] LLM or response-parsing failure in `POST /api/visits/:id/followup` returns structured JSON error output

## 5. SSE Event Bus

- [auto] `EventBus.emit("visit_created", payload)` delivers payload to all subscribers
- [auto] After unsubscribe, no further events are delivered
- [auto] `GET /api/events` responds with `text/event-stream` headers, emits serialized events, and cleans up the subscription on abort
- [manual] `GET /api/events` streams `data: {...}\n\n` — verify with `curl -N http://localhost:3000/api/events` while submitting a visit

## 6. Analytics Endpoints

- [auto] `GET /api/analytics/overview` returns `{ total_patients, active_visits, resolved_today, referrals_pending }` with numeric values
- [auto] `GET /api/analytics/ailments` returns array with `ailment_code`, `frequency`, severity breakdown
- [auto] `GET /api/analytics/treatments` returns array with `treatment_code`, `effectiveness_score`, `usage_count`
- [auto] `GET /api/analytics/patients/:id` returns a non-empty per-patient summary for a real seeded/test patient, including chronic conditions array and visit-derived values

## 7. Background Jobs

- [auto] Visit expiration job: AWAITING_FOLLOWUP visit with `expires_at` in the past is set to EXPIRED after one job run; a visit with future `expires_at` is not expired even if `created_at` is older
- [auto] Chronic flagging job: 3 RESOLVED visits for the same patient + ailment within 30 days creates a `chronic_conditions` row

## 8. Dashboard Pages

- [manual] `/dashboard` loads without errors; stat cards show numeric values; charts render (may be zero-state on fresh DB)
- [manual] `/dashboard/patients` lists registered patients in a table; links navigate to detail page
- [manual] `/dashboard/patients/[id]` shows visit timeline and chronic condition badges without hydration warnings from locale-dependent date rendering
- [manual] `/dashboard/ailments` shows trending chart and custom ailment review queue; Verify/Merge/Dismiss actions do not 500 and the queue refreshes without manual reload
- [manual] `/dashboard/alerts` shows referral queue; Acknowledge action updates the row and the page refreshes without manual reload
- [manual] Mobile navigation toggle keeps a valid `aria-controls` target in the DOM in both closed and open states
- [manual] Layout includes mobile viewport behavior and PicoCSS theme setup (`data-theme` on `<html>`)
- [manual] All pages pass visual responsiveness check: no horizontal scroll at 375px (mobile), 768px (tablet), 1280px (desktop)

## 9. End-to-End Scenario (Full Checklist — Phase Done When)

- [auto] `tests/validation/phase2.test.ts` runs all of the above `[auto]` assertions and passes with zero failures
- [manual] Register patient → submit symptom → receive diagnosis + prescription → submit follow-up RESOLVED → `/dashboard` stat card updates → referral appears in `/dashboard/alerts` after treatment exhaustion

---

## Merge Blockers

The following failures **block merge** regardless of other passing tests:

1. `npm test` exits non-zero
2. Any `[auto]` assertion in `tests/validation/phase2.test.ts` fails
3. Any dashboard page throws an unhandled error (500) when the DB has seed data
4. Horizontal scroll appears at any supported breakpoint (≥ 320px)
5. Dashboard mutations leave stale operator data visible until manual reload
