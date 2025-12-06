import Link from 'next/link'
import { BackButton } from '@/components/navigation/BackButton'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold text-[#FF2D55] mb-4">404</div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Page Not Found</h1>
        <p className="text-muted-foreground mb-6">
          This page doesn't exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-2.5 bg-[#FF2D55] hover:bg-[#E6284D] text-white rounded-lg font-medium transition-colors"
          >
            Go Home
          </Link>
          <BackButton className="px-6 py-2.5 bg-card border border-border text-foreground rounded-lg font-medium hover:border-foreground/50 transition-colors" />
        </div>
      </div>
    </div>
  )
}
