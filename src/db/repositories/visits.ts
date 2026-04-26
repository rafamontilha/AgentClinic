import type Database from "better-sqlite3";
import { v4 as uuid } from "uuid";

export interface VisitRow {
  id: string;
  patient_id: string;
  symptoms: string;
  severity: number | null;
  status: string;
  triage_notes: string | null;
  recurrence_flag: number;
  created_at: number;
  updated_at: number;
  expires_at: number | null;
  resolved_at: number | null;
}

export interface DiagnosisRow {
  id: string;
  visit_id: string;
  ailment_code: string;
  confidence: number;
  is_primary: number;
}

export interface PrescriptionRow {
  id: string;
  visit_id: string;
  treatment_code: string;
  rationale: string | null;
  sequence: number;
}

export interface ReferralRow {
  id: string;
  visit_id: string;
  patient_id: string;
  ailment_code: string;
  reason: string;
  acknowledged_at: number | null;
  created_at: number;
}

export function countVisitsInLastHour(
  db: Database.Database,
  patient_id: string,
  rateLimit = 10
): { count: number; exceeded: boolean; retry_after_seconds: number } {
  const since = Date.now() - 60 * 60 * 1000;
  const { count } = db
    .prepare(
      "SELECT COUNT(*) AS count FROM visits WHERE patient_id = ? AND created_at > ?"
    )
    .get(patient_id, since) as { count: number };
  const exceeded = count >= rateLimit;
  return { count, exceeded, retry_after_seconds: exceeded ? 3600 : 0 };
}

export function checkRecurrence(
  db: Database.Database,
  patient_id: string,
  ailment_code: string,
  windowDays = 7
): boolean {
  const since = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const row = db
    .prepare(
      `SELECT v.id FROM visits v
       JOIN diagnoses d ON d.visit_id = v.id
       WHERE v.patient_id = ? AND d.ailment_code = ? AND d.is_primary = 1
         AND v.status = 'RESOLVED' AND v.resolved_at > ?
       LIMIT 1`
    )
    .get(patient_id, ailment_code, since);
  return !!row;
}

export interface CreateVisitData {
  patient_id: string;
  symptoms: string;
  severity: number;
  recurrence_flag: boolean;
  diagnoses: Array<{ ailment_code: string; confidence: number; is_primary: boolean }>;
  prescriptions: Array<{ treatment_code: string; rationale: string; sequence: number }>;
  followup_window_hours?: number;
}

export interface FullVisitRecord {
  visit: VisitRow;
  diagnoses: DiagnosisRow[];
  prescriptions: PrescriptionRow[];
}

export function createVisitWithPipeline(
  db: Database.Database,
  data: CreateVisitData
): FullVisitRecord {
  const visitId = uuid();
  const now = Date.now();
  const followupHours = data.followup_window_hours ?? 72;
  const expiresAt = now + followupHours * 60 * 60 * 1000;

  const insertAll = db.transaction(() => {
    db.prepare(
      `INSERT INTO visits (id, patient_id, symptoms, severity, status, recurrence_flag, created_at, updated_at, expires_at)
       VALUES (?, ?, ?, ?, 'AWAITING_FOLLOWUP', ?, ?, ?, ?)`
    ).run(visitId, data.patient_id, data.symptoms, data.severity, data.recurrence_flag ? 1 : 0, now, now, expiresAt);

    for (const d of data.diagnoses) {
      db.prepare(
        `INSERT INTO diagnoses (id, visit_id, ailment_code, confidence, is_primary) VALUES (?, ?, ?, ?, ?)`
      ).run(uuid(), visitId, d.ailment_code, d.confidence, d.is_primary ? 1 : 0);
    }

    for (const p of data.prescriptions) {
      db.prepare(
        `INSERT INTO prescriptions (id, visit_id, treatment_code, rationale, sequence) VALUES (?, ?, ?, ?, ?)`
      ).run(uuid(), visitId, p.treatment_code, p.rationale, p.sequence);
    }
  });

  insertAll();

  const visit = db.prepare("SELECT * FROM visits WHERE id = ?").get(visitId) as VisitRow;
  const diagnoses = db.prepare("SELECT * FROM diagnoses WHERE visit_id = ?").all(visitId) as DiagnosisRow[];
  const prescriptions = db.prepare("SELECT * FROM prescriptions WHERE visit_id = ?").all(visitId) as PrescriptionRow[];

  return { visit, diagnoses, prescriptions };
}

export function getVisitById(
  db: Database.Database,
  id: string
): FullVisitRecord | undefined {
  const visit = db.prepare("SELECT * FROM visits WHERE id = ?").get(id) as VisitRow | undefined;
  if (!visit) return undefined;
  const diagnoses = db.prepare("SELECT * FROM diagnoses WHERE visit_id = ?").all(id) as DiagnosisRow[];
  const prescriptions = db.prepare("SELECT * FROM prescriptions WHERE visit_id = ?").all(id) as PrescriptionRow[];
  return { visit, diagnoses, prescriptions };
}

export function listVisits(
  db: Database.Database,
  filters: { patient_id?: string; status?: string; ailment_code?: string }
): FullVisitRecord[] {
  let sql = "SELECT DISTINCT v.id FROM visits v";
  const params: unknown[] = [];

  if (filters.ailment_code) {
    sql += " JOIN diagnoses d ON d.visit_id = v.id AND d.ailment_code = ?";
    params.push(filters.ailment_code);
  }

  sql += " WHERE 1=1";
  if (filters.patient_id) { sql += " AND v.patient_id = ?"; params.push(filters.patient_id); }
  if (filters.status)     { sql += " AND v.status = ?";     params.push(filters.status);     }
  sql += " ORDER BY v.created_at DESC";

  const rows = db.prepare(sql).all(...params) as { id: string }[];
  return rows.map((r) => getVisitById(db, r.id)!).filter(Boolean);
}

export interface SubmitFollowupData {
  outcome: "RESOLVED" | "PARTIAL" | "FAILED";
  notes?: string;
}

export function submitFollowup(
  db: Database.Database,
  visit_id: string,
  data: SubmitFollowupData
): { followup_id: string; resolved_at: number | null } {
  const now = Date.now();
  const followupId = uuid();

  db.prepare(
    `INSERT INTO followups (id, visit_id, outcome, notes, submitted_at) VALUES (?, ?, ?, ?, ?)`
  ).run(followupId, visit_id, data.outcome, data.notes ?? null, now);

  const resolvedAt = data.outcome === "RESOLVED" ? now : null;
  db.prepare(
    `UPDATE visits SET status = 'RESOLVED', resolved_at = ?, updated_at = ? WHERE id = ?`
  ).run(resolvedAt, now, visit_id);

  return { followup_id: followupId, resolved_at: resolvedAt };
}

export function createReferral(
  db: Database.Database,
  visit_id: string,
  patient_id: string,
  ailment_code: string,
  reason: string
): ReferralRow {
  const id = uuid();
  const now = Date.now();
  db.prepare(
    `INSERT INTO referrals (id, visit_id, patient_id, ailment_code, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, visit_id, patient_id, ailment_code, reason, now);
  return db.prepare("SELECT * FROM referrals WHERE id = ?").get(id) as ReferralRow;
}

export function acknowledgeReferral(db: Database.Database, id: string): void {
  db.prepare("UPDATE referrals SET acknowledged_at = ? WHERE id = ?").run(Date.now(), id);
}

export function listReferrals(
  db: Database.Database,
  acknowledged?: boolean
): ReferralRow[] {
  if (acknowledged === undefined) {
    return db.prepare("SELECT * FROM referrals ORDER BY created_at DESC").all() as ReferralRow[];
  }
  const sql = acknowledged
    ? "SELECT * FROM referrals WHERE acknowledged_at IS NOT NULL ORDER BY created_at DESC"
    : "SELECT * FROM referrals WHERE acknowledged_at IS NULL ORDER BY created_at DESC";
  return db.prepare(sql).all() as ReferralRow[];
}

export function expireOldVisits(
  db: Database.Database,
  followupWindowHours: number
): number {
  const cutoff = Date.now() - followupWindowHours * 60 * 60 * 1000;
  const result = db
    .prepare(
      `UPDATE visits SET status = 'EXPIRED', updated_at = ?
       WHERE status = 'AWAITING_FOLLOWUP' AND created_at < ?`
    )
    .run(Date.now(), cutoff) as { changes: number };
  return result.changes;
}
