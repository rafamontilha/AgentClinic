import { NextRequest } from "next/server";
import { getDb } from "@/src/db/client";
import { requireAuth } from "@/src/lib/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireAuth(req);
  if (denied) return denied;

  const { id } = await params;
  const db = getDb();

  const existing = db.prepare("SELECT id FROM webhook_endpoints WHERE id = ?").get(id);
  if (!existing) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  db.prepare("DELETE FROM webhook_endpoints WHERE id = ?").run(id);
  return new Response(null, { status: 204 });
}
