import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/metadata";

export const metadata: Metadata = generatePageMetadata({
  title: "My Profile - Account Settings",
  description: "Manage your FoodShare profile, personal information, and account settings. Update your details and preferences.",
  path: "/profile",
  keywords: ["profile", "account settings", "user profile", "my account"],
  noIndex: true, // Private page, don't index
});

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
