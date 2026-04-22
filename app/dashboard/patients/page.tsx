import Link from "next/link";
import { getDb } from "@/src/db/client";
import { listPatients } from "@/src/db/repositories/patients";

export default function PatientsPage() {
  const patients = listPatients(getDb(), {});

  return (
    <div className="container-page">
      <h1>Patients</h1>
      {patients.length === 0 ? (
        <p>No patients registered yet.</p>
      ) : (
        <figure>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Model</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Registered</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id}>
                  <td>{p.agent_name}</td>
                  <td>{p.model}</td>
                  <td>{p.owner}</td>
                  <td>{p.status}</td>
                  <td>{new Date(p.created_at).toLocaleDateString()}</td>
                  <td>
                    <Link href={`/dashboard/patients/${p.id}`}>View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </figure>
      )}
    </div>
  );
}
