import { redirect } from "next/navigation";
import { Suspense } from "react";
import { MyPostsClient } from "./MyPostsClient";
import { MyPostsSkeleton } from "./MyPostsSkeleton";
import { getUser } from "@/app/actions/auth";
import { getUserProducts } from "@/lib/data/products";
import { generateNoIndexMetadata } from "@/lib/metadata";

export const metadata = generateNoIndexMetadata(
  "My Posts",
  "Manage your food sharing posts - create, edit, and delete your listings"
);

// Force dynamic rendering - user-specific content
export const dynamic = "force-dynamic";

/**
 * My Posts Page - Server Component
 * Full post management system for authenticated users
 */
export default async function MyPostsPage() {
  const user = await getUser();

  if (!user) {
    redirect("/auth/login?from=/my-posts");
  }

  const posts = await getUserProducts(user.id);

  return (
    <Suspense fallback={<MyPostsSkeleton />}>
      <MyPostsClient posts={posts} />
    </Suspense>
  );
}
