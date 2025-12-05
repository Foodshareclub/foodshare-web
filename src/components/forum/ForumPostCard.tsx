'use client';

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

import { motion } from "framer-motion";
import { GlassCard } from "@/components/Glass";
import type { ForumPost } from "@/api/forumAPI";
import { ForumCategoryBadge } from "./ForumCategoryBadge";
import { ForumTagBadge } from "./ForumTagBadge";
import { FaArrowUp, FaChartLine, FaCheckCircle, FaClock, FaCommentDots, FaEye, FaHeart, FaLock, FaThumbtack } from 'react-icons/fa';

// Module-level timestamp for activity checks (computed once on module load)
const MODULE_LOAD_TIME = Date.now();

type ForumPostCardProps = {
  post: ForumPost;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  index?: number;
};

// React Compiler handles memoization automatically
export function ForumPostCard({ post, onMouseEnter, onMouseLeave, index = 0 }: ForumPostCardProps) {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // React Compiler optimizes this handler automatically
  const onNavigateToPost = () => {
    router.push(`/community/${post.slug || post.id}`);
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
    const hasActivity = useMemo(() => {
      const lastActivityTime = new Date(
        post.last_activity_at || post.forum_post_created_at
      ).getTime();
      const oneHourAgo = MODULE_LOAD_TIME - 3600000;
      return lastActivityTime > oneHourAgo;
    }, [post.last_activity_at, post.forum_post_created_at]);

    // Post type styling
    const postTypeStyles = {
      discussion: { bg: "bg-slate-100", text: "text-slate-700", icon: null },
      question: { bg: "bg-amber-50", text: "text-amber-700", icon: "?" },
      announcement: { bg: "bg-blue-50", text: "text-blue-700", icon: "!" },
      guide: { bg: "bg-emerald-50", text: "text-emerald-700", icon: "📖" },
    };

    const typeStyle = postTypeStyles[post.post_type] || postTypeStyles.discussion;

    return (
      <motion.div
        className="col-span-1"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
        onMouseEnter={() => {
          setIsHovered(true);
          onMouseEnter?.();
        }}
        onMouseLeave={() => {
          setIsHovered(false);
          onMouseLeave?.();
        }}
      >
        <motion.div
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <GlassCard
            variant="standard"
            borderRadius="20px"
            padding="0"
            overflow="hidden"
            className="cursor-pointer group relative"
            onClick={onNavigateToPost}
          >
            {/* Gradient border effect on hover */}
            <div
              className={`absolute inset-0 rounded-[20px] transition-opacity duration-300 pointer-events-none ${
                isHovered ? "opacity-100" : "opacity-0"
              }`}
              style={{
                background:
                  "linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.1))",
              }}
            />

            {/* Image section */}
            {post.forum_post_image ? (
              <div className="relative overflow-hidden">
                {/* Skeleton loader */}
                {!imageLoaded && (
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer" />
                )}
                <motion.img
                  className="w-full object-cover"
                  style={{ aspectRatio: "16/9" }}
                  src={post.forum_post_image}
                  alt={post.forum_post_name || "Forum post"}
                  onLoad={() => setImageLoaded(true)}
                  animate={{ scale: isHovered ? 1.05 : 1 }}
                  transition={{ duration: 0.4 }}
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-60" />

                {/* Overlay badges */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                  {post.is_pinned && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="bg-amber-500/90 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-lg"
                    >
                      <FaThumbtack className="w-3 h-3" />
                      "Pinned"
                    </motion.span>
                  )}
                  {post.is_locked && (
                    <span className="bg-gray-700/90 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-lg">
                      <FaLock className="w-3 h-3" />
                      "Locked"
                    </span>
                  )}
                  {isHot && (
                    <span className="bg-[#FF2D55] text-white px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-lg">
                      <FaChartLine className="w-3 h-3" />
                      Hot
                    </span>
                  )}
                </div>

                {/* Quick stats overlay on image */}
                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  <span className="bg-black/50 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                    <FaEye className="w-3 h-3" />
                    {post.views_count || 0}
                  </span>
                </div>

                {/* Navigate arrow on hover */}
                <motion.div
                  className="absolute top-3 right-3"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: isHovered ? 1 : 0, scale: isHovered ? 1 : 0.8 }}
                  transition={{ duration: 0.2 }}
                >
                  <span className="bg-background/90 backdrop-blur-sm p-2 rounded-full shadow-lg block">
                    <FaArrowUp className="w-4 h-4 text-foreground" />
                  </span>
                </motion.div>
              </div>
            ) : (
              /* Decorative header for posts without images */
              <div className="h-2 bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400" />
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
                  <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                    <FaCheckCircle className="w-3.5 h-3.5" />
                    "Solved"
                  </span>
                )}
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold text-foreground line-clamp-2 mb-2 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors duration-200">
                {post.forum_post_name}
              </h3>

              {/* Description preview */}
              {post.forum_post_description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                  {post.forum_post_description}
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
              <div className="flex items-center justify-between pt-4 border-t border-border/50">
                {/* Author */}
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    {post.profiles?.avatar_url ? (
                      <img
                        src={post.profiles.avatar_url}
                        alt={post.profiles.nickname || "User"}
                        className="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow-sm"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center ring-2 ring-white shadow-sm">
                        <span className="text-xs font-semibold text-white">
                          {post.profiles?.nickname?.charAt(0).toUpperCase() || "?"}
                        </span>
                      </div>
                    )}
                    {/* Online indicator */}
                    {hasActivity && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground/80 truncate max-w-[100px]">
                      {post.profiles?.nickname || post.profiles?.first_name || "Anonymous"}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <FaClock className="w-3 h-3" />
                      {formatDate(post.last_activity_at || post.forum_post_created_at)}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3">
                  <motion.span
                    className="flex items-center gap-1 text-muted-foreground text-xs hover:text-red-500 transition-colors cursor-pointer"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <FaHeart className="w-4 h-4" />
                    <span className="font-medium">{post.forum_likes_counter || 0}</span>
                  </motion.span>
                  <span className="flex items-center gap-1 text-muted-foreground text-xs">
                    <FaCommentDots className="w-4 h-4" />
                    <span className="font-medium">{post.forum_comments_counter || 0}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom progress bar for questions */}
            {post.post_type === "question" && !post.best_answer_id && (
              <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-400" />
            )}
            {post.best_answer_id && (
              <div className="h-1 bg-gradient-to-r from-green-400 to-emerald-400" />
            )}
          </GlassCard>
        </motion.div>
      </motion.div>
    );
}
