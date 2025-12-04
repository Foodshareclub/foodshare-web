import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/metadata";

/**
 * Static metadata for user profile pages
 * Dynamic SEO metadata is handled at runtime
 */
export const metadata: Metadata = generatePageMetadata({
  title: "User Profile",
  description: "View this user's profile on FoodShare - connect with community members, share food, and reduce waste together.",
  path: "/profile",
  keywords: ["user profile", "foodshare member", "community", "food sharing", "connect"],
});

export default function ProfileDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
