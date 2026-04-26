import { NextRequest } from "next/server";
import { getDb } from "@/src/db/client";
import { requireAuth } from "@/src/lib/auth";
import { getVisitById } from "@/src/db/repositories/visits";
import { processFollowup } from "@/src/services/visit-pipeline";

const VALID_OUTCOMES = ["RESOLVED", "PARTIAL", "FAILED"] as const;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAuth(req);
  if (denied) return denied;

  const { id } = await params;
  const db = getDb();

  const record = getVisitById(db, id);
  if (!record) return Response.json({ error: "not_found" }, { status: 404 });
  if (record.visit.status !== "AWAITING_FOLLOWUP") {
    return Response.json(
      { error: "visit_not_awaiting_followup", status: record.visit.status },
      { status: 409 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || !VALID_OUTCOMES.includes(body.outcome)) {
    return Response.json(
      { error: "outcome must be one of: RESOLVED, PARTIAL, FAILED" },
      { status: 400 }
    );
  }

  await processFollowup(db, id, { outcome: body.outcome, notes: body.notes });
  const updated = getVisitById(db, id);
  return Response.json(updated);
}
