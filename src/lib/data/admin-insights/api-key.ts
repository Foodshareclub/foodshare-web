/**
 * API Key Management
 * Handles API key retrieval from environment variables
 * Values are injected during deployment via GitHub Actions
 */

/**
 * Get AI API key from environment variables
 * Checks for OPENAI_API_KEY first, then AI_GATEWAY_API_KEY
 */
export async function getAiApiKey(): Promise<string | null> {
  if (process.env.OPENAI_API_KEY) {
    return process.env.OPENAI_API_KEY;
  }
  if (process.env.AI_GATEWAY_API_KEY) {
    return process.env.AI_GATEWAY_API_KEY;
  }

  return null;
}
