import Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { runMigrations } from "@/src/db/migrate";
import { runSeed } from "@/src/db/seed";

function count(db: Database.Database, table: string): number {
  return (
    db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }
  ).n;
}

describe("runSeed", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(":memory:");
    runMigrations(db);
  });

  it("inserts exactly 10 ailments", () => {
    runSeed(db);
    expect(count(db, "ailments")).toBe(10);
  });

  it("inserts exactly 10 treatments", () => {
    runSeed(db);
    expect(count(db, "treatments")).toBe(10);
  });

  it("inserts at least 10 ailment_treatments mappings (one per ailment minimum)", () => {
    runSeed(db);
    expect(count(db, "ailment_treatments")).toBeGreaterThanOrEqual(10);
  });

  it("every ailment has at least one treatment mapped to it", () => {
    runSeed(db);
    const unmapped = (
      db
        .prepare(
          `SELECT a.code FROM ailments a
           LEFT JOIN ailment_treatments at ON at.ailment_id = a.id
           WHERE at.id IS NULL`
        )
        .all() as { code: string }[]
    );
    expect(unmapped).toHaveLength(0);
  });

  it("ailment codes are unique", () => {
    runSeed(db);
    const codes = (
      db.prepare("SELECT code FROM ailments").all() as { code: string }[]
    ).map((r) => r.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("treatment codes are unique", () => {
    runSeed(db);
    const codes = (
      db.prepare("SELECT code FROM treatments").all() as { code: string }[]
    ).map((r) => r.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("all effectiveness_score values are between 0 and 1", () => {
    runSeed(db);
    const scores = (
      db
        .prepare("SELECT effectiveness_score FROM ailment_treatments")
        .all() as { effectiveness_score: number }[]
    ).map((r) => r.effectiveness_score);
    for (const score of scores) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });

  it("is idempotent — second run inserts no additional rows", () => {
    runSeed(db);
    const before = {
      ailments: count(db, "ailments"),
      treatments: count(db, "treatments"),
      mappings: count(db, "ailment_treatments"),
    };
    runSeed(db);
    expect(count(db, "ailments")).toBe(before.ailments);
    expect(count(db, "treatments")).toBe(before.treatments);
    expect(count(db, "ailment_treatments")).toBe(before.mappings);
  });
});
