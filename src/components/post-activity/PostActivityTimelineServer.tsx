/**
 * Post Activity Timeline Server Component
 *
 * Server Component wrapper for streaming activity timeline.
 * Fetches data on server and renders timeline.
 *
 * @example
 * ```tsx
 * // In a page or layout
 * <Suspense fallback={<PostActivityTimelineSkeleton />}>
 *   <PostActivityTimelineServer postId={123} />
 * </Suspense>
 * ```
 */

import { PostActivityTimeline } from "./PostActivityTimeline";
import { getPostActivityTimeline } from "@/lib/data/post-activity";
import type { PostActivityType } from "@/types/post-activity.types";

interface PostActivityTimelineServerProps {
  postId: number;
  limit?: number;
  activityTypes?: PostActivityType[];
  showActor?: boolean;
  compact?: boolean;
  className?: string;
}

export async function PostActivityTimelineServer({
  postId,
  limit = 20,
  activityTypes,
  showActor = true,
  compact = false,
  className,
}: PostActivityTimelineServerProps) {
  const activities = await getPostActivityTimeline(postId, {
    limit,
    activityTypes,
  });

  return (
    <PostActivityTimeline
      activities={activities}
      showActor={showActor}
      compact={compact}
      className={className}
    />
  );
}

export default PostActivityTimelineServer;
