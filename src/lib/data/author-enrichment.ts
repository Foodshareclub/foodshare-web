import { formatProfileDisplayName } from "@/lib/data/author-display";
import { createCachedClient } from "@/lib/supabase/server";

interface PostWithAuthorFields {
  profile_id?: string | null;
  author_name?: string | null;
  author_avatar_url?: string | null;
}

/**
 * Enriches a list of posts with author display names and avatars from profiles_public.
 *
 * Uses the anon-safe `profiles_public` view via `createCachedClient()`.
 * Runs a single batched `.in("id", ...)` query for all unique missing profile IDs.
 * Strips surnames / full names for individual user privacy via `formatProfileDisplayName`
 * (e.g. "Tarlan Isaev" -> "Tarlan").
 */
export async function enrichPostsWithAuthors<T extends PostWithAuthorFields>(
  posts: T[],
): Promise<T[]> {
  if (!posts || posts.length === 0) return posts;

  // Collect distinct profile IDs that don't already have an authoritative author_name
  const missingProfileIds = [
    ...new Set(
      posts
        .filter(
          (p) =>
            (!p.author_name || p.author_name === "Community Member") &&
            Boolean(p.profile_id),
        )
        .map((p) => p.profile_id as string),
    ),
  ];

  if (missingProfileIds.length === 0) return posts;

  try {
    const supabase = createCachedClient();
    const { data: profiles, error } = await supabase
      .from("profiles_public")
      .select("id, first_name, second_name, nickname, avatar_url")
      .in("id", missingProfileIds);

    if (error || !profiles || profiles.length === 0) {
      return posts;
    }

    const profileMap = new Map<
      string,
      {
        id: string;
        first_name?: string | null;
        second_name?: string | null;
        nickname?: string | null;
        avatar_url?: string | null;
      }
    >();

    for (const prof of profiles) {
      profileMap.set(prof.id, prof);
    }

    for (const post of posts) {
      if (
        (!post.author_name || post.author_name === "Community Member") &&
        post.profile_id
      ) {
        const prof = profileMap.get(post.profile_id);
        if (prof) {
          post.author_name = formatProfileDisplayName(prof);
          if (!post.author_avatar_url && prof.avatar_url) {
            post.author_avatar_url = prof.avatar_url;
          }
        }
      }
    }
  } catch {
    // Non-blocking: failures degrade gracefully to the existing fallback
  }

  return posts;
}

/**
 * Enriches a single post with author display name and avatar.
 */
export async function enrichSinglePostWithAuthor<T extends PostWithAuthorFields>(
  post: T | null,
): Promise<T | null> {
  if (!post) return null;
  const [enriched] = await enrichPostsWithAuthors([post]);
  return enriched;
}
