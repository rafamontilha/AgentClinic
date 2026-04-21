import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { v4 as uuidv4 } from "uuid";
import { runMigrations } from "@/src/db/migrate";
import { runSeed } from "@/src/db/seed";
import * as schema from "@/src/db/schema";
import type { NewPatient, NewVisit, NewAilmentTreatment } from "@/src/db/schema";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON"); // matches getDb() in client.ts
  sqlite.pragma("journal_mode = WAL");
  runMigrations(sqlite);
  return { sqlite, db: drizzle(sqlite, { schema }) };
}

function newPatient(overrides: Partial<NewPatient> = {}): NewPatient {
  const now = Date.now();
  return {
    id: uuidv4(),
    agent_name: "test-agent",
    model: "claude-sonnet-4-5",
    owner: "test-owner",
    status: "active",
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function newVisit(patientId: string, overrides: Partial<NewVisit> = {}): NewVisit {
  const now = Date.now();
  return {
    id: uuidv4(),
    patient_id: patientId,
    symptoms: "Generating plausible-sounding but incorrect facts",
    status: "TRIAGE",
    recurrence_flag: 0,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

// ── patients ─────────────────────────────────────────────────────────────────

describe("patients", () => {
  let db: ReturnType<typeof makeDb>["db"];

  beforeEach(() => {
    db = makeDb().db;
  });

  it("insert + select by id round-trips all required fields", () => {
    const p = newPatient();
    db.insert(schema.patients).values(p).run();

    const found = db
      .select()
      .from(schema.patients)
      .where(eq(schema.patients.id, p.id))
      .get();

    expect(found).toBeDefined();
    expect(found?.agent_name).toBe("test-agent");
    expect(found?.model).toBe("claude-sonnet-4-5");
    expect(found?.owner).toBe("test-owner");
    expect(found?.status).toBe("active");
  });

  it("optional fields (version, environment, tags) survive the round-trip", () => {
    const p = newPatient({
      version: "2.1.0",
      environment: "production",
      tags: JSON.stringify(["rag", "tool-use"]),
    });
    db.insert(schema.patients).values(p).run();

    const found = db
      .select()
      .from(schema.patients)
      .where(eq(schema.patients.id, p.id))
      .get();

    expect(found?.version).toBe("2.1.0");
    expect(found?.environment).toBe("production");
    expect(JSON.parse(found?.tags ?? "[]")).toEqual(["rag", "tool-use"]);
  });

  it("status can be updated", () => {
    const p = newPatient();
    db.insert(schema.patients).values(p).run();

    db.update(schema.patients)
      .set({ status: "inactive", updated_at: Date.now() })
      .where(eq(schema.patients.id, p.id))
      .run();

    const updated = db
      .select()
      .from(schema.patients)
      .where(eq(schema.patients.id, p.id))
      .get();

    expect(updated?.status).toBe("inactive");
  });

  it("select all returns every inserted patient", () => {
    db.insert(schema.patients).values(newPatient({ agent_name: "agent-a" })).run();
    db.insert(schema.patients).values(newPatient({ agent_name: "agent-b" })).run();
    db.insert(schema.patients).values(newPatient({ agent_name: "agent-c" })).run();

    const all = db.select().from(schema.patients).all();
    expect(all).toHaveLength(3);
  });

  it("patient can be deleted", () => {
    const p = newPatient();
    db.insert(schema.patients).values(p).run();
    db.delete(schema.patients).where(eq(schema.patients.id, p.id)).run();

    const found = db
      .select()
      .from(schema.patients)
      .where(eq(schema.patients.id, p.id))
      .get();
    expect(found).toBeUndefined();
  });
});

// ── visits ────────────────────────────────────────────────────────────────────

describe("visits", () => {
  let db: ReturnType<typeof makeDb>["db"];
  let patientId: string;

  beforeEach(() => {
    const result = makeDb();
    db = result.db;
    const p = newPatient();
    patientId = p.id;
    db.insert(schema.patients).values(p).run();
  });

  it("insert + select by id round-trips all required fields", () => {
    const v = newVisit(patientId);
    db.insert(schema.visits).values(v).run();

    const found = db
      .select()
      .from(schema.visits)
      .where(eq(schema.visits.id, v.id))
      .get();

    expect(found).toBeDefined();
    expect(found?.patient_id).toBe(patientId);
    expect(found?.symptoms).toBe("Generating plausible-sounding but incorrect facts");
    expect(found?.status).toBe("TRIAGE");
    expect(found?.recurrence_flag).toBe(0);
  });

  it("FK constraint rejects a visit referencing a non-existent patient", () => {
    expect(() => {
      db.insert(schema.visits).values(newVisit("ghost-patient-id")).run();
    }).toThrow();
  });

  it("a patient can have multiple visits", () => {
    db.insert(schema.visits).values(newVisit(patientId, { symptoms: "symptom-1" })).run();
    db.insert(schema.visits).values(newVisit(patientId, { symptoms: "symptom-2" })).run();
    db.insert(schema.visits).values(newVisit(patientId, { symptoms: "symptom-3" })).run();

    const visits = db
      .select()
      .from(schema.visits)
      .where(eq(schema.visits.patient_id, patientId))
      .all();

    expect(visits).toHaveLength(3);
  });

  it("severity and expires_at accept null values", () => {
    const v = newVisit(patientId, { severity: null, expires_at: null });
    db.insert(schema.visits).values(v).run();

    const found = db
      .select()
      .from(schema.visits)
      .where(eq(schema.visits.id, v.id))
      .get();

    expect(found?.severity).toBeNull();
    expect(found?.expires_at).toBeNull();
  });

  it("status can be updated through the pipeline stages", () => {
    const v = newVisit(patientId);
    db.insert(schema.visits).values(v).run();

    for (const status of ["DIAGNOSED", "PRESCRIBED", "AWAITING_FOLLOWUP", "RESOLVED"] as const) {
      db.update(schema.visits)
        .set({ status, updated_at: Date.now() })
        .where(eq(schema.visits.id, v.id))
        .run();

      const found = db
        .select()
        .from(schema.visits)
        .where(eq(schema.visits.id, v.id))
        .get();
      expect(found?.status).toBe(status);
    }
  });

  it("deleting a patient cascades — orphan visit FK rejected on insert, not cascade-delete", () => {
    // SQLite FK does not auto-cascade unless ON DELETE CASCADE is declared.
    // Our schema omits it, so deleting a referenced patient should fail.
    db.insert(schema.visits).values(newVisit(patientId)).run();

    expect(() => {
      db.delete(schema.patients).where(eq(schema.patients.id, patientId)).run();
    }).toThrow();
  });
});

// ── ailments + treatments (seed data via Drizzle queries) ─────────────────────

describe("ailments and treatments — Drizzle queries over seed data", () => {
  let db: ReturnType<typeof makeDb>["db"];
  let sqlite: Database.Database;

  beforeEach(() => {
    const result = makeDb();
    db = result.db;
    sqlite = result.sqlite;
    runSeed(sqlite);
  });

  it("all 10 ailments are queryable and have required fields", () => {
    const ailments = db.select().from(schema.ailments).all();
    expect(ailments).toHaveLength(10);
    for (const a of ailments) {
      expect(a.id).toBeTruthy();
      expect(a.code).toBeTruthy();
      expect(a.name).toBeTruthy();
      expect(a.custom).toBe(0);
    }
  });

  it("can find HAL-001 (Hallucination) by code", () => {
    const hal = db
      .select()
      .from(schema.ailments)
      .where(eq(schema.ailments.code, "HAL-001"))
      .get();

    expect(hal).toBeDefined();
    expect(hal?.name).toBe("Hallucination");
    expect(hal?.category).toBe("accuracy");
  });

  it("all 10 treatments are queryable and have instructions", () => {
    const treatments = db.select().from(schema.treatments).all();
    expect(treatments).toHaveLength(10);
    for (const t of treatments) {
      expect(t.code).toBeTruthy();
      expect(t.instructions).toBeTruthy();
    }
  });

  it("can find TRT-010 (Reasoning Chain Prompting) by code", () => {
    const trt = db
      .select()
      .from(schema.treatments)
      .where(eq(schema.treatments.code, "TRT-010"))
      .get();

    expect(trt).toBeDefined();
    expect(trt?.name).toBe("Reasoning Chain Prompting");
  });

  it("HAL-001 has at least 2 treatment mappings with valid scores", () => {
    const hal = db
      .select()
      .from(schema.ailments)
      .where(eq(schema.ailments.code, "HAL-001"))
      .get()!;

    const mappings = db
      .select()
      .from(schema.ailment_treatments)
      .where(eq(schema.ailment_treatments.ailment_id, hal.id))
      .all();

    expect(mappings.length).toBeGreaterThanOrEqual(2);
    for (const m of mappings) {
      expect(m.effectiveness_score).toBeGreaterThan(0);
      expect(m.effectiveness_score).toBeLessThanOrEqual(1);
    }
  });

  it("can insert a custom ailment (custom = 1)", () => {
    const id = uuidv4();
    db.insert(schema.ailments).values({
      id,
      code: "CUSTOM-001",
      name: "Context Poisoning",
      description: "Adversarial content corrupts the model context silently",
      category: "security",
      custom: 1,
      created_at: Date.now(),
    }).run();

    const found = db
      .select()
      .from(schema.ailments)
      .where(eq(schema.ailments.code, "CUSTOM-001"))
      .get();

    expect(found?.custom).toBe(1);
    expect(db.select().from(schema.ailments).all()).toHaveLength(11);
  });
});

// ── ailment_treatments FK constraints ────────────────────────────────────────

describe("ailment_treatments FK constraints", () => {
  let db: ReturnType<typeof makeDb>["db"];
  let sqlite: Database.Database;

  beforeEach(() => {
    const result = makeDb();
    db = result.db;
    sqlite = result.sqlite;
    runSeed(sqlite);
  });

  const badMapping = (overrides: Partial<NewAilmentTreatment>): NewAilmentTreatment => ({
    id: uuidv4(),
    ailment_id: "ghost",
    treatment_id: "ghost",
    effectiveness_score: 0.5,
    sample_count: 0,
    ...overrides,
  });

  it("rejects mapping with a non-existent ailment_id", () => {
    const [treatment] = db.select().from(schema.treatments).all();
    expect(() => {
      db.insert(schema.ailment_treatments)
        .values(badMapping({ treatment_id: treatment.id }))
        .run();
    }).toThrow();
  });

  it("rejects mapping with a non-existent treatment_id", () => {
    const [ailment] = db.select().from(schema.ailments).all();
    expect(() => {
      db.insert(schema.ailment_treatments)
        .values(badMapping({ ailment_id: ailment.id }))
        .run();
    }).toThrow();
  });

  it("effectiveness_score can be updated after a follow-up", () => {
    const [mapping] = db.select().from(schema.ailment_treatments).all();
    const original = mapping.effectiveness_score;

    db.update(schema.ailment_treatments)
      .set({ effectiveness_score: 0.95, sample_count: mapping.sample_count + 1 })
      .where(eq(schema.ailment_treatments.id, mapping.id))
      .run();

    const updated = db
      .select()
      .from(schema.ailment_treatments)
      .where(eq(schema.ailment_treatments.id, mapping.id))
      .get();

    expect(updated?.effectiveness_score).toBe(0.95);
    expect(updated?.effectiveness_score).not.toBe(original);
    expect(updated?.sample_count).toBe(1);
  });
});
