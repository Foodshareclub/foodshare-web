import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

// Import metrics from proxy (will be available at runtime)
declare global {
  var proxyMetrics: {
    getMetricsSummary: () => {
      total: number;
      rateLimited: number;
      csrfBlocked: number;
      authFailures: number;
      avgDuration: number;
    };
  };
}

export async function GET() {
  if (!global.proxyMetrics) {
    return NextResponse.json({ error: "Metrics not available" }, { status: 503 });
  }

  const summary = global.proxyMetrics.getMetricsSummary();
  return NextResponse.json({
    ...summary,
    timestamp: new Date().toISOString(),
  });
}
