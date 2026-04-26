import { NextRequest } from "next/server";
import { getDb } from "@/src/db/client";
import { requireAuth } from "@/src/lib/auth";
import { getAilmentAnalytics } from "@/src/db/repositories/analytics";

export async function GET(req: NextRequest) {
  const denied = requireAuth(req);
  if (denied) return denied;
  return Response.json(getAilmentAnalytics(getDb()));
}
