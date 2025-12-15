import path from "path";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const EMAIL = "contact@foodshare.club"; // Default contact email

if (!ZONE_ID || !TOKEN) {
  console.error("Error: CLOUDFLARE_ZONE_ID or CLOUDFLARE_API_TOKEN not found in environment.");
  process.exit(1);
}

// DMARC Record:
// v=DMARC1;      -> Version
// p=none;        -> Policy (none = monitor only, don't reject yet)
// sp=none;       -> Subdomain Policy (none)
// rua=mailto:... -> Report URI (where to send daily reports)
const RECORD_CONTENT = `v=DMARC1; p=none; sp=none; rua=mailto:${EMAIL}`;

async function addDmarcRecord() {
  try {
    console.log("Adding DMARC record to Cloudflare...");

    const data = {
      type: "TXT",
      name: "_dmarc", // Cloudflare automatically appends domain
      content: RECORD_CONTENT,
      ttl: 3600,
      proxied: false,
    };

    interface CloudflareResponse {
      success: boolean;
      errors?: { code: number; message: string }[];
    }

    // Execute fetch
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }
    );

    const result = (await response.json()) as CloudflareResponse;

    if (result.success) {
      console.log("\n✅ DMARC Record Added Successfully!");
      console.log(`Name: _dmarc.foodshare.club`);
      console.log(`Content: ${RECORD_CONTENT}`);
      console.log(
        "This sets policy to 'none' (monitoring mode), which satisfies AWS requirements without risking email delivery."
      );
    } else {
      console.error("\n❌ Failed to add record:");
      if (result.errors?.[0]?.code === 81057) {
        console.error("  Error: Record already exists.");
      } else {
        console.error(result.errors);
      }
    }
  } catch (e: unknown) {
    console.error("Exception:", (e as Error).message || String(e));
  }
}

addDmarcRecord();

export {};
