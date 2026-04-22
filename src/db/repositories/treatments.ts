import type Database from "better-sqlite3";

export interface TreatmentRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  instructions: string | null;
  created_at: number;
}

export interface TreatmentWithEffectiveness extends TreatmentRow {
  effectiveness: Array<{ ailment_code: string; effectiveness_score: number }>;
}

export function listTreatments(db: Database.Database): TreatmentRow[] {
  return db.prepare("SELECT * FROM treatments ORDER BY code").all() as TreatmentRow[];
}

export function getTreatmentByCode(
  db: Database.Database,
  code: string
): TreatmentWithEffectiveness | undefined {
  const treatment = db
    .prepare("SELECT * FROM treatments WHERE code = ?")
    .get(code) as TreatmentRow | undefined;
  if (!treatment) return undefined;

  const effectiveness = db
    .prepare(
      `SELECT a.code AS ailment_code, at.effectiveness_score
       FROM ailment_treatments at
       JOIN ailments a ON a.id = at.ailment_id
       JOIN treatments t ON t.id = at.treatment_id
       WHERE t.code = ?`
    )
    .all(code) as Array<{ ailment_code: string; effectiveness_score: number }>;

  return { ...treatment, effectiveness };
}

export function getTreatmentsForAilment(
  db: Database.Database,
  ailmentCode: string
): Array<{ treatment_code: string; treatment_id: string; effectiveness_score: number }> {
  return db
    .prepare(
      `SELECT t.code AS treatment_code, t.id AS treatment_id, at.effectiveness_score
       FROM ailment_treatments at
       JOIN ailments a ON a.id = at.ailment_id
       JOIN treatments t ON t.id = at.treatment_id
       WHERE a.code = ?
       ORDER BY at.effectiveness_score DESC`
    )
    .all(ailmentCode) as Array<{
      treatment_code: string;
      treatment_id: string;
      effectiveness_score: number;
    }>;
}

export function updateEffectivenessScore(
  db: Database.Database,
  ailmentCode: string,
  treatmentCode: string,
  outcomeWeight: number
): void {
  const row = db
    .prepare(
      `SELECT at.id, at.effectiveness_score, at.sample_count
       FROM ailment_treatments at
       JOIN ailments a ON a.id = at.ailment_id
       JOIN treatments t ON t.id = at.treatment_id
       WHERE a.code = ? AND t.code = ?`
    )
    .get(ailmentCode, treatmentCode) as
    | { id: string; effectiveness_score: number; sample_count: number }
    | undefined;

  if (!row) return;

  const newScore = 0.8 * row.effectiveness_score + 0.2 * outcomeWeight;
  db.prepare(
    "UPDATE ailment_treatments SET effectiveness_score = ?, sample_count = ? WHERE id = ?"
  ).run(newScore, row.sample_count + 1, row.id);
}
