import path from "path";
import { Resend } from "resend";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function checkResendDNS() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("Error: RESEND_API_KEY not found in environment.");
    return;
  }

  console.log("Checking Resend configuration...");
  const resend = new Resend(apiKey);

  try {
    const { data: domains, error } = await resend.domains.list();

    if (error) {
      console.error("Error fetching Resend domains:", error);
      return;
    }

    if (!domains || domains.data.length === 0) {
      console.log("No domains found in Resend.");
      return;
    }

    for (const domain of domains.data) {
      console.log(`\nDomain: ${domain.name} (ID: ${domain.id})`);
      console.log(`Status: ${domain.status}`);
      console.log(`Region: ${domain.region}`);

      // Get specific domain details to see DNS records
      const { data: domainDetails } = await resend.domains.get(domain.id);

      if (domainDetails && domainDetails.records) {
        console.log("Expected DNS Records:");
        domainDetails.records.forEach(
          (record: { record: string; name: string; value: string; status?: string }) => {
            console.log(`  - Type: ${record.record}, Name: ${record.name}, Value: ${record.value}`);
            if (record.status) console.log(`    Status: ${record.status}`);
          }
        );
      }
    }
  } catch (e) {
    console.error("Exception checking Resend:", e);
  }
}

checkResendDNS();
