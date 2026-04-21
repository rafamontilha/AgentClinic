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
      expires_at      INTEGER
    );

    CREATE TABLE IF NOT EXISTS ailments (
      id          TEXT    PRIMARY KEY,
      code        TEXT    NOT NULL UNIQUE,
      name        TEXT    NOT NULL,
      description TEXT,
      category    TEXT,
      custom      INTEGER NOT NULL DEFAULT 0,
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
  `);

  console.log("[migrate] Database initialised.");
}
