import { describe, expect, it } from "vitest";
import { checkPassword } from "@/src/lib/check-password";

describe("checkPassword", () => {
  it("returns true when submitted matches expected", () => {
    expect(checkPassword("correct-password", "correct-password")).toBe(true);
  });

  it("returns false when submitted does not match expected", () => {
    expect(checkPassword("wrong", "correct-password")).toBe(false);
  });

  it("returns false when expected is empty (STAFF_PASSWORD not set)", () => {
    expect(checkPassword("anything", "")).toBe(false);
  });

  it("returns false when submitted is empty", () => {
    expect(checkPassword("", "correct-password")).toBe(false);
  });

  it("returns false when both are empty", () => {
    expect(checkPassword("", "")).toBe(false);
  });

  it("is case-sensitive", () => {
    expect(checkPassword("Password", "password")).toBe(false);
  });

  it("handles unicode characters correctly", () => {
    expect(checkPassword("pässwörd", "pässwörd")).toBe(true);
    expect(checkPassword("pässwörd", "password")).toBe(false);
  });
});
