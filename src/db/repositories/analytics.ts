import type Database from "better-sqlite3";

export function getOverview(db: Database.Database) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayTs = todayStart.getTime();

  const { total_patients } = db
    .prepare("SELECT COUNT(*) AS total_patients FROM patients")
    .get() as { total_patients: number };

  const { active_visits } = db
    .prepare(
      "SELECT COUNT(*) AS active_visits FROM visits WHERE status = 'AWAITING_FOLLOWUP'"
    )
    .get() as { active_visits: number };

  const { resolved_today } = db
    .prepare(
      "SELECT COUNT(*) AS resolved_today FROM visits WHERE status = 'RESOLVED' AND resolved_at > ?"
    )
    .get(todayTs) as { resolved_today: number };

  const { referrals_pending } = db
    .prepare(
      "SELECT COUNT(*) AS referrals_pending FROM referrals WHERE acknowledged_at IS NULL"
    )
    .get() as { referrals_pending: number };

  return { total_patients, active_visits, resolved_today, referrals_pending };
}

export function getAilmentAnalytics(db: Database.Database) {
  return db
    .prepare(
      `SELECT d.ailment_code, COUNT(*) AS frequency,
         SUM(CASE WHEN v.severity = 1 THEN 1 ELSE 0 END) AS sev1,
         SUM(CASE WHEN v.severity = 2 THEN 1 ELSE 0 END) AS sev2,
         SUM(CASE WHEN v.severity = 3 THEN 1 ELSE 0 END) AS sev3,
         SUM(CASE WHEN v.severity = 4 THEN 1 ELSE 0 END) AS sev4
       FROM diagnoses d
       JOIN visits v ON v.id = d.visit_id
       WHERE d.is_primary = 1
       GROUP BY d.ailment_code
       ORDER BY frequency DESC`
    )
    .all();
}

export function getTreatmentAnalytics(db: Database.Database) {
  return db
    .prepare(
      `SELECT t.code AS treatment_code, at.effectiveness_score, at.sample_count AS usage_count
       FROM treatments t
       LEFT JOIN ailment_treatments at ON at.treatment_id = t.id
       ORDER BY at.effectiveness_score DESC`
    )
    .all();
}

export function getPatientAnalytics(db: Database.Database, patient_id: string) {
  const visits = db
    .prepare("SELECT id, status, severity, created_at, resolved_at FROM visits WHERE patient_id = ?")
    .all(patient_id);

  const chronic_conditions = db
    .prepare(
      "SELECT ailment_code, first_flagged_at, recurrence_count FROM chronic_conditions WHERE patient_id = ?"
    )
    .all(patient_id);

  const treatment_outcomes = db
    .prepare(
      `SELECT p.treatment_code, f.outcome, COUNT(*) AS count
       FROM prescriptions p
       JOIN visits v ON v.id = p.visit_id
       LEFT JOIN followups f ON f.visit_id = v.id
       WHERE v.patient_id = ?
       GROUP BY p.treatment_code, f.outcome`
    )
    .all(patient_id);

  return { patient_id, visits, chronic_conditions, treatment_outcomes };
}
