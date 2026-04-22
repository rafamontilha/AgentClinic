import { NextRequest } from "next/server";
import { getDb } from "@/src/db/client";
import { requireAuth } from "@/src/lib/auth";
import { getPatientAnalytics } from "@/src/db/repositories/analytics";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAuth(req);
  if (denied) return denied;

  const { id } = await params;
  return Response.json(getPatientAnalytics(getDb(), id));
}
