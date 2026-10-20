import { createClient } from "@supabase/supabase-js";

// Environment variables come from Bun's own loader: `bun` reads `.env`,
// `.env.{NODE_ENV}` and `.env.local` before the script runs, and `.env.local`
// takes precedence over `.env`.

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "");

async function check() {
  const { data, error } = await supabase.from("email_templates").select("slug,name,category,is_active").order("name");

  if (error) {
    console.error("Error:", error.message);
    return;
  }

  console.log("\n📧 Templates in Supabase:\n");
  console.table(data);
}

check();
