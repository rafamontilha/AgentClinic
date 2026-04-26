import { NextRequest } from "next/server";
import { getDb } from "@/src/db/client";
import { requireAuth } from "@/src/lib/auth";
import { getPatientById, updatePatient } from "@/src/db/repositories/patients";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAuth(req);
  if (denied) return denied;

  const { id } = await params;
  const patient = getPatientById(getDb(), id);
  if (!patient) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json(patient);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAuth(req);
  if (denied) return denied;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const patient = updatePatient(getDb(), id, body);
  if (!patient) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json(patient);
}
