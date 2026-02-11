import Link from "next/link";

export default function ChallengeNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
      <h2 className="text-2xl font-bold mb-2">Challenge not found</h2>
      <p className="text-muted-foreground mb-6">
        This challenge doesn&apos;t exist or may have ended.
      </p>
      <Link
        href="/challenge"
        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
      >
        Browse challenges
      </Link>
    </div>
  );
}
