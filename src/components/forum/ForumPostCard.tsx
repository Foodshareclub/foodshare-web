"use client";

import { useRouter } from "next/navigation";
import {
  TrendingUp,
  CheckCircle,
  Clock,
  MessageCircle,
  Eye,
  Heart,
  Lock,
  Pin,
  Bookmark,
  Share2,
} from "lucide-react";
import { ForumCategoryBadge } from "./ForumCategoryBadge";
import { ForumTagBadge } from "./ForumTagBadge";
import type { ForumPost } from "@/api/forumAPI";

const MODULE_LOAD_TIME = Date.now();

type ForumPostCardProps = {
  post: ForumPost;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  index?: number;
  variant?: "default" | "compact" | "featured";
};

export function ForumPostCard({
  post,
  onMouseEnter,
  onMouseLeave,
  index = 0,
  variant: _variant = "default",
}: ForumPostCardProps) {
  const router = useRouter();

  const onNavigateToPost = () => {
    router.push(`/forum/${post.slug || post.id}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const isHot = (post.views_count || 0) > 100 || (post.forum_likes_counter || 0) > 10;
  const isNew = MODULE_LOAD_TIME - new Date(post.forum_post_created_at).getTime() < 86400000;
  // React Compiler handles memoization automatically
  const lastActivityTime = new Date(
    post.last_activity_at || post.forum_post_created_at
  ).getTime();
  const hasActivity = lastActivityTime > MODULE_LOAD_TIME - 3600000;

  const postTypeStyles = {
    discussion: {
      bg: "bg-slate-100 dark:bg-slate-800",
      text: "text-slate-700 dark:text-slate-300",
      icon: null,
      gradient: "from-slate-500 to-slate-600",
    },
    question: {
      bg: "bg-amber-50 dark:bg-amber-900/30",
      text: "text-amber-700 dark:text-amber-400",
      icon: "?",
      gradient: "from-amber-500 to-orange-500",
    },
    announcement: {
      bg: "bg-blue-50 dark:bg-blue-900/30",
      text: "text-blue-700 dark:text-blue-400",
      icon: "!",
      gradient: "from-blue-500 to-indigo-500",
    },
    guide: {
      bg: "bg-emerald-50 dark:bg-emerald-900/30",
      text: "text-emerald-700 dark:text-emerald-400",
      icon: "📖",
      gradient: "from-emerald-500 to-teal-500",
    },
  };

  const typeStyle = postTypeStyles[post.post_type] || postTypeStyles.discussion;

  return (
    <div
      className="col-span-1 animate-in fade-in slide-in-from-bottom-4 duration-400"
      style={{ animationDelay: `${Math.min(index * 50, 300)}ms`, animationFillMode: "both" }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="transition-transform duration-200 ease-out hover:-translate-y-1.5 active:scale-[0.98]">
        <div
          className="relative bg-card rounded-2xl overflow-hidden cursor-pointer group border border-border/50 hover:border-primary/40 shadow-sm hover:shadow-xl transition-all duration-300"
          onClick={onNavigateToPost}
        >
          {/* Gradient border effect on hover */}
          <div
            className="absolute inset-0 rounded-2xl transition-opacity duration-300 pointer-events-none opacity-0 group-hover:opacity-100"
            style={{
              background:
                "linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.05))",
            }}
          />

          {/* New badge */}
          {isNew && !post.is_pinned && (
            <div className="absolute top-3 left-3 z-20">
              <span className="px-2 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold rounded-full shadow-lg animate-pulse">
                NEW
              </span>
            </div>
          )}

          {/* Image section */}
          {post.forum_post_image ? (
            <div className="relative overflow-hidden">
              {/* Skeleton placeholder - hidden when image loads via CSS */}
              <div
                className="absolute inset-0 bg-gradient-to-r from-muted via-muted/50 to-muted animate-pulse"
                style={{ aspectRatio: "16/9" }}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="w-full object-cover transition-transform duration-500 group-hover:scale-105 relative"
                style={{ aspectRatio: "16/9" }}
                src={post.forum_post_image}
                alt={post.forum_post_name || "Forum post"}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

              {/* Overlay badges */}
              <div className="absolute top-3 left-3 flex flex-wrap gap-2 z-10">
                {post.is_pinned && (
                  <span className="bg-gradient-to-r from-amber-500 to-orange-500 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-lg animate-in zoom-in duration-300">
                    <Pin className="w-3 h-3" />
                    Pinned
                  </span>
                )}
                {post.is_locked && (
                  <span className="bg-gray-700/90 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-lg">
                    <Lock className="w-3 h-3" />
                    Locked
                  </span>
                )}
                {isHot && (
                  <span className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-lg">
                    <TrendingUp className="w-3 h-3" />
                    Trending
                  </span>
                )}
              </div>

              {/* Quick stats overlay */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                  <span className="bg-black/40 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5">
                    <Eye className="w-3 h-3" />
                    {post.views_count || 0}
                  </span>
                  <span className="bg-black/40 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5">
                    <MessageCircle className="w-3 h-3" />
                    {post.forum_comments_counter || 0}
                  </span>
                </div>
              </div>

              {/* Hover actions */}
              <div className="absolute top-3 right-3 flex gap-2 z-10 transition-all duration-200 opacity-0 -translate-y-2.5 group-hover:opacity-100 group-hover:translate-y-0">
                <span className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm p-2 rounded-full shadow-lg block hover:bg-primary hover:text-white transition-colors">
                  <Bookmark className="w-3.5 h-3.5" />
                </span>
                <span className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm p-2 rounded-full shadow-lg block hover:bg-primary hover:text-white transition-colors">
                  <Share2 className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ) : (
            <div className={`h-1.5 bg-gradient-to-r ${typeStyle.gradient}`} />
          )}

          <div className="p-5">
            {/* Category & Post Type Row */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {post.forum_categories && <ForumCategoryBadge category={post.forum_categories} />}
              {post.post_type !== "discussion" && (
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${typeStyle.bg} ${typeStyle.text} flex items-center gap-1`}
                >
                  {typeStyle.icon && <span>{typeStyle.icon}</span>}
                  {post.post_type === "question" && "Question"}
                  {post.post_type === "announcement" && "Announcement"}
                  {post.post_type === "guide" && "Guide"}
                </span>
              )}
              {post.best_answer_id && (
                <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Solved
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className="text-lg font-bold text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors duration-200">
              {post.forum_post_name}
            </h3>

            {/* Description preview */}
            {post.forum_post_description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                {post.forum_post_description.replace(/<[^>]*>/g, "").slice(0, 200)}
              </p>
            )}

            {/* Tags */}
            {post.forum_post_tags && post.forum_post_tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {post.forum_post_tags.slice(0, 3).map((tagRelation) => (
                  <ForumTagBadge
                    key={tagRelation.forum_tags.id}
                    tag={tagRelation.forum_tags}
                    size="sm"
                  />
                ))}
                {post.forum_post_tags.length > 3 && (
                  <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded-full">
                    +{post.forum_post_tags.length - 3}
                  </span>
                )}
              </div>
            )}

            {/* Author & Meta */}
            <div className="flex items-center justify-between pt-4 border-t border-border/30">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {post.profiles?.avatar_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={post.profiles.avatar_url}
                      alt={post.profiles.nickname || "User"}
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
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full animate-pulse" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground truncate max-w-[120px]">
                    {post.profiles?.nickname || post.profiles?.first_name || "Anonymous"}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(post.last_activity_at || post.forum_post_created_at)}
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-muted-foreground text-sm hover:text-red-500 hover:scale-110 active:scale-95 transition-all cursor-pointer">
                  <Heart className="w-4 h-4" />
                  <span className="font-semibold">{post.forum_likes_counter || 0}</span>
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground text-sm">
                  <MessageCircle className="w-4 h-4" />
                  <span className="font-semibold">{post.forum_comments_counter || 0}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Bottom accent bar */}
          {post.post_type === "question" && !post.best_answer_id && (
            <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-400" />
          )}
          {post.best_answer_id && (
            <div className="h-1 bg-gradient-to-r from-green-400 to-emerald-400" />
          )}
          {post.is_pinned && !post.best_answer_id && post.post_type !== "question" && (
            <div className="h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          )}
        </div>
      </div>
    </div>
  );
}
