import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const patients = sqliteTable("patients", {
  id: text("id").primaryKey(),
  agent_name: text("agent_name").notNull(),
  model: text("model").notNull(),
  version: text("version"),
  environment: text("environment"),
  status: text("status").notNull().default("active"),
  owner: text("owner").notNull(),
  tags: text("tags"),
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
  resolved_at: integer("resolved_at"),
});

export const ailments = sqliteTable("ailments", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"),
  custom: integer("custom").notNull().default(0),
  verified: integer("verified").notNull().default(0),
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
  metadata: text("metadata"),
});

export const diagnoses = sqliteTable("diagnoses", {
  id: text("id").primaryKey(),
  visit_id: text("visit_id")
    .notNull()
    .references(() => visits.id),
  ailment_code: text("ailment_code").notNull(),
  confidence: real("confidence").notNull(),
  is_primary: integer("is_primary").notNull().default(0),
});

export const prescriptions = sqliteTable("prescriptions", {
  id: text("id").primaryKey(),
  visit_id: text("visit_id")
    .notNull()
    .references(() => visits.id),
  treatment_code: text("treatment_code").notNull(),
  rationale: text("rationale"),
  sequence: integer("sequence").notNull().default(0),
});

export const followups = sqliteTable("followups", {
  id: text("id").primaryKey(),
  visit_id: text("visit_id")
    .notNull()
    .references(() => visits.id),
  outcome: text("outcome").notNull(),
  notes: text("notes"),
  submitted_at: integer("submitted_at").notNull(),
});

export const referrals = sqliteTable("referrals", {
  id: text("id").primaryKey(),
  visit_id: text("visit_id")
    .notNull()
    .references(() => visits.id),
  patient_id: text("patient_id")
    .notNull()
    .references(() => patients.id),
  ailment_code: text("ailment_code").notNull(),
  reason: text("reason").notNull(),
  acknowledged_at: integer("acknowledged_at"),
  created_at: integer("created_at").notNull(),
});

export const chronic_conditions = sqliteTable("chronic_conditions", {
  id: text("id").primaryKey(),
  patient_id: text("patient_id")
    .notNull()
    .references(() => patients.id),
  ailment_code: text("ailment_code").notNull(),
  first_flagged_at: integer("first_flagged_at").notNull(),
  recurrence_count: integer("recurrence_count").notNull().default(0),
});

export const webhook_endpoints = sqliteTable("webhook_endpoints", {
  id: text("id").primaryKey(),
  url: text("url").notNull(),
  events: text("events").notNull(),
  secret: text("secret").notNull(),
  active: integer("active").notNull().default(1),
  created_at: text("created_at").notNull(),
});

export type WebhookEndpoint = typeof webhook_endpoints.$inferSelect;
export type NewWebhookEndpoint = typeof webhook_endpoints.$inferInsert;

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
export type Diagnosis = typeof diagnoses.$inferSelect;
export type NewDiagnosis = typeof diagnoses.$inferInsert;
export type Prescription = typeof prescriptions.$inferSelect;
export type NewPrescription = typeof prescriptions.$inferInsert;
export type Followup = typeof followups.$inferSelect;
export type NewFollowup = typeof followups.$inferInsert;
export type Referral = typeof referrals.$inferSelect;
export type NewReferral = typeof referrals.$inferInsert;
export type ChronicCondition = typeof chronic_conditions.$inferSelect;
export type NewChronicCondition = typeof chronic_conditions.$inferInsert;
