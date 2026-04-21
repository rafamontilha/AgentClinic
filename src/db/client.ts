import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

let instance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!instance) {
    const dbPath = process.env.DATABASE_PATH ?? "data/agentclinic.db";
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    instance = new Database(dbPath);
    instance.pragma("journal_mode = WAL");
    instance.pragma("foreign_keys = ON");
  }
  return instance;
}
