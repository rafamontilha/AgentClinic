import Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { runMigrations } from "@/src/db/migrate";
import { runSeed } from "@/src/db/seed";
import { runExpireVisits } from "@/src/jobs/expire-visits";
import { runFlagChronics } from "@/src/jobs/flag-chronics";
import { v4 as uuid } from "uuid";

let db: Database.Database;

function insertPatient(db: Database.Database) {
  const id = uuid();
  const now = Date.now();
  db.prepare(
    `INSERT INTO patients (id, agent_name, model, owner, status, created_at, updated_at)
     VALUES (?, 'TestAgent', 'test-model', 'tester', 'active', ?, ?)`
  ).run(id, now, now);
  return id;
}

function insertVisit(
  db: Database.Database,
  patient_id: string,
  status: string,
  createdAt: number,
  resolvedAt: number | null = null
) {
  const id = uuid();
  db.prepare(
    `INSERT INTO visits (id, patient_id, symptoms, severity, status, recurrence_flag, created_at, updated_at, resolved_at)
     VALUES (?, ?, 'test symptoms', 2, ?, 0, ?, ?, ?)`
  ).run(id, patient_id, status, createdAt, createdAt, resolvedAt);
  return id;
}

function insertDiagnosis(db: Database.Database, visit_id: string, ailment_code: string) {
  db.prepare(
    `INSERT INTO diagnoses (id, visit_id, ailment_code, confidence, is_primary)
     VALUES (?, ?, ?, 0.9, 1)`
  ).run(uuid(), visit_id, ailment_code);
}

beforeEach(() => {
  db = new Database(":memory:");
  runMigrations(db);
  runSeed(db);
});

// ── expire-visits ─────────────────────────────────────────────────────────────

describe("runExpireVisits", () => {
  it("sets AWAITING_FOLLOWUP visits older than window to EXPIRED", () => {
    const patient_id = insertPatient(db);
    const oldTime = Date.now() - 100 * 60 * 60 * 1000; // 100 hours ago
    const visitId = insertVisit(db, patient_id, "AWAITING_FOLLOWUP", oldTime);

    const expired = runExpireVisits(db, 72);
    expect(expired).toBe(1);

    const row = db.prepare("SELECT status FROM visits WHERE id = ?").get(visitId) as { status: string };
    expect(row.status).toBe("EXPIRED");
  });

  it("does not expire visits within the window", () => {
    const patient_id = insertPatient(db);
    const recentTime = Date.now() - 1 * 60 * 60 * 1000; // 1 hour ago
    insertVisit(db, patient_id, "AWAITING_FOLLOWUP", recentTime);

    const expired = runExpireVisits(db, 72);
    expect(expired).toBe(0);
  });

  it("does not expire RESOLVED visits", () => {
    const patient_id = insertPatient(db);
    const oldTime = Date.now() - 100 * 60 * 60 * 1000;
    const visitId = insertVisit(db, patient_id, "RESOLVED", oldTime);

    runExpireVisits(db, 72);

    const row = db.prepare("SELECT status FROM visits WHERE id = ?").get(visitId) as { status: string };
    expect(row.status).toBe("RESOLVED");
  });
});

// ── flag-chronics ─────────────────────────────────────────────────────────────

describe("runFlagChronics", () => {
  it("creates a chronic_conditions row after 3 same-ailment RESOLVED visits in 30 days", () => {
    const patient_id = insertPatient(db);
    const recentTime = Date.now() - 5 * 24 * 60 * 60 * 1000; // 5 days ago

    for (let i = 0; i < 3; i++) {
      const visitId = insertVisit(db, patient_id, "RESOLVED", recentTime, recentTime);
      insertDiagnosis(db, visitId, "HAL-001");
    }

    const flagged = runFlagChronics(db, 30, 3);
    expect(flagged).toBe(1);

    const row = db
      .prepare("SELECT * FROM chronic_conditions WHERE patient_id = ?")
      .get(patient_id) as { ailment_code: string; recurrence_count: number } | undefined;
    expect(row).toBeDefined();
    expect(row?.ailment_code).toBe("HAL-001");
    expect(row?.recurrence_count).toBeGreaterThanOrEqual(3);
  });

  it("does not flag if fewer than min recurrences", () => {
    const patient_id = insertPatient(db);
    const recentTime = Date.now() - 5 * 24 * 60 * 60 * 1000;

    for (let i = 0; i < 2; i++) {
      const visitId = insertVisit(db, patient_id, "RESOLVED", recentTime, recentTime);
      insertDiagnosis(db, visitId, "CTX-001");
    }

    const flagged = runFlagChronics(db, 30, 3);
    expect(flagged).toBe(0);
  });

  it("does not double-flag an already flagged patient+ailment", () => {
    const patient_id = insertPatient(db);
    const recentTime = Date.now() - 5 * 24 * 60 * 60 * 1000;

    for (let i = 0; i < 3; i++) {
      const visitId = insertVisit(db, patient_id, "RESOLVED", recentTime, recentTime);
      insertDiagnosis(db, visitId, "INS-001");
    }

    runFlagChronics(db, 30, 3);
    const flaggedAgain = runFlagChronics(db, 30, 3);
    expect(flaggedAgain).toBe(0); // already existed

    const count = (
      db
        .prepare("SELECT COUNT(*) AS n FROM chronic_conditions WHERE patient_id = ?")
        .get(patient_id) as { n: number }
    ).n;
    expect(count).toBe(1);
  });
});
