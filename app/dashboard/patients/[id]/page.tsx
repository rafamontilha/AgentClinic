import { notFound } from "next/navigation";
import { getDb } from "@/src/db/client";
import { getPatientById } from "@/src/db/repositories/patients";
import { listVisits } from "@/src/db/repositories/visits";
import { getPatientAnalytics } from "@/src/db/repositories/analytics";
import styles from "@/app/dashboard/dashboard.module.css";

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getDb();
  const patient = getPatientById(db, id);
  if (!patient) notFound();

  const visits = listVisits(db, { patient_id: id });
  const analytics = getPatientAnalytics(db, id);
  const chronics = analytics.chronic_conditions as Array<{
    ailment_code: string;
    recurrence_count: number;
  }>;

  return (
    <div className="container-page">
      <hgroup>
        <h1>{patient.agent_name}</h1>
        <p>{patient.model} · {patient.owner} · {patient.status}</p>
      </hgroup>

      {/* Chronic condition badges */}
      {chronics.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          {chronics.map((c) => (
            <span key={c.ailment_code} className={`${styles.badge} ${styles.badgeChronic}`} style={{ marginRight: "0.5rem" }}>
              ⚠ Chronic: {c.ailment_code} ({c.recurrence_count}×)
            </span>
          ))}
        </div>
      )}

      {/* Visit timeline */}
      <section>
        <h2>Visit Timeline</h2>
        {visits.length === 0 ? (
          <p>No visits yet.</p>
        ) : (
          <ul className={styles.timeline}>
            {visits.map(({ visit, diagnoses, prescriptions }) => (
              <li key={visit.id}>
                <strong>{new Date(visit.created_at).toLocaleString()}</strong>
                {" — "}severity {visit.severity ?? "?"}, status <em>{visit.status}</em>
                {diagnoses.length > 0 && (
                  <div style={{ fontSize: "0.85rem", color: "var(--pico-muted-color)" }}>
                    Diagnoses: {diagnoses.map((d) => `${d.ailment_code} (${(d.confidence * 100).toFixed(0)}%)`).join(", ")}
                  </div>
                )}
                {prescriptions.length > 0 && (
                  <div style={{ fontSize: "0.85rem", color: "var(--pico-muted-color)" }}>
                    Treatments: {prescriptions.map((p) => p.treatment_code).join(", ")}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
