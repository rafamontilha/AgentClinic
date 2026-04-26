import crypto from "crypto";

export function checkPassword(submitted: string, expected: string): boolean {
  if (!expected) return false;
  // Hash both sides to make them equal length before timingSafeEqual
  const a = crypto.createHash("sha256").update(submitted).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}
