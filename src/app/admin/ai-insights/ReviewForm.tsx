"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface ReviewFormProps {
  onReviewSubmitted: () => void;
  initialRepo?: string;
}

export function ReviewForm({ onReviewSubmitted, initialRepo }: ReviewFormProps) {
  const [selectedRepo, setSelectedRepo] = useState(initialRepo || "");
  const [selectedPr, setSelectedPr] = useState("");
  const [postToGithub, setPostToGithub] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [reviewProgress, setReviewProgress] = useState("");

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
        onReviewSubmitted();
        setSelectedPr("");
      } else {
        const err = await res.json();
        // eslint-disable-next-line no-alert
        alert("Review failed: " + (err.error || "Unknown error"));
      }
    } catch {
      // eslint-disable-next-line no-alert
      alert("Review failed - network error");
    } finally {
      setTimeout(() => {
        setReviewing(false);
        setReviewProgress("");
      }, 2000);
    }
  };

  if (!selectedRepo) {
    return (
      <Card className="bg-zinc-900 border-zinc-800 p-6 text-zinc-500 text-center">
        <p>Select a repository to run a code review</p>
      </Card>
    );
  }

  // Fetch PRs for the selected repo
  const [prs, setPrs] = useState<
    { number: number; title: string; state: string; html_url: string }[]
  >([]);
  useEffect(() => {
    if (!selectedRepo) return;
    fetch(
      `/api/admin/pulls?owner=${selectedRepo.split("/")[0]}&repo=${selectedRepo.split("/")[1]}&state=all`
    )
      .then((r) => r.json())
      .then((data) => setPrs(data.pulls || []))
      .catch(() => setPrs([]));
  }, [selectedRepo]);

  return (
    <Card className="bg-zinc-900 border-zinc-800">
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
                setPrs([]);
              }}
              disabled={reviewing}
              className="w-full px-3 md:px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
            >
              <option value="">Select repository...</option>
              {/* Options would be populated from ReposPage data */}
            </select>
          </div>
          <div>
            <label className="text-sm text-zinc-400 block mb-1">Pull Request</label>
            <select
              value={selectedPr}
              onChange={(e) => setSelectedPr(e.target.value)}
              disabled={!selectedRepo || reviewing}
              className="flex-1 px-3 md:px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm disabled:opacity-50"
            >
              <option value="">
                {prs.length === 0 && selectedRepo ? "No PRs found" : "Select PR..."}
              </option>
              {prs.map((pr) => (
                <option key={pr.number} value={pr.number}>
                  #{pr.number} {pr.state === "closed" ? "✓" : "○"} {pr.title.slice(0, 30)}
                  {pr.title.length > 30 ? "..." : ""}
                </option>
              ))}
            </select>
            {selectedPr && (
              <a
                href={prs.find((p) => p.number === parseInt(selectedPr))?.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors text-sm mt-1"
                title="View on GitHub"
              >
                ↗
              </a>
            )}
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
            disabled={reviewing || !selectedPr}
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
  );
}
