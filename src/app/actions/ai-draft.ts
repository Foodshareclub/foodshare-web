"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  type ActionResult,
  unauthorizedError,
  failure,
  success,
  validationError,
  createError,
} from "@/lib/errors";

// ============================================================================
// Types
// ============================================================================

interface DraftResult {
  title: string;
  description: string;
}

// ============================================================================
// Validation
// ============================================================================

const draftSchema = z.object({
  images: z
    .array(z.string().startsWith("data:image/"))
    .min(1, "At least one image is required")
    .max(4, "Maximum 4 images"),
  postType: z.string().min(1, "Post type is required"),
});

// ============================================================================
// Rate Limiting (in-memory, per-process)
// ============================================================================

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

// ============================================================================
// System Prompts
// ============================================================================

function getSystemPrompt(postType: string): string {
  const base =
    "You are a helpful listing assistant for a community sharing platform. " +
    "Analyze the provided images and generate a title and description for the listing. " +
    "Keep the title concise (under 60 characters). " +
    "Keep the description informative but brief (2-4 sentences, under 300 characters). " +
    "Be friendly and community-oriented. " +
    'Respond in JSON format: { "title": "...", "description": "..." }';

  const categoryGuidance: Record<string, string> = {
    food:
      "This is a food sharing listing. Mention freshness, quantity, dietary info (vegan, gluten-free, etc.), " +
      "and whether it appears homemade or store-bought. Focus on appealing to people who could use free food.",
    thing:
      "This is a free item listing. Describe the item's condition, color, approximate size, and key features. " +
      "Help the reader understand what they'd be getting.",
    borrow:
      "This is a borrowing listing. Describe the item available for borrowing, its condition, " +
      "and suggest what it could be used for.",
    wanted:
      "This is a wanted listing. Based on the images, describe what the person is looking for " +
      "and why they might need it.",
    zerowaste:
      "This is a zero-waste listing. Emphasize sustainability, reuse potential, and eco-friendly aspects. " +
      "Mention how taking this item reduces waste.",
    vegan:
      "This is a vegan food listing. Highlight that the food is plant-based, mention key ingredients if visible, " +
      "and note any nutritional highlights.",
    fridge:
      "This is a community fridge listing. Describe the food available, its condition, " +
      "and any storage/freshness notes.",
    foodbank:
      "This is a food bank listing. Describe available items, quantities, " +
      "and any relevant details for people in need.",
    business:
      "This is an organisation listing. Describe the organisation and what they offer to the community.",
    challenge:
      "This is a community challenge listing. Describe what the challenge involves and how people can participate.",
  };

  const guidance = categoryGuidance[postType] || categoryGuidance.food;
  return `${base}\n\n${guidance}`;
}

// ============================================================================
// Server Action
// ============================================================================

export async function generateListingDraft(
  images: string[],
  postType: string
): Promise<ActionResult<DraftResult>> {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return failure(unauthorizedError("You must be signed in to use AI drafting"));
  }

  // Rate limit
  if (!checkRateLimit(user.id)) {
    return failure(
      createError("RATE_LIMIT", "You've reached the AI draft limit. Please try again later.")
    );
  }

  // Validate input
  const parsed = draftSchema.safeParse({ images, postType });
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || "Invalid input";
    return failure(validationError(firstError));
  }

  // Build vision message content
  const content: Array<
    { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }
  > = [
    {
      type: "text",
      text: "Please analyze these images and generate a title and description for this community listing.",
    },
    ...parsed.data.images.map((dataUrl) => ({
      type: "image_url" as const,
      image_url: { url: dataUrl },
    })),
  ];

  // Call Groq API
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("[ai-draft] GROQ_API_KEY is not configured");
    return failure(
      createError("INTERNAL_ERROR", "AI drafting is not available. Please try again later.")
    );
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.2-11b-vision-preview",
        messages: [
          { role: "system", content: getSystemPrompt(parsed.data.postType) },
          { role: "user", content },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error("[ai-draft] Groq API error:", response.status, errorText);
      return failure(
        createError("INTERNAL_ERROR", "AI service is temporarily unavailable. Please try again.")
      );
    }

    const data = await response.json();
    const messageContent = data.choices?.[0]?.message?.content;

    if (!messageContent) {
      console.error("[ai-draft] Empty response from Groq");
      return failure(
        createError("INTERNAL_ERROR", "AI returned an empty response. Please try again.")
      );
    }

    const parsed_response = JSON.parse(messageContent) as { title?: string; description?: string };

    if (!parsed_response.title || !parsed_response.description) {
      console.error("[ai-draft] Invalid JSON structure from Groq:", messageContent);
      return failure(
        createError("INTERNAL_ERROR", "AI returned an unexpected format. Please try again.")
      );
    }

    return success({
      title: parsed_response.title.slice(0, 100),
      description: parsed_response.description.slice(0, 500),
    });
  } catch (error) {
    console.error("[ai-draft] Error:", error);
    return failure(createError("INTERNAL_ERROR", "Failed to generate draft. Please try again."));
  }
}
