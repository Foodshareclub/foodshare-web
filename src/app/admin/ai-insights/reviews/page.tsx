"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ReviewResult = { line_comments?: Array<{ severity?: string }> } | null;

interface Review {
  id: string;
  repo_full_name: string;
  pr_number: number;
  status: string;
  result: ReviewResult;
  created_at: string;
  is_incremental: boolean;
}

interface RepoConfig {
  id: string;
  full_name: string;
  enabled: boolean;
  auto_review: boolean;
}

interface PR {
  number: number;
  title: string;
  state: string;
  url: string;
}

export default function ReviewsPage() {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [repos, setRepos] = useState<RepoConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [prs, setPrs] = useState<PR[]>([]);
  const [selectedPr, setSelectedPr] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [reviewProgress, setReviewProgress] = useState("");
  const [postToGithub, setPostToGithub] = useState(true);

  const loadReviews = useCallback(() => {
    fetch("/api/admin/reviews")
      .then((r) => r.json())
      .then((data) => {
        setReviews(data.reviews || []);
        setRepos(data.repos || []);
      })
      .catch(() => {
        setReviews([]);
        setRepos([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const refreshRepos = useCallback(() => {
    fetch("/api/admin/repos/config")
      .then((r) => r.json())
      .then((data) => {
        setRepos(data.configs || []);
      })
      .catch(() => {
        setRepos([]);
      });
  }, []);

  useEffect(() => {
    loadReviews();
    refreshRepos();
  }, [loadReviews, refreshRepos]);

  const runReview = async () => {
    if (!selectedRepo || !selectedPr) return;
    setReviewing(true);
    setReviewProgress("Fetching PR diff...");
    const [owner, repo] = selectedRepo.split("/");
    try {
      setReviewProgress("Analyzing code with AI...");
      const res = await fetch("/api/admin/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, repo, pr_number: parseInt(selectedPr), post: postToGithub }),
      });
      if (res.ok) {
        setReviewProgress("Review complete!");
        loadReviews();
        setSelectedPr("");
      } else {
        const err = await res.json();
        setReviewProgress(`Error: ${err.error}`);
      }
    } catch {
      setReviewProgress("Review failed");
    } finally {
      setTimeout(() => {
        setReviewing(false);
        setReviewProgress("");
      }, 2000);
    }
  };

  const totalIssues = reviews.reduce((acc, r) => acc + (r.result?.line_comments?.length || 0), 0);
  const criticalIssues = reviews.reduce(
    (acc, r) =>
      acc +
      (r.result?.line_comments?.filter(
        (c: { severity?: string }) => c.severity === "critical" || c.severity === "high"
      ).length || 0),
    0
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-500">Loading reviews...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">AI Code Reviews</h1>
          <p className="text-zinc-500 text-sm md:text-base">
            AI-powered code review for pull requests
          </p>
        </div>
        <div className="text-xs text-zinc-600 hidden md:block">
          <kbd className="px-2 py-1 bg-zinc-800 rounded">⌘+Enter</kbd> Run review •
          <kbd className="px-2 py-1 bg-zinc-800 rounded ml-2">⌘+R</kbd> View reviews
        </div>
      </div>

      {/* Quick Review Card */}
      <Card className="bg-gradient-to-r from-emerald-900/20 to-zinc-900 border-emerald-800/50">
        <CardHeader className="pb-2 md:pb-4">
          <CardTitle className="text-white flex items-center gap-2 text-lg">
            <span>⚡</span> Quick Review
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div>
              <label className="text-sm text-zinc-400 block mb-1">Repository</label>
              <select
                value={selectedRepo}
                onChange={(e) => {
                  setSelectedRepo(e.target.value);
                  setSelectedPr("");
                }}
                className="w-full px-3 md:px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
              >
                <option value="">Select repository...</option>
                {repos
                  .filter((r) => r.enabled)
                  .map((repo) => (
                    <option key={repo.id} value={repo.full_name}>
                      {repo.full_name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-zinc-400 block mb-1">Pull Request</label>
              <div className="flex gap-2">
                <select
                  value={selectedPr}
                  onChange={(e) => setSelectedPr(e.target.value)}
                  disabled={!selectedRepo || loading}
                  className="flex-1 px-3 md:px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm disabled:opacity-50"
                >
                  <option value="">
                    {loading
                      ? "Loading PRs..."
                      : prs.length === 0 && selectedRepo
                        ? "No PRs found"
                        : "Select PR..."}
                  </option>
                  {prs.map((pr) => (
                    <option key={pr.number} value={pr.number}>
                      #{pr.number} {pr.state === "closed" ? "✓" : "○"} {pr.title.slice(0, 35)}
                      {pr.title.length > 35 ? "..." : ""}
                    </option>
                  ))}
                </select>
                {selectedPr && prs.find((p) => p.number === parseInt(selectedPr))?.url && (
                  <a
                    href={prs.find((p) => p.number === parseInt(selectedPr))?.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
                    title="View on GitHub"
                  >
                    ↗
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={postToGithub}
                onChange={(e) => setPostToGithub(e.target.checked)}
                className="rounded bg-zinc-800 border-zinc-700 text-emerald-500"
              />
              Post review to GitHub
            </label>
            <Button
              onClick={runReview}
              disabled={reviewing || !selectedRepo || !selectedPr}
              className="bg-emerald-600 hover:bg-emerald-700 px-6 md:px-8 w-full md:w-auto"
            >
              {reviewing ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {reviewProgress || "Reviewing..."}
                </span>
              ) : (
                "🔍 Start Review"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-4 md:pt-6 text-center">
            <div className="text-2xl md:text-3xl font-bold text-white">{reviews.length}</div>
            <div className="text-xs md:text-sm text-zinc-500">Reviews</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-4 md:pt-6 text-center">
            <div className="text-2xl md:text-3xl font-bold text-yellow-400">{totalIssues}</div>
            <div className="text-xs md:text-sm text-zinc-500">Issues</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-4 md:pt-6 text-center">
            <div className="text-2xl md:text-3xl font-bold text-red-400">{criticalIssues}</div>
            <div className="text-xs md:text-sm text-zinc-500">Critical</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-4 md:pt-6 text-center">
            <div className="text-2xl md:text-3xl font-bold text-emerald-400">
              {repos.filter((r) => r.enabled).length}
            </div>
            <div className="text-xs md:text-sm text-zinc-500">Repos</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Reviews List */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-white text-base md:text-lg">Recent Reviews</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 md:space-y-3">
          {reviews.length === 0 ? (
            <p className="text-zinc-500 text-sm py-4 text-center">
              No reviews yet. Use the form above to run your first AI review!
            </p>
          ) : (
            reviews.slice(0, 10).map((review) => (
              <div
                key={review.id}
                className="flex items-center justify-between p-2 md:p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors cursor-pointer"
                onClick={() => router.push(`/admin/ai-insights/reviews/${review.id}`)}
              >
                <div className="flex items-center gap-2 md:gap-3 min-w-0">
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${review.result?.line_comments?.[0]?.severity === "critical" ? "bg-red-500" : review.result?.line_comments?.[0]?.severity === "high" ? "bg-orange-500" : "bg-emerald-500"}`}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {review.repo_full_name.split("/")[1]}
                    </div>
                    <div className="text-xs text-zinc-500">
                      PR #{review.pr_number} • {review.result?.line_comments?.length || 0} issues
                    </div>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`flex-shrink-0 text-xs ${review.status === "completed" ? "border-emerald-500 text-emerald-400" : "border-red-500 text-red-400"}`}
                >
                  {review.status === "completed" ? "✓" : "✗"}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
