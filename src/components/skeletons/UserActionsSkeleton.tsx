/**
 * Skeleton for the user actions section on the post detail page.
 * Displayed while user/admin auth data is being fetched.
 */
export function UserActionsSkeleton() {
  return (
    <div className="flex items-center gap-3 animate-pulse">
      <div className="h-10 w-24 bg-gray-200 rounded-lg" />
      <div className="h-10 w-24 bg-gray-200 rounded-lg" />
    </div>
  );
}
