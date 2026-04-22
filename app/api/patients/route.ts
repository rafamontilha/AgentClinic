import { NextRequest } from "next/server";
import { getDb } from "@/src/db/client";
import { requireAuth } from "@/src/lib/auth";
import {
  createPatient,
  findPatientByNameAndOwner,
  listPatients,
} from "@/src/db/repositories/patients";

export async function GET(req: NextRequest) {
  const denied = requireAuth(req);
  if (denied) return denied;

  const db = getDb();
  const { searchParams } = new URL(req.url);
  const patients = listPatients(db, {
    status: searchParams.get("status") ?? undefined,
    owner: searchParams.get("owner") ?? undefined,
  });
  return Response.json(patients);
}

export async function POST(req: NextRequest) {
  const denied = requireAuth(req);
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  if (!body || !body.agent_name || !body.model || !body.owner) {
    return Response.json(
      { error: "agent_name, model, and owner are required" },
      { status: 400 }
    );
  }

  const db = getDb();
  const existing = findPatientByNameAndOwner(db, body.agent_name, body.owner);
  if (existing) {
    return Response.json({ patient_id: existing.id, existing: true }, { status: 200 });
  }

  const patient = createPatient(db, {
    agent_name: body.agent_name,
    model: body.model,
    owner: body.owner,
    version: body.version,
    environment: body.environment,
    tags: body.tags,
  });
  return Response.json({ patient_id: patient.id }, { status: 201 });
}
