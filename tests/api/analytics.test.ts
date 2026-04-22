import Database from "better-sqlite3";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { runMigrations } from "@/src/db/migrate";
import { runSeed } from "@/src/db/seed";

let db: Database.Database;

vi.mock("@/src/db/client", () => ({ getDb: vi.fn(() => db) }));

import { GET as overviewGET } from "@/app/api/analytics/overview/route";
import { GET as ailmentsGET } from "@/app/api/analytics/ailments/route";
import { GET as treatmentsGET } from "@/app/api/analytics/treatments/route";
import { GET as patientGET } from "@/app/api/analytics/patients/[id]/route";

function makeReq(url: string): Request {
  return new Request(url, { method: "GET" });
}

beforeEach(() => {
  db = new Database(":memory:");
  runMigrations(db);
  runSeed(db);
  delete process.env.AGENTCLINIC_API_KEY;
});

describe("GET /api/analytics/overview", () => {
  it("returns overview with numeric fields", async () => {
    const res = await overviewGET(makeReq("http://localhost/api/analytics/overview") as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.total_patients).toBe("number");
    expect(typeof body.active_visits).toBe("number");
    expect(typeof body.resolved_today).toBe("number");
    expect(typeof body.referrals_pending).toBe("number");
  });
});

describe("GET /api/analytics/ailments", () => {
  it("returns an array (empty is fine on fresh DB)", async () => {
    const res = await ailmentsGET(makeReq("http://localhost/api/analytics/ailments") as never);
    expect(res.status).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });
});

describe("GET /api/analytics/treatments", () => {
  it("returns an array with treatment data", async () => {
    const res = await treatmentsGET(makeReq("http://localhost/api/analytics/treatments") as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});

describe("GET /api/analytics/patients/:id", () => {
  it("returns per-patient summary with chronic_conditions array", async () => {
    const id = "test-patient-id";
    const res = await patientGET(
      makeReq(`http://localhost/api/analytics/patients/${id}`) as never,
      { params: Promise.resolve({ id }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.patient_id).toBe(id);
    expect(Array.isArray(body.chronic_conditions)).toBe(true);
    expect(Array.isArray(body.visits)).toBe(true);
  });
});
