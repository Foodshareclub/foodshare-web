import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ok, handleError } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get("owner");
    const repo = searchParams.get("repo");
    const state = searchParams.get("state") || "all";

    if (!owner || !repo) return ok({ pulls: [] });

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("pull_requests")
      .select("*")
      .eq("repo_full_name", `${owner}/${repo}`)
      .eq("state", state)
      .order("number", { ascending: false });

    if (error) throw error;
    return ok({ pulls: data });
  } catch (error) {
    return handleError(error);
  }
}
