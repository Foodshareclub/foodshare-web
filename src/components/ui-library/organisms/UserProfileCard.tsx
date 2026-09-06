import React from "react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui-library/atoms/Avatar";
import { FrequencyBadge } from "@/components/ui-library/atoms/FrequencyBadge";
import { StatusIndicator } from "@/components/ui-library/atoms/StatusIndicator";

/**
 * UserProfileCard - Organism displaying user profile with avatar, status, and activity count
 */
interface UserProfileCardProps {
  name: string;
  avatarSrc?: string;
  status?: "online" | "offline" | "pending" | "error";
  activityCount?: number;
  activityLabel?: string;
  className?: string;
  avatarSize?: "sm" | "md" | "lg" | "xl";
}

export const UserProfileCard: React.FC<UserProfileCardProps> = ({
  name,
  avatarSrc,
  status,
  activityCount,
  activityLabel = "posts",
  className,
  avatarSize = "md",
}) => {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {avatarSrc ? (
        <Avatar src={avatarSrc} alt={name} size={avatarSize} />
      ) : (
        <span
          className={cn(
            "w-10 h-10 rounded-full bg-border flex items-center justify-center text-muted-foreground"
          )}
        >
          {name.charAt(0)}
        </span>
      )}
      {status !== undefined && <StatusIndicator status={status} size="sm" />}
      {activityCount !== undefined && (
        <FrequencyBadge count={activityCount} label={activityLabel} size="sm" />
      )}
      <span className="font-medium text-foreground">{name}</span>
    </div>
  );
};
