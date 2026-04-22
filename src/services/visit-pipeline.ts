import type Database from "better-sqlite3";
import { callTriage, callPrescription } from "@/src/lib/llm";
import { eventBus } from "@/src/lib/event-bus";
import { listAilments, createCustomAilment } from "@/src/db/repositories/ailments";
import { getTreatmentsForAilment, updateEffectivenessScore } from "@/src/db/repositories/treatments";
import {
  countVisitsInLastHour,
  checkRecurrence,
  createVisitWithPipeline,
  createReferral,
  submitFollowup,
  getVisitById,
  type SubmitFollowupData,
} from "@/src/db/repositories/visits";

const CONFIDENCE_THRESHOLD = 0.4;
const OUTCOME_WEIGHTS = { RESOLVED: 1.0, PARTIAL: 0.5, FAILED: 0.0 } as const;

export interface RunVisitInput {
  patient_id: string;
  symptoms_text: string;
  followup_window_hours?: number;
  rate_limit?: number;
}

export interface RunVisitResult {
  type: "rate_limited" | "success";
  retry_after_seconds?: number;
  visit?: ReturnType<typeof getVisitById>;
}

export async function runVisitPipeline(
  db: Database.Database,
  input: RunVisitInput
): Promise<RunVisitResult> {
  const rateLimit = input.rate_limit ?? parseInt(process.env.RATE_LIMIT_VISITS_PER_HOUR ?? "10");
  const { exceeded, retry_after_seconds } = countVisitsInLastHour(db, input.patient_id, rateLimit);
  if (exceeded) return { type: "rate_limited", retry_after_seconds };

  // LLM Call 1: triage + diagnosis
  const ailments = listAilments(db);
  const ailmentCodes = ailments.map((a) => a.code);
  const triageResult = await callTriage(input.symptoms_text, ailmentCodes);

  const sorted = [...triageResult.diagnoses].sort((a, b) => b.confidence - a.confidence);
  let primaryDiagnosis = sorted[0];

  // Auto-create custom ailment if no match reaches threshold
  if (!primaryDiagnosis || primaryDiagnosis.confidence < CONFIDENCE_THRESHOLD) {
    const customAilment = createCustomAilment(db, `Unknown ailment — ${input.symptoms_text.slice(0, 40)}`);
    primaryDiagnosis = { ailment_code: customAilment.code, confidence: 0 };
    sorted.unshift(primaryDiagnosis);
  }

  // Recurrence check
  const isRecurrence = checkRecurrence(db, input.patient_id, primaryDiagnosis.ailment_code);

  // LLM Call 2: prescription
  const candidateTreatments = getTreatmentsForAilment(db, primaryDiagnosis.ailment_code);
  const treatmentCodes = candidateTreatments.map((t) => t.treatment_code);

  const prescriptionResult = await callPrescription(
    primaryDiagnosis.ailment_code,
    treatmentCodes,
    `patient_id=${input.patient_id}`
  );

  const followupHours =
    input.followup_window_hours ??
    parseInt(process.env.FOLLOWUP_WINDOW_HOURS ?? "72");

  const record = createVisitWithPipeline(db, {
    patient_id: input.patient_id,
    symptoms: input.symptoms_text,
    severity: triageResult.severity,
    recurrence_flag: isRecurrence,
    diagnoses: sorted.map((d, i) => ({
      ailment_code: d.ailment_code,
      confidence: d.confidence,
      is_primary: i === 0,
    })),
    prescriptions: prescriptionResult.prescriptions.map((p, i) => ({
      treatment_code: p.treatment_code,
      rationale: p.rationale,
      sequence: i,
    })),
    followup_window_hours: followupHours,
  });

  // Referral if no treatments available
  if (candidateTreatments.length === 0) {
    const referral = createReferral(
      db,
      record.visit.id,
      input.patient_id,
      primaryDiagnosis.ailment_code,
      "no_treatments_available"
    );
    eventBus.emit("referral_created", { referral_id: referral.id });
  }

  eventBus.emit("visit_created", { visit_id: record.visit.id });

  return { type: "success", visit: record };
}

export async function processFollowup(
  db: Database.Database,
  visit_id: string,
  data: SubmitFollowupData
): Promise<void> {
  const result = submitFollowup(db, visit_id, data);

  // Update effectiveness scores for all prescribed treatments
  const visit = getVisitById(db, visit_id);
  if (!visit) return;

  const primaryDiagnosis = visit.diagnoses.find((d) => d.is_primary === 1);
  if (primaryDiagnosis) {
    const weight = OUTCOME_WEIGHTS[data.outcome] ?? 0;
    for (const p of visit.prescriptions) {
      updateEffectivenessScore(db, primaryDiagnosis.ailment_code, p.treatment_code, weight);
    }
  }

  eventBus.emit("visit_resolved", { visit_id, resolved_at: result.resolved_at });
}
