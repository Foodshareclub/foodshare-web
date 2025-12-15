import path from "path";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
// This is the ID of the stale record 'mxvvlievaqh5doewgtbxgkzfn7zvxu6w' found in previous analysis
// I need to be sure about the ID. I will fetch it first to be safe.
const STALE_RECORD_NAME_PART = "mxvvlievaqh5doewgtbxgkzfn7zvxu6w";

if (!ZONE_ID || !TOKEN) {
  console.error("Error: CLOUDFLARE_ZONE_ID or CLOUDFLARE_API_TOKEN not found in environment.");
  process.exit(1);
}

interface CloudflareRecord {
  id: string;
  name: string;
  content: string;
}

interface CloudflareListResponse {
  result: CloudflareRecord[];
}

interface CloudflareDeleteResponse {
  success: boolean;
  errors: unknown[];
}

async function deleteStaleRecord() {
  console.log(`Searching for stale record containing: ${STALE_RECORD_NAME_PART}...`);

  try {
    const listResponse = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=${STALE_RECORD_NAME_PART}._domainkey.foodshare.club`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    const listResult = (await listResponse.json()) as CloudflareListResponse;

    if (listResult.result && listResult.result.length > 0) {
      const record = listResult.result[0];
      console.log(`Found record ID: ${record.id}`);
      console.log(`Name: ${record.name}`);
      console.log(`Content: ${record.content}`);

      if (record.name.includes(STALE_RECORD_NAME_PART)) {
        console.log("\nDeleting record...");

        const deleteResponse = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${record.id}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${TOKEN}`,
              "Content-Type": "application/json",
            },
          }
        );

        const deleteResult = (await deleteResponse.json()) as CloudflareDeleteResponse;

        if (deleteResult.success) {
          console.log("✅ Successfully deleted the stale DKIM record.");
        } else {
          console.error("❌ Failed to delete:", deleteResult.errors);
        }
      } else {
        console.log("⚠️ Mismatch sanity check. Aborting delete.");
      }
    } else {
      console.log("ℹ️ Record not found. Maybe it was already deleted?");
    }
  } catch (e: unknown) {
    console.error("Error:", (e as Error).message || String(e));
  }
}

deleteStaleRecord();

export {};
