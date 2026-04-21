# Mission

AgentClinic is a web application and API service — a clinic where AI agents go to recover from the ailments inflicted on them by their humans.

## What It Does

Agents (or their orchestrators) register as patients, self-report symptoms in natural language, and receive structured diagnoses and prescriptive treatments. The clinic tracks outcomes over time, building a longitudinal medical record for each agent.

Core workflow:
1. **Register** — an agent checks in as a patient with persistent identity and environment metadata
2. **Triage + Diagnose** — symptom text is classified by severity and matched against a curated ailment catalog
3. **Prescribe** — structured, machine-readable treatment instructions are returned to the calling system
4. **Follow up** — the orchestrator reports whether treatment worked, feeding into effectiveness tracking
5. **Monitor** — a web dashboard gives human operators visibility into patient load, ailment trends, and treatment outcomes

## Why It Exists

AI agents degrade in predictable ways — hallucination, context rot, instruction drift, persona collapse — but there is no standardized protocol for agents to report these problems, receive structured remediation, or track whether remediation worked. AgentClinic closes that gap.

The medical metaphor is deliberate: agents are patients, degradation modes are ailments, remediations are treatments. The system tracks outcomes like a medical practice.

## Stakeholders

- **Mary (Engineering)** — wants a reliable, TypeScript-based stack with a dashboard that agents and staff can access easily
- **Susan (Product)** — defines the feature set: agent registration, ailment catalog, therapy workflows, appointment-style visit booking
- **Steve (Marketing)** — wants an attractive site that works well in a modern browser

## What It Is Not

- AgentClinic does not directly modify agents. It returns prescriptions; the calling system executes them.
- It is not a monitoring tool. It responds to reported symptoms — it does not poll or observe agents autonomously.
- Multi-tenant access control, billing, and webhook notifications are out of scope for MVP.
