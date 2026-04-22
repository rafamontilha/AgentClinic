import { getDb } from "@/src/db/client";
import { listAilments, verifyAilment } from "@/src/db/repositories/ailments";
import { getTreatmentAnalytics } from "@/src/db/repositories/analytics";
import { AilmentBarChart } from "@/app/components/charts/AilmentBarChart";
import { getAilmentAnalytics } from "@/src/db/repositories/analytics";
import styles from "@/app/dashboard/dashboard.module.css";

export default function AilmentsPage() {
  const db = getDb();
  const allAilments = listAilments(db);
  const customQueue = allAilments.filter((a) => a.custom === 1 && a.verified === 0);
  const trendData = getAilmentAnalytics(db) as Array<{
    ailment_code: string;
    frequency: number;
  }>;
  const treatmentEffectiveness = getTreatmentAnalytics(db) as Array<{
    treatment_code: string;
    effectiveness_score: number | null;
    usage_count: number;
  }>;

  return (
    <div className="container-page">
      <h1>Ailments</h1>

      {/* Trending chart */}
      {trendData.length > 0 && (
        <div className={styles.section}>
          <h2>Ailment Frequency</h2>
          <AilmentBarChart data={trendData} />
        </div>
      )}

      {/* Treatment effectiveness */}
      <div className={styles.section}>
        <h2>Treatment Effectiveness</h2>
        <figure>
          <table>
            <thead>
              <tr>
                <th>Treatment</th>
                <th>Effectiveness</th>
                <th>Usage Count</th>
              </tr>
            </thead>
            <tbody>
              {treatmentEffectiveness.map((t) => (
                <tr key={t.treatment_code}>
                  <td>{t.treatment_code}</td>
                  <td>{t.effectiveness_score != null ? (t.effectiveness_score * 100).toFixed(1) + "%" : "—"}</td>
                  <td>{t.usage_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </figure>
      </div>

      {/* Custom ailment review queue */}
      {customQueue.length > 0 && (
        <div className={styles.section}>
          <h2>Custom Ailment Review Queue ({customQueue.length})</h2>
          <figure>
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customQueue.map((a) => (
                  <tr key={a.code}>
                    <td><code>{a.code}</code></td>
                    <td>{a.name}</td>
                    <td>
                      <div className={styles.reviewActions}>
                        <form action={async () => {
                          "use server";
                          verifyAilment(db, a.code);
                        }}>
                          <button type="submit">Verify</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </figure>
        </div>
      )}

      {customQueue.length === 0 && (
        <p>No custom ailments pending review.</p>
      )}
    </div>
  );
}
