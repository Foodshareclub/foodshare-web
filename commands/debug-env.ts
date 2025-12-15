import path from "path";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

function debugEnv() {
  const keyId = process.env.AWS_ACCESS_KEY_ID;
  const secret = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION;

  console.log("--- AWS Credentials Debug ---");

  if (keyId) {
    console.log(`AWS_ACCESS_KEY_ID:`);
    console.log(`  Length: ${keyId.length}`);
    console.log(`  Starts with: '${keyId.slice(0, 4)}'`);
    console.log(`  Ends with: '${keyId.slice(-4)}'`);
    console.log(`  Has whitespace? ${/\s/.test(keyId)}`);
  } else {
    console.log("AWS_ACCESS_KEY_ID: Not found");
  }

  if (secret) {
    console.log(`AWS_SECRET_ACCESS_KEY:`);
    console.log(`  Length: ${secret.length}`);
    console.log(`  Starts with: '${secret.slice(0, 2)}...'`);
    console.log(`  Ends with: '...${secret.slice(-2)}'`);
    console.log(`  Has whitespace? ${/\s/.test(secret)}`);
    console.log(`  Has quotes? ${/['"]/.test(secret)}`);
  } else {
    console.log("AWS_SECRET_ACCESS_KEY: Not found");
  }

  console.log(`AWS_REGION: ${region || "Not found"}`);
}

debugEnv();
