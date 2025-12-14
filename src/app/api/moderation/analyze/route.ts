import { createXai } from "@ai-sdk/xai";
import { generateObject } from "ai";
import { z } from "zod";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Constants
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const SECRET_NAME = "XAI_API_KEY";
const XAI_MODEL = "grok-3-mini";
const XAI_TEMPERATURE = 0.3;

// Cache for API key to avoid repeated vault lookups
let cachedApiKey: string | null = null;
let cacheExpiry = 0;

interface VaultSecret {
  name: string;
  value: string;
}

/**
 * Get XAI API key from environment variable or Supabase Vault
 * Supports both direct xAI keys and Vercel AI Gateway keys
 */
async function getXaiApiKey(): Promise<string | null> {
  // Check environment variables first (for local dev or Vercel env)
  if (process.env.XAI_API_KEY) {
    return process.env.XAI_API_KEY;
  }
  if (process.env.AI_GATEWAY_API_KEY) {
    return process.env.AI_GATEWAY_API_KEY;
  }

  // Check cache
  if (cachedApiKey && Date.now() < cacheExpiry) {
    return cachedApiKey;
  }

  // Fetch from Supabase Vault
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_secrets", {
      secret_names: [SECRET_NAME],
    });

    if (error || !data || data.length === 0) {
      console.error("Failed to fetch XAI_API_KEY from vault:", error?.message);
      return null;
    }

    const secret = (data as VaultSecret[]).find((s) => s.name === SECRET_NAME);
    if (secret?.value) {
      cachedApiKey = secret.value;
      cacheExpiry = Date.now() + CACHE_TTL;
      return cachedApiKey;
    }

    return null;
  } catch (err) {
    console.error("Error fetching secret from vault:", err);
    return null;
  }
}

// Response schema for structured AI output
const moderationSchema = z.object({
  analysis: z.object({
    summary: z.string().describe("Brief summary of the report assessment"),
    categories: z
      .array(z.string())
      .describe("Content categories detected (e.g., spam, food safety, misleading)"),
    reasoning: z.string().describe("Detailed reasoning for the assessment"),
    suggestedAction: z.string().describe("Recommended moderation action"),
    riskFactors: z.array(z.string()).describe("Identified risk factors"),
  }),
  severityScore: z
    .number()
    .min(0)
    .max(100)
    .describe("Severity score from 0 (benign) to 100 (critical)"),
  recommendedAction: z
    .enum(["dismiss", "warn_user", "hide_post", "remove_post", "ban_user", "escalate"])
    .describe("Recommended action based on analysis"),
  confidence: z.number().min(0).max(1).describe("Confidence level of the analysis (0-1)"),
});

// Request body schema
const requestSchema = z.object({
  postTitle: z.string(),
  postDescription: z.string(),
  postType: z.string(),
  reportReason: z.string(),
  reportDescription: z.string(),
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    // Authenticate user - only admins can use moderation API
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin using user_roles junction table (source of truth)
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("roles!inner(name)")
      .eq("profile_id", user.id);

    const roles = (userRoles || [])
      .map((r) => (r.roles as unknown as { name: string })?.name)
      .filter(Boolean);

    const isAdmin = roles.includes("admin") || roles.includes("superadmin");

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    // Get API key from vault or environment
    const apiKey = await getXaiApiKey();
    if (!apiKey) {
      console.error("XAI_API_KEY not configured in vault or environment");
      return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
    }

    // Initialize xAI client with the fetched key
    // AI Gateway keys (vck_) use Vercel's AI Gateway proxy
    const isGatewayKey = apiKey.startsWith("vck_");
    const xai = createXai({
      apiKey,
      // Vercel AI Gateway endpoint for xAI/Grok
      baseURL: isGatewayKey ? "https://ai-gateway.vercel.sh/xai/v1" : undefined,
    });

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
- Reporter's Description: ${input.reportDescription || "No additional details provided"}

Provide a thorough analysis and recommendation.`;

    // Call Grok via Vercel AI SDK
    const result = await generateObject({
      model: xai(XAI_MODEL),
      schema: moderationSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: XAI_TEMPERATURE,
    });

    // Log usage for monitoring (optional - uses existing grok_usage_logs table)
    try {
      const supabase = await createClient();
      await supabase.from("grok_usage_logs").insert({
        model: XAI_MODEL,
        tokens: result.usage?.totalTokens || 0,
      });
    } catch {
      // Non-critical, continue even if logging fails
    }

    return NextResponse.json(result.object);
  } catch (error) {
    console.error("Moderation analysis error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
