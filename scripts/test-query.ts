import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function test() {
  // Test with explicit limit
  const { data, error, count } = await supabase
    .from('posts')
    .select('id', { count: 'exact' })
    .in('post_type', ['fridge', 'foodbank'])
    .or('images.is.null,images.eq.{}')
    .neq('website', '-')
    .neq('website', '')
    .not('website', 'is', null)
    .order('id')
    .limit(500);

  console.log('Returned rows:', data?.length);
  console.log('Total count:', count);
  console.log('Error:', error);
}

test();
