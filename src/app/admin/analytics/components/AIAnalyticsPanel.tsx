"use client";

import { useState, useEffect } from "react";
import {
  Send,
  Sparkles,
  Lightbulb,
  FileText,
  Loader2,
  TrendingUp,
  AlertTriangle,
  Target,
  AlertCircle,
  RefreshCw,
  Database,
  ChevronDown,
  ChevronUp,
  Trophy,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  askAnalyticsQuestion,
  generateWeeklyReport,
  getAIInsights,
} from "@/app/actions/analytics-ai";
import type { NLQueryResult, WeeklyReport, AIInsight } from "@/app/actions/analytics-ai";
import { fetchSyncStatus, fetchTopSharers } from "@/app/actions/analytics-data";
import type { SyncStatus, TopSharer } from "@/lib/data/analytics";

const EXAMPLE_QUESTIONS = [
  "How many users signed up this week?",
  "What's the most popular food category?",
  "How many items were successfully shared last month?",
  "Who are the top 5 food sharers?",
  "What's the listing to arranged conversion rate?",
  "Show user signups by month",
  "How many active listings are older than 7 days?",
  "Which day has the most listings?",
] as const;

const SCHEMA_INFO = {
  full_users: ["id", "created_at", "nickname", "is_active", "is_verified", "last_seen_at"],
  full_listings: [
    "id",
    "created_at",
    "post_name",
    "post_type",
    "is_active",
    "is_arranged",
    "post_arranged_at",
    "profile_id",
    "post_views",
  ],
  events: ["id", "event_name", "user_id", "properties", "timestamp"],
};

const QUERY_HISTORY_KEY = "ai-analytics-query-history";
const MAX_HISTORY = 5;

type LoadingState = "query" | "report" | "insights" | "sharers" | "sync" | null;

function getInsightIcon(type: AIInsight["type"]) {
  switch (type) {
    case "trend":
      return <TrendingUp className="h-4 w-4" />;
    case "anomaly":
      return <AlertTriangle className="h-4 w-4" />;
    case "recommendation":
      return <Target className="h-4 w-4" />;
  }
}

function getInsightColor(type: AIInsight["type"]): string {
  switch (type) {
    case "trend":
      return "text-blue-500 bg-blue-500/10";
    case "anomaly":
      return "text-amber-500 bg-amber-500/10";
    case "recommendation":
      return "text-green-500 bg-green-500/10";
  }
}

function formatTimeAgo(dateString: string | null): string {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function SyncStatusBadge({
  status,
  onRefresh,
  loading,
}: {
  status: SyncStatus[] | null;
  onRefresh: () => void;
  loading: boolean;
}) {
  const latestSync = status?.reduce((latest, s) => {
    if (!latest?.lastSyncAt) return s;
    if (!s.lastSyncAt) return latest;
    return new Date(s.lastSyncAt) > new Date(latest.lastSyncAt) ? s : latest;
  }, status[0]);

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs">
        <Database className="h-3 w-3" />
        <span>Synced: {latestSync ? formatTimeAgo(latestSync.lastSyncAt) : "Unknown"}</span>
      </div>
      <button
        onClick={onRefresh}
        disabled={loading}
        className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        title="Refresh sync status"
      >
        <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
      </button>
    </div>
  );
}

function SchemaReference({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-lg border bg-muted/30">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between p-3 text-sm font-medium hover:bg-muted/50"
      >
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4" />
          <span>Available Tables & Columns</span>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {expanded && (
        <div className="border-t p-3">
          <div className="grid gap-3 text-xs sm:grid-cols-3">
            {Object.entries(SCHEMA_INFO).map(([table, columns]) => (
              <div key={table}>
                <p className="font-semibold text-primary">{table}</p>
                <ul className="mt-1 space-y-0.5 text-muted-foreground">
                  {columns.map((col) => (
                    <li key={col}>{col}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QueryHistory({
  queries,
  onSelect,
  onClear,
}: {
  queries: string[];
  onSelect: (q: string) => void;
  onClear: () => void;
}) {
  if (queries.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Recent queries</span>
        </div>
        <button onClick={onClear} className="text-xs text-muted-foreground hover:text-foreground">
          Clear
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {queries.map((q, i) => (
          <button
            key={i}
            onClick={() => onSelect(q)}
            className="max-w-[200px] truncate rounded-full bg-primary/10 px-3 py-1 text-xs text-primary hover:bg-primary/20"
            title={q}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

function ResultTable({ data }: { data: Record<string, unknown>[] }) {
  if (data.length === 0) return null;

  const keys = Object.keys(data[0]);

  return (
    <div className="overflow-x-auto rounded border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            {keys.map((key) => (
              <th key={key} className="p-2 text-left font-medium">
                {key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b last:border-0">
              {keys.map((key) => (
                <td key={key} className="p-2">
                  {String(row[key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QueryResultDisplay({ result }: { result: NLQueryResult }) {
  const hasTabularData = result.data.length > 0 && result.data.length <= 20;

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Question</p>
        <p className="font-medium">{result.question}</p>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Answer</p>
        <p className="text-lg font-semibold text-primary">{result.answer}</p>
      </div>

      {hasTabularData && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Data ({result.data.length} rows)</p>
          <ResultTable data={result.data} />
        </div>
      )}

      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
          View generated SQL
        </summary>
        <pre className="mt-2 overflow-x-auto rounded bg-muted p-2">{result.generatedSQL}</pre>
      </details>

      <p className="text-xs text-muted-foreground">Executed in {result.executionTimeMs}ms</p>
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3 text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function WeeklyReportCard({ report }: { report: WeeklyReport }) {
  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Weekly Community Report</h3>
      </div>

      <p className="text-sm text-muted-foreground">{report.period}</p>

      <p className="text-sm">{report.summary}</p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MetricBox label="New Users" value={report.metrics.newUsers} />
        <MetricBox label="New Listings" value={report.metrics.newListings} />
        <MetricBox label="Items Shared" value={report.metrics.arrangedItems} />
        <MetricBox label="Top Category" value={report.metrics.topCategory} />
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium">Highlights</p>
        <ul className="space-y-1 text-sm text-muted-foreground">
          {report.highlights.map((highlight, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-primary">*</span>
              {highlight}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function AIInsightsCard({ insights }: { insights: AIInsight[] }) {
  if (insights.length === 0) return null;

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">AI Insights</h3>
      </div>

      <div className="space-y-3">
        {insights.map((insight, i) => (
          <div key={i} className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
            <div className={cn("rounded-full p-1.5", getInsightColor(insight.type))}>
              {getInsightIcon(insight.type)}
            </div>
            <div className="flex-1 space-y-1">
              <p className="font-medium">{insight.title}</p>
              <p className="text-sm text-muted-foreground">{insight.description}</p>
              <p className="text-xs text-muted-foreground">
                Confidence: {Math.round(insight.confidence * 100)}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopSharersCard({ sharers }: { sharers: TopSharer[] }) {
  if (sharers.length === 0) return null;

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Top Sharers</h3>
      </div>

      <div className="space-y-2">
        {sharers.map((sharer, i) => (
          <div
            key={sharer.userId}
            className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                  i === 0 && "bg-yellow-500/20 text-yellow-600",
                  i === 1 && "bg-gray-300/30 text-gray-600",
                  i === 2 && "bg-amber-600/20 text-amber-700",
                  i > 2 && "bg-muted text-muted-foreground"
                )}
              >
                {i + 1}
              </span>
              <span className="font-medium">{sharer.nickname}</span>
            </div>
            <div className="text-right text-sm">
              <p className="font-semibold text-primary">{sharer.arrangedCount} shared</p>
              <p className="text-xs text-muted-foreground">{sharer.totalListings} total listings</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AIAnalyticsPanel() {
  const [question, setQuestion] = useState("");
  const [queryResult, setQueryResult] = useState<NLQueryResult | null>(null);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [topSharers, setTopSharers] = useState<TopSharer[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus[] | null>(null);
  const [loading, setLoading] = useState<LoadingState>(null);
  const [error, setError] = useState<string | null>(null);
  const [schemaExpanded, setSchemaExpanded] = useState(false);
  // Lazy initialization from localStorage
  const [queryHistory, setQueryHistory] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem(QUERY_HISTORY_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  const handleRefreshSync = async () => {
    setLoading("sync");
    const result = await fetchSyncStatus();
    if (result.success && result.data) {
      setSyncStatus(result.data);
    }
    setLoading(null);
  };

  // Fetch sync status on mount
  useEffect(() => {
    const fetchInitialSync = async () => {
      const result = await fetchSyncStatus();
      if (result.success && result.data) {
        setSyncStatus(result.data);
      }
    };
    fetchInitialSync();
  }, []);

  const saveQueryToHistory = (q: string) => {
    const updated = [q, ...queryHistory.filter((h) => h !== q)].slice(0, MAX_HISTORY);
    setQueryHistory(updated);
    localStorage.setItem(QUERY_HISTORY_KEY, JSON.stringify(updated));
  };

  const clearHistory = () => {
    setQueryHistory([]);
    localStorage.removeItem(QUERY_HISTORY_KEY);
  };

  const handleAskQuestion = async () => {
    if (!question.trim()) return;

    setLoading("query");
    setError(null);
    setQueryResult(null);

    const result = await askAnalyticsQuestion(question);

    if (result.success) {
      setQueryResult(result.data!);
      saveQueryToHistory(question);
    } else {
      setError(result.error.message);
    }

    setLoading(null);
  };

  const handleGenerateReport = async () => {
    setLoading("report");
    setError(null);

    const result = await generateWeeklyReport();

    if (result.success) {
      setWeeklyReport(result.data!);
    } else {
      setError(result.error.message);
    }

    setLoading(null);
  };

  const handleGetInsights = async () => {
    setLoading("insights");
    setError(null);

    const result = await getAIInsights();

    if (result.success) {
      setInsights(result.data || []);
    } else {
      setError(result.error.message);
    }

    setLoading(null);
  };

  const handleGetTopSharers = async () => {
    setLoading("sharers");
    setError(null);

    const result = await fetchTopSharers(10);

    if (result.success) {
      setTopSharers(result.data || []);
    } else {
      setError(result.error.message);
    }

    setLoading(null);
  };

  return (
    <div className="space-y-6">
      {/* Header with Sync Status */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">AI-Powered Analytics</h2>
        </div>
        <SyncStatusBadge
          status={syncStatus}
          onRefresh={handleRefreshSync}
          loading={loading === "sync"}
        />
      </div>

      {/* Schema Reference */}
      <SchemaReference
        expanded={schemaExpanded}
        onToggle={() => setSchemaExpanded(!schemaExpanded)}
      />

      {/* Query Section */}
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Ask questions about your data in plain English
        </p>

        <div className="flex gap-2">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., How many users signed up this week?"
            onKeyDown={(e) => e.key === "Enter" && handleAskQuestion()}
            disabled={loading === "query"}
          />
          <Button onClick={handleAskQuestion} disabled={loading === "query" || !question.trim()}>
            {loading === "query" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Query History */}
        <QueryHistory queries={queryHistory} onSelect={setQuestion} onClear={clearHistory} />

        {/* Example Questions */}
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => setQuestion(q)}
              className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Query Result */}
      {queryResult && <QueryResultDisplay result={queryResult} />}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={handleGenerateReport} disabled={loading === "report"}>
          {loading === "report" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileText className="mr-2 h-4 w-4" />
          )}
          Generate Weekly Report
        </Button>
        <Button variant="outline" onClick={handleGetInsights} disabled={loading === "insights"}>
          {loading === "insights" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Lightbulb className="mr-2 h-4 w-4" />
          )}
          Get AI Insights
        </Button>
        <Button variant="outline" onClick={handleGetTopSharers} disabled={loading === "sharers"}>
          {loading === "sharers" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Trophy className="mr-2 h-4 w-4" />
          )}
          Top Sharers
        </Button>
      </div>

      {/* Results */}
      {weeklyReport && <WeeklyReportCard report={weeklyReport} />}
      {insights.length > 0 && <AIInsightsCard insights={insights} />}
      {topSharers.length > 0 && <TopSharersCard sharers={topSharers} />}

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
