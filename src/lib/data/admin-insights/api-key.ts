/**
 * API Key Management
 * Handles API key retrieval from environment variables
 * Values are injected during deployment via GitHub Actions
 */

/**
 * Get AI configuration from environment variables
 * Checks for GROQ_API_KEY first, then ZAI_API_KEY, then OPENAI_API_KEY
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
  if (process.env.OPENAI_API_KEY) {
    return {
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: "https://api.openai.com/v1",
    };
  }

  return null;
}
