/* eslint-disable @typescript-eslint/no-unused-vars */
/* oxlint-disable no-unused-vars */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://api.foodshare.club";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy";

// We just need to see if the query syntax is valid for the current schema
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Testing getForumPosts query...");
  const { data, error } = await supabase
    .from("forum")
    .select(
      `*,
      profiles!forum_profile_id_profiles_fkey (id, nickname, first_name, second_name, avatar_url),
      forum_categories!forum_category_id_fkey (*),
      forum_post_tags (forum_tags (*))`
    )
    .eq("forum_published", true)
    .limit(1);

  if (error) {
    console.error("Error in getForumPosts query:", error);
  } else {
    console.log("getForumPosts query succeeded.");
  }
}

test();
