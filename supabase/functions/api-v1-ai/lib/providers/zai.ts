/**
 * z.ai Embeddings Provider
 *
 * Extracted from `api-v1-ai/index.ts` — no logic changes.
 */

import { ServerError } from "../../../_shared/errors.ts";
import { getZaiKey } from "../config.ts";

export async function zaiEmbeddings(input: string | string[]) {
  const texts = Array.isArray(input) ? input : [input];

  const res = await fetch("https://api.z.ai/api/v2/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getZaiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input: texts, model: "text-embedding-3-small" }),
  });

  if (!res.ok) throw new ServerError(`z.ai error: ${res.status}`);
  // deno-lint-ignore no-explicit-any
  const data: any = await res.json();

  return {
    // deno-lint-ignore no-explicit-any
    embeddings: data.data.map((d: any) => d.embedding),
    model: data.model,
    usage: { totalTokens: data.usage.total_tokens },
    provider: "z.ai",
  };
}
