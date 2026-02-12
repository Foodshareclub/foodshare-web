/**
 * Reports Data Layer
 *
 * Cached data fetching functions for post reports.
 */

import { cacheLife, cacheTag } from 'next/cache';
import { createCachedClient } from '@/lib/supabase/server';
import { CACHE_TAGS } from './cache-keys';

// ============================================================================
// Types
// ============================================================================

export interface PostReport {
  id: string;
  post_id: number;
  reporter_id: string;
  reason: string;
  description: string | null;
  ai_analysis: {
    summary: string;
    categories: string[];
    reasoning: string;
    suggestedAction: string;
    riskFactors: string[];
  } | null;
  ai_severity_score: number | null;
  ai_recommended_action: string | null;
  ai_confidence: number | null;
  status: 'pending' | 'ai_reviewed' | 'under_review' | 'resolved' | 'dismissed';
  moderator_id: string | null;
  moderator_action: string | null;
  moderator_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  post?: {
    id: number;
    post_name: string;
    post_type: string;
    profile_id: string;
  };
  reporter?: {
    id: string;
    nickname: string;
    avatar_url: string;
  };
}

export interface ReportStats {
  total: number;
  pending: number;
  aiReviewed: number;
  resolved: number;
  highSeverity: number;
}

// ============================================================================
// Cached Data Functions
// ============================================================================

/**
 * Get pending reports for admin review (sorted by AI severity)
 */
export async function getPendingReports(limit = 50): Promise<PostReport[]> {
  cacheLife('short');
  cacheTag(CACHE_TAGS.ADMIN, 'reports');

  const supabase = createCachedClient();

  const { data, error } = await supabase
    .from('post_reports')
    .select(`
      *,
      post:posts(id, post_name, post_type, profile_id),
      reporter:profiles!post_reports_reporter_id_fkey(id, nickname, avatar_url)
    `)
    .in('status', ['pending', 'ai_reviewed'])
    .order('ai_severity_score', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as PostReport[];
}

/**
 * Get all reports with pagination
 */
export async function getReports(
  options: {
    status?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<PostReport[]> {
  const { status, limit = 50, offset = 0 } = options;

  const supabase = createCachedClient();

  let query = supabase
    .from('post_reports')
    .select(`
      *,
      post:posts(id, post_name, post_type, profile_id),
      reporter:profiles!post_reports_reporter_id_fkey(id, nickname, avatar_url)
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return (data ?? []) as PostReport[];
}

/**
 * Get report statistics for admin dashboard
 */
export async function getReportStats(): Promise<ReportStats> {
  cacheLife('short');
  cacheTag(CACHE_TAGS.ADMIN, 'reports');

  const supabase = createCachedClient();

  // Get counts by status
  const { data: statusCounts, error: statusError } = await supabase
    .from('post_reports')
    .select('status')
    .then(({ data, error }) => {
      if (error) return { data: null, error };
      const counts = {
        total: data?.length || 0,
        pending: data?.filter((r) => r.status === 'pending').length || 0,
        aiReviewed: data?.filter((r) => r.status === 'ai_reviewed').length || 0,
        resolved: data?.filter((r) => r.status === 'resolved').length || 0,
      };
      return { data: counts, error: null };
    });

  if (statusError) throw new Error(statusError.message);

  // Get high severity count (score >= 70)
  const { count: highSeverity, error: severityError } = await supabase
    .from('post_reports')
    .select('*', { count: 'exact', head: true })
    .gte('ai_severity_score', 70)
    .in('status', ['pending', 'ai_reviewed']);

  if (severityError) throw new Error(severityError.message);

  return {
    ...statusCounts!,
    highSeverity: highSeverity || 0,
  };
}

/**
 * Get reports for a specific post
 */
export async function getPostReports(postId: number): Promise<PostReport[]> {
  const supabase = createCachedClient();

  const { data, error } = await supabase
    .from('post_reports')
    .select(`
      *,
      reporter:profiles!post_reports_reporter_id_fkey(id, nickname, avatar_url)
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as PostReport[];
}

/**
 * Check if user has already reported a post
 */
export async function hasUserReportedPost(
  postId: number,
  userId: string
): Promise<boolean> {
  const supabase = createCachedClient();

  const { data, error } = await supabase
    .from('post_reports')
    .select('id')
    .eq('post_id', postId)
    .eq('reporter_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message);
  }

  return !!data;
}
