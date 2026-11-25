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
 * Listing types that deliberately show the author's full name.
 *
 * Volunteer listings are the public team cards: the person is listed by role and
 * name on purpose. Every other type keeps the surname out (see
 * `formatProfileDisplayName`), so a member's surname never appears on their food
 * listings. The same rule is applied in the database for `author_name` (migration
 * `20261125030000_volunteer_listing_full_name`), which only ever reads
 * `profiles_public`, so private profiles get no name at all.
 */
const FULL_NAME_POST_TYPES: ReadonlySet<string> = new Set(["volunteer"]);

export function showsFullAuthorName(postType?: string | null): boolean {
  return postType != null && FULL_NAME_POST_TYPES.has(postType);
}

/**
 * Full name from profile fields: first + second name, trimmed and single-spaced,
 * falling back to the nickname, then "Community Member".
 */
export function formatProfileFullName(profile?: ProfileSummary | null): string {
  if (!profile) return "Community Member";
  const full = [profile.first_name, profile.second_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ");
  return full || profile.nickname?.trim() || "Community Member";
}

/**
 * Author name for a listing of the given type: the full name for volunteer
 * listings, the privacy-safe first name for everything else.
 */
export function formatListingAuthorName(postType: string | null | undefined, profile?: ProfileSummary | null): string {
  return showsFullAuthorName(postType) ? formatProfileFullName(profile) : formatProfileDisplayName(profile);
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

/**
 * Render an already-resolved `author_name` for a listing of the given type.
 * Volunteer listings keep the full name; other types are cut to the first name.
 */
export function formatListingAuthorLabel(postType: string | null | undefined, name?: string | null): string {
  if (showsFullAuthorName(postType)) return name?.trim() || "Community Member";
  return formatFirstAuthorName(name);
}

/**
 * Split a volunteer listing into the person's name and the role title.
 *
 * The name comes from the author's profile (`author_name`, full name for volunteer
 * listings); `post_name` is the role ("IT Teammate"). Listings submitted through
 * the application form used to carry "Name - Headline" in `post_name`. When the
 * text before " - " is the author's own name (or starts with the author's first
 * name) it is dropped, so the name is never shown twice or out of step with the
 * profile. Without an author name the legacy "Name - Headline" split is kept.
 */
export function splitVolunteerTitle(
  postName: string | null | undefined,
  authorName?: string | null,
): { name: string; headline: string | null } {
  const title = postName?.trim() ?? "";
  const author = authorName?.trim();
  const hasAuthor = Boolean(author) && author !== "Community Member";
  const separator = title.indexOf(" - ");
  const left = separator > 0 ? title.slice(0, separator).trim() : "";
  const right = separator > 0 ? title.slice(separator + 3).trim() : "";
  if (hasAuthor && author) {
    const firstName = author.split(/\s+/)[0]?.toLowerCase() ?? "";
    const leftIsAuthor =
      left !== "" && (left.toLowerCase() === author.toLowerCase() || left.toLowerCase().startsWith(firstName));
    if (leftIsAuthor && right) return { name: author, headline: right };
    return { name: author, headline: title || null };
  }
  if (!title) return { name: "Volunteer", headline: null };
  if (left && right) return { name: left, headline: right };
  return { name: title, headline: null };
}
