"use client";

/**
 * Post Activity Realtime Component
 *
 * Subscribes to real-time activity updates via Supabase.
 * Bleeding-edge pattern for live activity feeds.
 *
 * @example
 * ```tsx
 * <PostActivityRealtime
 *   postId={123}
 *   initialActivities={activities}
 *   onNewActivity={(activity) => console.log('New:', activity)}
 * />
 * ```
 */

import { useEffect, useState, useCallback } from "react";
import { PostActivityTimeline } from "./PostActivityTimeline";
import { createClient } from "@/lib/supabase/client";
import type { PostActivityTimelineItem, PostActivityType } from "@/types/post-activity.types";

interface PostActivityRealtimeProps {
  postId: number;
  initialActivities: PostActivityTimelineItem[];
  maxActivities?: number;
  activityTypes?: PostActivityType[];
  showActor?: boolean;
  compact?: boolean;
  className?: string;
  onNewActivity?: (activity: PostActivityTimelineItem) => void;
}

export function PostActivityRealtime({
  postId,
  initialActivities,
  maxActivities = 50,
  activityTypes,
  showActor = true,
  compact = false,
  className,
  onNewActivity,
}: PostActivityRealtimeProps) {
  const [activities, setActivities] = useState<PostActivityTimelineItem[]>(initialActivities);
  const [isConnected, setIsConnected] = useState(false);

  const handleNewActivity = useCallback(
    (payload: { new: Record<string, unknown> }) => {
      const newActivity = payload.new as unknown as PostActivityTimelineItem;

      // Filter by activity types if specified
      if (activityTypes && !activityTypes.includes(newActivity.activity_type)) {
        return;
      }

      setActivities((prev) => {
        // Deduplicate by ID
        if (prev.some((a) => a.id === newActivity.id)) {
          return prev;
        }

        // Add to front and limit size
        const updated = [newActivity, ...prev].slice(0, maxActivities);
        return updated;
      });

      onNewActivity?.(newActivity);
    },
    [activityTypes, maxActivities, onNewActivity]
  );

  useEffect(() => {
    const supabase = createClient();

    // Subscribe to new activities for this post
    const channel = supabase
      .channel(`post-activity-${postId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "post_activity_logs",
          filter: `post_id=eq.${postId}`,
        },
        handleNewActivity
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      channel.unsubscribe();
    };
  }, [postId, handleNewActivity]);

  return (
    <div className={className}>
      {/* Connection indicator */}
      <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
        <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-gray-400"}`} />
        {isConnected ? "Live updates" : "Connecting..."}
      </div>

      <PostActivityTimeline activities={activities} showActor={showActor} compact={compact} />
    </div>
  );
}

export default PostActivityRealtime;
