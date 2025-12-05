/**
 * Auth Loading Component
 * Matches the login page structure
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-muted/30 dark:bg-background relative overflow-hidden">
      {/* Background Pattern */}
      <div
        className="absolute top-0 left-0 right-0 bottom-0 opacity-[0.03] dark:opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #E61E4D 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Header */}
      <div className="sticky top-0 bg-background/95 border-b border-border z-10 backdrop-blur-[10px]">
        <div className="container mx-auto max-w-7xl py-4 px-4">
          <div className="flex justify-between items-center">
            <div className="h-8 w-28 bg-muted rounded animate-pulse" />
            <div className="h-4 w-48 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto max-w-[480px] py-8 md:py-16 px-4">
        {/* Card */}
        <div className="bg-card rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-6 md:p-8 border border-border animate-pulse">
          {/* Welcome Message */}
          <div className="mb-8 text-center">
            <div className="h-10 w-48 bg-muted rounded mx-auto mb-3" />
            <div className="h-5 w-72 bg-muted rounded mx-auto" />
          </div>

          {/* Form fields */}
          <div className="space-y-5">
            <div>
              <div className="h-4 w-24 bg-muted rounded mb-2" />
              <div className="h-12 bg-muted rounded-xl" />
            </div>
            <div>
              <div className="h-4 w-20 bg-muted rounded mb-2" />
              <div className="h-12 bg-muted rounded-xl" />
            </div>
            <div className="h-14 bg-muted rounded-xl" />
          </div>

          {/* Divider */}
          <div className="flex items-center my-8">
            <div className="flex-1 h-px bg-muted" />
            <div className="h-4 w-32 bg-muted rounded mx-4" />
            <div className="flex-1 h-px bg-muted" />
          </div>

          {/* Social buttons */}
          <div className="space-y-3">
            <div className="h-14 bg-muted rounded-xl" />
            <div className="flex gap-3">
              <div className="flex-1 h-14 bg-muted rounded-xl" />
              <div className="flex-1 h-14 bg-muted rounded-xl" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="h-4 w-64 bg-muted rounded mx-auto mt-6" />
      </div>
    </div>
  )
}
