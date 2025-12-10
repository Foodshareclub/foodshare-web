'use server';

import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import {
  type ActionResult,
  withErrorHandling,
  validateWithSchema,
} from '@/lib/errors';
import { CACHE_TAGS, invalidateTag } from '@/lib/data/cache-keys';

// ============================================================================
// Zod Schemas
// ============================================================================

const reportReasons = [
  'spam',
  'inappropriate',
  'misleading',
  'expired',
  'wrong_location',
  'safety_concern',
  'duplicate',
  'other',
] as const;

const createReportSchema = z.object({
  post_id: z.number().int().positive('Invalid post ID'),
  reason: z.enum(reportReasons, { message: 'Invalid report reason' }),
  description: z.string().max(1000).optional(),
});

const resolveReportSchema = z.object({
  report_id: z.string().uuid('Invalid report ID'),
  action: z.enum([
    'dismissed',
    'warning_sent',
    'post_hidden',
    'post_removed',
    'user_banned',
  ]),
  notes: z.string().max(500).optional(),
});

// ============================================================================
// Types
// ============================================================================

export type ReportReason = (typeof reportReasons)[number];

export interface AIAnalysis {
  summary: string;
  categories: string[];
  reasoning: string;
  suggestedAction: string;
  riskFactors: string[];
}

export interface CreateReportInput {
  post_id: number;
  reason: ReportReason;
  description?: string;
}

// ============================================================================
// Server Actions
// ============================================================================

/**
 * Create a new post report with AI analysis
 */
export async function createPostReport(
  input: CreateReportInput
): Promise<ActionResult<{ id: string; aiAnalyzed: boolean }>> {
  const validation = validateWithSchema(createReportSchema, input);
  if (!validation.success) {
    return validation;
  }

  return withErrorHandling(async () => {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    // Check if user already reported this post
    const { data: existingReport } = await supabase
      .from('post_reports')
      .select('id')
      .eq('post_id', validation.data.post_id)
      .eq('reporter_id', user.id)
      .single();

    if (existingReport) {
      throw new Error('You have already reported this post');
    }

    // Get post details for AI analysis
    const { data: post } = await supabase
      .from('posts')
      .select('id, post_name, post_description, post_type, profile_id')
      .eq('id', validation.data.post_id)
      .single();

    if (!post) throw new Error('Post not found');

    // Create initial report
    const { data: report, error: insertError } = await supabase
      .from('post_reports')
      .insert({
        post_id: validation.data.post_id,
        reporter_id: user.id,
        reason: validation.data.reason,
        description: validation.data.description,
        status: 'pending',
      })
      .select('id')
      .single();

    if (insertError) throw new Error(insertError.message);

    // Trigger AI analysis asynchronously (don't block the response)
    let aiAnalyzed = false;
    try {
      const aiResult = await analyzeReportWithAI({
        postTitle: post.post_name || '',
        postDescription: post.post_description || '',
        postType: post.post_type || '',
        reportReason: validation.data.reason,
        reportDescription: validation.data.description || '',
      });

      if (aiResult) {
        await supabase
          .from('post_reports')
          .update({
            ai_analysis: aiResult.analysis,
            ai_severity_score: aiResult.severityScore,
            ai_recommended_action: aiResult.recommendedAction,
            ai_confidence: aiResult.confidence,
            status: 'ai_reviewed',
          })
          .eq('id', report.id);

        aiAnalyzed = true;
      }
    } catch {
      // AI analysis failed, but report was created - continue
      console.error('AI analysis failed, report created without AI review');
    }

    // Invalidate admin caches
    invalidateTag(CACHE_TAGS.ADMIN);

    return { id: report.id, aiAnalyzed };
  }, 'createPostReport');
}

/**
 * Resolve a report (admin only)
 */
export async function resolvePostReport(
  input: z.infer<typeof resolveReportSchema>
): Promise<ActionResult<undefined>> {
  const validation = validateWithSchema(resolveReportSchema, input);
  if (!validation.success) {
    return validation;
  }

  return withErrorHandling(async () => {
    const supabase = await createClient();

    // Get current user and verify admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role?.admin !== true && profile.role?.superadmin !== true)) {
      throw new Error('Admin access required');
    }

    // Get report with post info
    const { data: report } = await supabase
      .from('post_reports')
      .select('id, post_id, status')
      .eq('id', validation.data.report_id)
      .single();

    if (!report) throw new Error('Report not found');
    if (report.status === 'resolved') throw new Error('Report already resolved');

    // Update report
    const { error: updateError } = await supabase
      .from('post_reports')
      .update({
        status: 'resolved',
        moderator_id: user.id,
        moderator_action: validation.data.action,
        moderator_notes: validation.data.notes,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', validation.data.report_id);

    if (updateError) throw new Error(updateError.message);

    // Apply action to post if needed
    if (validation.data.action === 'post_hidden' || validation.data.action === 'post_removed') {
      await supabase
        .from('posts')
        .update({ is_active: false })
        .eq('id', report.post_id);

      invalidateTag(CACHE_TAGS.PRODUCTS);
      invalidateTag(CACHE_TAGS.PRODUCT(report.post_id));
    }

    invalidateTag(CACHE_TAGS.ADMIN);

    return undefined;
  }, 'resolvePostReport');
}

// ============================================================================
// AI Analysis Helper
// ============================================================================

interface AIAnalysisInput {
  postTitle: string;
  postDescription: string;
  postType: string;
  reportReason: string;
  reportDescription: string;
}

interface AIAnalysisResult {
  analysis: AIAnalysis;
  severityScore: number;
  recommendedAction: string;
  confidence: number;
}

async function analyzeReportWithAI(input: AIAnalysisInput): Promise<AIAnalysisResult | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  try {
    const response = await fetch(`${baseUrl}/api/moderation/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      console.error('AI analysis API error:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('AI analysis request failed:', error);
    return null;
  }
}
