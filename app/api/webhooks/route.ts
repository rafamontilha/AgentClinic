import { NextRequest } from "next/server";
import { v4 as uuid } from "uuid";
import { getDb } from "@/src/db/client";
import { requireAuth } from "@/src/lib/auth";

const VALID_EVENTS = ["visit_created", "visit_resolved", "referral_created", "chronic_flagged"];

export async function POST(req: NextRequest) {
  const denied = requireAuth(req);
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "invalid_body" }, { status: 400 });

  if (!body.url || !String(body.url).startsWith("https://")) {
    return Response.json({ error: "url must start with https://" }, { status: 400 });
  }

  if (!Array.isArray(body.events) || body.events.length === 0) {
    return Response.json({ error: "events must be a non-empty array" }, { status: 400 });
  }

  const invalidEvent = (body.events as unknown[]).find(
    (e) => !VALID_EVENTS.includes(e as string)
  );
  if (invalidEvent !== undefined) {
    return Response.json({ error: `unknown event: ${String(invalidEvent)}` }, { status: 400 });
  }

  if (!body.secret || typeof body.secret !== "string" || body.secret.trim() === "") {
    return Response.json({ error: "secret must be a non-empty string" }, { status: 400 });
  }

  const db = getDb();
  const id = uuid();
  const created_at = new Date().toISOString();

  db.prepare(
    "INSERT INTO webhook_endpoints (id, url, events, secret, active, created_at) VALUES (?, ?, ?, ?, 1, ?)"
  ).run(id, String(body.url), JSON.stringify(body.events), String(body.secret), created_at);

  const endpoint = db.prepare("SELECT * FROM webhook_endpoints WHERE id = ?").get(id);
  return Response.json(endpoint, { status: 201 });
}

export async function GET(req: NextRequest) {
  const denied = requireAuth(req);
  if (denied) return denied;

  const db = getDb();
  const endpoints = db.prepare("SELECT * FROM webhook_endpoints").all();
  return Response.json(endpoints);
}
