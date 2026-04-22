import type Database from "better-sqlite3";
import { expireOldVisits } from "@/src/db/repositories/visits";

export function runExpireVisits(db: Database.Database, followupWindowHours: number): number {
  const expired = expireOldVisits(db, followupWindowHours);
  if (expired > 0) {
    console.log(`[expire-visits] Expired ${expired} visit(s).`);
  }
  return expired;
}
