import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ok, handleError } from "@/lib/api";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("repo_configs")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return ok({ configs: data });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      full_name,
      enabled = true,
      auto_review = true,
      categories,
      ignore_paths,
      custom_instructions,
      skip_initial_sync: _skip_initial_sync = false,
    } = await request.json();
    if (!full_name?.includes("/")) return handleError("Invalid repo format (expected owner/repo)");

    const supabase = await createClient();

    const { data: existing } = await supabase
      .from("repo_configs")
      .select("id, enabled")
      .eq("full_name", full_name)
      .single();

    const _isNewOrNewlyEnabled = !existing || (!existing.enabled && enabled);

    const { data, error } = await supabase
      .from("repo_configs")
      .upsert(
        {
          full_name,
          enabled,
          auto_review,
          categories: categories || ["security", "bug", "performance"],
          ignore_paths,
          custom_instructions,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "full_name" }
      )
      .select()
      .single();

    if (error) throw error;

    return ok({
      config: data,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const full_name = searchParams.get("full_name");
    if (!full_name) return handleError("full_name required");

    const supabase = await createClient();
    const { error } = await supabase.from("repo_configs").delete().eq("full_name", full_name);
    if (error) throw error;
    return ok({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
