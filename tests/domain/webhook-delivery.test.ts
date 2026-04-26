import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runMigrations } from "@/src/db/migrate";
import { eventBus } from "@/src/lib/event-bus";
import { initWebhookDelivery } from "@/src/lib/webhook-delivery";
import crypto from "crypto";

let db: Database.Database;
let unsub: (() => void) | null = null;

vi.mock("@/src/db/client", () => ({ getDb: vi.fn(() => db) }));

beforeEach(() => {
  db = new Database(":memory:");
  runMigrations(db);
  vi.useFakeTimers();
});

afterEach(() => {
  if (unsub) {
    unsub();
    unsub = null;
  }
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function insertEndpoint(opts: { active?: number; events?: string[]; secret?: string } = {}) {
  const id = `ep-${Math.random().toString(36).slice(2)}`;
  db.prepare(
    "INSERT INTO webhook_endpoints (id, url, events, secret, active, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(
    id,
    "https://example.com/hook",
    JSON.stringify(opts.events ?? ["visit_created"]),
    opts.secret ?? "test-secret",
    opts.active ?? 1,
    new Date().toISOString()
  );
  return id;
}

describe("webhook delivery", () => {
  it("POSTs to registered URL with correct URL, method, and headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    insertEndpoint();
    unsub = initWebhookDelivery();

    eventBus.emit("visit_created", { visit_id: "v-001" });
    await vi.runAllTimersAsync();

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
    expect(url).toBe("https://example.com/hook");
    expect(opts.method).toBe("POST");
    expect(opts.headers["Content-Type"]).toBe("application/json");
    expect(opts.headers["X-AgentClinic-Signature"]).toMatch(/^sha256=[0-9a-f]+$/);
  });

  it("signature header matches HMAC-SHA256(body, secret)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    insertEndpoint({ secret: "my-secret" });
    unsub = initWebhookDelivery();

    eventBus.emit("visit_created", { visit_id: "v-001" });
    await vi.runAllTimersAsync();

    const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
    const expectedSig = `sha256=${crypto.createHmac("sha256", "my-secret").update(opts.body as string).digest("hex")}`;
    expect(opts.headers["X-AgentClinic-Signature"]).toBe(expectedSig);
  });

  it("retries on HTTP 500: fires 3 attempts total", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    vi.stubGlobal("fetch", fetchMock);

    insertEndpoint();
    unsub = initWebhookDelivery();

    eventBus.emit("visit_created", { visit_id: "v-retry" });
    await vi.runAllTimersAsync();

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not retry on HTTP 400: fires exactly 1 attempt", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 400 });
    vi.stubGlobal("fetch", fetchMock);

    insertEndpoint();
    unsub = initWebhookDelivery();

    eventBus.emit("visit_created", { visit_id: "v-400" });
    await vi.runAllTimersAsync();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("skips inactive endpoints", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    insertEndpoint({ active: 0 });
    unsub = initWebhookDelivery();

    eventBus.emit("visit_created", { visit_id: "v-inactive" });
    await vi.runAllTimersAsync();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not deliver to endpoint subscribed to a different event", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    insertEndpoint({ events: ["visit_resolved"] });
    unsub = initWebhookDelivery();

    eventBus.emit("visit_created", { visit_id: "v-wrong-event" });
    await vi.runAllTimersAsync();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("delivers when event matches subscription", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    insertEndpoint({ events: ["visit_resolved"] });
    unsub = initWebhookDelivery();

    eventBus.emit("visit_resolved", { visit_id: "v-resolved" });
    await vi.runAllTimersAsync();

    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
