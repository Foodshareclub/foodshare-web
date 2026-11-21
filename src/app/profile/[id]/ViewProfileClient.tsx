/**
 * ViewProfile Component (Server Component)
 * Displays another user's profile with minimal client-side interactivity
 * Action buttons are extracted to ProfileActions client wrapper
 */

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { AuthUser } from "@/lib/data/auth";
import type { PublicProfile } from "@/lib/data/profiles";
import { coarseAreaLabel, parsePostGISPoint } from "@/utils/postgis";
import { Calendar, MapPin, ShieldCheck } from "lucide-react";
import { ProfileActions } from "./ProfileActions";

interface ViewProfileClientProps {
  profile: PublicProfile;
  user: AuthUser | null;
  /** Whether the profile user is a volunteer (from user_roles table) */
  isVolunteer?: boolean;
}

export function ViewProfileClient({ profile, user, isVolunteer = false }: ViewProfileClientProps) {
  const isAuthenticated = !!user;

  // Null when the member opted out, when there is no point, or when the
  // value is a shape we cannot read. Absent beats wrong: the card simply
  // does not render.
  const coarseArea =
    profile.location_sharing_enabled === false ? null : coarseAreaLabel(parsePostGISPoint(profile.location));

  const initials = `${profile.first_name?.[0] || ""}${profile.second_name?.[0] || ""}`.toUpperCase();
  const joinDate = profile.created_time
    ? new Date(profile.created_time).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      })
    : "Unknown";

  return (
    <div className="min-h-screen bg-muted/20 dark:bg-background">
      <div className="container mx-auto max-w-5xl pt-24 pb-16 px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Left Column: Airbnb Host ID Badge Card */}
          <div className="md:col-span-5 lg:col-span-4">
            <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/95 backdrop-blur-2xl shadow-xl p-6 sm:p-8 flex flex-col items-center text-center">
              {/* Soft ambient halo */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-16 inset-x-0 mx-auto size-48 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 blur-3xl"
              />

              {/* Avatar with Verified Badge */}
              <div className="relative mb-4">
                <Avatar className="size-28 sm:size-32 rounded-full border-4 border-background shadow-xl">
                  <AvatarImage src={profile.avatar_url || undefined} alt={profile.first_name || "User"} />
                  <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-emerald-500 to-teal-700 text-white">
                    {initials || "?"}
                  </AvatarFallback>
                </Avatar>
                <div
                  className="absolute bottom-1 end-1 size-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md border-2 border-background"
                  aria-hidden="true"
                >
                  <ShieldCheck className="size-4 stroke-[2.5]" />
                </div>
              </div>

              {/* Host Name & Tag */}
              <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">
                {profile.first_name} {profile.second_name}
              </h1>
              {profile.nickname && (
                <p className="text-sm text-muted-foreground mb-3 font-medium">@{profile.nickname}</p>
              )}

              {/* Volunteer Badge */}
              {isVolunteer && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 rounded-full text-xs font-semibold mb-6">
                  <span>🤝 Volunteer</span>
                </div>
              )}

              {/* Key Host Stats / Details */}
              <div className="w-full space-y-2.5 pt-4 border-t border-border/60">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40 border border-border/40 text-start">
                  <div className="size-8 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
                    <Calendar className="size-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Member Since</p>
                    <p className="text-xs font-semibold text-foreground truncate">{joinDate}</p>
                  </div>
                </div>

                {coarseArea && (
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40 border border-border/40 text-start">
                    <div className="size-8 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
                      <MapPin className="size-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Location</p>
                      <p className="text-xs font-semibold text-foreground truncate">{coarseArea}</p>
                      <p className="text-[10px] text-muted-foreground">Approximate area</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Host Bio & Details */}
          <div className="md:col-span-7 lg:col-span-8 space-y-6">
            <div className="rounded-3xl border border-border/80 bg-card/95 backdrop-blur-2xl shadow-xl p-6 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mb-4">About</h2>

              {profile.about_me && (
                <div className="rounded-2xl border border-border/50 bg-muted/20 p-5 text-sm sm:text-base leading-relaxed text-foreground/80 whitespace-pre-wrap mb-6">
                  {profile.about_me}
                </div>
              )}

              {/* Action buttons (client component) */}
              <div className="pt-4 border-t border-border/60">
                <ProfileActions profileId={profile.id} isAuthenticated={isAuthenticated} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ViewProfileClient;
