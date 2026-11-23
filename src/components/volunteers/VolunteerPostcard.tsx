import { isValidImageUrl } from "@/lib/image";
import { cn } from "@/lib/utils";
import type { InitialProductStateType } from "@/types/product.types";
import { getProductDetailUrl } from "@/utils/categoryMapping";
import { gpu120Image } from "@/utils/gpuStyles";
import {
  Camera,
  Car,
  ChefHat,
  ClipboardList,
  Clock,
  Code,
  Globe,
  HeartHandshake,
  MapPin,
  ShieldCheck,
  Smartphone,
  Sparkles,
  User,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type React from "react";

interface VolunteerPostcardProps {
  volunteer: InitialProductStateType;
  isFeatured?: boolean;
}

/**
 * VolunteerPostcard - Display card for volunteer profiles
 * Features Airbnb host card styling with circular verified avatar and skills pills
 */
export function VolunteerPostcard({ volunteer, isFeatured = false }: VolunteerPostcardProps) {
  const volunteerUrl = getProductDetailUrl(volunteer.post_type, volunteer.id);

  // Parse skills from condition field (comma-separated)
  const skills = volunteer.condition
    ? volunteer.condition
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  // Get display-friendly availability
  const availabilityDisplay = getAvailabilityDisplay(volunteer.available_hours);

  // Get location (stripped address or full address)
  const location = volunteer.post_stripped_address || volunteer.post_address || "";

  // Parse name and headline from post_name (format: "Name - Headline")
  const [name, headline] = parseNameAndHeadline(volunteer.post_name);

  return (
    <Link href={volunteerUrl} className="block group h-full" prefetch={true}>
      <div className="relative h-full flex flex-col justify-between overflow-hidden rounded-3xl border border-border/80 bg-card/95 backdrop-blur-2xl p-6 shadow-sm hover:shadow-xl hover:border-foreground/20 transition-all duration-300">
        {/* Ambient Glow */}
        <div className="absolute -top-16 -end-16 size-32 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

        {/* Featured Badge */}
        {isFeatured && (
          <div className="absolute top-3.5 end-3.5 bg-brand text-white text-[10px] font-semibold tracking-wide uppercase px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
            <Sparkles className="size-3" aria-hidden="true" />
            <span>Featured</span>
          </div>
        )}

        <div>
          {/* Avatar Section */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              {/* Avatar ring */}
              <div className="size-22 sm:size-24 rounded-full p-0.5 bg-gradient-to-br from-emerald-500/30 to-teal-500/20 shadow-md">
                <div className="size-full rounded-full overflow-hidden bg-background">
                  {volunteer.images && volunteer.images.length > 0 && isValidImageUrl(volunteer.images[0]) ? (
                    <Image
                      src={volunteer.images[0]}
                      alt={name}
                      width={96}
                      height={96}
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                      style={gpu120Image}
                    />
                  ) : (
                    <div className="size-full bg-muted/60 flex items-center justify-center text-muted-foreground">
                      <User className="size-9 text-primary/80" />
                    </div>
                  )}
                </div>
              </div>
              {/* Verified Shield Badge */}
              <div
                className="absolute bottom-0 end-0 size-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs border-2 border-background"
                aria-hidden="true"
              >
                <ShieldCheck className="size-3.5" />
              </div>
            </div>
          </div>

          {/* Name & Headline */}
          <div className="text-center mb-4">
            <h3 className="font-semibold text-foreground text-base sm:text-lg line-clamp-1 font-display group-hover:text-primary transition-colors">
              {name}
            </h3>
            {headline && (
              <p className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-medium line-clamp-1 mt-0.5">
                &ldquo;{headline}&rdquo;
              </p>
            )}
          </div>

          {/* Skills Tags */}
          {skills.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5 mb-4">
              {skills.slice(0, 3).map((skill, index) => {
                const SkillIcon = getSkillIconComponent(skill);
                return (
                  <span
                    // biome-ignore lint/suspicious/noArrayIndexKey: skills come from a raw comma-separated field a user typed, so the same tag can repeat; the capped list is read-only and never reorders
                    key={index}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-border/80 bg-muted/50 text-foreground"
                  >
                    <SkillIcon className="size-3 text-muted-foreground" aria-hidden="true" />
                    <span>{skill}</span>
                  </span>
                );
              })}
              {skills.length > 3 && (
                <span className="text-[11px] font-medium px-2 py-0.5 text-muted-foreground">
                  +{skills.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>

        <div>
          {/* Divider */}
          <div className="border-t border-border/60 my-3" />

          {/* Location & Availability Footer */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 truncate max-w-[55%]">
              <MapPin className="size-3.5 text-primary shrink-0" aria-hidden="true" />
              <span className="truncate">{location || "Community"}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Clock className="size-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
              <span>{availabilityDisplay}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

/**
 * Parse "Name - Headline" format into separate parts
 */
function parseNameAndHeadline(postName: string | null): [string, string | null] {
  if (!postName) return ["Volunteer", null];

  const parts = postName.split(" - ");
  if (parts.length >= 2) {
    return [parts[0].trim(), parts.slice(1).join(" - ").trim()];
  }

  return [postName, null];
}

/**
 * Get display-friendly availability text
 */
function getAvailabilityDisplay(availableHours: string | null): string {
  if (!availableHours) return "Flexible";

  const lower = availableHours.toLowerCase();
  if (lower === "weekdays") return "Weekdays";
  if (lower === "weekends") return "Weekends";
  if (lower === "evenings") return "Evenings";
  if (lower === "flexible") return "Flexible";

  // Return original if it's a custom value
  return availableHours.length > 12 ? `${availableHours.slice(0, 12)}...` : availableHours;
}

/**
 * Map skill keywords to Lucide Icon components
 */
function getSkillIconComponent(skill: string): React.ComponentType<{ className?: string }> {
  const lower = skill.toLowerCase();
  if (lower.includes("driv") || lower.includes("delivery")) return Car;
  if (lower.includes("cook")) return ChefHat;
  if (lower.includes("organiz")) return ClipboardList;
  if (lower.includes("social")) return Smartphone;
  if (lower.includes("photo")) return Camera;
  if (lower.includes("translat")) return Globe;
  if (lower.includes("tech") || lower.includes("cod")) return Code;
  if (lower.includes("outreach") || lower.includes("community")) return HeartHandshake;
  return Sparkles;
}

export default VolunteerPostcard;
