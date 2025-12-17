"use client";

/**
 * AudienceTab - Audience segments and subscriber management
 */

import {
  Users,
  UserPlus,
  UserMinus,
  TrendingUp,
  Target,
  Plus,
  Activity,
  Heart,
} from "lucide-react";

import { MetricCard, EmptyState } from "../components";
import { SegmentCard, SystemSegmentCard } from "../cards";
import type { AudienceTabProps } from "../types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function AudienceTab({ segments, stats }: AudienceTabProps) {
  return (
    <div className="space-y-5">
      {/* Audience Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Audience Segments
              </CardTitle>
              <CardDescription>Target specific groups with personalized content</CardDescription>
            </div>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              New Segment
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {segments.map((segment) => (
              <SegmentCard key={segment.id} segment={segment} />
            ))}
            {segments.length === 0 && (
              <div className="col-span-full py-8">
                <EmptyState
                  icon={<Target className="h-10 w-10" />}
                  title="No segments created"
                  description="Create segments to target specific audiences"
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
        </CardContent>
      </Card>

      {/* System Segments */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">System Segments</CardTitle>
          <CardDescription>Auto-generated segments based on user behavior</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid md:grid-cols-4 gap-4">
            <SystemSegmentCard
              name="All Subscribers"
              count={stats.totalSubscribers}
              icon={<Users className="h-4 w-4" />}
              color="blue"
            />
            <SystemSegmentCard
              name="Active Users"
              count={stats.activeSubscribers}
              icon={<Activity className="h-4 w-4" />}
              color="emerald"
            />
            <SystemSegmentCard
              name="New (7 days)"
              count={Math.round(stats.totalSubscribers * 0.05)}
              icon={<UserPlus className="h-4 w-4" />}
              color="violet"
            />
            <SystemSegmentCard
              name="Engaged"
              count={Math.round((stats.totalSubscribers * stats.avgOpenRate) / 100)}
              icon={<Heart className="h-4 w-4" />}
              color="amber"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
