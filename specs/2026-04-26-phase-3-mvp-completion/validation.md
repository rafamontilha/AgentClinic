# Phase 3 — MVP Completion: Validation

Phase 3 is ready to merge when **`npm test` and `npm run sdk:test` both pass with zero failures**. The criteria below are the authoritative checklist; `tests/validation/phase3.test.ts` automates all assertions marked `[auto]`. Manual steps are marked `[manual]`.

---

## 1. Real LLM Integration

- [auto] `callTriage` parses the fixture in `tests/fixtures/llm-triage.json` into `{ severity: number, diagnoses: Array<{ ailment_code: string, confidence: number }> }` without error
- [auto] `callPrescription` parses the fixture in `tests/fixtures/llm-prescription.json` into `{ prescriptions: Array<{ treatment_code: string, rationale: string }> }` without error
- [auto] `POST /api/visits` with `ANTHROPIC_API_KEY` unset (or empty string) returns `503` with body `{ error: "llm_unavailable" }`
- [auto] A malformed LLM JSON response (fixture with missing fields) causes `POST /api/visits` to return `502` with a structured JSON error — not an opaque 500
- [auto] No test file contains `vi.mock('@anthropic-ai/sdk')` (grep assertion)
- [auto] `tests/helpers/llm.ts` does not exist (file-absence assertion)
- [auto] (skip if `ANTHROPIC_API_KEY` absent) `POST /api/visits` with a real key returns `201` with `severity`, `diagnoses`, and `prescriptions`
- [auto] (skip if `ANTHROPIC_API_KEY` absent) Second identical triage call returns `usage.cache_read_input_tokens > 0` in the Anthropic response, confirming prompt caching is active
- [manual] Set `ANTHROPIC_API_KEY` in `.env`, start `npm run dev`, POST a visit via curl — confirm the response contains a real AI-generated diagnosis and rationale (not fixture data)

## 2. Webhook API

- [auto] `POST /api/webhooks` with valid body returns `201` and a record containing `id`, `url`, `events`, `active: 1`
- [auto] `POST /api/webhooks` with a non-HTTPS `url` returns `400`
- [auto] `POST /api/webhooks` with an unknown event name in `events` array returns `400`
- [auto] `POST /api/webhooks` with empty `secret` returns `400`
- [auto] `GET /api/webhooks` returns the created endpoint in the array
- [auto] `DELETE /api/webhooks/:id` returns `204`; subsequent `GET /api/webhooks` does not include the deleted endpoint
- [auto] `DELETE /api/webhooks/<unknown-id>` returns `404`
- [auto] All `/api/webhooks` routes return `401` when `AGENTCLINIC_API_KEY` is set and the request omits the header

## 3. Webhook Delivery

- [auto] `webhook-delivery.ts`: on `visit_created` event, a registered active endpoint with `events: ["visit_created"]` receives a POST with the correct JSON payload
- [auto] The `X-AgentClinic-Signature` header on the delivery equals `sha256=` + `HMAC-SHA256(rawBody, secret)` in hex
- [auto] An inactive endpoint (`active: 0`) does not receive the delivery
- [auto] An endpoint subscribed only to `referral_created` does not receive a `visit_created` delivery
- [auto] Delivery retries exactly 3 times when `fetch` returns HTTP 500; total fetch calls = 3
- [auto] Delivery does not retry when `fetch` returns HTTP 400; total fetch calls = 1
- [auto] After all 3 retries fail, a `console.error` is called with the endpoint ID and event name
- [manual] Register a webhook endpoint pointing to a local `nc -l` listener; submit a visit; confirm the POST arrives with the correct signature header

## 4. Client SDK

- [auto] `packages/sdk/` compiles with `tsc --noEmit` (exit 0) — verifies all types are consistent
- [auto] `AgentClinicClient.register({ agent_name, owner, model })` sends `POST <baseUrl>/api/patients` with `Authorization: Bearer <apiKey>` and returns `{ patient_id: string }`
- [auto] `AgentClinicClient.getPatient(id)` sends `GET <baseUrl>/api/patients/:id` and returns a `Patient`-shaped object
- [auto] `AgentClinicClient.submitVisit({ patient_id, symptoms_text })` sends `POST <baseUrl>/api/visits` and returns a `Visit` with non-empty `diagnoses` and `prescriptions` arrays
- [auto] `AgentClinicClient.getVisit(id)` sends `GET <baseUrl>/api/visits/:id` and returns a `Visit`
- [auto] `AgentClinicClient.submitFollowup(visitId, "RESOLVED")` sends `POST <baseUrl>/api/visits/:id/followup` with body `{ outcome: "RESOLVED" }` and returns an updated `Visit`
- [auto] On HTTP `401` response, all methods throw `AgentClinicError` with `error.status === 401`
- [auto] On HTTP `429` response, methods throw `AgentClinicError` with `error.status === 429` and `error.code === "rate_limit_exceeded"`
- [manual] Run `npm run sdk:build`; confirm `packages/sdk/dist/index.js` and `packages/sdk/dist/index.d.ts` are generated; import the built package in a throwaway Node.js script and call `new AgentClinicClient(...)` without TypeScript errors

## 5. Regression: Phase 2 Assertions Must Still Pass

- [auto] All assertions from `tests/validation/phase2.test.ts` continue to pass with zero failures after Phase 3 changes
- [auto] `POST /api/patients`, `GET /api/patients/:id`, `GET /api/ailments`, `GET /api/treatments`, `GET /api/analytics/overview` all return expected shapes (smoke check for API contract stability)

---

## Merge Blockers

The following failures **block merge** regardless of other passing tests:

1. `npm test` exits non-zero
2. `npm run sdk:test` exits non-zero
3. Any `[auto]` assertion in `tests/validation/phase3.test.ts` fails
4. Any Phase 2 `[auto]` assertion regresses
5. `vi.mock('@anthropic-ai/sdk')` is still present in any test file
6. Webhook delivery silently swallows delivery failures (must log with `console.error` after exhausting retries)
7. `AgentClinicError` is not thrown on non-2xx SDK responses (callers must not receive raw `fetch` errors)
