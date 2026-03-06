/**
 * API Key Management
 * Handles API key retrieval from environment variables
 * Values are injected during deployment via GitHub Actions
 */

/**
 * Get AI configuration from environment variables
 * Checks for GROQ_API_KEY first, then ZAI_API_KEY, then AI_GATEWAY_API_KEY
 */
export async function getAiConfig(): Promise<{ apiKey: string; baseURL?: string } | null> {
  if (process.env.GROQ_API_KEY) {
    return {
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    };
  }
  if (process.env.ZAI_API_KEY) {
    return {
      apiKey: process.env.ZAI_API_KEY,
      baseURL: "https://api.z.ai/v1",
    };
  }
  if (process.env.AI_GATEWAY_API_KEY) {
    return {
      apiKey: process.env.AI_GATEWAY_API_KEY,
      baseURL: "https://ai-gateway.vercel.sh/openai/v1",
    };
  }

  return null;
}
