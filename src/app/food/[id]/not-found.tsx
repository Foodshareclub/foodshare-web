import Link from "next/link";

export default function FoodNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
      <h2 className="text-2xl font-bold mb-2">Listing not found</h2>
      <p className="text-muted-foreground mb-6">
        This food listing may have been removed or is no longer available.
      </p>
      <Link
        href="/food"
        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
      >
        Browse food listings
      </Link>
    </div>
  );
}
