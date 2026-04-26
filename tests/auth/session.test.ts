import { describe, expect, it } from "vitest";
import { sessionOptions } from "@/src/lib/session";

describe("sessionOptions", () => {
  it("uses the correct cookie name", () => {
    expect(sessionOptions.cookieName).toBe("agentclinic_session");
  });

  it("sets httpOnly to true", () => {
    expect(sessionOptions.cookieOptions?.httpOnly).toBe(true);
  });

  it("sets maxAge to 8 hours (28800 seconds)", () => {
    expect(sessionOptions.cookieOptions?.maxAge).toBe(28800);
  });

  it("sets sameSite to lax", () => {
    expect(sessionOptions.cookieOptions?.sameSite).toBe("lax");
  });

  it("has a boolean secure flag (false in test env, true in production)", () => {
    // secure is derived from NODE_ENV at module load; in test env it is false
    expect(typeof sessionOptions.cookieOptions?.secure).toBe("boolean");
  });
});
