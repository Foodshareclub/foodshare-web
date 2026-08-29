"use client";

import { Users, Package, MessageSquare, AlertTriangle, Sparkles, Zap } from "lucide-react";
import { GrokAssistant } from "@/app/admin/ai-insights/GrokAssistant";
import { Card } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { AIInsightsData } from "@/lib/data/admin-ai-insights";

interface Props {
  initialData: AIInsightsData;
}

interface ReviewStats {
  totalReviews: number;
  totalIssues: number;
  criticalIssues: number;
  activeRepos: number;
}

export function AIInsightsClient({ initialData }: Props) {
  const data = initialData;
  const [reviewStats, setReviewStats] = useState<ReviewStats>({
    totalReviews: 0,
    totalIssues: 0,
    criticalIssues: 0,
    activeRepos: 0,
  });

  const activeUserPercent =
    data.totalUsers > 0 ? ((data.activeUsers7d / data.totalUsers) * 100).toFixed(1) : "0";

  useEffect(() => {
    fetch("/api/admin/reviews?limit=100")
      .then((r) => r.json())
      .then((result) => {
        const reviews = result.reviews || [];
        const allIssues = reviews.reduce(
          (acc: number, r: { result: { line_comments?: Array<{ severity?: string }> } }) =>
            acc + (r.result?.line_comments?.length || 0),
          0
        );
        const critical = reviews.reduce(
          (acc: number, r: { result: { line_comments?: Array<{ severity?: string }> } }) =>
            acc +
            (r.result?.line_comments?.filter(
              (c: { severity?: string }) => c.severity === "critical" || c.severity === "high"
            ).length || 0),
          0
        );
        const activeRepos = new Set(
          reviews.map((r: { repo_full_name: string }) => r.repo_full_name)
        ).size;
        setReviewStats({
          totalReviews: reviews.length,
          totalIssues: allIssues,
          criticalIssues: critical,
          activeRepos,
        });
      })
      .catch(() =>
        setReviewStats({ totalReviews: 0, totalIssues: 0, criticalIssues: 0, activeRepos: 0 })
      );
  }, []);

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-zinc-900 border-zinc-800 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-400" />
            <div>
              <div className="text-lg font-bold text-white">Active Users (7d)</div>
              <div className="text-sm text-zinc-500">{activeUserPercent}% of total</div>
            </div>
          </div>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-green-400" />
            <div>
              <div className="text-lg font-bold text-white">Churn Risk</div>
              <div className="text-sm text-zinc-500">{data.churnRate.toFixed(1)}%</div>
              <div className="text-xs mt-1">({data.atRiskUsers} users inactive)</div>
            </div>
          </div>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-purple-400" />
            <div>
              <div className="text-lg font-bold text-white">Active Listings</div>
              <div className="text-sm text-zinc-500">{data.activeListings}</div>
              <div className="text-xs mt-1">{data.newListings7d} new this week</div>
            </div>
          </div>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-emerald-400" />
            <div>
              <div className="text-lg font-bold text-white">Total Chats</div>
              <div className="text-sm text-zinc-500">{data.totalChats}</div>
              <div className="text-xs mt-1">{data.newChats7d} new this week</div>
            </div>
          </div>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-emerald-400" />
            <div>
              <div className="text-lg font-bold text-white">AI Reviews</div>
              <div className="text-sm text-zinc-500">{reviewStats.totalReviews} reviews</div>
              <div className="text-xs mt-1">
                {reviewStats.totalIssues} issues ({reviewStats.criticalIssues} critical)
              </div>
              <div className="text-xs mt-1">({reviewStats.activeRepos} repos)</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Interface */}
        <div className="lg:col-span-2 h-[500px]">
          <GrokAssistant />
        </div>

        {/* Side Panel */}
        <div className="space-y-4">
          {/* Tips */}
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-800 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <h3 className="font-semibold text-foreground">Pro Tips</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-purple-600 dark:text-purple-400 mt-0.5">•</span>
                <span>Ask specific questions for better insights</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 dark:text-purple-400 mt-0.5">•</span>
                <span>Insights are cached for 1 hour to save credits</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 dark:text-purple-400 mt-0.5">•</span>
                <span>Request predictions and recommendations</span>
              </li>
            </ul>
          </div>

          {/* Example Questions */}
          <div className="bg-background rounded-lg border border-border p-4">
            <h3 className="font-semibold text-foreground mb-3">Example Questions</h3>
            <ul className="space-y-2 text-sm">
              <li className="p-2 bg-muted rounded hover:bg-muted/80 cursor-pointer text-muted-foreground">
                "What time should I send emails for best engagement?"
              </li>
              <li className="p-2 bg-muted rounded hover:bg-muted/80 cursor-pointer text-muted-foreground">
                "Which food categories are trending?"
              </li>
              <li className="p-2 bg-muted rounded hover:bg-muted/80 cursor-pointer text-muted-foreground">
                "How can I reduce user churn?"
              </li>
              <li className="p-2 bg-muted rounded hover:bg-muted/80 cursor-pointer text-muted-foreground">
                "Predict next week&apos;s listing volume"
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
