/**
 * Groq Chat Provider
 *
 * OpenAI-compatible chat completions via Groq.
 * Extracted from `api-v1-ai/index.ts` — no logic changes.
 */

import { ServerError } from "../../../_shared/errors.ts";
import { getGroqKey } from "../config.ts";

export async function groqChat(
  messages: unknown[],
  model: string,
  temp: number,
  maxTokens?: number,
) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getGroqKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: temp,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) throw new ServerError(`Groq error: ${res.status}`);
  // deno-lint-ignore no-explicit-any
  const data: any = await res.json();

  return {
    id: data.id,
    model: data.model,
    // deno-lint-ignore no-explicit-any
    choices: data.choices.map((c: any) => ({
      message: c.message,
      finishReason: c.finish_reason,
    })),
    usage: {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    },
    provider: "groq",
  };
}
