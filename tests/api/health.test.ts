import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("returns HTTP 200", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
  });

  it("returns exactly { status: 'ok' }", async () => {
    const res = await GET();
    const body = await res.json();
    expect(body).toStrictEqual({ status: "ok" });
  });

  it("Content-Type is application/json", async () => {
    const res = await GET();
    expect(res.headers.get("content-type")).toContain("application/json");
  });
});
