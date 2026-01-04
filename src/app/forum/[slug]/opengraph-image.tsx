import { ImageResponse } from "next/og";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const runtime = "edge";
export const alt = "FoodShare Forum Post";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// ISR: Regenerate image every 5 minutes
export const revalidate = 300;

// Cached fetch to deduplicate calls
const getForumPost = cache(async (slugOrId: string) => {
  const supabase = await createClient();
  const isNumericId = /^\d+$/.test(slugOrId);

  const query = supabase.from("forum").select(`
    id,
    slug,
    forum_post_name,
    forum_post_description,
    forum_categories!forum_category_id_fkey (category_name, category_emoji),
    profiles!forum_profile_id_profiles_fkey (nickname, first_name, avatar_url),
    views_count,
    forum_likes_counter
  `);

  const { data, error } = isNumericId
    ? await query.eq("id", parseInt(slugOrId, 10)).single()
    : await query.eq("slug", slugOrId).single();

  if (error || !data) return null;
  return data;
});

export default async function Image({ params }: { params: { slug: string } }) {
  const post = await getForumPost(params.slug);

  const title = post?.forum_post_name || "Forum Post";
  const description = post?.forum_post_description
    ? post.forum_post_description.replace(/<[^>]*>/g, "").slice(0, 120)
    : "Join the discussion on FoodShare Forum";
  // Handle Supabase joins (can be array or single object)
  const category = Array.isArray(post?.forum_categories)
    ? post.forum_categories[0]
    : post?.forum_categories;
  const profile = Array.isArray(post?.profiles) ? post.profiles[0] : post?.profiles;
  const categoryName = category?.category_name || "Discussion";
  const categoryEmoji = category?.category_emoji || "💬";
  const authorName = profile?.nickname || profile?.first_name || "Member";
  const viewsCount = post?.views_count || 0;
  const likesCount = post?.forum_likes_counter || 0;

  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 50%, #1D4ED8 100%)",
        fontFamily: "system-ui, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative elements */}
      <div
        style={{
          position: "absolute",
          top: -80,
          right: -80,
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.1)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -100,
          left: -100,
          width: 350,
          height: 350,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.08)",
        }}
      />

      {/* Main content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          zIndex: 1,
          padding: "0 60px",
          maxWidth: 1000,
        }}
      >
        {/* Category badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 20px",
            background: "rgba(255,255,255,0.2)",
            borderRadius: 50,
            fontSize: 20,
            color: "white",
            fontWeight: 600,
            marginBottom: 24,
          }}
        >
          <span>{categoryEmoji}</span>
          <span>{categoryName}</span>
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            fontSize: 48,
            fontWeight: 800,
            color: "white",
            textShadow: "0 4px 20px rgba(0,0,0,0.3)",
            marginBottom: 16,
            letterSpacing: "-1px",
            textAlign: "center",
            lineHeight: 1.2,
          }}
        >
          {title.length > 60 ? `${title.slice(0, 60)}...` : title}
        </div>

        {/* Description */}
        <div
          style={{
            display: "flex",
            fontSize: 22,
            color: "rgba(255,255,255,0.9)",
            textShadow: "0 2px 10px rgba(0,0,0,0.2)",
            marginBottom: 32,
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          {description}
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 16 }}>
          {/* Author */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              background: "rgba(255,255,255,0.15)",
              borderRadius: 50,
              fontSize: 18,
              color: "white",
              fontWeight: 500,
            }}
          >
            <span>👤</span>
            <span>{authorName}</span>
          </div>

          {/* Views */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              background: "rgba(255,255,255,0.15)",
              borderRadius: 50,
              fontSize: 18,
              color: "white",
              fontWeight: 500,
            }}
          >
            <span>👁️</span>
            <span>{viewsCount} views</span>
          </div>

          {/* Likes */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              background: "rgba(255,255,255,0.15)",
              borderRadius: 50,
              fontSize: 18,
              color: "white",
              fontWeight: 500,
            }}
          >
            <span>❤️</span>
            <span>{likesCount} likes</span>
          </div>
        </div>
      </div>

      {/* Logo and URL */}
      <div
        style={{
          position: "absolute",
          bottom: 28,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <img
          src={`${process.env.NEXT_PUBLIC_SITE_URL || "https://foodshare.club"}/logo192.png`}
          alt="FoodShare"
          width={40}
          height={40}
          style={{ borderRadius: 8 }}
        />
        <div
          style={{
            display: "flex",
            fontSize: 22,
            color: "rgba(255,255,255,0.9)",
            fontWeight: 500,
          }}
        >
          foodshare.club/forum
        </div>
      </div>
    </div>,
    {
      ...size,
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
      },
    }
  );
}
