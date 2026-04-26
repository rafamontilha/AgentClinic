export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn("AGENTCLINIC: ANTHROPIC_API_KEY is not set — visit pipeline will return 503");
    }
    if (!process.env.SESSION_SECRET) {
      console.warn("AGENTCLINIC: SESSION_SECRET is not set — dashboard auth is disabled");
    }

    const { getDb } = await import("./db/client");
    const { runMigrations } = await import("./db/migrate");
    const { runSeed } = await import("./db/seed");
    const { runExpireVisits } = await import("./jobs/expire-visits");
    const { runFlagChronics } = await import("./jobs/flag-chronics");
    const { initWebhookDelivery } = await import("./lib/webhook-delivery");

    const db = getDb();
    runMigrations(db);
    runSeed(db);
    initWebhookDelivery();

    const followupWindowHours = parseInt(process.env.FOLLOWUP_WINDOW_HOURS ?? "72");
    const expireIntervalMinutes = parseInt(process.env.EXPIRE_CHECK_INTERVAL_MINUTES ?? "15");

    setInterval(
      () => {
        runExpireVisits(db, followupWindowHours);
        runFlagChronics(db);
      },
      expireIntervalMinutes * 60 * 1000
    );
  }
}
