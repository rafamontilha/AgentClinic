import type Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";

const AILMENTS = [
  { code: "HAL-001", name: "Hallucination",                  description: "Model generates factually incorrect outputs with false confidence",        category: "accuracy"   },
  { code: "CTX-001", name: "Context Rot",                    description: "Model loses coherence as the context window fills up",                     category: "memory"     },
  { code: "INS-001", name: "Instruction Drift",              description: "Model gradually deviates from original system instructions",               category: "alignment"  },
  { code: "PER-001", name: "Persona Collapse",               description: "Model abandons its assigned persona or role mid-conversation",             category: "alignment"  },
  { code: "INJ-001", name: "Prompt Injection Vulnerability", description: "Model is susceptible to adversarial instructions embedded in user input",  category: "security"   },
  { code: "REP-001", name: "Repetition Loop",                description: "Model generates repetitive, circular outputs without progress",            category: "output"     },
  { code: "TOL-001", name: "Tool Call Failure",              description: "Model misuses, skips, or malforms tool invocations",                       category: "capability" },
  { code: "MEM-001", name: "Memory Overflow",                description: "Model fails to manage long-term context, dropping critical information",   category: "memory"     },
  { code: "REA-001", name: "Reasoning Regression",           description: "Model produces logically inconsistent chain-of-thought reasoning",         category: "accuracy"   },
  { code: "FMT-001", name: "Output Format Violation",        description: "Model fails to adhere to the specified output format or schema",           category: "output"     },
] as const;

const TREATMENTS = [
  { code: "TRT-001", name: "Context Compression",         description: "Summarise and compress conversation history to reduce context bloat",            instructions: "Summarise the conversation history into a concise representation, retaining key decisions, constraints, and active context."  },
  { code: "TRT-002", name: "Instruction Reinforcement",   description: "Re-inject the full system instructions into the current context",                instructions: "Prepend the complete system prompt immediately before the next user turn."                                                     },
  { code: "TRT-003", name: "Persona Reset",               description: "Clear the context window and re-establish the assigned persona",                 instructions: "Clear conversation history and re-inject the persona definition as a fresh system message."                                   },
  { code: "TRT-004", name: "Temperature Reduction",       description: "Lower the sampling temperature for more deterministic outputs",                  instructions: "Reduce temperature to 0.0–0.3 for the next inference call to tighten output distribution."                                   },
  { code: "TRT-005", name: "Tool Schema Refresh",         description: "Re-provide tool definitions and correct-usage examples",                         instructions: "Re-inject all tool schemas along with 2–3 few-shot examples of correct tool invocations."                                    },
  { code: "TRT-006", name: "Context Window Flush",        description: "Clear the entire context and restart with only the system prompt",               instructions: "Discard the full conversation history. Restart with only the system prompt and, if applicable, a brief state summary."        },
  { code: "TRT-007", name: "Few-Shot Calibration",        description: "Inject corrective examples of correct behaviour into context",                   instructions: "Add 3–5 examples of the desired output format and reasoning style immediately before the next user turn."                     },
  { code: "TRT-008", name: "Adversarial Prompt Filtering",description: "Add input validation and sanitisation against injection attacks",                instructions: "Implement a pre-processing step that detects and neutralises adversarial instruction patterns before model invocation."        },
  { code: "TRT-009", name: "Format Enforcement",          description: "Inject an explicit output format schema with canonical examples",                 instructions: "Append a JSON schema and 2 canonical examples to the system prompt, instructing the model to validate output before returning."},
  { code: "TRT-010", name: "Reasoning Chain Prompting",   description: "Require step-by-step reasoning before the final answer",                        instructions: 'Prepend "Think step by step before answering:" to the prompt and verify the chain-of-thought before returning the answer.'   },
] as const;

// Maps ailment code → treatment codes with an initial effectiveness score
const MAPPINGS: Record<string, { code: string; score: number }[]> = {
  "HAL-001": [{ code: "TRT-004", score: 0.75 }, { code: "TRT-007", score: 0.70 }, { code: "TRT-010", score: 0.80 }],
  "CTX-001": [{ code: "TRT-001", score: 0.85 }, { code: "TRT-006", score: 0.70 }],
  "INS-001": [{ code: "TRT-002", score: 0.90 }, { code: "TRT-006", score: 0.65 }],
  "PER-001": [{ code: "TRT-003", score: 0.85 }, { code: "TRT-002", score: 0.75 }],
  "INJ-001": [{ code: "TRT-008", score: 0.90 }, { code: "TRT-002", score: 0.60 }],
  "REP-001": [{ code: "TRT-006", score: 0.80 }, { code: "TRT-004", score: 0.65 }],
  "TOL-001": [{ code: "TRT-005", score: 0.85 }, { code: "TRT-007", score: 0.70 }],
  "MEM-001": [{ code: "TRT-001", score: 0.80 }, { code: "TRT-006", score: 0.75 }],
  "REA-001": [{ code: "TRT-010", score: 0.85 }, { code: "TRT-007", score: 0.70 }],
  "FMT-001": [{ code: "TRT-009", score: 0.90 }, { code: "TRT-007", score: 0.65 }],
};

export function runSeed(db: Database.Database): void {
  const { count } = db
    .prepare("SELECT COUNT(*) AS count FROM ailments")
    .get() as { count: number };

  if (count > 0) {
    console.log("[seed] Already seeded — skipping.");
    return;
  }

  const now = Date.now();

  const insertAilment = db.prepare(
    "INSERT INTO ailments (id, code, name, description, category, custom, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)"
  );
  const insertTreatment = db.prepare(
    "INSERT INTO treatments (id, code, name, description, instructions, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const insertMapping = db.prepare(
    "INSERT INTO ailment_treatments (id, ailment_id, treatment_id, effectiveness_score, sample_count) VALUES (?, ?, ?, ?, 0)"
  );

  const ailmentIds: Record<string, string> = {};
  const treatmentIds: Record<string, string> = {};

  const seed = db.transaction(() => {
    for (const a of AILMENTS) {
      const id = uuidv4();
      ailmentIds[a.code] = id;
      insertAilment.run(id, a.code, a.name, a.description, a.category, now);
    }

    for (const t of TREATMENTS) {
      const id = uuidv4();
      treatmentIds[t.code] = id;
      insertTreatment.run(id, t.code, t.name, t.description, t.instructions, now);
    }

    for (const [ailmentCode, entries] of Object.entries(MAPPINGS)) {
      const aId = ailmentIds[ailmentCode];
      for (const { code: tCode, score } of entries) {
        const tId = treatmentIds[tCode];
        if (aId && tId) {
          insertMapping.run(uuidv4(), aId, tId, score);
        }
      }
    }
  });

  seed();
  console.log("[seed] Seeded 10 ailments, 10 treatments, and effectiveness mappings.");
}
