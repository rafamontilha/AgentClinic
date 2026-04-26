import { describe, it, expect, vi, beforeEach } from "vitest";
import { AgentClinicClient, AgentClinicError } from "../src/index";

const BASE_URL = "https://api.agentclinic.test";
const API_KEY = "test-api-key";

function makeClient() {
  return new AgentClinicClient({ baseUrl: BASE_URL, apiKey: API_KEY });
}

type FetchMock = ReturnType<typeof vi.fn>;

function mockFetch(status: number, body: unknown): FetchMock {
  const mock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("AgentClinicClient.register", () => {
  it("sends POST /api/patients with correct body and returns patient_id", async () => {
    const fetchMock = mockFetch(201, { patient_id: "p-123" });
    const client = makeClient();

    const result = await client.register({ agent_name: "TestBot", model: "gpt-4", owner: "tester" });

    expect(result.patient_id).toBe("p-123");
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
    expect(url).toBe(`${BASE_URL}/api/patients`);
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body as string)).toMatchObject({ agent_name: "TestBot", model: "gpt-4", owner: "tester" });
    expect(opts.headers.Authorization).toBe(`Bearer ${API_KEY}`);
  });
});

describe("AgentClinicClient.getPatient", () => {
  it("sends GET /api/patients/:id and returns patient", async () => {
    const patient = { id: "p-123", agent_name: "TestBot", model: "gpt-4", owner: "tester", status: "active", created_at: 1000, updated_at: 1000 };
    const fetchMock = mockFetch(200, patient);
    const client = makeClient();

    const result = await client.getPatient("p-123");

    expect(result.id).toBe("p-123");
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
    expect(url).toBe(`${BASE_URL}/api/patients/p-123`);
    expect(opts.method).toBe("GET");
    expect(opts.headers.Authorization).toBe(`Bearer ${API_KEY}`);
  });
});

describe("AgentClinicClient.submitVisit", () => {
  it("sends POST /api/visits and returns visit with diagnoses and prescriptions", async () => {
    const visit = {
      visit: { id: "v-001", patient_id: "p-123", symptoms: "test", status: "AWAITING_FOLLOWUP", severity: 2, recurrence_flag: 0, created_at: 1000, updated_at: 1000 },
      diagnoses: [{ id: "d-1", visit_id: "v-001", ailment_code: "HAL-001", confidence: 0.85, is_primary: 1 }],
      prescriptions: [{ id: "rx-1", visit_id: "v-001", treatment_code: "TRT-004", rationale: "test", sequence: 0 }],
    };
    const fetchMock = mockFetch(201, visit);
    const client = makeClient();

    const result = await client.submitVisit({ patient_id: "p-123", symptoms_text: "hallucinating" });

    expect(result.diagnoses.length).toBeGreaterThan(0);
    expect(result.prescriptions.length).toBeGreaterThan(0);
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE_URL}/api/visits`);
    expect(opts.method).toBe("POST");
  });
});

describe("AgentClinicClient.submitFollowup", () => {
  it("sends POST /api/visits/:id/followup with outcome and returns updated visit", async () => {
    const visit = {
      visit: { id: "v-001", patient_id: "p-123", symptoms: "test", status: "RESOLVED", severity: 2, recurrence_flag: 0, created_at: 1000, updated_at: 1000 },
      diagnoses: [],
      prescriptions: [],
    };
    const fetchMock = mockFetch(200, visit);
    const client = makeClient();

    const result = await client.submitFollowup("v-001", "RESOLVED");

    expect(result.visit.status).toBe("RESOLVED");
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE_URL}/api/visits/v-001/followup`);
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body as string)).toEqual({ outcome: "RESOLVED" });
  });
});

describe("AgentClinicError", () => {
  it("is thrown with correct status and code on 401 response", async () => {
    mockFetch(401, { error: "unauthorized", message: "Missing API key" });
    const client = makeClient();

    await expect(client.register({ agent_name: "x", model: "m", owner: "o" })).rejects.toMatchObject({
      status: 401,
      code: "unauthorized",
    });
  });

  it("is thrown with correct status and code on 429 response", async () => {
    mockFetch(429, { error: "rate_limit_exceeded", retry_after_seconds: 60 });
    const client = makeClient();

    await expect(client.submitVisit({ patient_id: "p", symptoms_text: "x" })).rejects.toMatchObject({
      status: 429,
      code: "rate_limit_exceeded",
    });
  });

  it("is an instance of AgentClinicError", async () => {
    mockFetch(401, { error: "unauthorized" });
    const client = makeClient();

    try {
      await client.getPatient("x");
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(AgentClinicError);
    }
  });
});

describe("Authorization header", () => {
  it("is set on every request", async () => {
    const fetchMock = mockFetch(200, { id: "p-123", agent_name: "TestBot", model: "gpt-4", owner: "tester", status: "active", created_at: 1000, updated_at: 1000 });
    const client = makeClient();

    await client.getPatient("p-123");

    const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
    expect(opts.headers.Authorization).toBe(`Bearer ${API_KEY}`);
  });
});
