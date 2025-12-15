import { resolveCname } from "dns/promises";
import path from "path";
import {
  SESClient,
  GetIdentityDkimAttributesCommand,
  GetIdentityVerificationAttributesCommand,
} from "@aws-sdk/client-ses";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function checkSESDkim() {
  const region = process.env.AWS_REGION || "us-east-1";
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const domain = "foodshare.club";

  if (!accessKeyId || !secretAccessKey) {
    console.error(
      "Error: AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY) not found in environment variables."
    );
    process.exit(1);
  }

  console.log(`Checking SES Identity for: ${domain} (Region: ${region})`);

  const client = new SESClient({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  try {
    // Check Verification Status
    const verificationCommand = new GetIdentityVerificationAttributesCommand({
      Identities: [domain],
    });
    const verificationResponse = await client.send(verificationCommand);
    const verificationAttributes = verificationResponse.VerificationAttributes?.[domain];

    if (!verificationAttributes) {
      console.log(`No verification attributes found for ${domain}. Is it added to SES?`);
    } else {
      console.log(`\nVerification Status: ${verificationAttributes.VerificationStatus}`);
    }

    // Check DKIM Attributes
    const dkimCommand = new GetIdentityDkimAttributesCommand({
      Identities: [domain],
    });
    const dkimResponse = await client.send(dkimCommand);
    const dkimAttributes = dkimResponse.DkimAttributes?.[domain];

    if (!dkimAttributes) {
      console.log(`No DKIM attributes found for ${domain}.`);
    } else {
      console.log(`DKIM Enabled: ${dkimAttributes.DkimEnabled}`);
      console.log(`DKIM Verification Status: ${dkimAttributes.DkimVerificationStatus}`);
      console.log("\nDKIM Tokens (CNAME Selectors):");

      if (dkimAttributes.DkimTokens && dkimAttributes.DkimTokens.length > 0) {
        dkimAttributes.DkimTokens.forEach((token) => {
          console.log(`- ${token}`);
          console.log(`  Record Name:   ${token}._domainkey.${domain}`);
          console.log(`  Record Values: ${token}.dkim.amazonses.com`);
        });

        // Verify DNS records using 'dig' for each token
        console.log("\nVerifying DNS Records...");

        for (const token of dkimAttributes.DkimTokens) {
          const recordName = `${token}._domainkey.${domain}`;
          try {
            // Check for regular record
            let output = "";
            try {
              const records = await resolveCname(recordName);
              output = records[0] || "";
            } catch {
              // Ignore not found
            }

            // Check for double-domain record (common error)
            let doubleDomainOutput = "";
            try {
              const records = await resolveCname(`${recordName}.${domain}`);
              doubleDomainOutput = records[0] || "";
            } catch {
              // Ignore not found
            }

            console.log(`\nRecord: ${recordName}`);
            if (output) {
              console.log(`  ✅ Found: ${output}`);
              if (
                output === `${token}.dkim.amazonses.com` ||
                output === `${token}.dkim.amazonses.com.`
              ) {
                console.log("  ✅ Value matches AWS expectation.");
              } else {
                console.log(`  ⚠️ Value mismatch! Expected ${token}.dkim.amazonses.com`);
              }
            } else {
              console.log("  ❌ Not Found");
            }

            if (doubleDomainOutput) {
              console.log(`  🚨 FOUND DOUBLE DOMAIN ERROR at: ${recordName}.${domain}`);
              console.log(`     Value: ${doubleDomainOutput}`);
            }
          } catch {
            console.log(`  Error checking DNS for ${recordName}`);
          }
        }
      } else {
        console.log("No DKIM tokens found.");
      }
    }
  } catch (error) {
    console.error("Error fetching SES identity attributes:", error);
  }
}

checkSESDkim();
