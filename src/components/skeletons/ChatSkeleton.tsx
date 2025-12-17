import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ChatSkeletonProps {
  className?: string;
}

/**
 * Chat page skeleton with sidebar and message area
 */
export function ChatSkeleton({ className }: ChatSkeletonProps) {
  return (
    <div
      className={cn(
        "min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800",
        className
      )}
    >
      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-4 h-[calc(100vh-120px)]">
          {/* Sidebar skeleton */}
          <div className="hidden xl:block w-80 flex-shrink-0">
            <div className="glass-subtle rounded-2xl h-full p-4 space-y-4">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-10 w-full" />
              <div className="space-y-3 pt-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chat area skeleton */}
          <div className="flex-1">
            <div className="glass-subtle rounded-2xl h-full flex flex-col">
              {/* Header */}
              <div className="p-4 border-b border-white/20">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 p-4 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
                    <Skeleton
                      className={`h-12 rounded-2xl ${
                        i % 2 === 0 ? "w-48 rounded-bl-sm" : "w-36 rounded-br-sm"
                      }`}
                    />
                  </div>
                ))}
              </div>

              {/* Input */}
              <div className="p-4 border-t border-white/20">
                <div className="flex gap-2">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <Skeleton className="h-10 flex-1 rounded-lg" />
                  <Skeleton className="h-10 w-10 rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
