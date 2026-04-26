export class AgentClinicError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "AgentClinicError";
    this.status = status;
    this.code = code;
  }
}

export interface Patient {
  id: string;
  agent_name: string;
  model: string;
  version?: string | null;
  environment?: string | null;
  status: string;
  owner: string;
  tags?: string | null;
  created_at: number;
  updated_at: number;
}

export interface Diagnosis {
  id: string;
  visit_id: string;
  ailment_code: string;
  confidence: number;
  is_primary: number;
}

export interface Prescription {
  id: string;
  visit_id: string;
  treatment_code: string;
  rationale?: string | null;
  sequence: number;
}

export interface Followup {
  id: string;
  visit_id: string;
  outcome: string;
  notes?: string | null;
  submitted_at: number;
}

export interface Visit {
  visit: {
    id: string;
    patient_id: string;
    symptoms: string;
    severity?: number | null;
    status: string;
    triage_notes?: string | null;
    recurrence_flag: number;
    created_at: number;
    updated_at: number;
    expires_at?: number | null;
    resolved_at?: number | null;
  };
  diagnoses: Diagnosis[];
  prescriptions: Prescription[];
}

export interface RegisterParams {
  agent_name: string;
  model: string;
  owner: string;
  version?: string;
  environment?: string;
  tags?: string;
}

export interface SubmitVisitParams {
  patient_id: string;
  symptoms_text: string;
}

export class AgentClinicClient {
  private baseUrl: string;
  private apiKey: string;

  constructor({ baseUrl, apiKey }: { baseUrl: string; apiKey: string }) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
  }

  private async request<T>(path: string, method: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errorCode = (data as { error?: string }).error ?? "unknown";
      throw new AgentClinicError(res.status, errorCode, JSON.stringify(data));
    }
    return data as T;
  }

  register(params: RegisterParams): Promise<{ patient_id: string }> {
    return this.request<{ patient_id: string }>("/api/patients", "POST", params);
  }

  getPatient(id: string): Promise<Patient> {
    return this.request<Patient>(`/api/patients/${id}`, "GET");
  }

  submitVisit(params: SubmitVisitParams): Promise<Visit> {
    return this.request<Visit>("/api/visits", "POST", params);
  }

  getVisit(id: string): Promise<Visit> {
    return this.request<Visit>(`/api/visits/${id}`, "GET");
  }

  submitFollowup(visitId: string, outcome: "RESOLVED" | "PARTIAL" | "FAILED"): Promise<Visit> {
    return this.request<Visit>(`/api/visits/${visitId}/followup`, "POST", { outcome });
  }
}
