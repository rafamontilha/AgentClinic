import { vi } from "vitest";

export interface MockTriageResponse {
  severity: 1 | 2 | 3 | 4;
  diagnoses: Array<{ ailment_code: string; confidence: number }>;
}

export interface MockPrescriptionResponse {
  prescriptions: Array<{ treatment_code: string; rationale: string }>;
}

export function mockLlmTriage(response: MockTriageResponse) {
  const { callTriage } = vi.hoisted(() => ({ callTriage: vi.fn() }));
  vi.mock("@/src/lib/llm", () => ({
    callTriage,
    callPrescription: vi.fn().mockResolvedValue({ prescriptions: [] }),
  }));
  callTriage.mockResolvedValue(response);
  return callTriage;
}

export function setupLlmMocks(
  triage: MockTriageResponse,
  prescription: MockPrescriptionResponse
) {
  vi.mock("@/src/lib/llm", () => ({
    callTriage: vi.fn().mockResolvedValue(triage),
    callPrescription: vi.fn().mockResolvedValue(prescription),
  }));
}
