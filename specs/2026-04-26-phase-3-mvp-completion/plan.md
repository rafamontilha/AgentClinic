# Phase 3 — MVP Completion: Plan

Each group is a self-contained deliverable. Groups run top to bottom; later groups depend on earlier ones. Groups 1–3 each represent 1–3 days of focused work.

---

## Group 1 — Real LLM Integration (Day 1)

- Create `src/lib/llm.ts`:
  - Export `callTriage(symptomsText: string, ailmentCodes: string[]): Promise<TriageResult>`
  - Export `callPrescription(ailmentCode: string, patientHistory: VisitSummary[], candidateTreatments: string[]): Promise<PrescriptionResult>`
  - Both functions instantiate `new Anthropic()` (reads `ANTHROPIC_API_KEY` from env)
  - Call 1 marks the ailment catalog block with `cache_control: { type: "ephemeral" }`
  - Both functions validate the LLM JSON response shape; on parse failure throw a structured `LLMParseError` (not a raw Error)
- Update `src/app/api/visits/route.ts`:
  - Remove any direct `@anthropic-ai/sdk` import or mock dependency
  - Import `callTriage` and `callPrescription` from `src/lib/llm.ts`
  - Add runtime key check: if `!process.env.ANTHROPIC_API_KEY`, return `503 { error: "llm_unavailable" }` before calling LLM
  - Existing 502 error handling for upstream LLM failures remains in place
- Update `src/instrumentation.ts`:
  - Log a startup `console.warn("AGENTCLINIC: ANTHROPIC_API_KEY is not set — visit pipeline will return 503")` if key is absent
- Remove `vi.mock('@anthropic-ai/sdk')` from all test files
- Remove `tests/helpers/llm.ts`
- Add `tests/fixtures/llm-triage.json` — a realistic Anthropic API response for the triage call (severity 2, two diagnoses with confidences 0.85 and 0.4)
- Add `tests/fixtures/llm-prescription.json` — a realistic Anthropic API response for the prescription call (two prescriptions with rationale text)
- Update `tests/domain/` and `tests/api/` parsing tests to use fixtures instead of mocks
- Mark integration tests that call the real API with `it.skipIf(!process.env.ANTHROPIC_API_KEY, ...)`
- `npm test` must pass with zero failures (skipped tests are not failures)

## Group 2 — Webhook Delivery (Day 2)

- Schema: add `webhook_endpoints` table to `src/db/schema.ts`:
  - `id` (uuid, PK), `url` (text, not null), `events` (text, not null — JSON array), `secret` (text, not null), `active` (integer, default 1), `created_at` (text)
  - Run `drizzle-kit generate` and apply migration
- `src/lib/webhook-delivery.ts`:
  - `initWebhookDelivery()` — subscribes to the `EventBus` singleton; call this from `instrumentation.ts`
  - On each event: query `webhook_endpoints` where `active = 1` and `events` JSON contains the event name
  - For each matching endpoint: POST JSON payload to `url` with headers `Content-Type: application/json`, `X-AgentClinic-Signature: sha256=<HMAC-SHA256(body, secret)>`
  - Retry logic: up to 3 attempts; delay sequence 1000 ms / 2000 ms / 4000 ms; retry on network error or HTTP ≥ 500; do not retry on HTTP 4xx
  - Log each attempt result with `console.log`; log final failure with `console.error`
- `POST /api/webhooks` (`src/app/api/webhooks/route.ts`):
  - Validate: `url` must start with `https://`, `events` must be non-empty array of known event names (`visit_created`, `visit_resolved`, `referral_created`, `chronic_flagged`), `secret` must be non-empty string
  - Insert row, return `201` with the created endpoint record
- `GET /api/webhooks`:
  - Return all endpoints (active and inactive) as JSON array
- `DELETE /api/webhooks/:id` (`src/app/api/webhooks/[id]/route.ts`):
  - Delete row; return `204` on success, `404` if not found
- `tests/api/webhooks.test.ts`: CRUD tests with in-memory SQLite
- `tests/domain/webhook-delivery.test.ts`:
  - Mock `global.fetch`; assert correct URL, method, headers, and body are sent
  - Assert signature header matches `HMAC-SHA256(body, secret)`
  - Assert retry fires on HTTP 500 response; assert no retry on HTTP 400
  - Assert inactive endpoint is skipped
  - Assert unknown event is not delivered to endpoint subscribed to a different event
- `npm test` must pass

## Group 3 — Client SDK (Day 3)

- Scaffold `packages/sdk/`:
  - `package.json` — name `@agentclinic/sdk`, version `0.1.0`, `main: "dist/index.js"`, `types: "dist/index.d.ts"`, no runtime dependencies
  - `tsconfig.json` — `target: ES2020`, `module: CommonJS`, `outDir: dist`, `declaration: true`, `strict: true`
  - `src/index.ts` — all exports
  - `tests/client.test.ts`
- `src/index.ts`:
  - Export `AgentClinicClient` class:
    - Constructor: `{ baseUrl: string; apiKey: string }`
    - Private `request<T>(path, method, body?)` helper — sets `Authorization: Bearer <apiKey>`, `Content-Type: application/json`; throws `AgentClinicError` on non-2xx
    - `register(params: RegisterParams): Promise<{ patient_id: string }>`
    - `getPatient(id: string): Promise<Patient>`
    - `submitVisit(params: SubmitVisitParams): Promise<Visit>`
    - `getVisit(id: string): Promise<Visit>`
    - `submitFollowup(visitId: string, outcome: "RESOLVED" | "PARTIAL" | "FAILED"): Promise<Visit>`
  - Export `AgentClinicError extends Error` with `status: number` and `code: string`
  - Export types: `Patient`, `Visit`, `Diagnosis`, `Prescription`, `RegisterParams`, `SubmitVisitParams`
- `tests/client.test.ts` using Vitest:
  - Mock `global.fetch` for each test
  - Assert `register()` sends `POST /api/patients` with correct body; returns `{ patient_id }`
  - Assert `submitVisit()` sends `POST /api/visits`; returns visit with `diagnoses` and `prescriptions` arrays
  - Assert `submitFollowup()` sends `POST /api/visits/:id/followup` with `{ outcome }`; returns updated visit
  - Assert `AgentClinicError` is thrown with correct `status` and `code` on `401` and `429` responses
  - Assert `Authorization` header is set on every request
- Add `packages/sdk` script to root `package.json`:
  - `"sdk:build": "cd packages/sdk && tsc"`
  - `"sdk:test": "cd packages/sdk && vitest run"`
- `npm run sdk:build` and `npm run sdk:test` must exit 0

## Group 4 — Phase 3 Validation Suite

- `tests/validation/phase3.test.ts`:
  - Re-run key Phase 2 assertions to confirm no regressions (patient CRUD, visit pipeline with LLM fixtures, analytics shape)
  - [auto] `callTriage` parses `tests/fixtures/llm-triage.json` into correct `TriageResult` shape
  - [auto] `callPrescription` parses `tests/fixtures/llm-prescription.json` into correct `PrescriptionResult` shape
  - [auto] `POST /api/visits` with `ANTHROPIC_API_KEY` unset returns `503 { error: "llm_unavailable" }`
  - [auto] `POST /api/webhooks` creates endpoint; `GET /api/webhooks` lists it; `DELETE /api/webhooks/:id` removes it
  - [auto] Webhook delivery POSTs to registered URL with correct signature on `visit_created` event
  - [auto] `AgentClinicClient` TypeScript types compile without errors
  - [auto] `AgentClinicClient.register()` sends correct HTTP request and returns `{ patient_id }`
- `npm test` (root) must exit 0; `npm run sdk:test` must exit 0
