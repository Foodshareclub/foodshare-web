"use client";

import { Users, UserPlus, UserMinus, TrendingUp, Target, Plus } from "lucide-react";
import { GlassCard } from "../shared/GlassCard";
import { MetricCard } from "../shared/MetricCard";
import { EmptyState } from "../shared/EmptyState";
import { SegmentCard } from "../audience/SegmentCard";
import { SystemSegmentCard } from "../audience/SystemSegmentCard";
import type { AudienceSegment, EmailDashboardStats } from "../types";
import { Button } from "@/components/ui/button";

export function AudienceTab({
  segments,
  stats,
}: {
  segments: AudienceSegment[];
  stats: EmailDashboardStats;
}) {
  return (
    <div className="space-y-6">
      {/* Audience Overview */}
      <div className="grid md:grid-cols-4 gap-4">
        <MetricCard
          label="Total Subscribers"
          value={stats.totalSubscribers.toLocaleString()}
          icon={<Users className="h-5 w-5" />}
          color="blue"
        />
        <MetricCard
          label="Active"
          value={stats.activeSubscribers.toLocaleString()}
          icon={<UserPlus className="h-5 w-5" />}
          color="emerald"
        />
        <MetricCard
          label="Unsubscribed (30d)"
          value={Math.round(
            (stats.totalSubscribers * stats.unsubscribeRate) / 100
          ).toLocaleString()}
          icon={<UserMinus className="h-5 w-5" />}
          color="rose"
        />
        <MetricCard
          label="Growth Rate"
          value={`+${Math.max(0, 100 - stats.unsubscribeRate).toFixed(1)}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          color="violet"
        />
      </div>

      {/* Segments */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Audience Segments
          </h3>
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            New Segment
          </Button>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {segments.map((segment) => (
            <SegmentCard key={segment.id} segment={segment} />
          ))}
          {segments.length === 0 && (
            <div className="col-span-full py-8">
              <EmptyState
                icon={<Target />}
                message="No segments created yet"
                action={
                  <Button className="mt-4 gap-2">
                    <Plus className="h-4 w-4" />
                    Create Segment
                  </Button>
                }
              />
            </div>
          )}
        </div>
      </GlassCard>

      {/* Default Segments */}
      <GlassCard>
        <h3 className="font-semibold mb-4">System Segments</h3>
        <div className="grid md:grid-cols-4 gap-4">
          <SystemSegmentCard name="All Subscribers" count={stats.totalSubscribers} color="blue" />
          <SystemSegmentCard name="Active Users" count={stats.activeSubscribers} color="emerald" />
          <SystemSegmentCard
            name="New (7 days)"
            count={Math.round(stats.totalSubscribers * 0.05)}
            color="violet"
          />
          <SystemSegmentCard
            name="Engaged"
            count={Math.round((stats.totalSubscribers * stats.avgOpenRate) / 100)}
            color="amber"
          />
        </div>
      </GlassCard>
    </div>
  );
}
