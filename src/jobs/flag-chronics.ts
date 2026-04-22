import type Database from "better-sqlite3";
import { v4 as uuid } from "uuid";
import { eventBus } from "@/src/lib/event-bus";

export function runFlagChronics(db: Database.Database, windowDays = 30, minRecurrences = 3): number {
  const since = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const now = Date.now();

  const candidates = db
    .prepare(
      `SELECT v.patient_id, d.ailment_code, COUNT(*) AS recurrence_count
       FROM visits v
       JOIN diagnoses d ON d.visit_id = v.id AND d.is_primary = 1
       WHERE v.status = 'RESOLVED' AND v.resolved_at > ?
       GROUP BY v.patient_id, d.ailment_code
       HAVING recurrence_count >= ?`
    )
    .all(since, minRecurrences) as Array<{
      patient_id: string;
      ailment_code: string;
      recurrence_count: number;
    }>;

  let flagged = 0;
  for (const row of candidates) {
    const existing = db
      .prepare(
        "SELECT id FROM chronic_conditions WHERE patient_id = ? AND ailment_code = ?"
      )
      .get(row.patient_id, row.ailment_code) as { id: string } | undefined;

    if (existing) {
      db.prepare(
        "UPDATE chronic_conditions SET recurrence_count = ? WHERE id = ?"
      ).run(row.recurrence_count, existing.id);
    } else {
      db.prepare(
        `INSERT INTO chronic_conditions (id, patient_id, ailment_code, first_flagged_at, recurrence_count)
         VALUES (?, ?, ?, ?, ?)`
      ).run(uuid(), row.patient_id, row.ailment_code, now, row.recurrence_count);

      eventBus.emit("chronic_flagged", {
        patient_id: row.patient_id,
        ailment_code: row.ailment_code,
      });
      flagged++;
    }
  }

  return flagged;
}
