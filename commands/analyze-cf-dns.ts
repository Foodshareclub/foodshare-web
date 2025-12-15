import path from "path";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const DOMAIN = "foodshare.club";

if (!ZONE_ID || !TOKEN) {
  console.error("Error: CLOUDFLARE_ZONE_ID or CLOUDFLARE_API_TOKEN not found in environment.");
  process.exit(1);
}

async function checkCloudflareDNS() {
  console.log("Fetching DNS records from Cloudflare...");
  try {
    interface DNSRecord {
      id: string;
      type: string;
      name: string;
      content: string;
      proxied: boolean;
    }

    interface CloudflareDNSResponse {
      success: boolean;
      errors: unknown[];
      result: DNSRecord[];
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?per_page=100`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = (await response.json()) as CloudflareDNSResponse;

    if (!data.success) {
      console.error("Failed to fetch records:", data.errors);
      return;
    }

    const records = data.result;
    console.log(`Found ${records.length} records.`);

    // specific AWS SES check
    const awsRecords = records.filter(
      (r: DNSRecord) =>
        (r.content && r.content.includes("amazonses.com")) ||
        (r.name && r.name.includes("_domainkey"))
    );

    console.log("\n--- AWS SES / DKIM Record Analysis ---");

    if (awsRecords.length === 0) {
      console.log("No AWS SES or DKIM-related records found.");
    }

    awsRecords.forEach((r: DNSRecord) => {
      let status = "✅ OK";
      const isDoubleDomain = r.name.includes(`${DOMAIN}.${DOMAIN}`);
      const isProxied = r.proxied;

      // AWS SES CNAMEs usually end in .dkim.amazonses.com
      const isAwsCname = r.type === "CNAME" && r.content.includes("dkim.amazonses.com");

      if (isDoubleDomain) {
        status = "❌ ERROR: Double Domain";
      } else if (isAwsCname && isProxied) {
        status = "❌ ERROR: Proxied (Orange Cloud)";
      } else if (isAwsCname && !r.name.endsWith(`_domainkey.${DOMAIN}`)) {
        // This checks if it's formatted roughly right,
        // but double domain check above is more specific
      }

      console.log(`\nID: ${r.id}`);
      console.log(`Type: ${r.type}`);
      console.log(`Name: ${r.name}`);
      console.log(`Content: ${r.content}`);
      console.log(`Proxied: ${r.proxied}`);
      console.log(`Status: ${status}`);

      if (status.includes("ERROR")) {
        // Attempt to fix
        console.log(`--> NEEDS FIXING`);
      }
    });
  } catch (e: unknown) {
    console.error("Error:", (e as Error).message || String(e));
  }
}

checkCloudflareDNS();

export {};
