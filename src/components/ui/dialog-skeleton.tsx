import { Skeleton } from "./skeleton";
import { cn } from "@/lib/utils";

export interface DialogSkeletonProps {
  /** Show title skeleton */
  title?: boolean;
  /** Show description skeleton */
  description?: boolean;
  /** Number of content rows */
  rows?: number;
  /** Show action buttons skeleton */
  actions?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * DialogSkeleton - Loading skeleton for dialog/modal content
 *
 * @example
 * // Basic usage
 * <DialogContent>
 *   {isLoading ? <DialogSkeleton /> : <ActualContent />}
 * </DialogContent>
 *
 * @example
 * // Custom configuration
 * <DialogSkeleton title description rows={4} actions />
 */
export function DialogSkeleton({
  title = true,
  description = true,
  rows = 3,
  actions = false,
  className,
}: DialogSkeletonProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Title */}
      {title && <Skeleton className="h-6 w-2/3" />}

      {/* Description */}
      {description && <Skeleton className="h-4 w-full" />}

      {/* Content rows */}
      <div className="space-y-3 pt-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" style={{ opacity: 1 - i * 0.1 }} />
        ))}
      </div>

      {/* Actions */}
      {actions && (
        <div className="flex justify-end gap-3 pt-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      )}
    </div>
  );
}

/**
 * Pre-configured variants for common dialog types
 */

/** Skeleton for form dialogs */
export function FormDialogSkeleton({ className }: { className?: string }) {
  return <DialogSkeleton title description rows={4} actions className={className} />;
}

/** Skeleton for confirmation dialogs */
export function ConfirmDialogSkeleton({ className }: { className?: string }) {
  return <DialogSkeleton title description rows={1} actions className={className} />;
}

/** Skeleton for content/info dialogs */
export function ContentDialogSkeleton({ className }: { className?: string }) {
  return <DialogSkeleton title description rows={6} actions={false} className={className} />;
}
