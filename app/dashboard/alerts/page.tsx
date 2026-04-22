import { getDb } from "@/src/db/client";
import { listReferrals, acknowledgeReferral } from "@/src/db/repositories/visits";
import styles from "@/app/dashboard/dashboard.module.css";

export default function AlertsPage() {
  const db = getDb();
  const pendingReferrals = listReferrals(db, false);
  const chronicConditions = db
    .prepare(
      `SELECT cc.patient_id, cc.ailment_code, cc.recurrence_count, cc.first_flagged_at,
              p.agent_name
       FROM chronic_conditions cc
       JOIN patients p ON p.id = cc.patient_id
       ORDER BY cc.recurrence_count DESC`
    )
    .all() as Array<{
      patient_id: string;
      ailment_code: string;
      recurrence_count: number;
      first_flagged_at: number;
      agent_name: string;
    }>;

  return (
    <div className="container-page">
      <h1>Alerts</h1>

      {/* Referral queue */}
      <section>
        <h2>Referral Queue ({pendingReferrals.length} pending)</h2>
        {pendingReferrals.length === 0 ? (
          <p>No pending referrals.</p>
        ) : (
          <figure>
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Ailment</th>
                  <th>Reason</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingReferrals.map((r) => (
                  <tr key={r.id}>
                    <td><code>{r.patient_id.slice(0, 8)}</code></td>
                    <td>{r.ailment_code}</td>
                    <td>{r.reason}</td>
                    <td>{new Date(r.created_at).toLocaleDateString()}</td>
                    <td>
                      <form action={async () => {
                        "use server";
                        acknowledgeReferral(db, r.id);
                      }}>
                        <button type="submit" className="outline">
                          Acknowledge
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </figure>
        )}
      </section>

      {/* Chronic conditions */}
      <section>
        <h2>Chronic Conditions</h2>
        {chronicConditions.length === 0 ? (
          <p>No chronic conditions flagged.</p>
        ) : (
          <figure>
            <table>
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Ailment</th>
                  <th>Recurrences</th>
                  <th>First Flagged</th>
                </tr>
              </thead>
              <tbody>
                {chronicConditions.map((c, i) => (
                  <tr key={i}>
                    <td>
                      <span className={`${styles.badge} ${styles.badgeChronic}`}>
                        {c.agent_name}
                      </span>
                    </td>
                    <td>{c.ailment_code}</td>
                    <td>{c.recurrence_count}×</td>
                    <td>{new Date(c.first_flagged_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </figure>
        )}
      </section>
    </div>
  );
}
