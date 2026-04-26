import { NextRequest } from "next/server";

export function requireAuth(req: NextRequest): Response | null {
  const key = process.env.AGENTCLINIC_API_KEY;
  if (!key) return null;

  const auth = req.headers.get("authorization");
  if (!auth || auth !== `Bearer ${key}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}
