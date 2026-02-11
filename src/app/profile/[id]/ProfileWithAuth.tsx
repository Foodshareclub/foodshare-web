import { ViewProfileClient } from "./ViewProfileClient";
import { getUser } from "@/app/actions/auth";
import { hasUserRole } from "@/lib/data/profiles";
import type { PublicProfile } from "@/lib/data/profiles";

interface ProfileWithAuthProps {
  profile: PublicProfile;
  profileId: string;
}

/**
 * Async Server Component that fetches auth-dependent data independently.
 *
 * The profile data is already available (fetched in the parent page for
 * notFound checks and SEO metadata). This component streams the user
 * session and volunteer role check separately so the page shell can
 * render before auth resolves.
 */
export async function ProfileWithAuth({ profile, profileId }: ProfileWithAuthProps) {
  const [user, isVolunteer] = await Promise.all([
    getUser(),
    hasUserRole(profileId, "volunteer"),
  ]);

  return <ViewProfileClient profile={profile} user={user} isVolunteer={isVolunteer} />;
}
