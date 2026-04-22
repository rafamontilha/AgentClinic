import Database from "better-sqlite3";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { runMigrations } from "@/src/db/migrate";
import { runSeed } from "@/src/db/seed";

let db: Database.Database;

vi.mock("@/src/db/client", () => ({
  getDb: vi.fn(() => db),
}));

// Import routes AFTER mock is set up
import { GET as listGET, POST } from "@/app/api/patients/route";
import { GET as getByIdGET, PATCH } from "@/app/api/patients/[id]/route";
import { GET as historyGET } from "@/app/api/patients/[id]/history/route";

function makeReq(method: string, url: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  db = new Database(":memory:");
  runMigrations(db);
  runSeed(db);
  delete process.env.AGENTCLINIC_API_KEY;
});

describe("POST /api/patients", () => {
  it("creates a new patient and returns 201 with patient_id", async () => {
    const req = makeReq("POST", "http://localhost/api/patients", {
      agent_name: "TestBot",
      model: "gpt-4",
      owner: "alice",
    });
    const res = await POST(req as never);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.patient_id).toBeTruthy();
  });

  it("returns existing patient_id for duplicate agent_name + owner", async () => {
    const payload = { agent_name: "DupBot", model: "gpt-4", owner: "bob" };
    const res1 = await POST(makeReq("POST", "http://localhost/api/patients", payload) as never);
    const { patient_id } = await res1.json();

    const res2 = await POST(makeReq("POST", "http://localhost/api/patients", payload) as never);
    const body2 = await res2.json();
    expect(body2.patient_id).toBe(patient_id);
    expect(body2.existing).toBe(true);
  });

  it("returns 400 when required fields are missing", async () => {
    const req = makeReq("POST", "http://localhost/api/patients", { agent_name: "X" });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("returns 401 when API key is set and header is missing", async () => {
    process.env.AGENTCLINIC_API_KEY = "secret";
    const req = new Request("http://localhost/api/patients", { method: "POST" });
    const res = await POST(req as never);
    expect(res.status).toBe(401);
  });
});

describe("GET /api/patients", () => {
  it("returns an array of patients", async () => {
    await POST(makeReq("POST", "http://localhost/api/patients", {
      agent_name: "ListBot", model: "m1", owner: "owner1",
    }) as never);
    const res = await listGET(makeReq("GET", "http://localhost/api/patients") as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  it("filters by status", async () => {
    const res = await listGET(
      makeReq("GET", "http://localhost/api/patients?status=inactive") as never
    );
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.every((p: { status: string }) => p.status === "inactive")).toBe(true);
  });
});

describe("GET /api/patients/:id", () => {
  it("returns the patient record", async () => {
    const createRes = await POST(
      makeReq("POST", "http://localhost/api/patients", {
        agent_name: "FindBot", model: "m2", owner: "owner2",
      }) as never
    );
    const { patient_id } = await createRes.json();

    const res = await getByIdGET(
      makeReq("GET", `http://localhost/api/patients/${patient_id}`) as never,
      { params: Promise.resolve({ id: patient_id }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(patient_id);
    expect(body.agent_name).toBe("FindBot");
  });

  it("returns 404 for unknown id", async () => {
    const res = await getByIdGET(
      makeReq("GET", "http://localhost/api/patients/nope") as never,
      { params: Promise.resolve({ id: "nope" }) }
    );
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/patients/:id", () => {
  it("updates model and status", async () => {
    const createRes = await POST(
      makeReq("POST", "http://localhost/api/patients", {
        agent_name: "PatchBot", model: "old-model", owner: "patcher",
      }) as never
    );
    const { patient_id } = await createRes.json();

    const res = await PATCH(
      makeReq("PATCH", `http://localhost/api/patients/${patient_id}`, {
        model: "new-model",
        status: "inactive",
      }) as never,
      { params: Promise.resolve({ id: patient_id }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.model).toBe("new-model");
    expect(body.status).toBe("inactive");
  });
});

describe("GET /api/patients/:id/history", () => {
  it("returns empty visits array for a new patient", async () => {
    const createRes = await POST(
      makeReq("POST", "http://localhost/api/patients", {
        agent_name: "HistBot", model: "m3", owner: "historian",
      }) as never
    );
    const { patient_id } = await createRes.json();

    const res = await historyGET(
      makeReq("GET", `http://localhost/api/patients/${patient_id}/history`) as never,
      { params: Promise.resolve({ id: patient_id }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.visits)).toBe(true);
    expect(body.visits).toHaveLength(0);
  });
});

describe("GET /api/health — no auth required", () => {
  it("health endpoint returns 200 regardless of API key", async () => {
    process.env.AGENTCLINIC_API_KEY = "secret";
    const { GET } = await import("@/app/api/health/route");
    const res = await GET();
    expect(res.status).toBe(200);
  });
});
