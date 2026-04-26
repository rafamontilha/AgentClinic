import Anthropic from "@anthropic-ai/sdk";

export class LLMParseError extends Error {
  constructor(message: string, public readonly raw: string) {
    super(message);
    this.name = "LLMParseError";
  }
}

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

function extractJson(text: string): string {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new LLMParseError("No JSON object found in LLM response", text);
  return match[0];
}

export function parseTriage(text: string): TriageResult {
  let data: Partial<TriageResult>;
  try {
    data = JSON.parse(extractJson(text)) as Partial<TriageResult>;
  } catch (e) {
    if (e instanceof LLMParseError) throw e;
    throw new LLMParseError(`Failed to parse triage JSON: ${(e as Error).message}`, text);
  }
  if (!([1, 2, 3, 4] as unknown[]).includes(data.severity)) {
    throw new LLMParseError(`Invalid severity value: ${String(data.severity)}`, text);
  }
  if (!Array.isArray(data.diagnoses) || data.diagnoses.length === 0) {
    throw new LLMParseError("diagnoses must be a non-empty array", text);
  }
  return data as TriageResult;
}

export function parsePrescription(text: string): PrescriptionResult {
  let data: Partial<PrescriptionResult>;
  try {
    data = JSON.parse(extractJson(text)) as Partial<PrescriptionResult>;
  } catch (e) {
    if (e instanceof LLMParseError) throw e;
    throw new LLMParseError(`Failed to parse prescription JSON: ${(e as Error).message}`, text);
  }
  if (!Array.isArray(data.prescriptions)) {
    throw new LLMParseError("prescriptions must be an array", text);
  }
  return data as PrescriptionResult;
}

export async function callTriage(
  symptomsText: string,
  ailmentCodes: string[]
): Promise<TriageResult> {
  const model = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-7";
  const systemText = `You are a medical triage system for AI agents.

Available ailment codes: ${ailmentCodes.join(", ")}

Respond with a JSON object only:
{
  "severity": <1-4, where 1=mild, 4=critical>,
  "diagnoses": [{ "ailment_code": "<code>", "confidence": <0.0-1.0> }]
}

Order diagnoses by confidence descending. Include only relevant ailments.`;

  const response = await getClient().messages.create({
    model,
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: systemText,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Symptom report: "${symptomsText}"`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  return parseTriage(text);
}

export async function callPrescription(
  ailmentCode: string,
  treatmentCodes: string[],
  patientHistory: string
): Promise<PrescriptionResult> {
  const model = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-7";
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
  return parsePrescription(text);
}
