import { getDb } from "@/src/db/client";
import { getOverview, getAilmentAnalytics } from "@/src/db/repositories/analytics";
import { listVisits } from "@/src/db/repositories/visits";
import { SseRefresh } from "@/app/components/SseRefresh";
import { AilmentBarChart } from "@/app/components/charts/AilmentBarChart";
import { SeverityDonut } from "@/app/components/charts/SeverityDonut";
import styles from "./dashboard.module.css";

export default function DashboardPage() {
  const db = getDb();
  const overview = getOverview(db);
  const ailmentData = getAilmentAnalytics(db) as Array<{
    ailment_code: string;
    frequency: number;
    sev1: number;
    sev2: number;
    sev3: number;
    sev4: number;
  }>;
  const recentVisits = listVisits(db, {}).slice(0, 10);

  const severityData = [
    { name: "Mild (1)",     value: ailmentData.reduce((s, r) => s + r.sev1, 0) },
    { name: "Moderate (2)", value: ailmentData.reduce((s, r) => s + r.sev2, 0) },
    { name: "Severe (3)",   value: ailmentData.reduce((s, r) => s + r.sev3, 0) },
    { name: "Critical (4)", value: ailmentData.reduce((s, r) => s + r.sev4, 0) },
  ].filter((d) => d.value > 0);

  return (
    <div className="container-page">
      <SseRefresh />
      <hgroup>
        <h1>Dashboard</h1>
        <p>Clinic overview — refreshes automatically on new events.</p>
      </hgroup>

      {/* Stat cards */}
      <div className={styles.statGrid}>
        {[
          { label: "Total Patients",   value: overview.total_patients   },
          { label: "Active Visits",    value: overview.active_visits    },
          { label: "Resolved Today",   value: overview.resolved_today   },
          { label: "Pending Referrals",value: overview.referrals_pending},
        ].map((stat) => (
          <article key={stat.label} className={styles.statCard}>
            <h2>{stat.value}</h2>
            <p>{stat.label}</p>
          </article>
        ))}
      </div>

      {/* Charts */}
      {ailmentData.length > 0 && (
        <div className="grid">
          <div className={styles.section}>
            <h2>Ailment Distribution</h2>
            <AilmentBarChart data={ailmentData} />
          </div>
          <div className={styles.section}>
            <h2>Severity Breakdown</h2>
            <SeverityDonut data={severityData} />
          </div>
        </div>
      )}

      {/* Recent visits */}
      <div className={styles.section}>
        <h2>Recent Visits</h2>
        {recentVisits.length === 0 ? (
          <p>No visits yet. Waiting for agents to check in.</p>
        ) : (
          <figure>
            <table>
              <thead>
                <tr>
                  <th>Visit ID</th>
                  <th>Patient</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {recentVisits.map(({ visit }) => (
                  <tr key={visit.id}>
                    <td><code>{visit.id.slice(0, 8)}</code></td>
                    <td><code>{visit.patient_id.slice(0, 8)}</code></td>
                    <td>{visit.severity ?? "—"}</td>
                    <td>{visit.status}</td>
                    <td>{new Date(visit.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </figure>
        )}
      </div>
    </div>
  );
}
