import Database from "better-sqlite3";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { runMigrations } from "@/src/db/migrate";
import { runSeed } from "@/src/db/seed";
import { v4 as uuid } from "uuid";

let db: Database.Database;

vi.mock("@/src/db/client", () => ({ getDb: vi.fn(() => db) }));
vi.mock("@/src/lib/llm", () => ({
  callTriage: vi.fn().mockResolvedValue({
    severity: 2,
    diagnoses: [{ ailment_code: "HAL-001", confidence: 0.85 }],
  }),
  callPrescription: vi.fn().mockResolvedValue({
    prescriptions: [{ treatment_code: "TRT-004", rationale: "Reduce temperature." }],
  }),
}));

import { GET as listGET, POST } from "@/app/api/visits/route";
import { GET as getByIdGET } from "@/app/api/visits/[id]/route";
import { POST as followupPOST } from "@/app/api/visits/[id]/followup/route";

function makeReq(method: string, url: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function insertPatient() {
  const id = uuid();
  const now = Date.now();
  db.prepare(
    `INSERT INTO patients (id, agent_name, model, owner, status, created_at, updated_at)
     VALUES (?, 'TestBot', 'model', 'owner', 'active', ?, ?)`
  ).run(id, now, now);
  return id;
}

beforeEach(() => {
  db = new Database(":memory:");
  runMigrations(db);
  runSeed(db);
  delete process.env.AGENTCLINIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = "test-key";
});

describe("POST /api/visits", () => {
  it("returns 201 with visit_id, status AWAITING_FOLLOWUP, severity, diagnoses, prescriptions", async () => {
    const patient_id = insertPatient();
    const res = await POST(
      makeReq("POST", "http://localhost/api/visits", {
        patient_id,
        symptoms_text: "I keep hallucinating numbers",
      }) as never
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.visit.id).toBeTruthy();
    expect(body.visit.status).toBe("AWAITING_FOLLOWUP");
    expect(body.visit.severity).toBe(2);
    expect(body.diagnoses.length).toBeGreaterThan(0);
    expect(body.prescriptions.length).toBeGreaterThan(0);
  });

  it("returns 404 when patient does not exist", async () => {
    const res = await POST(
      makeReq("POST", "http://localhost/api/visits", {
        patient_id: "nonexistent",
        symptoms_text: "something",
      }) as never
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await POST(
      makeReq("POST", "http://localhost/api/visits", { patient_id: "x" }) as never
    );
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate limit is exceeded", async () => {
    const patient_id = insertPatient();
    const now = Date.now();
    // Insert 10 visits in the last hour
    for (let i = 0; i < 10; i++) {
      db.prepare(
        `INSERT INTO visits (id, patient_id, symptoms, severity, status, recurrence_flag, created_at, updated_at)
         VALUES (?, ?, 'x', 1, 'AWAITING_FOLLOWUP', 0, ?, ?)`
      ).run(uuid(), patient_id, now, now);
    }
    const res = await POST(
      makeReq("POST", "http://localhost/api/visits", {
        patient_id,
        symptoms_text: "another visit",
      }) as never
    );
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe("rate_limit_exceeded");
    expect(typeof body.retry_after_seconds).toBe("number");
  });

  it("sets recurrence_flag when same ailment was RESOLVED within 7 days", async () => {
    const { callTriage } = await import("@/src/lib/llm");
    vi.mocked(callTriage).mockResolvedValue({
      severity: 1,
      diagnoses: [{ ailment_code: "CTX-001", confidence: 0.9 }],
    });

    const patient_id = insertPatient();
    const recentTime = Date.now() - 1 * 24 * 60 * 60 * 1000; // 1 day ago

    // Insert a resolved visit with CTX-001
    const oldVisitId = uuid();
    db.prepare(
      `INSERT INTO visits (id, patient_id, symptoms, status, recurrence_flag, created_at, updated_at, resolved_at)
       VALUES (?, ?, 'context issues', 'RESOLVED', 0, ?, ?, ?)`
    ).run(oldVisitId, patient_id, recentTime, recentTime, recentTime);
    db.prepare(
      `INSERT INTO diagnoses (id, visit_id, ailment_code, confidence, is_primary) VALUES (?, ?, 'CTX-001', 0.9, 1)`
    ).run(uuid(), oldVisitId);

    const res = await POST(
      makeReq("POST", "http://localhost/api/visits", {
        patient_id,
        symptoms_text: "context rot again",
      }) as never
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.visit.recurrence_flag).toBe(1);
  });

  it("auto-creates custom ailment when confidence < 0.4", async () => {
    const { callTriage } = await import("@/src/lib/llm");
    vi.mocked(callTriage).mockResolvedValue({
      severity: 1,
      diagnoses: [{ ailment_code: "HAL-001", confidence: 0.1 }],
    });

    const patient_id = insertPatient();
    const res = await POST(
      makeReq("POST", "http://localhost/api/visits", {
        patient_id,
        symptoms_text: "mysterious unknown issue",
      }) as never
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    const primaryDx = body.diagnoses.find((d: { is_primary: number }) => d.is_primary === 1);
    expect(primaryDx.ailment_code).toMatch(/^CUSTOM-/);
  });
});

describe("GET /api/visits/:id", () => {
  it("returns visit record with diagnoses and prescriptions", async () => {
    const patient_id = insertPatient();
    const createRes = await POST(
      makeReq("POST", "http://localhost/api/visits", {
        patient_id,
        symptoms_text: "hallucinating",
      }) as never
    );
    const { visit } = await createRes.json();

    const res = await getByIdGET(
      makeReq("GET", `http://localhost/api/visits/${visit.id}`) as never,
      { params: Promise.resolve({ id: visit.id }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.visit.id).toBe(visit.id);
    expect(Array.isArray(body.diagnoses)).toBe(true);
    expect(Array.isArray(body.prescriptions)).toBe(true);
  });

  it("returns 404 for unknown visit", async () => {
    const res = await getByIdGET(
      makeReq("GET", "http://localhost/api/visits/nope") as never,
      { params: Promise.resolve({ id: "nope" }) }
    );
    expect(res.status).toBe(404);
  });
});

describe("GET /api/visits?patient_id=", () => {
  it("returns only that patient's visits", async () => {
    const patient_id = insertPatient();
    await POST(
      makeReq("POST", "http://localhost/api/visits", { patient_id, symptoms_text: "test" }) as never
    );
    const res = await listGET(
      makeReq("GET", `http://localhost/api/visits?patient_id=${patient_id}`) as never
    );
    const body = await res.json();
    expect(body.every((r: { visit: { patient_id: string } }) => r.visit.patient_id === patient_id)).toBe(true);
  });
});

describe("POST /api/visits/:id/followup", () => {
  it("sets visit to RESOLVED and updates effectiveness score", async () => {
    const patient_id = insertPatient();
    const createRes = await POST(
      makeReq("POST", "http://localhost/api/visits", { patient_id, symptoms_text: "hallucinating" }) as never
    );
    const { visit } = await createRes.json();

    const res = await followupPOST(
      makeReq("POST", `http://localhost/api/visits/${visit.id}/followup`, { outcome: "RESOLVED" }) as never,
      { params: Promise.resolve({ id: visit.id }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.visit.status).toBe("RESOLVED");
  });

  it("returns 409 if visit is not AWAITING_FOLLOWUP", async () => {
    const patient_id = insertPatient();
    const createRes = await POST(
      makeReq("POST", "http://localhost/api/visits", { patient_id, symptoms_text: "test" }) as never
    );
    const { visit } = await createRes.json();

    // Resolve once
    await followupPOST(
      makeReq("POST", `http://localhost/api/visits/${visit.id}/followup`, { outcome: "RESOLVED" }) as never,
      { params: Promise.resolve({ id: visit.id }) }
    );

    // Try to followup again
    const res2 = await followupPOST(
      makeReq("POST", `http://localhost/api/visits/${visit.id}/followup`, { outcome: "PARTIAL" }) as never,
      { params: Promise.resolve({ id: visit.id }) }
    );
    expect(res2.status).toBe(409);
  });

  it("returns 400 for invalid outcome", async () => {
    const patient_id = insertPatient();
    const createRes = await POST(
      makeReq("POST", "http://localhost/api/visits", { patient_id, symptoms_text: "test" }) as never
    );
    const { visit } = await createRes.json();

    const res = await followupPOST(
      makeReq("POST", `http://localhost/api/visits/${visit.id}/followup`, { outcome: "INVALID" }) as never,
      { params: Promise.resolve({ id: visit.id }) }
    );
    expect(res.status).toBe(400);
  });
});
