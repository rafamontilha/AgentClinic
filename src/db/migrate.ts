import type Database from "better-sqlite3";

export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS patients (
      id          TEXT    PRIMARY KEY,
      agent_name  TEXT    NOT NULL,
      model       TEXT    NOT NULL,
      version     TEXT,
      environment TEXT,
      status      TEXT    NOT NULL DEFAULT 'active',
      owner       TEXT    NOT NULL,
      tags        TEXT,
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS visits (
      id              TEXT    PRIMARY KEY,
      patient_id      TEXT    NOT NULL REFERENCES patients(id),
      symptoms        TEXT    NOT NULL,
      severity        INTEGER,
      status          TEXT    NOT NULL DEFAULT 'TRIAGE',
      triage_notes    TEXT,
      recurrence_flag INTEGER NOT NULL DEFAULT 0,
      created_at      INTEGER NOT NULL,
      updated_at      INTEGER NOT NULL,
      expires_at      INTEGER,
      resolved_at     INTEGER
    );

    CREATE TABLE IF NOT EXISTS ailments (
      id          TEXT    PRIMARY KEY,
      code        TEXT    NOT NULL UNIQUE,
      name        TEXT    NOT NULL,
      description TEXT,
      category    TEXT,
      custom      INTEGER NOT NULL DEFAULT 0,
      verified    INTEGER NOT NULL DEFAULT 0,
      created_at  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS treatments (
      id           TEXT    PRIMARY KEY,
      code         TEXT    NOT NULL UNIQUE,
      name         TEXT    NOT NULL,
      description  TEXT,
      instructions TEXT,
      created_at   INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ailment_treatments (
      id                  TEXT    PRIMARY KEY,
      ailment_id          TEXT    NOT NULL REFERENCES ailments(id),
      treatment_id        TEXT    NOT NULL REFERENCES treatments(id),
      effectiveness_score REAL    NOT NULL DEFAULT 0.5,
      sample_count        INTEGER NOT NULL DEFAULT 0,
      metadata            TEXT
    );

    CREATE TABLE IF NOT EXISTS diagnoses (
      id           TEXT    PRIMARY KEY,
      visit_id     TEXT    NOT NULL REFERENCES visits(id),
      ailment_code TEXT    NOT NULL,
      confidence   REAL    NOT NULL,
      is_primary   INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS prescriptions (
      id             TEXT    PRIMARY KEY,
      visit_id       TEXT    NOT NULL REFERENCES visits(id),
      treatment_code TEXT    NOT NULL,
      rationale      TEXT,
      sequence       INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS followups (
      id           TEXT    PRIMARY KEY,
      visit_id     TEXT    NOT NULL REFERENCES visits(id),
      outcome      TEXT    NOT NULL,
      notes        TEXT,
      submitted_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS referrals (
      id              TEXT    PRIMARY KEY,
      visit_id        TEXT    NOT NULL REFERENCES visits(id),
      patient_id      TEXT    NOT NULL REFERENCES patients(id),
      ailment_code    TEXT    NOT NULL,
      reason          TEXT    NOT NULL,
      acknowledged_at INTEGER,
      created_at      INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chronic_conditions (
      id               TEXT    PRIMARY KEY,
      patient_id       TEXT    NOT NULL REFERENCES patients(id),
      ailment_code     TEXT    NOT NULL,
      first_flagged_at INTEGER NOT NULL,
      recurrence_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS webhook_endpoints (
      id         TEXT    PRIMARY KEY,
      url        TEXT    NOT NULL,
      events     TEXT    NOT NULL,
      secret     TEXT    NOT NULL,
      active     INTEGER NOT NULL DEFAULT 1,
      created_at TEXT    NOT NULL
    );
  `);

  // Add columns to pre-existing tables (no-op if column already exists)
  for (const sql of [
    "ALTER TABLE visits ADD COLUMN resolved_at INTEGER",
    "ALTER TABLE ailments ADD COLUMN verified INTEGER NOT NULL DEFAULT 0",
  ]) {
    try {
      db.exec(sql);
    } catch {
      // Column already exists — safe to ignore
    }
  }

  console.log("[migrate] Database initialised.");
}
