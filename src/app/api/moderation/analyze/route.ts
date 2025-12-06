import { createXai } from '@ai-sdk/xai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Initialize xAI (Grok) client
const xai = createXai({
  apiKey: process.env.XAI_API_KEY,
});

// Response schema for structured AI output
const moderationSchema = z.object({
  analysis: z.object({
    summary: z.string().describe('Brief summary of the report assessment'),
    categories: z.array(z.string()).describe('Content categories detected (e.g., spam, food safety, misleading)'),
    reasoning: z.string().describe('Detailed reasoning for the assessment'),
    suggestedAction: z.string().describe('Recommended moderation action'),
    riskFactors: z.array(z.string()).describe('Identified risk factors'),
  }),
  severityScore: z.number().min(0).max(100).describe('Severity score from 0 (benign) to 100 (critical)'),
  recommendedAction: z.enum([
    'dismiss',
    'warn_user',
    'hide_post',
    'remove_post',
    'ban_user',
    'escalate',
  ]).describe('Recommended action based on analysis'),
  confidence: z.number().min(0).max(1).describe('Confidence level of the analysis (0-1)'),
});

// Request body schema
const requestSchema = z.object({
  postTitle: z.string(),
  postDescription: z.string(),
  postType: z.string(),
  reportReason: z.string(),
  reportDescription: z.string(),
});

export async function POST(request: Request) {
  try {
    // Verify API key is configured
    if (!process.env.XAI_API_KEY) {
      console.error('XAI_API_KEY not configured');
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 503 }
      );
    }

    // Parse and validate request
    const body = await request.json();
    const input = requestSchema.parse(body);

    // Build the prompt for Grok
    const systemPrompt = `You are a content moderation AI for FoodShare, a community food sharing platform. 
Your job is to analyze reported posts and provide moderation recommendations.

Context about FoodShare:
- Users share surplus food with their community
- Posts include food items, community fridges, food banks, and volunteer opportunities
- Safety and trust are critical - food safety concerns are high priority
- The platform values community building and reducing food waste

Moderation Guidelines:
- DISMISS: Report is unfounded or minor issue
- WARN_USER: First-time minor violation, educate the user
- HIDE_POST: Temporarily hide while investigating
- REMOVE_POST: Clear violation of guidelines
- BAN_USER: Repeated or severe violations
- ESCALATE: Requires human review (complex cases, legal concerns)

Consider:
1. Food safety implications
2. Potential for harm to community members
3. Intent (malicious vs. accidental)
4. Severity and scope of the issue
5. Pattern of behavior (if applicable)`;

    const userPrompt = `Analyze this reported post:

POST DETAILS:
- Title: ${input.postTitle}
- Description: ${input.postDescription}
- Type: ${input.postType}

REPORT:
- Reason: ${input.reportReason}
- Reporter's Description: ${input.reportDescription || 'No additional details provided'}

Provide a thorough analysis and recommendation.`;

    // Call Grok via Vercel AI SDK
    const result = await generateObject({
      model: xai('grok-3-mini'),
      schema: moderationSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.3, // Lower temperature for more consistent moderation
    });

    // Log usage for monitoring (optional - uses existing grok_usage_logs table)
    try {
      const supabase = await createClient();
      await supabase.from('grok_usage_logs').insert({
        model: 'grok-3-mini',
        tokens: result.usage?.totalTokens || 0,
      });
    } catch {
      // Non-critical, continue even if logging fails
    }

    return NextResponse.json(result.object);
  } catch (error) {
    console.error('Moderation analysis error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 }
    );
  }
}
