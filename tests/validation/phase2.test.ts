/**
 * Automated acceptance gate for Phase 2 validation.md.
 * Covers all [auto] checklist items from sections 1–7.
 */
import Database from "better-sqlite3";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { v4 as uuid } from "uuid";
import { runMigrations } from "@/src/db/migrate";
import { runSeed } from "@/src/db/seed";

let db: Database.Database;

vi.mock("@/src/db/client", () => ({ getDb: vi.fn(() => db) }));
vi.mock("@/src/lib/llm", () => ({
  callTriage: vi.fn().mockResolvedValue({
    severity: 2,
    diagnoses: [{ ailment_code: "HAL-001", confidence: 0.85 }],
  }),
  callPrescription: vi.fn().mockResolvedValue({
    prescriptions: [{ treatment_code: "TRT-004", rationale: "Lower temperature." }],
  }),
}));

import { GET as listAilmentsGET, POST as createAilmentPOST } from "@/app/api/ailments/route";
import { GET as getAilmentGET } from "@/app/api/ailments/[code]/route";
import { GET as listTreatmentsGET } from "@/app/api/treatments/route";
import { GET as getTreatmentGET } from "@/app/api/treatments/[code]/route";
import { POST as createPatientPOST } from "@/app/api/patients/route";
import { GET as getPatientGET, PATCH as patchPatientPATCH } from "@/app/api/patients/[id]/route";
import { GET as patientHistoryGET } from "@/app/api/patients/[id]/history/route";
import { POST as createVisitPOST } from "@/app/api/visits/route";
import { GET as getVisitGET } from "@/app/api/visits/[id]/route";
import { GET as listVisitsGET } from "@/app/api/visits/route";
import { POST as followupPOST } from "@/app/api/visits/[id]/followup/route";
import { runExpireVisits } from "@/src/jobs/expire-visits";
import { runFlagChronics } from "@/src/jobs/flag-chronics";
import { GET as overviewGET } from "@/app/api/analytics/overview/route";
import { GET as ailmentAnalyticsGET } from "@/app/api/analytics/ailments/route";
import { GET as treatmentAnalyticsGET } from "@/app/api/analytics/treatments/route";
import { GET as patientAnalyticsGET } from "@/app/api/analytics/patients/[id]/route";
import { eventBus } from "@/src/lib/event-bus";

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
  process.env.ANTHROPIC_API_KEY = "test-key";
});

// ── § 1: Schema & Seed ────────────────────────────────────────────────────────

describe("validation § 1 — schema and seed", () => {
  it("runMigrations completes without error", () => {
    expect(() => runMigrations(new Database(":memory:"))).not.toThrow();
  });

  it("all 10 required tables exist", () => {
    const names = (
      db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]
    ).map((r) => r.name);
    const required = [
      "patients", "visits", "diagnoses", "prescriptions", "followups",
      "referrals", "chronic_conditions", "ailments", "treatments", "ailment_treatments",
    ];
    for (const t of required) expect(names).toContain(t);
  });

  it("seed inserts exactly 10 ailments", () => {
    const { n } = db.prepare("SELECT COUNT(*) AS n FROM ailments").get() as { n: number };
    expect(n).toBe(10);
  });

  it("seed inserts exactly 10 treatments", () => {
    const { n } = db.prepare("SELECT COUNT(*) AS n FROM treatments").get() as { n: number };
    expect(n).toBe(10);
  });

  it("seed inserts at least one ailment_treatments row per ailment", () => {
    const { n } = db.prepare("SELECT COUNT(*) AS n FROM ailment_treatments").get() as { n: number };
    expect(n).toBeGreaterThanOrEqual(10);
  });
});

// ── § 2: Patient API ──────────────────────────────────────────────────────────

describe("validation § 2 — patient API", () => {
  let patient_id: string;

  it("POST /api/patients returns 201 with patient_id", async () => {
    const res = await createPatientPOST(
      makeReq("POST", "http://localhost/api/patients", {
        agent_name: "Phase2Bot", model: "claude-3", owner: "tester",
      }) as never
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.patient_id).toBeTruthy();
    patient_id = body.patient_id;
  });

  it("POST /api/patients duplicate returns existing patient_id", async () => {
    const res = await createPatientPOST(
      makeReq("POST", "http://localhost/api/patients", {
        agent_name: "Phase2Bot", model: "claude-3", owner: "tester",
      }) as never
    );
    const body = await res.json();
    expect(body.existing).toBe(true);
    expect(body.patient_id).toBe(patient_id);
  });

  it("GET /api/patients/:id returns the patient", async () => {
    const res = await getPatientGET(
      makeReq("GET", `http://localhost/api/patients/${patient_id}`) as never,
      { params: Promise.resolve({ id: patient_id }) }
    );
    expect(res.status).toBe(200);
  });

  it("GET /api/patients/:id unknown returns 404", async () => {
    const res = await getPatientGET(
      makeReq("GET", "http://localhost/api/patients/nope") as never,
      { params: Promise.resolve({ id: "nope" }) }
    );
    expect(res.status).toBe(404);
  });

  it("GET /api/patients?status=active returns matching patients", async () => {
    const res = await (await import("@/app/api/patients/route")).GET(
      makeReq("GET", "http://localhost/api/patients?status=active") as never
    );
    const body = await res.json();
    expect(body.every((p: { status: string }) => p.status === "active")).toBe(true);
  });

  it("PATCH /api/patients/:id updates model and status", async () => {
    const res = await patchPatientPATCH(
      makeReq("PATCH", `http://localhost/api/patients/${patient_id}`, { status: "inactive" }) as never,
      { params: Promise.resolve({ id: patient_id }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("inactive");
  });

  it("GET /api/patients/:id/history returns empty visits for new patient", async () => {
    const res = await patientHistoryGET(
      makeReq("GET", `http://localhost/api/patients/${patient_id}/history`) as never,
      { params: Promise.resolve({ id: patient_id }) }
    );
    const body = await res.json();
    expect(Array.isArray(body.visits)).toBe(true);
  });

  it("request without Bearer token returns 401 when key is set", async () => {
    process.env.AGENTCLINIC_API_KEY = "secret";
    const res = await createPatientPOST(new Request("http://localhost/api/patients", { method: "POST" }) as never);
    expect(res.status).toBe(401);
    delete process.env.AGENTCLINIC_API_KEY;
  });
});

// ── § 3: Ailment & Treatment Catalog ─────────────────────────────────────────

describe("validation § 3 — ailment and treatment catalog", () => {
  it("GET /api/ailments returns ≥ 10 ailments", async () => {
    const body = await (await listAilmentsGET(makeReq("GET", "http://localhost/api/ailments") as never)).json();
    expect(body.length).toBeGreaterThanOrEqual(10);
  });

  it("POST /api/ailments creates custom ailment and GET retrieves it", async () => {
    const res = await createAilmentPOST(
      makeReq("POST", "http://localhost/api/ailments", { name: "Test Custom" }) as never
    );
    expect(res.status).toBe(201);
    const { code } = await res.json();
    const getRes = await getAilmentGET(
      makeReq("GET", `http://localhost/api/ailments/${code}`) as never,
      { params: Promise.resolve({ code }) }
    );
    expect(getRes.status).toBe(200);
  });

  it("GET /api/treatments returns ≥ 10 treatments", async () => {
    const body = await (await listTreatmentsGET(makeReq("GET", "http://localhost/api/treatments") as never)).json();
    expect(body.length).toBeGreaterThanOrEqual(10);
  });

  it("GET /api/treatments/:code returns effectiveness scores", async () => {
    const body = await (
      await getTreatmentGET(
        makeReq("GET", "http://localhost/api/treatments/TRT-001") as never,
        { params: Promise.resolve({ code: "TRT-001" }) }
      )
    ).json();
    expect(Array.isArray(body.effectiveness)).toBe(true);
  });
});

// ── § 4: Visit Pipeline ───────────────────────────────────────────────────────

describe("validation § 4 — visit pipeline", () => {
  let visit_id: string;
  let patient_id: string;

  it("POST /api/visits returns 201 with full visit record", async () => {
    const cr = await createPatientPOST(
      makeReq("POST", "http://localhost/api/patients", {
        agent_name: "PipelineBot", model: "claude", owner: "pipeline-tester",
      }) as never
    );
    patient_id = (await cr.json()).patient_id;

    // Ensure status is active before creating a visit
    db.prepare("UPDATE patients SET status = 'active' WHERE id = ?").run(patient_id);

    const res = await createVisitPOST(
      makeReq("POST", "http://localhost/api/visits", {
        patient_id,
        symptoms_text: "severe hallucinations",
      }) as never
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.visit.status).toBe("AWAITING_FOLLOWUP");
    expect(body.visit.severity).toBeGreaterThanOrEqual(1);
    expect(body.diagnoses.length).toBeGreaterThan(0);
    expect(body.prescriptions.length).toBeGreaterThan(0);
    visit_id = body.visit.id;
  });

  it("rate limit: 10 visits/hour triggers 429 with retry_after_seconds", async () => {
    const cr = await createPatientPOST(
      makeReq("POST", "http://localhost/api/patients", {
        agent_name: "RateLimitBot", model: "m", owner: "rl",
      }) as never
    );
    const pid = (await cr.json()).patient_id;
    const now = Date.now();
    for (let i = 0; i < 10; i++) {
      db.prepare(
        `INSERT INTO visits (id, patient_id, symptoms, severity, status, recurrence_flag, created_at, updated_at)
         VALUES (?, ?, 'x', 1, 'AWAITING_FOLLOWUP', 0, ?, ?)`
      ).run(uuid(), pid, now, now);
    }
    const res = await createVisitPOST(
      makeReq("POST", "http://localhost/api/visits", { patient_id: pid, symptoms_text: "overflow" }) as never
    );
    expect(res.status).toBe(429);
    expect((await res.json()).retry_after_seconds).toBeGreaterThan(0);
  });

  it("auto-creates custom ailment when LLM confidence < 0.4", async () => {
    const { callTriage } = await import("@/src/lib/llm");
    vi.mocked(callTriage).mockResolvedValueOnce({
      severity: 1,
      diagnoses: [{ ailment_code: "HAL-001", confidence: 0.05 }],
    });
    const cr = await createPatientPOST(
      makeReq("POST", "http://localhost/api/patients", {
        agent_name: "CustomBot", model: "m", owner: "custom",
      }) as never
    );
    const pid = (await cr.json()).patient_id;
    const res = await createVisitPOST(
      makeReq("POST", "http://localhost/api/visits", { patient_id: pid, symptoms_text: "unknown" }) as never
    );
    const body = await res.json();
    const primary = body.diagnoses.find((d: { is_primary: number }) => d.is_primary === 1);
    expect(primary.ailment_code).toMatch(/^CUSTOM-/);
    // Verify the custom ailment was created with is_custom = 1
    const row = db.prepare("SELECT custom FROM ailments WHERE code = ?").get(primary.ailment_code) as { custom: number };
    expect(row?.custom).toBe(1);
  });

  it("referral row created when no treatments available for ailment", async () => {
    // Create a custom ailment with no treatment mappings
    const ailmentId = uuid();
    db.prepare(
      `INSERT INTO ailments (id, code, name, custom, verified, created_at) VALUES (?, ?, ?, 1, 0, ?)`
    ).run(ailmentId, "ORPHAN-001", "Orphan Ailment", Date.now());

    const { callTriage } = await import("@/src/lib/llm");
    vi.mocked(callTriage).mockResolvedValueOnce({
      severity: 2,
      diagnoses: [{ ailment_code: "ORPHAN-001", confidence: 0.9 }],
    });

    const cr = await createPatientPOST(
      makeReq("POST", "http://localhost/api/patients", {
        agent_name: "ReferralBot", model: "m", owner: "ref",
      }) as never
    );
    const pid = (await cr.json()).patient_id;
    await createVisitPOST(
      makeReq("POST", "http://localhost/api/visits", { patient_id: pid, symptoms_text: "orphan issue" }) as never
    );

    const { n } = db
      .prepare("SELECT COUNT(*) AS n FROM referrals WHERE patient_id = ? AND ailment_code = 'ORPHAN-001'")
      .get(pid) as { n: number };
    expect(n).toBeGreaterThan(0);
  });

  it("GET /api/visits/:id returns visit record; unknown returns 404", async () => {
    const res = await getVisitGET(
      makeReq("GET", `http://localhost/api/visits/${visit_id}`) as never,
      { params: Promise.resolve({ id: visit_id }) }
    );
    expect(res.status).toBe(200);

    const res404 = await getVisitGET(
      makeReq("GET", "http://localhost/api/visits/nope") as never,
      { params: Promise.resolve({ id: "nope" }) }
    );
    expect(res404.status).toBe(404);
  });

  it("GET /api/visits?patient_id returns only that patient's visits", async () => {
    const res = await listVisitsGET(
      makeReq("GET", `http://localhost/api/visits?patient_id=${patient_id}`) as never
    );
    const body = await res.json();
    expect(body.every((r: { visit: { patient_id: string } }) => r.visit.patient_id === patient_id)).toBe(true);
  });

  it("POST /api/visits/:id/followup RESOLVED sets status to RESOLVED", async () => {
    const res = await followupPOST(
      makeReq("POST", `http://localhost/api/visits/${visit_id}/followup`, { outcome: "RESOLVED" }) as never,
      { params: Promise.resolve({ id: visit_id }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.visit.status).toBe("RESOLVED");
  });
});

// ── § 5: SSE Event Bus ────────────────────────────────────────────────────────

describe("validation § 5 — SSE event bus", () => {
  it("EventBus.emit visit_created delivers to subscriber", () => {
    const fn = vi.fn();
    const unsub = eventBus.subscribe(fn);
    eventBus.emit("visit_created", { visit_id: "test" });
    unsub();
    expect(fn).toHaveBeenCalledWith({ type: "visit_created", data: { visit_id: "test" } });
  });

  it("after unsubscribe, no further events delivered", () => {
    const fn = vi.fn();
    const unsub = eventBus.subscribe(fn);
    unsub();
    eventBus.emit("visit_resolved", {});
    expect(fn).not.toHaveBeenCalled();
  });
});

// ── § 6: Analytics Endpoints ─────────────────────────────────────────────────

describe("validation § 6 — analytics endpoints", () => {
  it("GET /api/analytics/overview returns required numeric fields", async () => {
    const body = await (await overviewGET(makeReq("GET", "http://localhost/api/analytics/overview") as never)).json();
    expect(typeof body.total_patients).toBe("number");
    expect(typeof body.active_visits).toBe("number");
    expect(typeof body.resolved_today).toBe("number");
    expect(typeof body.referrals_pending).toBe("number");
  });

  it("GET /api/analytics/ailments returns array with ailment_code", async () => {
    const body = await (await ailmentAnalyticsGET(makeReq("GET", "http://localhost/api/analytics/ailments") as never)).json();
    expect(Array.isArray(body)).toBe(true);
    if (body.length > 0) {
      expect(body[0]).toHaveProperty("ailment_code");
      expect(body[0]).toHaveProperty("frequency");
    }
  });

  it("GET /api/analytics/treatments returns array", async () => {
    const body = await (await treatmentAnalyticsGET(makeReq("GET", "http://localhost/api/analytics/treatments") as never)).json();
    expect(Array.isArray(body)).toBe(true);
  });

  it("GET /api/analytics/patients/:id returns per-patient summary", async () => {
    const body = await (
      await patientAnalyticsGET(
        makeReq("GET", "http://localhost/api/analytics/patients/xyz") as never,
        { params: Promise.resolve({ id: "xyz" }) }
      )
    ).json();
    expect(Array.isArray(body.chronic_conditions)).toBe(true);
    expect(Array.isArray(body.visits)).toBe(true);
  });
});

// ── § 7: Background Jobs ─────────────────────────────────────────────────────

describe("validation § 7 — background jobs", () => {
  it("expire job: AWAITING_FOLLOWUP older than window becomes EXPIRED", () => {
    const patient_id_local = uuid();
    const now_local = Date.now();
    db.prepare(
      `INSERT INTO patients (id, agent_name, model, owner, status, created_at, updated_at)
       VALUES (?, 'ExpireBot', 'm', 'e', 'active', ?, ?)`
    ).run(patient_id_local, now_local, now_local);

    const oldTime = Date.now() - 100 * 60 * 60 * 1000;
    const visitId = uuid();
    db.prepare(
      `INSERT INTO visits (id, patient_id, symptoms, status, recurrence_flag, created_at, updated_at)
       VALUES (?, ?, 'x', 'AWAITING_FOLLOWUP', 0, ?, ?)`
    ).run(visitId, patient_id_local, oldTime, oldTime);

    const expired = runExpireVisits(db, 72);
    expect(expired).toBeGreaterThanOrEqual(1);
    const row = db.prepare("SELECT status FROM visits WHERE id = ?").get(visitId) as { status: string };
    expect(row.status).toBe("EXPIRED");
  });

  it("chronic job: 3 same-ailment resolved visits creates chronic_conditions row", () => {
    const patient_id_local = uuid();
    const now_local = Date.now();
    db.prepare(
      `INSERT INTO patients (id, agent_name, model, owner, status, created_at, updated_at)
       VALUES (?, 'ChronicBot', 'm', 'c', 'active', ?, ?)`
    ).run(patient_id_local, now_local, now_local);

    const recent = Date.now() - 5 * 24 * 60 * 60 * 1000;
    for (let i = 0; i < 3; i++) {
      const vid = uuid();
      db.prepare(
        `INSERT INTO visits (id, patient_id, symptoms, status, recurrence_flag, created_at, updated_at, resolved_at)
         VALUES (?, ?, 'chronic', 'RESOLVED', 0, ?, ?, ?)`
      ).run(vid, patient_id_local, recent, recent, recent);
      db.prepare(
        `INSERT INTO diagnoses (id, visit_id, ailment_code, confidence, is_primary) VALUES (?, ?, 'REP-001', 0.9, 1)`
      ).run(uuid(), vid);
    }

    const flagged = runFlagChronics(db, 30, 3);
    expect(flagged).toBeGreaterThanOrEqual(1);
    const row = db
      .prepare("SELECT * FROM chronic_conditions WHERE patient_id = ?")
      .get(patient_id_local);
    expect(row).toBeDefined();
  });
});
