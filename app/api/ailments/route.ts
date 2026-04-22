import { NextRequest } from "next/server";
import { getDb } from "@/src/db/client";
import { requireAuth } from "@/src/lib/auth";
import { listAilments, createAilment } from "@/src/db/repositories/ailments";

export async function GET(req: NextRequest) {
  const denied = requireAuth(req);
  if (denied) return denied;
  return Response.json(listAilments(getDb()));
}

export async function POST(req: NextRequest) {
  const denied = requireAuth(req);
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  if (!body || !body.name) {
    return Response.json({ error: "name is required" }, { status: 400 });
  }

  const ailment = createAilment(getDb(), {
    name: body.name,
    description: body.description,
    category: body.category,
    code: body.code,
  });
  return Response.json(ailment, { status: 201 });
}
