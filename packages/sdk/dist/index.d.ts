export declare class AgentClinicError extends Error {
    status: number;
    code: string;
    constructor(status: number, code: string, message: string);
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
export declare class AgentClinicClient {
    private baseUrl;
    private apiKey;
    constructor({ baseUrl, apiKey }: {
        baseUrl: string;
        apiKey: string;
    });
    private request;
    register(params: RegisterParams): Promise<{
        patient_id: string;
    }>;
    getPatient(id: string): Promise<Patient>;
    submitVisit(params: SubmitVisitParams): Promise<Visit>;
    getVisit(id: string): Promise<Visit>;
    submitFollowup(visitId: string, outcome: "RESOLVED" | "PARTIAL" | "FAILED"): Promise<Visit>;
}
