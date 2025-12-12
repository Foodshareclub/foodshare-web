import { Database } from "duckdb-async";

async function testMotherDuck() {
  console.log("Testing MotherDuck connection...");
  try {
    const token = process.env.MOTHERDUCK_TOKEN;
    if (!token) {
      throw new Error("MOTHERDUCK_TOKEN not found in env");
    }

    // In a real app we'd use the vault, but for this quick test script we might need to manually set it
    // or rely on the vault code if we can run it in context.
    // For now, let's assume I can get the token from the vault using the existing code.

    // However, I can't easily run the vault code in isolation without a full nextjs context usually.
    // Let's rely on the token I just inserted.

    const db = await Database.create(`md:?motherduck_token=${token}`);
    const rows = await db.all("SELECT 1 as val");
    console.log("Connection successful:", rows);
  } catch (err) {
    console.error("Connection failed:", err);
  }
}

// Note: This script is just a placeholder to show intent.
// I'll actually create a proper server-side utility in the next steps.
