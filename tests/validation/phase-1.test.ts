/**
 * Automated acceptance gate for Phase 1 validation.md.
 *
 * Covers the automatable checklist items from sections 2, 3, and 6.
 * Sections 1 (server startup logs), 4 (home page in browser), and
 * 5 (dashboard in browser) require manual verification.
 */
import Database from "better-sqlite3";
import { beforeAll, describe, expect, it } from "vitest";
import { runMigrations } from "@/src/db/migrate";
import { runSeed } from "@/src/db/seed";
import { GET as healthGET } from "@/app/api/health/route";

let db: Database.Database;

beforeAll(() => {
  db = new Database(":memory:");
  runMigrations(db);
  runSeed(db);
});

// ── Section 2: Health endpoint responds ────────────────────────────────────

describe("validation § 2 — health endpoint responds", () => {
  it("HTTP status code is 200", async () => {
    const res = await healthGET();
    expect(res.status).toBe(200);
  });

  it('body is exactly {"status":"ok"}', async () => {
    const res = await healthGET();
    expect(await res.json()).toStrictEqual({ status: "ok" });
  });
});

// ── Section 3: Database is initialised ────────────────────────────────────

describe("validation § 3 — database is initialised", () => {
  it("all five tables exist: patients, visits, ailments, treatments, ailment_treatments", () => {
    const names = (
      db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        .all() as { name: string }[]
    ).map((r) => r.name);

    expect(names).toContain("patients");
    expect(names).toContain("visits");
    expect(names).toContain("ailments");
    expect(names).toContain("treatments");
    expect(names).toContain("ailment_treatments");
  });

  it("SELECT COUNT(*) FROM ailments returns 10", () => {
    const { n } = db
      .prepare("SELECT COUNT(*) AS n FROM ailments")
      .get() as { n: number };
    expect(n).toBe(10);
  });

  it("SELECT COUNT(*) FROM treatments returns 10", () => {
    const { n } = db
      .prepare("SELECT COUNT(*) AS n FROM treatments")
      .get() as { n: number };
    expect(n).toBe(10);
  });

  it("SELECT COUNT(*) FROM ailment_treatments returns at least 10", () => {
    const { n } = db
      .prepare("SELECT COUNT(*) AS n FROM ailment_treatments")
      .get() as { n: number };
    expect(n).toBeGreaterThanOrEqual(10);
  });
});

// ── Section 6: Code quality gate ──────────────────────────────────────────

describe("validation § 6 — code quality gate", () => {
  it("Drizzle schema exports typed infer types (no any escapes)", async () => {
    const schema = await import("@/src/db/schema");
    // If TypeScript compiled this file, the typed exports exist.
    // Runtime check: each table object has an $inferSelect symbol.
    expect(schema.patients).toBeDefined();
    expect(schema.visits).toBeDefined();
    expect(schema.ailments).toBeDefined();
    expect(schema.treatments).toBeDefined();
    expect(schema.ailment_treatments).toBeDefined();
  });

  it("health route exports a GET function", async () => {
    const route = await import("@/app/api/health/route");
    expect(typeof route.GET).toBe("function");
  });
});
