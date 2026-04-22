import type Database from "better-sqlite3";
import { v4 as uuid } from "uuid";

export interface AilmentRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  custom: number;
  verified: number;
  created_at: number;
}

export function listAilments(db: Database.Database): AilmentRow[] {
  return db.prepare("SELECT * FROM ailments ORDER BY code").all() as AilmentRow[];
}

export function getAilmentByCode(
  db: Database.Database,
  code: string
): AilmentRow | undefined {
  return db.prepare("SELECT * FROM ailments WHERE code = ?").get(code) as AilmentRow | undefined;
}

export function createCustomAilment(
  db: Database.Database,
  name: string,
  description?: string,
  category?: string
): AilmentRow {
  const id = uuid();
  const code = `CUSTOM-${id.slice(0, 8).toUpperCase()}`;
  const now = Date.now();
  db.prepare(
    `INSERT INTO ailments (id, code, name, description, category, custom, verified, created_at)
     VALUES (?, ?, ?, ?, ?, 1, 0, ?)`
  ).run(id, code, name, description ?? null, category ?? null, now);
  return db.prepare("SELECT * FROM ailments WHERE id = ?").get(id) as AilmentRow;
}

export function createAilment(
  db: Database.Database,
  input: { name: string; description?: string; category?: string; code?: string }
): AilmentRow {
  const id = uuid();
  const code = input.code ?? `CUSTOM-${id.slice(0, 8).toUpperCase()}`;
  const now = Date.now();
  db.prepare(
    `INSERT INTO ailments (id, code, name, description, category, custom, verified, created_at)
     VALUES (?, ?, ?, ?, ?, 1, 0, ?)`
  ).run(id, code, input.name, input.description ?? null, input.category ?? null, now);
  return db.prepare("SELECT * FROM ailments WHERE id = ?").get(id) as AilmentRow;
}

export function verifyAilment(db: Database.Database, code: string): void {
  db.prepare("UPDATE ailments SET verified = 1 WHERE code = ?").run(code);
}
