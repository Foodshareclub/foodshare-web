import { MetadataRoute } from "next";
import { siteConfig } from "@/lib/metadata";
import { createCachedClient } from "@/lib/supabase/server";

/**
 * Dynamic sitemap for SEO
 * Includes static routes, food products, forum posts, and forum categories
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
    // Challenges section
    {
      url: `${baseUrl}/challenge`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  // Forum category routes
  const forumCategoryRoutes: MetadataRoute.Sitemap = forumCategories.map((category) => ({
    url: `${baseUrl}/forum?category=${category.slug}`,
    lastModified: new Date(category.updated_at),
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  // Forum post routes
  const forumPostRoutes: MetadataRoute.Sitemap = forumPosts.map((post) => ({
    url: `${baseUrl}/forum/${post.slug || post.id}`,
    lastModified: new Date(post.last_activity_at || post.forum_post_updated_at),
    changeFrequency: "weekly" as const,
    priority: post.is_pinned ? 0.8 : post.is_featured ? 0.7 : 0.6,
  }));

  // Food product routes (individual listings)
  const foodProductRoutes: MetadataRoute.Sitemap = foodProducts.map((product) => ({
    url: `${baseUrl}/food/${product.id}`,
    lastModified: new Date(product.updated_at || product.created_at),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Challenge routes
  const challengeRoutes: MetadataRoute.Sitemap = challenges.map((challenge) => ({
    url: `${baseUrl}/challenge/${challenge.id}`,
    lastModified: new Date(challenge.challenge_updated_at || challenge.challenge_created_at),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

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
 * Fetch published forum posts for sitemap
 */
async function getForumPostsForSitemap() {
  try {
    const supabase = createCachedClient();

    const { data, error } = await supabase
      .from("forum")
      .select("id, slug, forum_post_updated_at, last_activity_at, is_pinned, is_featured")
      .eq("forum_published", true)
      .order("forum_post_created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch forum posts for sitemap:", error);
      return [];
    }

    return data || [];
  } catch {
    console.error("Error fetching forum posts for sitemap");
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
      .select("slug, updated_at")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Failed to fetch forum categories for sitemap:", error);
      return [];
    }

    return data || [];
  } catch {
    console.error("Error fetching forum categories for sitemap");
    return [];
  }
}

/**
 * Fetch active food posts for sitemap
 * Returns all active posts for complete SEO coverage
 */
async function getFoodProductsForSitemap() {
  try {
    const supabase = createCachedClient();

    const { data, error } = await supabase
      .from("posts")
      .select("id, created_at, updated_at")
      .eq("is_active", true)
      .order("id", { ascending: false });

    if (error) {
      console.error("Failed to fetch food posts for sitemap:", error);
      return [];
    }

    return data || [];
  } catch {
    console.error("Error fetching food posts for sitemap");
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
      .select("id, challenge_created_at, challenge_updated_at")
      .eq("challenge_published", true)
      .order("id", { ascending: false });

    if (error) {
      console.error("Failed to fetch challenges for sitemap:", error);
      return [];
    }

    return data || [];
  } catch {
    console.error("Error fetching challenges for sitemap");
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
