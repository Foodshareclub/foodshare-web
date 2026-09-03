import { MetadataRoute } from "next";
import { siteConfig } from "@/lib/metadata";
import { createCachedClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

/**
 * Dynamic sitemap for SEO
 * Includes static routes, food products, forum posts, and forum categories
 * Generated at request time (not build time) to avoid cert fetch during build
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteConfig.url;

  // Fetch all dynamic data for sitemap
  const [forumPosts, forumCategories, foodProducts, challenges, publicProfiles] = await Promise.all(
    [
      getForumPostsForSitemap(),
      getForumCategoriesForSitemap(),
      getFoodProductsForSitemap(),
      getChallengesForSitemap(),
      getPublicProfilesForSitemap(),
    ]
  );

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/food`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },

    {
      url: `${baseUrl}/things`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/foodbanks`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/fridges`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/borrow`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/wanted`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/map/food`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/map/things`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/map/foodbanks`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/map/fridges`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    // Forum section
    {
      url: `${baseUrl}/forum`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.8,
    },
    // Static content pages
    {
      url: `${baseUrl}/help`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    // Donation page
    {
      url: `${baseUrl}/donation`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    // Guides — migrated from foodshare-docs
    {
      url: `${baseUrl}/guides`,
      lastModified: new Date("2026-09-03"),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/guides/food-safety`,
      lastModified: new Date("2026-09-03"),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/guides/safe-sharing`,
      lastModified: new Date("2026-09-03"),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/guides/sharing-guidelines`,
      lastModified: new Date("2026-09-03"),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/guides/what-can-i-share`,
      lastModified: new Date("2026-09-03"),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/guides/expiry-dates`,
      lastModified: new Date("2026-09-03"),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/guides/borrow`,
      lastModified: new Date("2026-09-03"),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/guides/cookie-policy`,
      lastModified: new Date("2026-09-03"),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    // Challenges section
    {
      url: `${baseUrl}/challenge`,
      lastModified: new Date("2026-09-03"),
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  // Forum category routes
  const forumCategoryRoutes: MetadataRoute.Sitemap = forumCategories.map(
    (category: { slug: string; updated_at: string }) => ({
      url: `${baseUrl}/forum?category=${category.slug}`,
      lastModified: new Date(category.updated_at),
      changeFrequency: "daily" as const,
      priority: 0.7,
    })
  );

  // Forum post routes
  const forumPostRoutes: MetadataRoute.Sitemap = forumPosts.map((post) => ({
    url: `${baseUrl}/forum/${post.slug || post.id}`,
    lastModified: new Date(post.last_activity_at || post.forum_post_updated_at),
    changeFrequency: "weekly" as const,
    priority: post.is_pinned ? 0.8 : post.is_featured ? 0.7 : 0.6,
  }));

  // Product routes — agnostic canonical with slug forkeyword (DB-owned post_slug)
  const foodProductRoutes: MetadataRoute.Sitemap = foodProducts.map(
    (product: {
      id: number;
      post_name: string | null;
      post_slug: string | null;
      created_at: string;
      updated_at: string | null;
    }) => {
      const slug =
        (product.post_slug as string) || slugify((product.post_name as string) || "item");
      return {
        url: `${baseUrl}/product/${product.id}-${slug}`,
        lastModified: new Date(product.updated_at || product.created_at),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      };
    }
  );

  // Challenge routes
  const challengeRoutes: MetadataRoute.Sitemap = challenges.map(
    (challenge: {
      id: number;
      challenge_created_at: string;
      challenge_updated_at: string | null;
    }) => ({
      url: `${baseUrl}/challenge/${challenge.id}`,
      lastModified: new Date(challenge.challenge_updated_at || challenge.challenge_created_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })
  );

  // Public profile routes
  const publicProfileRoutes: MetadataRoute.Sitemap = publicProfiles.map((profile) => ({
    url: `${baseUrl}/profile/${profile.id}`,
    lastModified: new Date(profile.updated_at),
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  return [
    ...staticRoutes,
    ...forumCategoryRoutes,
    ...forumPostRoutes,
    ...foodProductRoutes,
    ...challengeRoutes,
    ...publicProfileRoutes,
  ];
}

/**
 * Fetch published forum posts for sitemap — paginated
 */
async function getForumPostsForSitemap() {
  try {
    const supabase = createCachedClient();
    const pageSize = 1000;
    let all: Array<{
      id: number;
      slug: string | null;
      forum_post_updated_at: string;
      last_activity_at: string | null;
      is_pinned: boolean;
      is_featured: boolean;
    }> = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from("forum")
        .select("id,slug,forum_post_updated_at,last_activity_at,is_pinned,is_featured")
        .eq("forum_published", true)
        .order("forum_post_created_at", { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) {
        // Silent during build — cert may not be available, return partial/empty
        if (
          process.env.NODE_ENV !== "production" ||
          !String(error.message).includes("certificate")
        ) {
          console.warn("Failed to fetch forum posts for sitemap:", error.message);
        }
        return all;
      }
      if (!data || data.length === 0) break;
      all = all.concat(data as typeof all);
      if (data.length < pageSize) break;
      from += pageSize;
      if (from >= 20000) break;
    }
    return all;
  } catch {
    return [];
  }
}

/**
 * Fetch active forum categories for sitemap
 */
async function getForumCategoriesForSitemap() {
  try {
    const supabase = createCachedClient();

    const { data, error } = await supabase
      .from("forum_categories")
      .select("slug,updated_at")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      if (process.env.NODE_ENV !== "production" || !String(error.message).includes("certificate")) {
        console.warn("Failed to fetch forum categories for sitemap:", error.message);
      }
      return [];
    }

    return data || [];
  } catch {
    return [];
  }
}

/**
 * Fetch active food posts for sitemap
 * Returns all active posts for complete SEO coverage — paginated to avoid 1000-row limit
 */
async function getFoodProductsForSitemap() {
  try {
    const supabase = createCachedClient();
    const pageSize = 1000;
    let all: Array<{
      id: number;
      post_name: string | null;
      post_slug: string | null;
      created_at: string;
      updated_at: string | null;
    }> = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from("posts")
        .select("id,post_name,post_slug,created_at,updated_at")
        .eq("is_active", true)
        .order("id", { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) {
        if (
          process.env.NODE_ENV !== "production" ||
          !String(error.message).includes("certificate")
        ) {
          console.warn("Failed to fetch food posts for sitemap:", error.message);
        }
        return all;
      }

      if (!data || data.length === 0) break;
      all = all.concat(data as typeof all);
      if (data.length < pageSize) break;
      from += pageSize;
      // Safety cap 50k to avoid runaway
      if (from >= 50000) break;
    }

    return all;
  } catch {
    // Silent fallback — sitemap still returns static routes
    return [];
  }
}

/**
 * Fetch published challenges for sitemap
 */
async function getChallengesForSitemap() {
  try {
    const supabase = createCachedClient();

    const { data, error } = await supabase
      .from("challenges")
      .select("id,challenge_created_at,challenge_updated_at")
      .eq("challenge_published", true)
      .order("id", { ascending: false });

    if (error) {
      if (process.env.NODE_ENV !== "production" || !String(error.message).includes("certificate")) {
        console.warn("Failed to fetch challenges for sitemap:", error.message);
      }
      return [];
    }

    return data || [];
  } catch {
    return [];
  }
}

/**
 * Fetch public user profiles for sitemap
 * Note: Disabled until is_public column is added to profiles table
 * TODO: Enable once database migration adds profiles.is_public column
 */
async function getPublicProfilesForSitemap(): Promise<Array<{ id: string; updated_at: string }>> {
  // Return empty array - public profiles feature not yet in database
  return [];
}
