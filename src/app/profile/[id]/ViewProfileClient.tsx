"use client";

/**
 * View Profile Client Component
 * Handles interactive elements for viewing another user's profile
 */

import React from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Mail, MapPin, Calendar } from "lucide-react";

// Icon aliases for consistency
const FaEnvelope = Mail;
const FaMapMarkerAlt = MapPin;
const FaCalendar = Calendar;
import Image from "next/image";
import peak from "@/assets/peakpx-min.jpg";
import type { PublicProfile } from "@/lib/data/profiles";
import type { AuthUser } from "@/app/actions/auth";

interface ViewProfileClientProps {
  profile: PublicProfile;
  user: AuthUser | null;
}

export function ViewProfileClient({ profile, user }: ViewProfileClientProps) {
  const router = useRouter();
  const isAuthenticated = !!user;

  const initials =
    `${profile.first_name?.[0] || ""}${profile.second_name?.[0] || ""}`.toUpperCase();
  const joinDate = profile.created_time
    ? new Date(profile.created_time).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      })
    : "Unknown";

  return (
    <div className="min-h-screen bg-muted/30 dark:bg-background">
      <div className="container mx-auto max-w-4xl pt-24 pb-12 px-4">
        <div className="glass rounded-xl p-0 overflow-hidden">
          {/* Cover Photo */}
          <div className="relative h-[200px] w-full">
            <Image src={peak} alt="Cover" fill className="object-cover" priority />
          </div>

          {/* Profile Content */}
          <div className="p-8">
            {/* Avatar */}
            <div className="flex justify-center -mt-20 mb-6">
              <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                <AvatarImage
                  src={profile.avatar_url || undefined}
                  alt={profile.first_name || "User"}
                />
                <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-emerald-400 to-emerald-600 text-white">
                  {initials || "?"}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Name */}
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {profile.first_name} {profile.second_name}
              </h1>
              {profile.nickname && (
                <p className="text-lg text-muted-foreground">@{profile.nickname}</p>
              )}
            </div>

            {/* Volunteer Badge */}
            {profile.role?.volunteer && (
              <div className="flex justify-center mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                    🤝 Volunteer
                  </span>
                </div>
              </div>
            )}

            {/* About Me */}
            {profile.about_me && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-3 text-foreground">About</h2>
                <div className="glass-subtle rounded-xl p-4">
                  <p className="text-foreground/80 whitespace-pre-wrap">{profile.about_me}</p>
                </div>
              </div>
            )}

            {/* Profile Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Join Date */}
              <div className="glass-subtle rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                    <FaCalendar className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-medium">
                      Member Since
                    </p>
                    <p className="text-foreground font-semibold">{joinDate}</p>
                  </div>
                </div>
              </div>

              {/* Location */}
              {profile.location && (
                <div className="glass-subtle rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <FaMapMarkerAlt className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-medium">
                        Location
                      </p>
                      <p className="text-foreground font-semibold">{String(profile.location)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Contact Button (Only for authenticated users) */}
            {isAuthenticated && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => router.push(`/chat?user=${profile.id}`)}
                  className="px-8 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2"
                >
                  <FaEnvelope />
                  Send Message
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => router.back()}
            className="px-6 py-2 text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
}

export default ViewProfileClient;
