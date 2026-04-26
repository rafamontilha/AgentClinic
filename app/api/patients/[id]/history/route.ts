import { NextRequest } from "next/server";
import { getDb } from "@/src/db/client";
import { requireAuth } from "@/src/lib/auth";
import { getPatientById, getPatientVisitHistory } from "@/src/db/repositories/patients";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAuth(req);
  if (denied) return denied;

  const { id } = await params;
  const db = getDb();
  if (!getPatientById(db, id)) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  const visits = getPatientVisitHistory(db, id, limit, offset);
  return Response.json({ patient_id: id, visits, limit, offset });
}
