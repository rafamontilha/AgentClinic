import { NextRequest } from "next/server";
import { getDb } from "@/src/db/client";
import { requireAuth } from "@/src/lib/auth";
import { getVisitById } from "@/src/db/repositories/visits";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAuth(req);
  if (denied) return denied;

  const { id } = await params;
  const visit = getVisitById(getDb(), id);
  if (!visit) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json(visit);
}
