import { NextRequest } from "next/server";
import { getDb } from "@/src/db/client";
import { requireAuth } from "@/src/lib/auth";
import { getPatientById } from "@/src/db/repositories/patients";
import { listVisits } from "@/src/db/repositories/visits";
import { runVisitPipeline } from "@/src/services/visit-pipeline";

export async function GET(req: NextRequest) {
  const denied = requireAuth(req);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const visits = listVisits(getDb(), {
    patient_id: searchParams.get("patient_id") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    ailment_code: searchParams.get("ailment_code") ?? undefined,
  });
  return Response.json(visits);
}

export async function POST(req: NextRequest) {
  const denied = requireAuth(req);
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  if (!body || !body.patient_id || !body.symptoms_text) {
    return Response.json(
      { error: "patient_id and symptoms_text are required" },
      { status: 400 }
    );
  }

  const db = getDb();
  if (!getPatientById(db, body.patient_id)) {
    return Response.json({ error: "patient_not_found" }, { status: 404 });
  }

  const result = await runVisitPipeline(db, {
    patient_id: body.patient_id,
    symptoms_text: body.symptoms_text,
  });

  if (result.type === "rate_limited") {
    return Response.json(
      { error: "rate_limit_exceeded", retry_after_seconds: result.retry_after_seconds },
      { status: 429 }
    );
  }

  return Response.json(result.visit, { status: 201 });
}
