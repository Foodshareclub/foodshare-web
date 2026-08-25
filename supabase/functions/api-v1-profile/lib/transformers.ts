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
    isVolunteer: data.is_volunteer,
    ratingCount: data.rating_count,
    ratingAverage: data.rating_average,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    profileVisibility: data.profile_visibility || "public",
  };
}
