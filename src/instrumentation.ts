export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getDb } = await import("./db/client");
    const { runMigrations } = await import("./db/migrate");
    const { runSeed } = await import("./db/seed");

    const db = getDb();
    runMigrations(db);
    runSeed(db);
  }
}
