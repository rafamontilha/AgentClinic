import { NextRequest } from "next/server";
import { getDb } from "@/src/db/client";
import { requireAuth } from "@/src/lib/auth";
import { getTreatmentByCode } from "@/src/db/repositories/treatments";

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const denied = requireAuth(req);
  if (denied) return denied;

  const { code } = await params;
  const treatment = getTreatmentByCode(getDb(), code);
  if (!treatment) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json(treatment);
}
