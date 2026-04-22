import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

export interface TriageResult {
  severity: 1 | 2 | 3 | 4;
  diagnoses: Array<{ ailment_code: string; confidence: number }>;
}

export interface PrescriptionResult {
  prescriptions: Array<{ treatment_code: string; rationale: string }>;
}

function parseJson<T>(text: string): T {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object found in LLM response");
  return JSON.parse(match[0]) as T;
}

export async function callTriage(
  symptomsText: string,
  ailmentCodes: string[]
): Promise<TriageResult> {
  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";
  const response = await getClient().messages.create({
    model,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are a medical triage system for AI agents.

Symptom report: "${symptomsText}"

Available ailment codes: ${ailmentCodes.join(", ")}

Respond with a JSON object only:
{
  "severity": <1-4, where 1=mild, 4=critical>,
  "diagnoses": [{ "ailment_code": "<code>", "confidence": <0.0-1.0> }]
}

Order diagnoses by confidence descending. Include only relevant ailments.`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  return parseJson<TriageResult>(text);
}

export async function callPrescription(
  ailmentCode: string,
  treatmentCodes: string[],
  patientHistory: string
): Promise<PrescriptionResult> {
  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";
  const response = await getClient().messages.create({
    model,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are a medical prescription system for AI agents.

Primary ailment: ${ailmentCode}
Patient history summary: ${patientHistory}
Available treatments: ${treatmentCodes.join(", ")}

Respond with a JSON object only:
{
  "prescriptions": [{ "treatment_code": "<code>", "rationale": "<explanation>" }]
}

Order by recommended priority.`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  return parseJson<PrescriptionResult>(text);
}
