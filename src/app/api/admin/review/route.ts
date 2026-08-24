import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ok, handleError } from "@/lib/api";

interface ReviewInput {
  owner: string;
  repo: string;
  pr_number: number;
  post?: boolean;
  depth?: "quick" | "standard" | "deep";
  focus_areas?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Manual validation
    const owner = String(body.owner || "").trim();
    const repo = String(body.repo || "").trim();
    const pr_number = Number(body.pr_number);
    const post = body.post;
    const depth = String(body.depth || "").trim();
    const focus_areas = Array.isArray(body.focus_areas) ? body.focus_areas : [];

    if (!owner?.includes("/")) return handleError("Invalid owner format (expected owner)");
    if (!repo?.includes("/")) return handleError("Invalid repo format (expected owner/repo)");
    if (!Number.isInteger(pr_number) || pr_number <= 0) return handleError("Invalid pr_number");
    if (depth && !["quick", "standard", "deep"].includes(depth))
      return handleError("Invalid depth");
    const fullName = `${owner}/${repo}`;
    const options = depth || focus_areas ? { depth, focus_areas } : undefined;

    const supabase = await createClient();

    if (post) {
      // TODO: integrate with foodshare-ai reviewAndPost logic
      // For now, insert a placeholder review record
      const { error } = await supabase.from("review_history").insert({
        repo_full_name: fullName,
        pr_number,
        status: "completed",
        result: {
          line_comments: [],
          _analysis: "Placeholder review - integrate with foodshare-ai review logic",
        },
        head_sha: "",
        is_incremental: false,
      });
      if (error) throw error;
      return ok({
        review: {
          id: Date.now().toString(),
          repo_full_name: fullName,
          pr_number,
          status: "completed",
          result: { line_comments: [] },
        },
        note: "Review submitted (placeholder - integrate with foodshare-ai review logic)",
      });
    }

    // TODO: integrate with foodshare-ai reviewPullRequest logic
    const { error } = await supabase.from("review_history").insert({
      repo_full_name: fullName,
      pr_number,
      status: "completed",
      result: {
        line_comments: [],
        _analysis: "Placeholder review - integrate with foodshare-ai reviewPullRequest logic",
      },
      head_sha: "",
      is_incremental: false,
    });
    if (error) throw error;
    return ok({
      review: {
        id: Date.now().toString(),
        repo_full_name: fullName,
        pr_number,
        status: "completed",
        result: { line_comments: [] },
      },
      note: "Review submitted (placeholder - integrate with foodshare-ai reviewPullRequest logic)",
    });
  } catch (error) {
    return handleError(error);
  }
}
