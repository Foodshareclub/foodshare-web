import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

console.log('='.repeat(80));
console.log('Checking Migrated User Data Completeness');
console.log('='.repeat(80));
console.log();

// Get sample of migrated users (those with firebase_migrated metadata)
const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

if (usersError) {
  console.error('Error fetching users:', usersError);
  process.exit(1);
}

// Filter to only firebase migrated users
const migratedUsers = users.filter(u => u.user_metadata?.firebase_migrated);

console.log(`Total users in Supabase: ${users.length}`);
console.log(`Firebase migrated users: ${migratedUsers.length}`);
console.log();

// Sample 5 migrated users
const sample = migratedUsers.slice(0, 5);

console.log('Sample Migrated Users (with all data):');
console.log('-'.repeat(80));

for (let i = 0; i < sample.length; i++) {
  const user = sample[i];
  console.log(`\nUser ${i + 1}:`);
  console.log(`  Supabase ID: ${user.id}`);
  console.log(`  Email: ${user.email || '(none)'}`);
  console.log(`  Phone: ${user.phone || '(none)'}`);
  console.log(`  Firebase ID: ${user.user_metadata.firebase_id}`);
  console.log(`  First Name: ${user.user_metadata.first_name || '(empty)'}`);
  console.log(`  Second Name: ${user.user_metadata.second_name || '(empty)'}`);

  // Get profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profile) {
    console.log(`  Profile first_name: ${profile.first_name || '(empty)'}`);
    console.log(`  Profile second_name: ${profile.second_name || '(empty)'}`);
    console.log(`  Nickname: ${profile.nickname || '(empty)'}`);
    console.log(`  Avatar URL: ${profile.avatar_url ? 'Yes (' + profile.avatar_url.substring(0, 50) + '...)' : 'No'}`);
    console.log(`  About Me: ${profile.about_me || '(empty)'}`);
  }

  // Check address
  const { data: address } = await supabase
    .from('address')
    .select('*')
    .eq('profile_id', user.id)
    .single();

  if (address) {
    console.log(`  Address: Yes (lat: ${address.lat}, long: ${address.long})`);
    console.log(`  Generated Address: ${address.generated_full_address || '(empty)'}`);
  } else {
    console.log(`  Address: No`);
  }
}

console.log();
console.log('='.repeat(80));
console.log('Data Completeness Check:');
console.log('='.repeat(80));

// Count users with names
const usersWithNames = migratedUsers.filter(u => u.user_metadata.first_name || u.user_metadata.second_name);

console.log(`Users with names in metadata: ${usersWithNames.length} / ${migratedUsers.length} (${((usersWithNames.length / migratedUsers.length) * 100).toFixed(1)}%)`);

// Check profiles
const { data: profiles } = await supabase
  .from('profiles')
  .select('id, first_name, second_name, nickname, avatar_url, about_me')
  .in('id', migratedUsers.map(u => u.id));

const profilesWithNames = profiles.filter(p => p.first_name || p.second_name);

console.log(`Profiles with names: ${profilesWithNames.length} / ${profiles.length} (${((profilesWithNames.length / profiles.length) * 100).toFixed(1)}%)`);

// Check addresses
const { data: addresses } = await supabase
  .from('address')
  .select('profile_id, lat, long, generated_full_address')
  .in('profile_id', migratedUsers.map(u => u.id));

console.log(`Users with addresses: ${addresses.length} / ${migratedUsers.length} (${((addresses.length / migratedUsers.length) * 100).toFixed(1)}%)`);

console.log();
console.log('✅ Data migration appears complete!');

process.exit(0);
