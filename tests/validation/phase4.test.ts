import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { sessionOptions } from "@/src/lib/session";
import { config } from "@/middleware";

// ─── 1. Session options ────────────────────────────────────────────────────────

describe("Phase 4 — session options", () => {
  it("cookieName is agentclinic_session", () => {
    expect(sessionOptions.cookieName).toBe("agentclinic_session");
  });

  it("httpOnly is true", () => {
    expect(sessionOptions.cookieOptions?.httpOnly).toBe(true);
  });

  it("maxAge is 28800 seconds (8 hours)", () => {
    expect(sessionOptions.cookieOptions?.maxAge).toBe(28800);
  });

  it("sameSite is lax", () => {
    expect(sessionOptions.cookieOptions?.sameSite).toBe("lax");
  });
});

// ─── 2. Middleware config ──────────────────────────────────────────────────────

describe("Phase 4 — middleware config", () => {
  it("middleware.ts exists at project root", () => {
    const p = path.resolve(__dirname, "../../middleware.ts");
    expect(fs.existsSync(p)).toBe(true);
  });

  it("matcher includes /dashboard/:path*", () => {
    expect(config.matcher).toContain("/dashboard/:path*");
  });

  it("matcher does not include /api/", () => {
    expect(config.matcher.join(",")).not.toContain("/api/");
  });

  it("matcher does not include /login", () => {
    expect(config.matcher.join(",")).not.toContain("/login");
  });
});

// ─── 3. SESSION_SECRET startup warning ────────────────────────────────────────

describe("Phase 4 — SESSION_SECRET startup warning", () => {
  it("instrumentation.ts contains a SESSION_SECRET console.warn", () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../src/instrumentation.ts"),
      "utf-8"
    );
    expect(src).toContain("SESSION_SECRET");
    expect(src).toContain("console.warn");
  });
});

// ─── 4. Login + logout routes exist ───────────────────────────────────────────

describe("Phase 4 — route files", () => {
  it("app/login/page.tsx exists", () => {
    expect(fs.existsSync(path.resolve(__dirname, "../../app/login/page.tsx"))).toBe(true);
  });

  it("app/login/page.tsx contains a password input", () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../app/login/page.tsx"),
      "utf-8"
    );
    expect(src).toContain('type="password"');
  });

  it("app/logout/route.ts exists", () => {
    expect(fs.existsSync(path.resolve(__dirname, "../../app/logout/route.ts"))).toBe(true);
  });

  it("app/logout/route.ts deletes the session cookie", () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../app/logout/route.ts"),
      "utf-8"
    );
    expect(src).toContain("agentclinic_session");
  });
});

// ─── 5. NavMenu contains Sign out link ────────────────────────────────────────

describe("Phase 4 — NavMenu", () => {
  it("NavMenu.tsx includes a Sign out link pointing to /logout", () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../app/components/NavMenu.tsx"),
      "utf-8"
    );
    expect(src).toContain("/logout");
    expect(src).toContain("Sign out");
  });
});
