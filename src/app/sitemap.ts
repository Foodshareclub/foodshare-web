import { MetadataRoute } from "next";
import { siteConfig } from "@/lib/metadata";
import { createCachedClient } from "@/lib/supabase/server";

/**
 * Dynamic sitemap for SEO
 * Includes static routes, forum posts, and forum categories
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteConfig.url;

  // Fetch forum data for sitemap
  const [forumPosts, forumCategories] = await Promise.all([
    getForumPostsForSitemap(),
    getForumCategoriesForSitemap(),
  ]);

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
      url: `${baseUrl}/food?type=food`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/food?type=things`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/food?type=foodbanks`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/food?type=fridges`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/food?type=borrow`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/food?type=wanted`,
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
    {
      url: `${baseUrl}/auth/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
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

  return [...staticRoutes, ...forumCategoryRoutes, ...forumPostRoutes];
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
      .order("forum_post_created_at", { ascending: false })
      .limit(500);

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
