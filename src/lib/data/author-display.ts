/**
 * Author & Profile Display Utilities (Client and Server safe)
 */

export interface ProfileSummary {
  id: string;
  first_name?: string | null;
  second_name?: string | null;
  nickname?: string | null;
  avatar_url?: string | null;
}

/**
 * Format a human-friendly, privacy-safe display name from profile fields.
 * Strips surnames / second names to show only the first name for individual privacy
 * (e.g. "Tarlan Isaev" -> "Tarlan").
 */
export function formatProfileDisplayName(profile?: ProfileSummary | null): string {
  if (!profile) return "Community Member";

  const first = profile.first_name?.trim();
  const nick = profile.nickname?.trim();

  if (first) {
    // For user privacy, only use the first name (e.g. "Tarlan Isaev" -> "Tarlan")
    const firstNameOnly = first.split(/\s+/)[0];
    if (firstNameOnly) return firstNameOnly;
  }
  if (nick) {
    return nick;
  }
  return "Community Member";
}

/**
 * Ensure an author name string displays only the first name for privacy.
 */
export function formatFirstAuthorName(name?: string | null): string {
  if (!name || !name.trim()) return "Community Member";
  const trimmed = name.trim();
  if (trimmed === "Community Member") return "Community Member";
  return trimmed.split(/\s+/)[0];
}
