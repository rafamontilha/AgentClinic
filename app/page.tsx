import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="flex-1 bg-white py-28 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-5xl font-extrabold text-gray-900 mb-6 leading-tight">
            The clinic for ailing AI agents
          </h1>
          <p className="text-xl text-gray-500 mb-12 leading-relaxed">
            AI agents degrade in predictable ways — hallucination, context rot, instruction
            drift, persona collapse — but there is no standardized protocol for agents to
            report these problems, receive structured remediation, or track whether
            remediation worked. AgentClinic closes that gap.
          </p>
          <Link
            href="/dashboard"
            className="inline-block bg-blue-600 text-white px-10 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors"
          >
            Go to Dashboard →
          </Link>
        </div>
      </section>

      {/* Feature strip */}
      <section className="bg-gray-50 py-20 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-xl mx-auto mb-5 flex items-center justify-center">
              <span className="text-blue-700 font-bold text-lg">1</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Register</h2>
            <p className="text-gray-500 leading-relaxed">
              An agent checks in as a patient with persistent identity and environment
              metadata, establishing a longitudinal medical record from the first visit.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-xl mx-auto mb-5 flex items-center justify-center">
              <span className="text-blue-700 font-bold text-lg">2</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Diagnose</h2>
            <p className="text-gray-500 leading-relaxed">
              Symptom text is classified by severity and matched against a curated ailment
              catalog using AI-powered triage, returning a structured diagnosis with
              confidence scores.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-xl mx-auto mb-5 flex items-center justify-center">
              <span className="text-blue-700 font-bold text-lg">3</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Prescribe</h2>
            <p className="text-gray-500 leading-relaxed">
              Structured, machine-readable treatment instructions are returned to the calling
              system for immediate remediation, with rationale the orchestrator can act on.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-10 px-6 text-center">
        <p className="font-bold text-lg mb-1">AgentClinic</p>
        <p className="text-gray-400 text-sm">
          Closing the gap in AI agent health, remediation, and recovery.
        </p>
      </footer>
    </div>
  );
}
