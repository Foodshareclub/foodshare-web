/**
 * Script to run quickSetupWelcomeAutomation
 * Run with: npx tsx scripts/setup-welcome-automation.ts
 */

import { quickSetupWelcomeAutomation } from "../src/app/actions/automations";

async function main() {
  console.log("🚀 Setting up Welcome Automation with Tester Recruitment...\n");

  const result = await quickSetupWelcomeAutomation();

  if (result.success) {
    console.log("✅ SUCCESS!\n");
    console.log("📧 Templates:");
    console.log(`   Created: ${result.data.templates.created}`);
    console.log(`   Updated: ${result.data.templates.updated}`);
    if (result.data.templates.errors.length > 0) {
      console.log(`   Errors: ${result.data.templates.errors.join(", ")}`);
    }
    console.log("\n🤖 Automation:");
    console.log(`   ID: ${result.data.automation.id}`);
    console.log(`   Name: ${result.data.automation.name}`);
    console.log(`   Status: ${result.data.automation.status}`);
  } else {
    console.log("❌ FAILED!\n");
    console.log(`Error: ${result.error.message}`);
    if (result.error.code) {
      console.log(`Code: ${result.error.code}`);
    }
  }
}

main().catch(console.error);
