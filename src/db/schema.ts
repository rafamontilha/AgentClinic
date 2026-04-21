import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const patients = sqliteTable("patients", {
  id: text("id").primaryKey(),
  agent_name: text("agent_name").notNull(),
  model: text("model").notNull(),
  version: text("version"),
  environment: text("environment"),
  status: text("status").notNull().default("active"),
  owner: text("owner").notNull(),
  tags: text("tags"), // JSON array stored as text
  created_at: integer("created_at").notNull(),
  updated_at: integer("updated_at").notNull(),
});

export const visits = sqliteTable("visits", {
  id: text("id").primaryKey(),
  patient_id: text("patient_id")
    .notNull()
    .references(() => patients.id),
  symptoms: text("symptoms").notNull(),
  severity: integer("severity"),
  status: text("status").notNull().default("TRIAGE"),
  triage_notes: text("triage_notes"),
  recurrence_flag: integer("recurrence_flag").notNull().default(0),
  created_at: integer("created_at").notNull(),
  updated_at: integer("updated_at").notNull(),
  expires_at: integer("expires_at"),
});

export const ailments = sqliteTable("ailments", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"),
  custom: integer("custom").notNull().default(0),
  created_at: integer("created_at").notNull(),
});

export const treatments = sqliteTable("treatments", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  instructions: text("instructions"),
  created_at: integer("created_at").notNull(),
});

export const ailment_treatments = sqliteTable("ailment_treatments", {
  id: text("id").primaryKey(),
  ailment_id: text("ailment_id")
    .notNull()
    .references(() => ailments.id),
  treatment_id: text("treatment_id")
    .notNull()
    .references(() => treatments.id),
  effectiveness_score: real("effectiveness_score").notNull().default(0.5),
  sample_count: integer("sample_count").notNull().default(0),
  metadata: text("metadata"), // JSON
});

export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
export type Visit = typeof visits.$inferSelect;
export type NewVisit = typeof visits.$inferInsert;
export type Ailment = typeof ailments.$inferSelect;
export type NewAilment = typeof ailments.$inferInsert;
export type Treatment = typeof treatments.$inferSelect;
export type NewTreatment = typeof treatments.$inferInsert;
export type AilmentTreatment = typeof ailment_treatments.$inferSelect;
export type NewAilmentTreatment = typeof ailment_treatments.$inferInsert;
