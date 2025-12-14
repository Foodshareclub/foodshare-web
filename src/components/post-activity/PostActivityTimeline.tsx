"use client";

/**
 * Post Activity Timeline Component
 *
 * Displays a chronological timeline of activities for a post.
 * Used in post detail pages and admin dashboards.
 */

import { formatDistanceToNow } from "date-fns";
import {
  FiPlus,
  FiEdit,
  FiTrash2,
  FiRotateCcw,
  FiToggleRight,
  FiToggleLeft,
  FiClock,
  FiEye,
  FiMessageCircle,
  FiCheckCircle,
  FiXCircle,
  FiPackage,
  FiAlertCircle,
  FiFlag,
  FiAlertTriangle,
  FiCheck,
  FiThumbsUp,
  FiThumbsDown,
  FiEyeOff,
  FiHeart,
  FiShare2,
  FiBookmark,
  FiEdit3,
  FiFileText,
  FiSettings,
  FiPower,
  FiMapPin,
  FiImage,
} from "react-icons/fi";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { PostActivityTimelineItem, PostActivityType } from "@/types/post-activity.types";
import { ACTIVITY_TYPE_LABELS, ACTIVITY_TYPE_COLORS } from "@/types/post-activity.types";

// Icon mapping
const ACTIVITY_ICONS: Record<PostActivityType, React.ComponentType<{ className?: string }>> = {
  created: FiPlus,
  updated: FiEdit,
  deleted: FiTrash2,
  restored: FiRotateCcw,
  activated: FiToggleRight,
  deactivated: FiToggleLeft,
  expired: FiClock,
  viewed: FiEye,
  contacted: FiMessageCircle,
  arranged: FiCheckCircle,
  arrangement_cancelled: FiXCircle,
  collected: FiPackage,
  not_collected: FiAlertCircle,
  reported: FiFlag,
  flagged: FiAlertTriangle,
  unflagged: FiCheck,
  approved: FiThumbsUp,
  rejected: FiThumbsDown,
  hidden: FiEyeOff,
  unhidden: FiEye,
  liked: FiHeart,
  unliked: FiHeart,
  shared: FiShare2,
  bookmarked: FiBookmark,
  unbookmarked: FiBookmark,
  admin_edited: FiEdit3,
  admin_note_added: FiFileText,
  admin_status_changed: FiSettings,
  auto_expired: FiClock,
  auto_deactivated: FiPower,
  location_updated: FiMapPin,
  images_updated: FiImage,
};

interface PostActivityTimelineProps {
  activities: PostActivityTimelineItem[];
  showActor?: boolean;
  compact?: boolean;
  className?: string;
}

export function PostActivityTimeline({
  activities,
  showActor = true,
  compact = false,
  className,
}: PostActivityTimelineProps) {
  if (activities.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No activity recorded yet</div>;
  }

  return (
    <div className={cn("relative", className)}>
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

      <div className="space-y-4">
        {activities.map((activity) => (
          <ActivityItem
            key={activity.id}
            activity={activity}
            showActor={showActor}
            compact={compact}
          />
        ))}
      </div>
    </div>
  );
}

interface ActivityItemProps {
  activity: PostActivityTimelineItem;
  showActor: boolean;
  compact: boolean;
}

function ActivityItem({ activity, showActor, compact }: ActivityItemProps) {
  const Icon = ACTIVITY_ICONS[activity.activity_type] || FiClock;
  const colorClass = ACTIVITY_TYPE_COLORS[activity.activity_type] || "text-gray-500";
  const label = ACTIVITY_TYPE_LABELS[activity.activity_type] || activity.activity_type;

  return (
    <div className="relative pl-10">
      {/* Icon circle */}
      <div
        className={cn(
          "absolute left-0 w-8 h-8 rounded-full bg-background border-2 flex items-center justify-center",
          colorClass.replace("text-", "border-")
        )}
      >
        <Icon className={cn("w-4 h-4", colorClass)} />
      </div>

      <div className={cn("bg-card rounded-lg border p-3", compact ? "py-2" : "p-4")}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {showActor && activity.actor_nickname && (
              <Avatar className="h-6 w-6 flex-shrink-0">
                <AvatarImage src={activity.actor_avatar || undefined} />
                <AvatarFallback className="text-xs">
                  {activity.actor_nickname.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="min-w-0">
              <p className={cn("font-medium", compact ? "text-sm" : "")}>
                {showActor && activity.actor_nickname && (
                  <span className="text-foreground">{activity.actor_nickname} </span>
                )}
                <span className={colorClass}>{label.toLowerCase()}</span>
                {activity.reason && (
                  <span className="text-muted-foreground"> - {activity.reason}</span>
                )}
              </p>
              {!compact && activity.notes && (
                <p className="text-sm text-muted-foreground mt-1">{activity.notes}</p>
              )}
            </div>
          </div>
          <time
            className="text-xs text-muted-foreground flex-shrink-0"
            dateTime={activity.created_at}
          >
            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
          </time>
        </div>

        {/* Show changes if present */}
        {!compact && Object.keys(activity.changes || {}).length > 0 && (
          <ActivityChanges changes={activity.changes} />
        )}
      </div>
    </div>
  );
}

interface ActivityChangesProps {
  changes: Record<string, unknown>;
}

function ActivityChanges({ changes }: ActivityChangesProps) {
  const entries = Object.entries(changes);
  if (entries.length === 0) return null;

  return (
    <div className="mt-2 pt-2 border-t">
      <p className="text-xs font-medium text-muted-foreground mb-1">Changes:</p>
      <div className="space-y-1">
        {entries.slice(0, 5).map(([key, value]) => (
          <div key={key} className="text-xs">
            <span className="font-medium">{formatFieldName(key)}:</span>{" "}
            <span className="text-muted-foreground">{formatValue(value)}</span>
          </div>
        ))}
        {entries.length > 5 && (
          <p className="text-xs text-muted-foreground">+{entries.length - 5} more changes</p>
        )}
      </div>
    </div>
  );
}

function formatFieldName(field: string): string {
  return field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "N/A";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default PostActivityTimeline;
