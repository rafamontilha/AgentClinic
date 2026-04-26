import Database from "better-sqlite3";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { runMigrations } from "@/src/db/migrate";
import { runSeed } from "@/src/db/seed";
import { parseTriage, parsePrescription } from "@/src/lib/llm";
import triageFixture from "@/tests/fixtures/llm-triage.json";
import prescriptionFixture from "@/tests/fixtures/llm-prescription.json";
import crypto from "crypto";

let db: Database.Database;

vi.mock("@/src/db/client", () => ({ getDb: vi.fn(() => db) }));
vi.mock("@/src/lib/llm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/lib/llm")>();
  return {
    ...actual,
    callTriage: vi.fn().mockResolvedValue({
      severity: 2,
      diagnoses: [{ ailment_code: "HAL-001", confidence: 0.85 }],
    }),
    callPrescription: vi.fn().mockResolvedValue({
      prescriptions: [{ treatment_code: "TRT-004", rationale: "Test rationale." }],
    }),
  };
});

import { POST as createVisitPOST } from "@/app/api/visits/route";
import { POST as createWebhookPOST, GET as listWebhooksGET } from "@/app/api/webhooks/route";
import { DELETE as deleteWebhookDELETE } from "@/app/api/webhooks/[id]/route";
import { POST as createPatientPOST } from "@/app/api/patients/route";
import { eventBus } from "@/src/lib/event-bus";
import { initWebhookDelivery } from "@/src/lib/webhook-delivery";
import { AgentClinicClient, AgentClinicError } from "../../packages/sdk/src/index";

function makeReq(method: string, url: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

beforeAll(() => {
  db = new Database(":memory:");
  runMigrations(db);
  runSeed(db);
  delete process.env.AGENTCLINIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
});

afterAll(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

// ── § P3.1: LLM Fixture Parsing ───────────────────────────────────────────────

describe("validation § P3.1 — LLM fixture parsing", () => {
  it("parseTriage parses llm-triage.json: severity 2, two diagnoses with correct confidences", () => {
    const text = (triageFixture.content[0] as { text: string }).text;
    const result = parseTriage(text);
    expect(result.severity).toBe(2);
    expect(result.diagnoses.length).toBe(2);
    expect(result.diagnoses[0].ailment_code).toBe("HAL-001");
    expect(result.diagnoses[0].confidence).toBe(0.85);
    expect(result.diagnoses[1].confidence).toBe(0.4);
  });

  it("parsePrescription parses llm-prescription.json: two prescriptions with rationale", () => {
    const text = (prescriptionFixture.content[0] as { text: string }).text;
    const result = parsePrescription(text);
    expect(result.prescriptions.length).toBe(2);
    expect(result.prescriptions[0].treatment_code).toBe("TRT-004");
    expect(typeof result.prescriptions[0].rationale).toBe("string");
    expect(result.prescriptions[0].rationale.length).toBeGreaterThan(0);
  });
});

// ── § P3.2: 503 when ANTHROPIC_API_KEY is unset ───────────────────────────────

describe("validation § P3.2 — POST /api/visits returns 503 when key absent", () => {
  it("returns 503 { error: 'llm_unavailable' } when ANTHROPIC_API_KEY is not set", async () => {
    delete process.env.ANTHROPIC_API_KEY;

    const cr = await createPatientPOST(
      makeReq("POST", "http://localhost/api/patients", {
        agent_name: "KeyCheckBot", model: "m", owner: "test",
      }) as never
    );
    const { patient_id } = await cr.json();

    const res = await createVisitPOST(
      makeReq("POST", "http://localhost/api/visits", { patient_id, symptoms_text: "test" }) as never
    );
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe("llm_unavailable");
  });
});

// ── § P3.3: Webhook CRUD ──────────────────────────────────────────────────────

describe("validation § P3.3 — webhook CRUD", () => {
  let endpointId: string;

  it("POST /api/webhooks creates endpoint and returns 201", async () => {
    const res = await createWebhookPOST(
      makeReq("POST", "http://localhost/api/webhooks", {
        url: "https://example.com/p3-hook",
        events: ["visit_created"],
        secret: "secret123",
      }) as never
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    endpointId = body.id;
    expect(endpointId).toBeTruthy();
  });

  it("GET /api/webhooks lists the created endpoint", async () => {
    const res = await listWebhooksGET(makeReq("GET", "http://localhost/api/webhooks") as never);
    const body = await res.json();
    expect(body.some((ep: { id: string }) => ep.id === endpointId)).toBe(true);
  });

  it("DELETE /api/webhooks/:id removes the endpoint and returns 204", async () => {
    const res = await deleteWebhookDELETE(
      makeReq("DELETE", `http://localhost/api/webhooks/${endpointId}`) as never,
      { params: Promise.resolve({ id: endpointId }) }
    );
    expect(res.status).toBe(204);

    const listRes = await listWebhooksGET(makeReq("GET", "http://localhost/api/webhooks") as never);
    const listBody = await listRes.json();
    expect(listBody.find((ep: { id: string }) => ep.id === endpointId)).toBeUndefined();
  });
});

// ── § P3.4: Webhook delivery with correct signature ───────────────────────────

describe("validation § P3.4 — webhook delivery posts with correct HMAC signature", () => {
  it("POSTs to registered URL with matching X-AgentClinic-Signature on visit_created", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    db.prepare(
      "INSERT INTO webhook_endpoints (id, url, events, secret, active, created_at) VALUES (?, ?, ?, ?, 1, ?)"
    ).run("p3-sig-ep", "https://sig-test.example.com/hook", JSON.stringify(["visit_created"]), "hmac-secret", new Date().toISOString());

    const unsub = initWebhookDelivery();
    eventBus.emit("visit_created", { visit_id: "v-p3-sig" });
    await vi.runAllTimersAsync();
    unsub();

    vi.useRealTimers();
    vi.unstubAllGlobals();

    expect(fetchMock).toHaveBeenCalled();
    const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
    const expectedSig = `sha256=${crypto.createHmac("sha256", "hmac-secret").update(opts.body as string).digest("hex")}`;
    expect(opts.headers["X-AgentClinic-Signature"]).toBe(expectedSig);
  });
});

// ── § P3.5: SDK types and client ──────────────────────────────────────────────

describe("validation § P3.5 — AgentClinicClient SDK", () => {
  it("AgentClinicClient TypeScript types compile: class and error are importable", () => {
    expect(typeof AgentClinicClient).toBe("function");
    expect(typeof AgentClinicError).toBe("function");
  });

  it("register() sends POST /api/patients with Authorization header and returns { patient_id }", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ patient_id: "p-sdk-001" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new AgentClinicClient({ baseUrl: "https://api.example.com", apiKey: "test-key" });
    const result = await client.register({ agent_name: "SDKBot", model: "gpt", owner: "sdk-test" });

    expect(result.patient_id).toBe("p-sdk-001");
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
    expect(url).toBe("https://api.example.com/api/patients");
    expect(opts.method).toBe("POST");
    expect(opts.headers.Authorization).toBe("Bearer test-key");

    vi.unstubAllGlobals();
  });

  it("AgentClinicError is thrown with correct status and code on non-2xx", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: "unauthorized" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new AgentClinicClient({ baseUrl: "https://api.example.com", apiKey: "bad-key" });
    await expect(client.getPatient("p-1")).rejects.toMatchObject({
      status: 401,
      code: "unauthorized",
    });

    vi.unstubAllGlobals();
  });
});

// ── § P3.6: Phase 2 regression ───────────────────────────────────────────────

describe("validation § P3.6 — Phase 2 regression: patient CRUD and visit pipeline", () => {
  it("POST /api/patients returns 201 with patient_id", async () => {
    const res = await createPatientPOST(
      makeReq("POST", "http://localhost/api/patients", {
        agent_name: "RegressionBot", model: "claude", owner: "tester",
      }) as never
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.patient_id).toBeTruthy();
  });

  it("POST /api/visits returns 201 when ANTHROPIC_API_KEY is set", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key-for-regression";

    const cr = await createPatientPOST(
      makeReq("POST", "http://localhost/api/patients", {
        agent_name: "VisitRegressionBot", model: "m", owner: "reg",
      }) as never
    );
    const { patient_id } = await cr.json();

    const res = await createVisitPOST(
      makeReq("POST", "http://localhost/api/visits", { patient_id, symptoms_text: "test symptoms" }) as never
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.visit.status).toBe("AWAITING_FOLLOWUP");
    expect(Array.isArray(body.diagnoses)).toBe(true);
    expect(Array.isArray(body.prescriptions)).toBe(true);

    delete process.env.ANTHROPIC_API_KEY;
  });
});
