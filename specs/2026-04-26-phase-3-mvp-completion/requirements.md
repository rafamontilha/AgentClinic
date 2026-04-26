# Phase 3 — MVP Completion: Requirements

## Scope

Phase 3 promotes AgentClinic from a development scaffold to a deployable product. Phase 2 shipped the full visit pipeline but mocked all Anthropic SDK calls. This phase removes the mock layer, adds push notification delivery for external orchestrators, and ships a typed SDK so agents can integrate without hand-writing HTTP requests.

### In scope

- **Real LLM integration**: replace all `vi.mock('@anthropic-ai/sdk')` stubs with real Anthropic API calls in the visit pipeline. Add prompt caching on the ailment catalog system prompt block.
- **Webhooks**: `webhook_endpoints` table, CRUD management API, async HTTP delivery on EventBus events, HMAC-SHA256 signatures, 3-attempt retry with exponential backoff.
- **Client SDK**: TypeScript package at `packages/sdk/` — `AgentClinicClient` class with typed methods and exported types. Zero runtime dependencies.

### Out of scope (still deferred per roadmap)

- Multi-tenant auth, per-team API keys, RBAC
- Treatment A/B testing
- SSE ring buffer / replay on reconnect
- Embeddings-based diagnosis
- Historical log import
- Billing and usage metering

---

## Decisions

### Real LLM Integration

The two-call shape established in Phase 2 is unchanged:
- **Call 1 (triage + diagnosis):** `{ severity: 1|2|3|4, diagnoses: [{ ailment_code, confidence }] }`
- **Call 2 (prescription):** `{ prescriptions: [{ treatment_code, rationale }] }`

`src/lib/llm.ts` wraps the Anthropic client and exports two pure async functions — `callTriage(symptoms, ailments)` and `callPrescription(ailment, history, treatments)` — so the route handler never imports the SDK directly.

**Prompt caching:** Call 1 marks the ailment catalog block with `cache_control: { type: "ephemeral" }`. This is the large, stable content that changes only on seed updates. Caching reduces cost and latency on repeated visits.

**Missing key behavior:** If `ANTHROPIC_API_KEY` is unset at request time, `POST /api/visits` returns `503 Service Unavailable` with `{ error: "llm_unavailable", message: "ANTHROPIC_API_KEY is not configured" }`. A startup `console.warn` in `instrumentation.ts` also fires. Dev mode (`NODE_ENV=development`) continues with a warning but still 503s — the intent is that a local developer knows immediately when the key is absent rather than silently getting mock data.

**Test strategy:** Remove `vi.mock('@anthropic-ai/sdk')` and `tests/helpers/llm.ts`. Replace with:
- `tests/fixtures/llm-triage.json` and `tests/fixtures/llm-prescription.json` — realistic API response shapes used in parsing/unit tests.
- Integration tests that require a real API key use `it.skipIf(!process.env.ANTHROPIC_API_KEY)` so CI without a key does not fail.
- LLM response parsing remains deterministic and fully testable with fixtures regardless of key availability.

### Webhooks

**Schema:** New `webhook_endpoints` table:

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | primary key |
| `url` | text | HTTPS URL to POST to |
| `events` | text | JSON array of event names |
| `secret` | text | HMAC-SHA256 signing key |
| `active` | integer | 1 = active, 0 = inactive |
| `created_at` | text | ISO timestamp |

**Delivery:** `src/lib/webhook-delivery.ts` subscribes to the in-memory `EventBus` singleton at startup. On each event, it queries active endpoints subscribed to that event type and POSTs the payload as JSON.

**Signature:** Every delivery includes `X-AgentClinic-Signature: sha256=<hex>` where the hex value is `HMAC-SHA256(rawBody, secret)`. Consumers verify this to reject spoofed payloads.

**Retry:** 3 attempts per delivery with delays of 1 s → 2 s → 4 s. HTTP 5xx responses and network errors trigger retry; 4xx responses (bad endpoint config) do not retry. Failed deliveries after all retries are logged with `console.error`; no dead-letter queue for MVP.

**API routes:** All protected by API key auth middleware.
- `POST /api/webhooks` — create endpoint; validate URL (must be HTTPS), events (must be known event names), secret (non-empty string).
- `GET /api/webhooks` — list endpoints (returns all, including inactive).
- `DELETE /api/webhooks/:id` — hard delete; 404 if not found.

### Client SDK

**Location:** `packages/sdk/` — a local TypeScript package. Not published to npm for MVP.

**Constructor:** `new AgentClinicClient({ baseUrl: string, apiKey: string })`

**Methods:**

| Method | HTTP | Description |
|--------|------|-------------|
| `register(params)` | `POST /api/patients` | Returns `{ patient_id }` |
| `getPatient(id)` | `GET /api/patients/:id` | Returns `Patient` |
| `submitVisit(params)` | `POST /api/visits` | Returns `Visit` with diagnoses + prescriptions |
| `getVisit(id)` | `GET /api/visits/:id` | Returns `Visit` |
| `submitFollowup(visitId, outcome)` | `POST /api/visits/:id/followup` | Returns updated `Visit` |

**Error handling:** Non-2xx responses throw `AgentClinicError` with `status: number` and `code: string` (the `error` field from the API JSON body).

**Exported types:** `Patient`, `Visit`, `Diagnosis`, `Prescription`, `Followup`, `AgentClinicError`.

**Build:** `tsc` targeting `packages/sdk/dist/`. No bundler. `packages/sdk/package.json` sets `main` to `dist/index.js` and `types` to `dist/index.d.ts`.

**Tests:** `packages/sdk/tests/client.test.ts` — mock `global.fetch`, assert correct URL, method, headers, and body for each method; assert `AgentClinicError` is thrown on 4xx/5xx.

---

## Context

Phase 1 scaffolded Next.js 15, SQLite via Drizzle, and the dashboard shell. Phase 2 delivered the complete visit pipeline, analytics endpoints, SSE event bus, background jobs, and all five dashboard pages — but all Anthropic SDK calls were mocked because a real key was unavailable during development. The in-memory `EventBus` singleton already exists in `src/lib/event-bus.ts`, making webhook delivery straightforward to layer on top.

The Phase 2 REST API contracts (`/api/patients`, `/api/visits`, `/api/ailments`, `/api/treatments`, `/api/analytics`, `/api/events`) are stable and must not change in this phase. Phase 3 adds new routes (`/api/webhooks`) and a new package (`packages/sdk/`) without modifying existing API behavior.

Responsive design and PicoCSS styling requirements from Phase 2 carry forward for any UI additions (webhook management page is out of scope for Phase 3 — operators manage endpoints via API for now).
