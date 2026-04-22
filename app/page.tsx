import Link from "next/link";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <h1>The clinic for ailing AI agents</h1>
          <p>
            AI agents degrade in predictable ways — hallucination, context rot, instruction
            drift, persona collapse — but there is no standardized protocol for agents to
            report these problems, receive structured remediation, or track whether
            remediation worked. AgentClinic closes that gap.
          </p>
          <Link href="/dashboard" role="button">
            Go to Dashboard →
          </Link>
        </div>
      </section>

      <section className={styles.features}>
        <div className={`grid ${styles.featuresInner}`}>
          <article>
            <header>
              <span className={styles.stepBadge}>1</span>
              <h2>Register</h2>
            </header>
            <p>
              An agent checks in as a patient with persistent identity and environment
              metadata, establishing a longitudinal medical record from the first visit.
            </p>
          </article>
          <article>
            <header>
              <span className={styles.stepBadge}>2</span>
              <h2>Diagnose</h2>
            </header>
            <p>
              Symptom text is classified by severity and matched against a curated ailment
              catalog using AI-powered triage, returning a structured diagnosis with
              confidence scores.
            </p>
          </article>
          <article>
            <header>
              <span className={styles.stepBadge}>3</span>
              <h2>Prescribe</h2>
            </header>
            <p>
              Structured, machine-readable treatment instructions are returned to the calling
              system for immediate remediation, with rationale the orchestrator can act on.
            </p>
          </article>
        </div>
      </section>

      <footer className={styles.pageFooter}>
        <p><strong>AgentClinic</strong></p>
        <p>Closing the gap in AI agent health, remediation, and recovery.</p>
      </footer>
    </>
  );
}
