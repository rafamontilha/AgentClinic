import type Database from "better-sqlite3";
import { v4 as uuid } from "uuid";

export interface PatientRow {
  id: string;
  agent_name: string;
  model: string;
  version: string | null;
  environment: string | null;
  status: string;
  owner: string;
  tags: string | null;
  created_at: number;
  updated_at: number;
}

export interface CreatePatientInput {
  agent_name: string;
  model: string;
  owner: string;
  version?: string;
  environment?: string;
  tags?: string[];
}

export interface UpdatePatientInput {
  model?: string;
  version?: string;
  environment?: string;
  status?: string;
}

export function findPatientByNameAndOwner(
  db: Database.Database,
  agent_name: string,
  owner: string
): PatientRow | undefined {
  return db
    .prepare("SELECT * FROM patients WHERE agent_name = ? AND owner = ?")
    .get(agent_name, owner) as PatientRow | undefined;
}

export function createPatient(
  db: Database.Database,
  input: CreatePatientInput
): PatientRow {
  const id = uuid();
  const now = Date.now();
  db.prepare(
    `INSERT INTO patients (id, agent_name, model, version, environment, status, owner, tags, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)`
  ).run(
    id,
    input.agent_name,
    input.model,
    input.version ?? null,
    input.environment ?? null,
    input.owner,
    input.tags ? JSON.stringify(input.tags) : null,
    now,
    now
  );
  return db.prepare("SELECT * FROM patients WHERE id = ?").get(id) as PatientRow;
}

export function getPatientById(
  db: Database.Database,
  id: string
): PatientRow | undefined {
  return db.prepare("SELECT * FROM patients WHERE id = ?").get(id) as PatientRow | undefined;
}

export function listPatients(
  db: Database.Database,
  filters: { status?: string; owner?: string }
): PatientRow[] {
  let sql = "SELECT * FROM patients WHERE 1=1";
  const params: string[] = [];
  if (filters.status) { sql += " AND status = ?"; params.push(filters.status); }
  if (filters.owner)  { sql += " AND owner = ?";  params.push(filters.owner);  }
  sql += " ORDER BY created_at DESC";
  return db.prepare(sql).all(...params) as PatientRow[];
}

export function updatePatient(
  db: Database.Database,
  id: string,
  input: UpdatePatientInput
): PatientRow | undefined {
  const sets: string[] = [];
  const params: unknown[] = [];
  if (input.model !== undefined)       { sets.push("model = ?");       params.push(input.model);       }
  if (input.version !== undefined)     { sets.push("version = ?");     params.push(input.version);     }
  if (input.environment !== undefined) { sets.push("environment = ?"); params.push(input.environment); }
  if (input.status !== undefined)      { sets.push("status = ?");      params.push(input.status);      }
  if (sets.length === 0) return getPatientById(db, id);
  sets.push("updated_at = ?");
  params.push(Date.now(), id);
  db.prepare(`UPDATE patients SET ${sets.join(", ")} WHERE id = ?`).run(...params);
  return getPatientById(db, id);
}

export function getPatientVisitHistory(
  db: Database.Database,
  patient_id: string,
  limit = 50,
  offset = 0
): unknown[] {
  return db
    .prepare(
      "SELECT * FROM visits WHERE patient_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
    )
    .all(patient_id, limit, offset);
}
