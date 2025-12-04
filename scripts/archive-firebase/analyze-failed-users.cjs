const fs = require('fs');

// Load reports
const migrationResults = JSON.parse(fs.readFileSync('migration-reports/04-live-migration-results.json', 'utf-8'));
const extractedUsers = JSON.parse(fs.readFileSync('migration-reports/01-firebase-users-extracted.json', 'utf-8'));

// Get all failed user IDs
const failedResults = migrationResults.results.filter(r => !r.success);

// Build a map of Firebase users by ID
const usersMap = new Map(extractedUsers.users.map(u => [u.firebaseId, u]));

// Analyze failed users
const failedPhoneStrategy = [];
const failedEmailStrategy = [];

failedResults.forEach(result => {
  const user = usersMap.get(result.firebaseId);
  if (!user) return;

  const analysis = {
    firebaseId: result.firebaseId,
    strategy: result.strategy,
    error: result.error,
    hasEmail: !!user.email && user.email.trim() !== '',
    hasPhone: !!user.phone && user.phone.trim() !== '',
    email: user.email,
    phone: user.phone
  };

  if (result.strategy === 'phone') {
    failedPhoneStrategy.push(analysis);
  } else {
    failedEmailStrategy.push(analysis);
  }
});

// Count phone strategy failures with email
const phoneFailsWithEmail = failedPhoneStrategy.filter(u => u.hasEmail);
const phoneFailsNoEmail = failedPhoneStrategy.filter(u => !u.hasEmail);

console.log('='.repeat(60));
console.log('Failed Migration Analysis');
console.log('='.repeat(60));
console.log();
console.log('Email Strategy Failures:', failedEmailStrategy.length);
console.log('  Breakdown:');
failedEmailStrategy.forEach(u => {
  console.log(`    ${u.firebaseId}: ${u.error}`);
  console.log(`      Email: ${u.email}, Phone: ${u.phone}`);
});
console.log();
console.log('Phone Strategy Failures:', failedPhoneStrategy.length);
console.log(`  With email backup: ${phoneFailsWithEmail.length}`);
console.log(`  Phone only (no email): ${phoneFailsNoEmail.length}`);
console.log();
console.log('Recovery Strategy:');
console.log(`  1. Retry ${phoneFailsWithEmail.length} phone failures using their email addresses`);
console.log(`  2. Fix phone format and retry ${phoneFailsNoEmail.length} phone-only users`);
console.log(`  3. Manual review ${failedEmailStrategy.length} email strategy failures`);
console.log();
console.log('Sample phone failures WITH email (can retry via email):');
phoneFailsWithEmail.slice(0, 5).forEach(u => {
  console.log(`  ${u.firebaseId}:`);
  console.log(`    Email: ${u.email}`);
  console.log(`    Phone: ${u.phone}`);
  console.log(`    Error: ${u.error}`);
});
console.log();
console.log('Sample phone-only failures (need phone fix):');
phoneFailsNoEmail.slice(0, 5).forEach(u => {
  console.log(`  ${u.firebaseId}:`);
  console.log(`    Phone: ${u.phone}`);
  console.log(`    Error: ${u.error}`);
});

// Save detailed analysis
fs.writeFileSync('migration-reports/07-failed-users-analysis.json', JSON.stringify({
  emailStrategyFailures: failedEmailStrategy,
  phoneStrategyFailuresWithEmail: phoneFailsWithEmail,
  phoneStrategyFailuresNoEmail: phoneFailsNoEmail,
  summary: {
    total: failedResults.length,
    emailStrategyFails: failedEmailStrategy.length,
    phoneWithEmailBackup: phoneFailsWithEmail.length,
    phoneOnlyNoEmail: phoneFailsNoEmail.length
  }
}, null, 2));

console.log();
console.log('✅ Detailed analysis saved to: migration-reports/07-failed-users-analysis.json');
