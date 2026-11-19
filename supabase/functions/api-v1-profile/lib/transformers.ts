import { formatDisplayName } from "../../_shared/transformers.ts";

export function transformProfile(data: Record<string, unknown>) {
  return {
    id: data.id,
    name: formatDisplayName(data),
    firstName: data.first_name,
    lastName: data.second_name,
    bio: data.bio,
    phone: data.phone,
    location: data.location,
    avatarUrl: data.avatar_url,
    // No source column exists for these three. They are emitted explicitly
    // so the response shape stays stable for clients that read them, rather
    // than silently becoming `undefined` — and they are null rather than
    // zero, because "no rating" is not the same claim as "rated zero times".
    isVolunteer: null,
    ratingCount: null,
    ratingAverage: null,
    // `created_time`, not `created_at` — that is the column profiles has.
    createdAt: data.created_time ?? data.created_at,
    updatedAt: data.updated_at,
    profileVisibility: data.profile_visibility || "public",
  };
}
