"use client";

import { useState } from "react";
import {
  Award,
  CheckCircle,
  ChevronDown,
  MessageCircle,
  Pencil,
  MoreHorizontal,
  Flag,
  Heart,
  Reply,
  Trash2,
} from "lucide-react";
import { RichTextViewer } from "./RichTextViewer";
import { cn, formatDate } from "@/lib/utils";
import type { ForumComment } from "@/api/forumAPI";
import { useAuth } from "@/hooks/useAuth";

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
    <div className={cn(getIndentation(), "animate-in fade-in slide-in-from-left-2 duration-300")}>
      {/* Thread connector for nested comments */}
      {comment.depth > 0 && (
        <div className="flex items-start mb-2">
          <Reply className="w-4 h-4 text-muted-foreground/50 mr-2 mt-1 flex-shrink-0" />
          <span className="text-xs text-muted-foreground">&quot;Reply&quot;</span>
        </div>
      )}

      <div className="transition-transform duration-200 hover:scale-[1.005]">
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
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-2 flex items-center gap-2 animate-in slide-in-from-top duration-300">
              <Award className="w-4 h-4 text-white" />
              <span className="text-white text-sm font-semibold">&quot;Best Answer&quot;</span>
              <CheckCircle className="w-4 h-4 text-white ml-auto" />
            </div>
          )}

          <div className="p-4 md:p-5">
            {/* Header: Author & Time */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                {/* Avatar with gradient fallback */}
                <div className="relative">
                  {/* eslint-disable @next/next/no-img-element */}
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
                  {/* eslint-enable @next/next/no-img-element */}
                  {/* Post author badge */}
                  {isPostAuthor && (
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                      <CheckCircle className="w-3 h-3 text-white" />
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
                    <span>
                      {formatDate(comment.comment_created_at, { format: "relative-short" })}
                    </span>
                    {comment.is_edited && (
                      <span className="italic flex items-center gap-1">
                        <Pencil className="w-3 h-3" />
                        &quot;edited&quot;
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions Menu */}
              <div className="relative">
                <button
                  className="p-2 rounded-full hover:bg-gray-100 hover:scale-110 active:scale-95 transition-all"
                  onClick={() => setShowMenu(!showMenu)}
                >
                  <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                </button>

                {showMenu && (
                  <>
                    {/* Backdrop to close menu */}
                    <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 top-10 bg-popover rounded-xl shadow-xl border border-border py-2 z-20 min-w-[160px] overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-150">
                      {isOwnComment && onEdit && (
                        <button
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted/50 flex items-center gap-3 transition-colors"
                          onClick={() => {
                            onEdit(comment);
                            setShowMenu(false);
                          }}
                        >
                          <Pencil className="w-4 h-4 text-muted-foreground" />
                          &quot;Edit&quot;
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
                          <Trash2 className="w-4 h-4" />
                          &quot;Delete&quot;
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
                          <Flag className="w-4 h-4 text-muted-foreground" />
                          &quot;Report&quot;
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
                            <Award className="w-4 h-4" />
                            &quot;Mark as Best&quot;
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Comment Content */}
            <div className="text-foreground/80 leading-relaxed mb-4 pl-[52px]">
              {comment.rich_content &&
              typeof comment.rich_content === "object" &&
              Object.keys(comment.rich_content as Record<string, unknown>).length > 0 ? (
                <RichTextViewer content={comment.rich_content} />
              ) : comment.comment ? (
                <RichTextViewer content={comment.comment} />
              ) : null}
            </div>

            {/* Footer: Actions */}
            <div className="flex items-center gap-1 pl-[52px]">
              {onLike && (
                <button
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all hover:scale-105 active:scale-95",
                    isLiked
                      ? "bg-red-500/10 text-red-600 dark:text-red-400"
                      : "text-muted-foreground hover:bg-muted hover:text-red-500"
                  )}
                  onClick={handleLike}
                >
                  <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
                  <span className="font-medium">
                    {(comment.likes_count || 0) + (isLiked ? 1 : 0)}
                  </span>
                </button>
              )}

              {onReply && comment.depth < 2 && (
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-muted-foreground hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition-all hover:scale-105 active:scale-95"
                  onClick={() => onReply(comment.id)}
                >
                  <Reply className="w-4 h-4" />
                  &quot;Reply&quot;
                </button>
              )}

              {comment.replies_count > 0 && (
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-muted-foreground hover:bg-muted transition-all hover:scale-105 active:scale-95 ml-auto"
                  onClick={handleToggleReplies}
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="font-medium">{comment.replies_count}</span>
                  <span
                    className={cn("transition-transform duration-200", expanded && "rotate-180")}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Nested Replies with animation */}
      {expanded && replies.length > 0 && (
        <div className="relative animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Vertical thread line */}
          <div className="absolute left-5 top-0 bottom-4 w-0.5 bg-gradient-to-b from-gray-200 to-transparent" />

          <div className="space-y-2">
            {replies.map((reply, index) => (
              <div
                key={reply.id}
                className="animate-in fade-in slide-in-from-top-2 duration-300"
                style={{ animationDelay: `${index * 50}ms`, animationFillMode: "both" }}
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
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
