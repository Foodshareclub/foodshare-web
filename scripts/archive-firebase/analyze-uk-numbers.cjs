const fs = require('fs');

// Load reports
const failedAnalysis = JSON.parse(fs.readFileSync('migration-reports/07-failed-users-analysis.json', 'utf-8'));
const extractedUsers = JSON.parse(fs.readFileSync('migration-reports/01-firebase-users-extracted.json', 'utf-8'));

// Build a map of Firebase users by ID
const usersMap = new Map(extractedUsers.users.map(u => [u.firebaseId, u]));

// Get users with +07 phone numbers (UK mobile pattern)
const ukPatternUsers = failedAnalysis.phoneStrategyFailuresNoEmail
  .filter(f => f.phone && f.phone.startsWith('+07'))
  .map(f => {
    const user = usersMap.get(f.firebaseId);
    return {
      firebaseId: f.firebaseId,
      phone: f.phone,
      firstName: user?.firstName || '',
      secondName: user?.secondName || '',
      nickname: user?.nickname || '',
      fullName: `${user?.firstName || ''} ${user?.secondName || ''}`.trim()
    };
  });

console.log('='.repeat(80));
console.log('Analysis of +07... Phone Numbers (UK Mobile Pattern)');
console.log('='.repeat(80));
console.log();
console.log(`Total users with +07 pattern: ${ukPatternUsers.length}`);
console.log();

// Analyze name origins
const germanNames = [];
const russianNames = [];
const ukNames = [];
const otherNames = [];

ukPatternUsers.forEach(user => {
  const fullName = user.fullName.toLowerCase();
  const firstName = user.firstName.toLowerCase();

  // Check for Cyrillic characters (Russian/Eastern European)
  if (/[\u0400-\u04FF]/.test(user.firstName + user.secondName)) {
    russianNames.push(user);
  }
  // Common German name patterns
  else if (
    /^(hans|franz|werner|klaus|dieter|jürgen|günter|helmut|horst|manfred)/i.test(firstName) ||
    /(müller|schmidt|schneider|fischer|weber|meyer|wagner|becker|schulz|hoffmann)$/i.test(user.secondName)
  ) {
    germanNames.push(user);
  }
  // Common UK name patterns
  else if (
    /^(james|john|robert|michael|william|david|richard|thomas|charles|daniel)/i.test(firstName) ||
    /(smith|jones|williams|brown|taylor|davies|wilson|evans|thomas|johnson)$/i.test(user.secondName)
  ) {
    ukNames.push(user);
  }
  else {
    otherNames.push(user);
  }
});

console.log('Name Analysis:');
console.log(`  Russian/Cyrillic names:  ${russianNames.length}`);
console.log(`  German names:            ${germanNames.length}`);
console.log(`  UK names:                ${ukNames.length}`);
console.log(`  Other/Unknown:           ${otherNames.length}`);
console.log();

console.log('Sample Russian/Cyrillic names (likely NOT UK users):');
russianNames.slice(0, 10).forEach(u => {
  console.log(`  ${u.phone} - ${u.firstName} ${u.secondName}`);
});

if (germanNames.length > 0) {
  console.log();
  console.log('Sample German names (likely NOT UK users):');
  germanNames.slice(0, 10).forEach(u => {
    console.log(`  ${u.phone} - ${u.firstName} ${u.secondName}`);
  });
}

if (ukNames.length > 0) {
  console.log();
  console.log('Sample UK names (possibly actual UK users):');
  ukNames.slice(0, 10).forEach(u => {
    console.log(`  ${u.phone} - ${u.firstName} ${u.secondName}`);
  });
}

console.log();
console.log('Sample Other names:');
otherNames.slice(0, 10).forEach(u => {
  console.log(`  ${u.phone} - ${u.firstName} ${u.secondName}`);
});

console.log();
console.log('='.repeat(80));
console.log('Conclusion:');
if (russianNames.length + germanNames.length > ukNames.length * 2) {
  console.log('✅ MAJORITY appear to be NON-UK users with incorrect phone format');
  console.log('   Recommendation: Convert +07 to +49 (Germany) or +7 (Russia) based on name');
} else {
  console.log('⚠️  MIXED population - needs manual review');
  console.log('   Some may be actual UK users, others have incorrect format');
}
console.log('='.repeat(80));
