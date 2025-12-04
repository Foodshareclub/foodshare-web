const fs = require('fs');

// Load reports
const failedAnalysis = JSON.parse(fs.readFileSync('migration-reports/07-failed-users-analysis.json', 'utf-8'));
const extractedUsers = JSON.parse(fs.readFileSync('migration-reports/01-firebase-users-extracted.json', 'utf-8'));

// Build a map of Firebase users by ID
const usersMap = new Map(extractedUsers.users.map(u => [u.firebaseId, u]));

// Get users with +07 phone numbers
const ukPatternUsers = failedAnalysis.phoneStrategyFailuresNoEmail
  .filter(f => f.phone && f.phone.startsWith('+07'))
  .map(f => {
    const user = usersMap.get(f.firebaseId);
    return {
      firebaseId: f.firebaseId,
      phone: f.phone,
      firstName: user?.firstName || '',
      secondName: user?.secondName || '',
      fullName: `${user?.firstName || ''} ${user?.secondName || ''}`.trim()
    };
  });

console.log('='.repeat(80));
console.log('Detailed Analysis: +07... Phone Numbers');
console.log('='.repeat(80));
console.log();

// Check if names are Western/UK-like
const hasCyrillic = (str) => /[\u0400-\u04FF]/.test(str);
const hasGermanChars = (str) => /[äöüßÄÖÜ]/.test(str);
const looksWestern = (name) => {
  return !hasCyrillic(name) && /^[a-zA-Z\s\-']+$/.test(name);
};

const western = ukPatternUsers.filter(u => looksWestern(u.fullName));
const cyrillic = ukPatternUsers.filter(u => hasCyrillic(u.fullName));
const german = ukPatternUsers.filter(u => hasGermanChars(u.fullName));
const other = ukPatternUsers.filter(u => !looksWestern(u.fullName) && !hasCyrillic(u.fullName) && !hasGermanChars(u.fullName));

console.log(`Total users with +07 pattern: ${ukPatternUsers.length}`);
console.log();
console.log('Name Character Analysis:');
console.log(`  Western alphabet only:   ${western.length} (likely UK users)`);
console.log(`  Cyrillic characters:     ${cyrillic.length} (Russian/Eastern European)`);
console.log(`  German characters:       ${german.length} (German)`);
console.log(`  Other/Empty:             ${other.length}`);
console.log();

// Analyze UK mobile number validity
// UK mobile: +44 7xxx xxxxxx (starts with 7, then 9 more digits)
console.log('UK Mobile Number Format Check:');
console.log('If we convert +07... to +447..., do they look valid?');
console.log();

const validUKFormat = [];
const invalidUKFormat = [];

ukPatternUsers.forEach(u => {
  // Remove +07 prefix and check remaining digits
  const remaining = u.phone.substring(3);

  // UK mobile should be 9 digits after the '7'
  if (/^\d{9,10}$/.test(remaining)) {
    validUKFormat.push({ ...u, fixedPhone: '+44' + u.phone.substring(2) });
  } else {
    invalidUKFormat.push(u);
  }
});

console.log(`  Would be valid UK mobile format: ${validUKFormat.length}`);
console.log(`  Would be invalid format:         ${invalidUKFormat.length}`);
console.log();

console.log('Sample conversions (+07... → +447...):');
validUKFormat.slice(0, 15).forEach(u => {
  console.log(`  ${u.phone} → ${u.fixedPhone} | ${u.fullName}`);
});

console.log();
console.log('='.repeat(80));
console.log('📊 VERDICT:');
console.log('='.repeat(80));

const percentage = ((western.length / ukPatternUsers.length) * 100).toFixed(1);
console.log(`✅ ${western.length} out of ${ukPatternUsers.length} (${percentage}%) have Western names`);
console.log(`✅ ${validUKFormat.length} would have valid UK mobile format if converted`);
console.log();
console.log('RECOMMENDATION:');
console.log('These appear to be ACTUAL UK USERS with phone numbers missing the "44"');
console.log('They entered: +07... (incorrect)');
console.log('Should be:    +447... (correct UK mobile)');
console.log();
console.log('Suggested fix: Convert +07... to +447...');
console.log('='.repeat(80));

// Save conversion list
const conversionList = validUKFormat.map(u => ({
  firebaseId: u.firebaseId,
  originalPhone: u.phone,
  fixedPhone: u.fixedPhone,
  firstName: u.firstName,
  secondName: u.secondName
}));

fs.writeFileSync('migration-reports/08-uk-phone-conversions.json', JSON.stringify({
  total: conversionList.length,
  conversions: conversionList
}, null, 2));

console.log();
console.log('✅ Conversion list saved to: migration-reports/08-uk-phone-conversions.json');
