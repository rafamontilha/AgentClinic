import Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { runMigrations } from "@/src/db/migrate";

function tables(db: Database.Database): string[] {
  return (
    db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[]
  ).map((r) => r.name);
}

describe("runMigrations", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(":memory:");
  });

  it("creates all five core tables from Phase 1", () => {
    runMigrations(db);
    const names = tables(db);
    expect(names).toContain("patients");
    expect(names).toContain("visits");
    expect(names).toContain("ailments");
    expect(names).toContain("treatments");
    expect(names).toContain("ailment_treatments");
  });

  it("creates all five Phase 2 tables", () => {
    runMigrations(db);
    const names = tables(db);
    expect(names).toContain("diagnoses");
    expect(names).toContain("prescriptions");
    expect(names).toContain("followups");
    expect(names).toContain("referrals");
    expect(names).toContain("chronic_conditions");
  });

  it("creates exactly eleven tables total", () => {
    runMigrations(db);
    expect(tables(db)).toHaveLength(11);
  });

  it("creates webhook_endpoints table (Phase 3)", () => {
    runMigrations(db);
    expect(tables(db)).toContain("webhook_endpoints");
  });

  it("is idempotent — running twice does not throw", () => {
    expect(() => {
      runMigrations(db);
      runMigrations(db);
    }).not.toThrow();
  });

  it("patients table has the expected columns", () => {
    runMigrations(db);
    const cols = (
      db.prepare("PRAGMA table_info(patients)").all() as { name: string }[]
    ).map((c) => c.name);
    expect(cols).toContain("id");
    expect(cols).toContain("agent_name");
    expect(cols).toContain("model");
    expect(cols).toContain("owner");
    expect(cols).toContain("status");
  });

  it("visits table has resolved_at column", () => {
    runMigrations(db);
    const cols = (
      db.prepare("PRAGMA table_info(visits)").all() as { name: string }[]
    ).map((c) => c.name);
    expect(cols).toContain("resolved_at");
  });

  it("ailments table has verified column", () => {
    runMigrations(db);
    const cols = (
      db.prepare("PRAGMA table_info(ailments)").all() as { name: string }[]
    ).map((c) => c.name);
    expect(cols).toContain("verified");
  });

  it("ailment_treatments table references ailments and treatments", () => {
    runMigrations(db);
    const fks = (
      db.prepare("PRAGMA foreign_key_list(ailment_treatments)").all() as {
        table: string;
      }[]
    ).map((f) => f.table);
    expect(fks).toContain("ailments");
    expect(fks).toContain("treatments");
  });

  it("diagnoses table references visits", () => {
    runMigrations(db);
    const fks = (
      db.prepare("PRAGMA foreign_key_list(diagnoses)").all() as {
        table: string;
      }[]
    ).map((f) => f.table);
    expect(fks).toContain("visits");
  });
});
