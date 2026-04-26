import Database from "better-sqlite3";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { runMigrations } from "@/src/db/migrate";

let db: Database.Database;

vi.mock("@/src/db/client", () => ({ getDb: vi.fn(() => db) }));

import { GET, POST } from "@/app/api/webhooks/route";
import { DELETE } from "@/app/api/webhooks/[id]/route";

function makeReq(method: string, url: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const VALID_BODY = {
  url: "https://example.com/webhook",
  events: ["visit_created"],
  secret: "supersecret",
};

beforeEach(() => {
  db = new Database(":memory:");
  runMigrations(db);
  delete process.env.AGENTCLINIC_API_KEY;
});

describe("POST /api/webhooks", () => {
  it("creates endpoint and returns 201 with id and url", async () => {
    const res = await POST(makeReq("POST", "http://localhost/api/webhooks", VALID_BODY) as never);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBeTruthy();
    expect(body.url).toBe(VALID_BODY.url);
  });

  it("returns 400 when url is not https", async () => {
    const res = await POST(
      makeReq("POST", "http://localhost/api/webhooks", { ...VALID_BODY, url: "http://example.com/webhook" }) as never
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when events is empty array", async () => {
    const res = await POST(
      makeReq("POST", "http://localhost/api/webhooks", { ...VALID_BODY, events: [] }) as never
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when events contains unknown event name", async () => {
    const res = await POST(
      makeReq("POST", "http://localhost/api/webhooks", { ...VALID_BODY, events: ["unknown_event"] }) as never
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when secret is empty string", async () => {
    const res = await POST(
      makeReq("POST", "http://localhost/api/webhooks", { ...VALID_BODY, secret: "" }) as never
    );
    expect(res.status).toBe(400);
  });

  it("accepts all valid event names", async () => {
    for (const event of ["visit_created", "visit_resolved", "referral_created", "chronic_flagged"]) {
      const res = await POST(
        makeReq("POST", "http://localhost/api/webhooks", { ...VALID_BODY, events: [event] }) as never
      );
      expect(res.status).toBe(201);
    }
  });
});

describe("GET /api/webhooks", () => {
  it("returns empty array when no endpoints exist", async () => {
    const res = await GET(makeReq("GET", "http://localhost/api/webhooks") as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(0);
  });

  it("returns list of all endpoints including inactive", async () => {
    await POST(makeReq("POST", "http://localhost/api/webhooks", VALID_BODY) as never);
    db.prepare("UPDATE webhook_endpoints SET active = 0").run();
    await POST(makeReq("POST", "http://localhost/api/webhooks", { ...VALID_BODY, url: "https://example2.com/hook" }) as never);

    const res = await GET(makeReq("GET", "http://localhost/api/webhooks") as never);
    const body = await res.json();
    expect(body.length).toBe(2);
  });
});

describe("DELETE /api/webhooks/:id", () => {
  it("deletes endpoint and returns 204", async () => {
    const createRes = await POST(makeReq("POST", "http://localhost/api/webhooks", VALID_BODY) as never);
    const { id } = await createRes.json();

    const res = await DELETE(
      makeReq("DELETE", `http://localhost/api/webhooks/${id}`) as never,
      { params: Promise.resolve({ id }) }
    );
    expect(res.status).toBe(204);

    const listRes = await GET(makeReq("GET", "http://localhost/api/webhooks") as never);
    const body = await listRes.json();
    expect(body.find((ep: { id: string }) => ep.id === id)).toBeUndefined();
  });

  it("returns 404 for unknown id", async () => {
    const res = await DELETE(
      makeReq("DELETE", "http://localhost/api/webhooks/nonexistent") as never,
      { params: Promise.resolve({ id: "nonexistent" }) }
    );
    expect(res.status).toBe(404);
  });
});
