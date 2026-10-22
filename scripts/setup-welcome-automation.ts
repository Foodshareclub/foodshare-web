/**
 * Script to run quickSetupWelcomeAutomation
 * Run with: bun scripts/setup-welcome-automation.ts
 */

// The barrel re-exports the actions a page needs; this one is not among
// them, so the module that has it is imported directly.
import { quickSetupWelcomeAutomation } from "../src/app/actions/automations/setup-welcome-flow";

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
