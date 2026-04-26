import { NextRequest } from "next/server";
import { getDb } from "@/src/db/client";
import { requireAuth } from "@/src/lib/auth";
import { getAilmentByCode } from "@/src/db/repositories/ailments";

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const denied = requireAuth(req);
  if (denied) return denied;

  const { code } = await params;
  const ailment = getAilmentByCode(getDb(), code);
  if (!ailment) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json(ailment);
}
