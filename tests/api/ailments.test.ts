import Database from "better-sqlite3";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { runMigrations } from "@/src/db/migrate";
import { runSeed } from "@/src/db/seed";

let db: Database.Database;

vi.mock("@/src/db/client", () => ({ getDb: vi.fn(() => db) }));

import { GET as listGET, POST } from "@/app/api/ailments/route";
import { GET as getByCodeGET } from "@/app/api/ailments/[code]/route";
import { GET as listTreatGET } from "@/app/api/treatments/route";
import { GET as getTreatByCodeGET } from "@/app/api/treatments/[code]/route";

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

describe("GET /api/ailments", () => {
  it("returns at least 10 seeded ailments", async () => {
    const res = await listGET(makeReq("GET", "http://localhost/api/ailments") as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(10);
  });
});

describe("POST /api/ailments", () => {
  it("creates a custom ailment and returns 201", async () => {
    const res = await POST(
      makeReq("POST", "http://localhost/api/ailments", { name: "Test Ailment", category: "test" }) as never
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.code).toMatch(/^CUSTOM-/);
    expect(body.custom).toBe(1);
  });

  it("returns 400 when name is missing", async () => {
    const res = await POST(makeReq("POST", "http://localhost/api/ailments", {}) as never);
    expect(res.status).toBe(400);
  });
});

describe("GET /api/ailments/:code", () => {
  it("returns the ailment for a valid code", async () => {
    const res = await getByCodeGET(
      makeReq("GET", "http://localhost/api/ailments/HAL-001") as never,
      { params: Promise.resolve({ code: "HAL-001" }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe("HAL-001");
  });

  it("returns 404 for an unknown code", async () => {
    const res = await getByCodeGET(
      makeReq("GET", "http://localhost/api/ailments/NOPE") as never,
      { params: Promise.resolve({ code: "NOPE" }) }
    );
    expect(res.status).toBe(404);
  });
});

describe("GET /api/treatments", () => {
  it("returns at least 10 seeded treatments", async () => {
    const res = await listTreatGET(makeReq("GET", "http://localhost/api/treatments") as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.length).toBeGreaterThanOrEqual(10);
  });
});

describe("GET /api/treatments/:code", () => {
  it("returns treatment with per-ailment effectiveness scores", async () => {
    const res = await getTreatByCodeGET(
      makeReq("GET", "http://localhost/api/treatments/TRT-001") as never,
      { params: Promise.resolve({ code: "TRT-001" }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe("TRT-001");
    expect(Array.isArray(body.effectiveness)).toBe(true);
  });

  it("returns 404 for an unknown code", async () => {
    const res = await getTreatByCodeGET(
      makeReq("GET", "http://localhost/api/treatments/NOPE") as never,
      { params: Promise.resolve({ code: "NOPE" }) }
    );
    expect(res.status).toBe(404);
  });
});
