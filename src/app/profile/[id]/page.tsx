import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ViewProfileClient } from "./ViewProfileClient";
import { getPublicProfile, hasUserRole } from "@/lib/data/profiles";
import { getUser } from "@/app/actions/auth";

// Route segment config for caching
export const revalidate = 300;

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * View Profile Page - Server Component
 * Displays another user's public profile
 */
export default async function ViewProfilePage({ params }: PageProps) {
  const { id } = await params;

  // Fetch data in parallel on the server
  const [profile, user, isVolunteer] = await Promise.all([
    getPublicProfile(id),
    getUser(),
    hasUserRole(id, "volunteer"),
  ]);

  if (!profile) {
    notFound();
  }

  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ViewProfileClient profile={profile} user={user} isVolunteer={isVolunteer} />
    </Suspense>
  );
}

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const profile = await getPublicProfile(id);

  if (!profile) {
    return { title: "Profile Not Found | FoodShare" };
  }

  const fullName = [profile.first_name, profile.second_name].filter(Boolean).join(" ") || "User";
  const description = profile.about_me?.slice(0, 160) || `View ${fullName}'s profile on FoodShare`;
  const pageUrl = `https://foodshare.club/profile/${id}`;
  const imageUrl = profile.avatar_url || "https://foodshare.club/og-image.jpg";

  return {
    title: `${fullName} | FoodShare`,
    description,
    alternates: {
      canonical: pageUrl,
    },
    // OpenGraph: Facebook, LinkedIn, WhatsApp - Profile type
    openGraph: {
      type: "profile",
      locale: "en_US",
      url: pageUrl,
      siteName: "FoodShare",
      title: `${fullName} on FoodShare`,
      description,
      images: [
        {
          url: imageUrl,
          width: 400,
          height: 400,
          alt: `${fullName}'s profile photo`,
          type: "image/jpeg",
        },
      ],
      firstName: profile.first_name || undefined,
      lastName: profile.second_name || undefined,
    },
    // Twitter / X Cards
    twitter: {
      card: "summary",
      site: "@foodshareapp",
      creator: "@foodshareapp",
      title: `${fullName} | FoodShare`,
      description,
      images: [
        {
          url: imageUrl,
          alt: `${fullName}'s profile photo`,
        },
      ],
    },
  };
}

/**
 * Skeleton loader for profile page
 */
function ProfileSkeleton() {
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
  );
}
