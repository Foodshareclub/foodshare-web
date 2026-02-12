import { cache } from "react";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Eye, Heart, Clock, CheckCircle, Pin, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createCachedClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { generateArticleJsonLd, safeJsonLdStringify } from "@/lib/jsonld";
import { siteConfig } from "@/lib/metadata";
import { ForumCategoryBadge, ForumTagBadge, RealtimeComments } from "@/components/forum";
import { RichTextViewer } from "@/components/forum/RichTextViewer";
import { BackButton } from "@/components/navigation/BackButton";
import { Skeleton } from "@/components/ui/skeleton";
import type { ForumPost, ForumComment } from "@/api/forumAPI";

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  try {
    const supabase = createCachedClient();
    const { data } = await supabase
      .from("forum")
      .select("slug")
      .order("views", { ascending: false })
      .limit(50);

    return (data ?? []).filter((p) => p.slug).map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

type PageProps = {
  params: Promise<{ slug: string }>;
};

// Wrapped with cache() to deduplicate calls between generateMetadata and page component
const getForumPost = cache(async (slugOrId: string): Promise<ForumPost | null> => {
  const supabase = await createClient();

  // Check if it's a numeric ID
  const isNumericId = /^\d+$/.test(slugOrId);

  const query = supabase.from("forum").select(`
      *,
      profiles!forum_profile_id_profiles_fkey (id, nickname, first_name, second_name, avatar_url),
      forum_categories!forum_category_id_fkey (*),
      forum_post_tags (forum_tags (*))
    `);

  const { data, error } = isNumericId
    ? await query.eq("id", parseInt(slugOrId, 10)).single()
    : await query.eq("slug", slugOrId).single();

  if (error || !data) return null;
  return data as ForumPost;
});

async function getInitialComments(forumId: number): Promise<ForumComment[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("comments")
    .select(
      "*, profiles!comments_user_id_profiles_fkey (id, nickname, first_name, second_name, avatar_url)"
    )
    .eq("forum_id", forumId)
    .is("parent_id", null)
    .order("is_pinned", { ascending: false })
    .order("is_best_answer", { ascending: false })
    .order("comment_created_at", { ascending: true });

  return (data ?? []) as ForumComment[];
}

function CommentsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// generateMetadata uses cached getForumPost - no duplicate DB call
export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const post = await getForumPost(slug);

  if (!post) {
    return { title: "Post Not Found | FoodShare Forum" };
  }

  const title = post.forum_post_name || "Forum Post";
  const description = post.forum_post_description
    ? post.forum_post_description.replace(/<[^>]*>/g, "").slice(0, 160)
    : "Join the discussion on FoodShare Forum";
  const pageUrl = `${siteConfig.url}/forum/${post.slug || post.id}`;
  const imageUrl = post.forum_post_image || siteConfig.ogImage;
  const authorName = post.profiles?.nickname || post.profiles?.first_name || "FoodShare Member";

  return {
    title: `${title} | FoodShare Forum`,
    description,
    alternates: {
      canonical: pageUrl,
    },
    // OpenGraph: Facebook, LinkedIn, WhatsApp - Article type for content
    openGraph: {
      type: "article",
      locale: "en_US",
      url: pageUrl,
      siteName: "FoodShare",
      title,
      description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${title} - FoodShare Forum`,
          type: "image/jpeg",
        },
      ],
      publishedTime: post.forum_post_created_at,
      modifiedTime: post.forum_post_updated_at || undefined,
      authors: [authorName],
      section: "Community",
    },
    // Twitter / X Cards
    twitter: {
      card: "summary_large_image",
      site: "@foodshareapp",
      creator: "@foodshareapp",
      title: `${title} | FoodShare Forum`,
      description,
      images: [
        {
          url: imageUrl,
          alt: `${title} - FoodShare Forum`,
        },
      ],
    },
  };
}

export default async function ForumPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getForumPost(slug);

  if (!post) notFound();

  const initialComments = await getInitialComments(post.id);

  // Generate JSON-LD Article structured data for SEO
  const description = post.forum_post_description
    ? post.forum_post_description.replace(/<[^>]*>/g, "").slice(0, 160)
    : "Join the discussion on FoodShare Forum";

  const jsonLd = generateArticleJsonLd({
    title: post.forum_post_name || "Forum Post",
    description,
    url: `${siteConfig.url}/forum/${post.slug || post.id}`,
    image: post.forum_post_image || undefined,
    datePublished: post.forum_post_created_at,
    dateModified: post.forum_post_updated_at || undefined,
    authorName: post.profiles?.nickname || post.profiles?.first_name || "FoodShare Member",
    authorUrl: post.profiles?.id ? `${siteConfig.url}/profile/${post.profiles.id}` : undefined,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(jsonLd) }}
      />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <BackButton className="mb-6" label="Back to Forum" />

        {/* Post Header */}
        <article className="mb-8">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {post.forum_categories && <ForumCategoryBadge category={post.forum_categories} />}
            {post.is_pinned && (
              <span className="bg-amber-500/90 text-white px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5">
                <Pin className="w-3 h-3" />
                Pinned
              </span>
            )}
            {post.is_locked && (
              <span className="bg-gray-700/90 text-white px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5">
                <Lock className="w-3 h-3" />
                Locked
              </span>
            )}
            {post.best_answer_id && (
              <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                Solved
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold mb-4">{post.forum_post_name}</h1>

          {/* Author & Meta */}
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6 pb-6 border-b border-border">
            <div className="flex items-center gap-3">
              {/* eslint-disable @next/next/no-img-element */}
              {post.profiles?.avatar_url ? (
                <img
                  src={post.profiles.avatar_url}
                  alt={post.profiles.nickname || "User"}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-sm"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center ring-2 ring-white shadow-sm">
                  <span className="text-lg font-semibold text-white">
                    {post.profiles?.nickname?.charAt(0).toUpperCase() || "?"}
                  </span>
                </div>
              )}
              {/* eslint-enable @next/next/no-img-element */}
              <div>
                <p className="font-semibold">
                  {post.profiles?.nickname || post.profiles?.first_name || "Anonymous"}
                </p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDate(post.forum_post_created_at, { format: "long" })}
                  {post.is_edited && <span className="italic ml-2">(edited)</span>}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {post.views_count || 0} views
              </span>
              <span className="flex items-center gap-1">
                <Heart className="w-4 h-4" />
                {post.forum_likes_counter || 0} likes
              </span>
            </div>
          </div>

          {/* Post Image */}
          {post.forum_post_image && (
            <div className="mb-6 rounded-xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.forum_post_image}
                alt={post.forum_post_name || "Post image"}
                className="w-full object-cover max-h-96"
              />
            </div>
          )}

          {/* Post Content */}
          <div className="prose prose-lg dark:prose-invert max-w-none mb-6">
            {post.rich_content ? (
              <RichTextViewer content={post.rich_content} />
            ) : post.forum_post_description ? (
              <RichTextViewer content={post.forum_post_description} />
            ) : null}
          </div>

          {/* Tags */}
          {post.forum_post_tags && post.forum_post_tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
              {post.forum_post_tags.map((tagRelation) => (
                <ForumTagBadge key={tagRelation.forum_tags.id} tag={tagRelation.forum_tags} />
              ))}
            </div>
          )}
        </article>

        {/* Comments Section */}
        <section className="pt-8 border-t border-border">
          <Suspense fallback={<CommentsSkeleton />}>
            <RealtimeComments
              forumId={post.id}
              postAuthorId={post.profile_id}
              initialComments={initialComments}
            />
          </Suspense>
        </section>
      </div>
    </>
  );
}
