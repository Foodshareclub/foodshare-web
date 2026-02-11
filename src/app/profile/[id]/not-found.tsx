import Link from "next/link";

export default function ProfileNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
      <h2 className="text-2xl font-bold mb-2">Profile not found</h2>
      <p className="text-muted-foreground mb-6">
        This profile doesn&apos;t exist or may have been removed.
      </p>
      <Link
        href="/"
        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
      >
        Go home
      </Link>
    </div>
  );
}
