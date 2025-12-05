'use client';

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ForumComment } from "@/api/forumAPI";
import { useAuth } from "@/hooks/useAuth";
import { FaAward, FaCheckCircle, FaChevronDown, FaCommentDots, FaEdit, FaEllipsisH, FaFlag, FaHeart, FaReply, FaTrash } from 'react-icons/fa';

type ForumCommentCardProps = {
  comment: ForumComment;
  isPostAuthor?: boolean;
  onReply?: (commentId: number) => void;
  onEdit?: (comment: ForumComment) => void;
  onDelete?: (commentId: number) => void;
  onLike?: (commentId: number) => void;
  onMarkBestAnswer?: (commentId: number) => void;
  onReport?: (commentId: number) => void;
  onLoadReplies?: (commentId: number) => void;
  replies?: ForumComment[];
  showReplies?: boolean;
  isHighlighted?: boolean;
};

// React Compiler handles memoization automatically
export function ForumCommentCard({
  comment,
  isPostAuthor = false,
  onReply,
  onEdit,
  onDelete,
  onLike,
  onMarkBestAnswer,
  onReport,
  onLoadReplies,
  replies = [],
  showReplies = false,
  isHighlighted = false,
}: ForumCommentCardProps) {
    // Get current user ID from useAuth hook (replaces Redux selector)
    const { user } = useAuth();
    const userId = user?.id;
    const [showMenu, setShowMenu] = useState(false);
    const [expanded, setExpanded] = useState(showReplies);
    const [isLiked, setIsLiked] = useState(false);
    const isOwnComment = userId === comment.user_id;

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

  // React Compiler optimizes these handlers automatically
  const handleToggleReplies = () => {
    if (!expanded && onLoadReplies && comment.replies_count > 0) {
      onLoadReplies(comment.id);
    }
    setExpanded(!expanded);
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    onLike?.(comment.id);
  };

    // Dynamic indentation based on depth
    const getIndentation = () => {
      if (comment.depth === 0) return "";
      if (comment.depth === 1) return "ml-6 md:ml-10";
      return "ml-10 md:ml-16";
    };

    return (
      <motion.div
        className={getIndentation()}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Thread connector for nested comments */}
        {comment.depth > 0 && (
          <div className="flex items-start mb-2">
            <FaReply className="w-4 h-4 text-muted-foreground/50 mr-2 mt-1 flex-shrink-0" />
            <span className="text-xs text-muted-foreground">
              "Reply"
            </span>
          </div>
        )}

        <motion.div
          whileHover={{ scale: 1.005 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
          <div
            className={cn(
              "rounded-2xl p-0 mb-3 overflow-hidden transition-all duration-300",
              comment.is_best_answer ? "glass-accent-primary" : "glass-subtle",
              comment.is_pinned && "ring-2 ring-amber-400/50",
              isHighlighted && "ring-2 ring-green-400/50 shadow-lg"
            )}
          >
            {/* Best Answer Banner */}
            {comment.is_best_answer && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                className="bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-2 flex items-center gap-2"
              >
                <FaAward className="w-4 h-4 text-white" />
                <span className="text-white text-sm font-semibold">
                  "Best Answer"
                </span>
                <FaCheckCircle className="w-4 h-4 text-white ml-auto" />
              </motion.div>
            )}

            <div className="p-4 md:p-5">
              {/* Header: Author & Time */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {/* Avatar with gradient fallback */}
                  <div className="relative">
                    {comment.profiles?.avatar_url ? (
                      <img
                        src={comment.profiles.avatar_url}
                        alt={comment.profiles.nickname || "User"}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center ring-2 ring-white shadow-sm">
                        <span className="text-sm font-bold text-white">
                          {comment.profiles?.nickname?.charAt(0).toUpperCase() || "?"}
                        </span>
                      </div>
                    )}
                    {/* Post author badge */}
                    {isPostAuthor && (
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                        <FaCheckCircle className="w-3 h-3 text-white" />
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {comment.profiles?.nickname || comment.profiles?.first_name || "Anonymous"}
                      </span>
                      {isOwnComment && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-full font-medium">
                          You
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatDate(comment.comment_created_at)}</span>
                      {comment.is_edited && (
                        <span className="italic flex items-center gap-1">
                          <FaEdit className="w-3 h-3" />
                          "edited"
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions Menu */}
                <div className="relative">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                    onClick={() => setShowMenu(!showMenu)}
                  >
                    <FaEllipsisH className="w-4 h-4 text-muted-foreground" />
                  </motion.button>

                  <AnimatePresence>
                    {showMenu && (
                      <>
                        {/* Backdrop to close menu */}
                        <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -10 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-10 bg-popover rounded-xl shadow-xl border border-border py-2 z-20 min-w-[160px] overflow-hidden"
                        >
                          {isOwnComment && onEdit && (
                            <button
                              className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted/50 flex items-center gap-3 transition-colors"
                              onClick={() => {
                                onEdit(comment);
                                setShowMenu(false);
                              }}
                            >
                              <FaEdit className="w-4 h-4 text-muted-foreground" />
                              "Edit"
                            </button>
                          )}
                          {isOwnComment && onDelete && (
                            <button
                              className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-50 flex items-center gap-3 text-red-600 transition-colors"
                              onClick={() => {
                                onDelete(comment.id);
                                setShowMenu(false);
                              }}
                            >
                              <FaTrash className="w-4 h-4" />
                              "Delete"
                            </button>
                          )}
                          {!isOwnComment && onReport && (
                            <button
                              className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted/50 flex items-center gap-3 transition-colors"
                              onClick={() => {
                                onReport(comment.id);
                                setShowMenu(false);
                              }}
                            >
                              <FaFlag className="w-4 h-4 text-muted-foreground" />
                              "Report"
                            </button>
                          )}
                          {isPostAuthor && !comment.is_best_answer && onMarkBestAnswer && (
                            <>
                              <div className="h-px bg-gray-100 my-1" />
                              <button
                                className="w-full px-4 py-2.5 text-left text-sm hover:bg-green-50 flex items-center gap-3 text-green-600 transition-colors"
                                onClick={() => {
                                  onMarkBestAnswer(comment.id);
                                  setShowMenu(false);
                                }}
                              >
                                <FaAward className="w-4 h-4" />
                                "Mark as Best"
                              </button>
                            </>
                          )}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Comment Content */}
              <div className="text-foreground/80 leading-relaxed whitespace-pre-wrap mb-4 pl-[52px]">
                {comment.comment}
              </div>

              {/* Footer: Actions */}
              <div className="flex items-center gap-1 pl-[52px]">
                {onLike && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${
                      isLiked
                        ? "bg-red-500/10 text-red-600 dark:text-red-400"
                        : "text-muted-foreground hover:bg-muted hover:text-red-500"
                    }`}
                    onClick={handleLike}
                  >
                    <FaHeart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
                    <span className="font-medium">
                      {(comment.likes_count || 0) + (isLiked ? 1 : 0)}
                    </span>
                  </motion.button>
                )}

                {onReply && comment.depth < 2 && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-muted-foreground hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                    onClick={() => onReply(comment.id)}
                  >
                    <FaReply className="w-4 h-4" />
                    "Reply"
                  </motion.button>
                )}

                {comment.replies_count > 0 && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-muted-foreground hover:bg-muted transition-all ml-auto"
                    onClick={handleToggleReplies}
                  >
                    <FaCommentDots className="w-4 h-4" />
                    <span className="font-medium">{comment.replies_count}</span>
                    <motion.span
                      animate={{ rotate: expanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <FaChevronDown className="w-4 h-4" />
                    </motion.span>
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Nested Replies with animation */}
        <AnimatePresence>
          {expanded && replies.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              {/* Vertical thread line */}
              <div className="absolute left-5 top-0 bottom-4 w-0.5 bg-gradient-to-b from-gray-200 to-transparent" />

              <div className="space-y-2">
                {replies.map((reply, index) => (
                  <motion.div
                    key={reply.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <ForumCommentCard
                      comment={reply}
                      isPostAuthor={isPostAuthor}
                      onReply={onReply}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onLike={onLike}
                      onReport={onReport}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
}
