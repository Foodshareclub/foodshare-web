"use client";

import type { ForumPost } from "@/api/forumAPI";
import { resolveForumCoverSources } from "@/lib/forum-covers";
import { CheckCircle, Clock, Eye, Heart, Lock, MessageCircle, Pin, TrendingUp } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ForumCategoryBadge } from "./ForumCategoryBadge";
import { ForumCoverImage } from "./ForumCoverImage";
import { ForumTagBadge } from "./ForumTagBadge";

type ForumPostCardProps = {
  post: ForumPost;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  index?: number;
  variant?: "default" | "compact" | "featured";
};

const CARD_LABELS = {
  badgeNew: "NEW",
  badgePinned: "Pinned",
  badgeLocked: "Locked",
  badgeTrending: "Trending",
  badgeSolved: "Solved",
  typeQuestion: "Question",
  typeAnnouncement: "Announcement",
  typeGuide: "Guide",
  fallbackTitle: "Forum post",
  anonymousAuthor: "Anonymous",
  justNow: "Just now",
} as const;

const POST_TYPE_STYLES = {
  discussion: {
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-700 dark:text-slate-300",
    icon: null,
  },
  question: {
    bg: "bg-amber-50 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-400",
    icon: "?",
  },
  announcement: {
    bg: "bg-blue-50 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-400",
    icon: "!",
  },
  guide: {
    bg: "bg-emerald-50 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-400",
    icon: "📖",
  },
} as const;

function formatRelativeDate(dateString: string, nowMs: number | null): string {
  const date = new Date(dateString);
  if (nowMs === null) {
    return date.toISOString().slice(0, 10);
  }
  const diffMs = Math.max(0, nowMs - date.getTime());
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return CARD_LABELS.justNow;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function ForumPostCard({ post, onMouseEnter, onMouseLeave, index = 0 }: ForumPostCardProps) {
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    setNowMs(Date.now());
  }, []);

  const postHref = `/forum/${post.slug || post.id}`;
  const isHot = (post.views_count || 0) > 100 || (post.forum_likes_counter || 0) > 10;
  const createdTime = new Date(post.forum_post_created_at).getTime();
  const lastActivityTime = new Date(post.last_activity_at || post.forum_post_created_at).getTime();
  const isNew = nowMs !== null && nowMs - createdTime < 86400000;
  const hasActivity = nowMs !== null && lastActivityTime > nowMs - 3600000;

  const typeStyle = POST_TYPE_STYLES[post.post_type] || POST_TYPE_STYLES.discussion;
  const cover = resolveForumCoverSources({
    id: post.id,
    slug: post.slug,
    title: post.forum_post_name,
    description: post.forum_post_description,
    postType: post.post_type,
    categorySlug: post.forum_categories?.slug,
    imageUrl: post.forum_post_image,
  });

  const plainExcerpt = post.forum_post_description
    ? post.forum_post_description
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 200)
    : "";

  return (
    <div
      className="col-span-1 h-full animate-in fade-in slide-in-from-bottom-4 duration-400"
      style={{
        animationDelay: `${Math.min(index * 50, 300)}ms`,
        animationFillMode: "both",
        ...(index >= 6 ? { contentVisibility: "auto", containIntrinsicSize: "auto 24rem" } : {}),
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="h-full transition-transform duration-200 ease-out hover:-translate-y-1.5 active:scale-[0.98]">
        <article className="relative h-full flex flex-col bg-card rounded-2xl overflow-hidden group border border-border/50 hover:border-primary/40 shadow-sm hover:shadow-xl transition-all duration-300 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
          {/* Gradient border sheen on hover */}
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-2xl transition-opacity duration-300 pointer-events-none opacity-0 group-hover:opacity-100"
            style={{
              background: "linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.05))",
            }}
          />

          {/* Cover Media — guaranteed for every post via contextual generation + host rewrite */}
          <div className="relative overflow-hidden">
            <ForumCoverImage
              primaryUrl={cover.primaryUrl}
              fallbackUrl={cover.fallbackUrl}
              alt={post.forum_post_name || CARD_LABELS.fallbackTitle}
              priority={index < 2}
              className="group-hover:scale-105"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none"
            />

            {/* Status badges */}
            <div className="absolute top-3 start-3 flex flex-wrap gap-2 z-10 pointer-events-none">
              {isNew && !post.is_pinned && (
                <span className="px-2 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold rounded-full shadow-lg">
                  {CARD_LABELS.badgeNew}
                </span>
              )}
              {post.is_pinned && (
                <span className="bg-gradient-to-r from-amber-500 to-orange-500 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-lg">
                  <Pin className="w-3 h-3" aria-hidden="true" />
                  {CARD_LABELS.badgePinned}
                </span>
              )}
              {post.is_locked && (
                <span className="bg-gray-700/90 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-lg">
                  <Lock className="w-3 h-3" aria-hidden="true" />
                  {CARD_LABELS.badgeLocked}
                </span>
              )}
              {isHot && (
                <span className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-lg">
                  <TrendingUp className="w-3 h-3" aria-hidden="true" />
                  {CARD_LABELS.badgeTrending}
                </span>
              )}
            </div>

            {/* Quick view & comment pills */}
            <div className="absolute bottom-3 inset-x-3 flex items-center justify-between z-10 pointer-events-none">
              <div className="flex items-center gap-2">
                <span className="bg-black/45 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5">
                  <Eye className="w-3 h-3" aria-hidden="true" />
                  {post.views_count || 0}
                </span>
                <span className="bg-black/45 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5">
                  <MessageCircle className="w-3 h-3" aria-hidden="true" />
                  {post.forum_comments_counter || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Card body */}
          <div className="p-5 flex flex-col flex-1">
            <div className="flex items-center gap-2 mb-3 flex-wrap relative z-10">
              {post.forum_categories && <ForumCategoryBadge category={post.forum_categories} />}
              {post.post_type !== "discussion" && (
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${typeStyle.bg} ${typeStyle.text} flex items-center gap-1`}
                >
                  {typeStyle.icon && <span aria-hidden="true">{typeStyle.icon}</span>}
                  {post.post_type === "question" && CARD_LABELS.typeQuestion}
                  {post.post_type === "announcement" && CARD_LABELS.typeAnnouncement}
                  {post.post_type === "guide" && CARD_LABELS.typeGuide}
                </span>
              )}
              {post.best_answer_id && (
                <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  {CARD_LABELS.badgeSolved}
                </span>
              )}
            </div>

            <h3 className="text-lg font-bold text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors duration-200">
              <Link href={postHref} className="after:absolute after:inset-0 focus-visible:outline-none">
                {post.forum_post_name}
              </Link>
            </h3>

            {plainExcerpt && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">{plainExcerpt}</p>
            )}

            {post.forum_post_tags && post.forum_post_tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4 relative z-10">
                {post.forum_post_tags.slice(0, 3).map((tagRelation) => (
                  <ForumTagBadge key={tagRelation.forum_tags.id} tag={tagRelation.forum_tags} size="sm" />
                ))}
                {post.forum_post_tags.length > 3 && (
                  <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded-full">
                    {`+${post.forum_post_tags.length - 3}`}
                  </span>
                )}
              </div>
            )}

            <div className="mt-auto flex items-center justify-between pt-4 border-t border-border/30">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {post.profiles?.avatar_url ? (
                    <Image
                      src={post.profiles.avatar_url}
                      alt={post.profiles.nickname || "User"}
                      width={36}
                      height={36}
                      className="w-9 h-9 rounded-full object-cover ring-2 ring-background shadow-md"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center ring-2 ring-background shadow-md">
                      <span className="text-sm font-bold text-white">
                        {post.profiles?.nickname?.charAt(0).toUpperCase() || "?"}
                      </span>
                    </div>
                  )}
                  {hasActivity && (
                    <span className="absolute -bottom-0.5 -end-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full animate-pulse" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground truncate max-w-[120px]">
                    {post.profiles?.nickname || post.profiles?.first_name || CARD_LABELS.anonymousAuthor}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" aria-hidden="true" />
                    {formatRelativeDate(post.last_activity_at || post.forum_post_created_at, nowMs)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-muted-foreground text-sm">
                  <Heart className="w-4 h-4" aria-hidden="true" />
                  <span className="font-semibold">{post.forum_likes_counter || 0}</span>
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground text-sm">
                  <MessageCircle className="w-4 h-4" aria-hidden="true" />
                  <span className="font-semibold">{post.forum_comments_counter || 0}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Bottom status bar */}
          {post.post_type === "question" && !post.best_answer_id && (
            <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-400" />
          )}
          {post.best_answer_id && <div className="h-1 bg-gradient-to-r from-green-400 to-emerald-400" />}
          {post.is_pinned && !post.best_answer_id && post.post_type !== "question" && (
            <div className="h-1 bg-gradient-to-r from-amber-500 to-amber-500" />
          )}
        </article>
      </div>
    </div>
  );
}
