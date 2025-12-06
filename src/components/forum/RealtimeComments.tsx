'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ForumCommentCard } from './ForumCommentCard';
import { RichTextEditor } from './RichTextEditor';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import type { ForumComment } from '@/api/forumAPI';
import { FaPaperPlane } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

type RealtimeCommentsProps = {
  forumId: number;
  postAuthorId: string;
  initialComments?: ForumComment[];
};

export function RealtimeComments({ forumId, postAuthorId, initialComments = [] }: RealtimeCommentsProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<ForumComment[]>(initialComments);
  const [loading, setLoading] = useState(!initialComments.length);
  const [submitting, setSubmitting] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [commentJson, setCommentJson] = useState<Record<string, unknown>>({});
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replies, setReplies] = useState<Record<number, ForumComment[]>>({});

  // Fetch initial comments if not provided
  useEffect(() => {
    if (initialComments.length) return;

    const fetchComments = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('comments')
        .select('*, profiles!comments_user_id_profiles_fkey (id, nickname, first_name, second_name, avatar_url)')
        .eq('forum_id', forumId)
        .is('parent_id', null)
        .order('is_pinned', { ascending: false })
        .order('is_best_answer', { ascending: false })
        .order('comment_created_at', { ascending: true });

      if (data) setComments(data as ForumComment[]);
      setLoading(false);
    };

    fetchComments();
  }, [forumId, initialComments.length]);

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`forum-comments-${forumId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments', filter: `forum_id=eq.${forumId}` },
        async (payload) => {
          // Fetch the full comment with profile
          const { data } = await supabase
            .from('comments')
            .select('*, profiles!comments_user_id_profiles_fkey (id, nickname, first_name, second_name, avatar_url)')
            .eq('id', payload.new.id)
            .single();

          if (data) {
            const newComment = data as ForumComment;
            if (newComment.parent_id) {
              // It's a reply
              setReplies((prev) => ({
                ...prev,
                [newComment.parent_id!]: [...(prev[newComment.parent_id!] || []), newComment],
              }));
            } else {
              // Top-level comment
              setComments((prev) => [...prev, newComment]);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'comments', filter: `forum_id=eq.${forumId}` },
        async (payload) => {
          const { data } = await supabase
            .from('comments')
            .select('*, profiles!comments_user_id_profiles_fkey (id, nickname, first_name, second_name, avatar_url)')
            .eq('id', payload.new.id)
            .single();

          if (data) {
            const updated = data as ForumComment;
            if (updated.parent_id) {
              setReplies((prev) => ({
                ...prev,
                [updated.parent_id!]: prev[updated.parent_id!]?.map((c) => (c.id === updated.id ? updated : c)) || [],
              }));
            } else {
              setComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'comments', filter: `forum_id=eq.${forumId}` },
        (payload) => {
          const deletedId = payload.old.id;
          setComments((prev) => prev.filter((c) => c.id !== deletedId));
          setReplies((prev) => {
            const newReplies = { ...prev };
            Object.keys(newReplies).forEach((key) => {
              newReplies[Number(key)] = newReplies[Number(key)].filter((c) => c.id !== deletedId);
            });
            return newReplies;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [forumId]);

  const handleSubmit = async () => {
    if (!user || !commentContent.trim()) return;

    setSubmitting(true);
    const supabase = createClient();

    const { error } = await supabase.from('comments').insert({
      forum_id: forumId,
      user_id: user.id,
      comment: commentContent,
      rich_content: commentJson,
      parent_id: replyingTo,
      depth: replyingTo ? 1 : 0,
    });

    if (!error) {
      setCommentContent('');
      setCommentJson({});
      setReplyingTo(null);
    }
    setSubmitting(false);
  };

  const handleLoadReplies = async (commentId: number) => {
    const supabase = createClient();
    const { data } = await supabase
      .from('comments')
      .select('*, profiles!comments_user_id_profiles_fkey (id, nickname, first_name, second_name, avatar_url)')
      .eq('parent_id', commentId)
      .order('comment_created_at', { ascending: true });

    if (data) {
      setReplies((prev) => ({ ...prev, [commentId]: data as ForumComment[] }));
    }
  };

  const handleDelete = async (commentId: number) => {
    const supabase = createClient();
    await supabase.from('comments').delete().eq('id', commentId);
  };

  if (loading) {
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

  return (
    <div className="space-y-6">
      {/* Comment input */}
      {user ? (
        <div className="space-y-3">
          {replyingTo && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Replying to comment</span>
              <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)}>
                Cancel
              </Button>
            </div>
          )}
          <RichTextEditor
            content={commentContent}
            placeholder="Write a comment..."
            onChange={(html, json) => {
              setCommentContent(html);
              setCommentJson(json);
            }}
            minHeight="100px"
          />
          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={submitting || !commentContent.trim()}>
              <FaPaperPlane className="mr-2 h-4 w-4" />
              {submitting ? 'Posting...' : 'Post Comment'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-6 bg-muted/30 rounded-lg">
          <p className="text-muted-foreground">Sign in to join the discussion</p>
        </div>
      )}

      {/* Comments list */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">{comments.length} Comments</h3>
        <AnimatePresence>
          {comments.map((comment, index) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.05 }}
            >
              <ForumCommentCard
                comment={comment}
                isPostAuthor={comment.user_id === postAuthorId}
                onReply={(id) => setReplyingTo(id)}
                onDelete={user?.id === comment.user_id ? handleDelete : undefined}
                onLoadReplies={handleLoadReplies}
                replies={replies[comment.id] || []}
                showReplies={!!replies[comment.id]?.length}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {comments.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No comments yet. Be the first to share your thoughts!
          </div>
        )}
      </div>
    </div>
  );
}
