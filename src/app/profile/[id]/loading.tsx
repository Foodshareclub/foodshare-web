/**
 * View Profile Loading Component
 * Matches ProfileSkeleton from page.tsx
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-muted/30 dark:bg-background">
      <div className="container mx-auto max-w-4xl pt-24 pb-12 px-4">
        <div className="glass rounded-xl p-0 overflow-hidden">
          <div className="h-[200px] bg-muted animate-pulse" />
          <div className="p-8 space-y-4">
            <div className="h-24 w-24 mx-auto rounded-full bg-muted animate-pulse -mt-12" />
            <div className="h-8 bg-muted animate-pulse rounded max-w-xs mx-auto" />
            <div className="h-4 bg-muted animate-pulse rounded max-w-sm mx-auto" />
            <div className="h-20 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </div>
    </div>
  )
}
