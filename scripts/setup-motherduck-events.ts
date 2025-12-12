import * as dotenv from "dotenv";
import { MotherDuckService } from "../src/lib/analytics/motherduck";

// Load env vars
dotenv.config();

async function setupEventsTable() {
  console.log("Setting up MotherDuck events table...");

  try {
    // Ensure we can connect (this will use the vault logic effectively or env vars if we run locally)
    // Note: Since this is a script running outside Next.js, we might need to rely on env vars
    // or manually mocking the vault return if strictly relying on vault.
    // Ideally, for scripts, we expect MOTHERDUCK_TOKEN to be in .env for local administration.

    if (!process.env.MOTHERDUCK_TOKEN) {
      console.warn(
        "Table setup might fail if Vault is not accessible from this script context. Ensure MOTHERDUCK_TOKEN is in .env"
      );
    }

    const ddl = `
      CREATE TABLE IF NOT EXISTS events (
        id UUID,
        event_name VARCHAR,
        user_id VARCHAR,
        properties JSON,
        timestamp TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await MotherDuckService.runQuery(ddl);
    console.log("✅ Table 'events' created successfully.");

    // Create an index on timestamp for faster time-series queries
    // await MotherDuckService.runQuery("CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp)");
    // console.log("✅ Index created.");
  } catch (error) {
    console.error("❌ Failed to setup table:", error);
    process.exit(1);
  }
}

// We need to shim the Vault for this script since it runs outside Next.js context mostly
// Or we just rely on the fact that MotherDuckService calls getMotherDuckToken which calls getEmailSecrets
// which checks process.env in development.
setupEventsTable();
