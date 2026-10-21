import { isValidImageUrl } from "@/lib/image";
import type { InitialProductStateType } from "@/types/product.types";
import { getProductDetailUrl } from "@/utils/categoryMapping";
import { gpu120Image } from "@/utils/gpuStyles";
import Image from "next/image";
import Link from "next/link";

interface VolunteerPostcardProps {
  volunteer: InitialProductStateType;
  isFeatured?: boolean;
}

/**
 * VolunteerPostcard - Display card for volunteer profiles
 * Features glassmorphic design with emerald accents
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
    <Link href={volunteerUrl} className="block group" prefetch={true}>
      <div className="glass rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl relative overflow-hidden">
        {/* Featured Badge */}
        {isFeatured && (
          <div className="absolute top-3 end-3 bg-gradient-to-r from-amber-400 to-orange-400 text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
            <span>Featured</span>
          </div>
        )}

        {/* Avatar Section */}
        <div className="flex justify-center mb-4">
          <div className="relative">
            {/* Gradient ring around avatar */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 p-1">
              <div className="w-full h-full rounded-full overflow-hidden bg-background">
                {volunteer.images && volunteer.images.length > 0 && isValidImageUrl(volunteer.images[0]) ? (
                  <Image
                    src={volunteer.images[0]}
                    alt={name}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    style={gpu120Image}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 flex items-center justify-center">
                    <span className="text-3xl">🙋</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Name & Headline */}
        <div className="text-center mb-4">
          <h3 className="font-semibold text-foreground text-lg line-clamp-1">{name}</h3>
          {headline && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 line-clamp-1 mt-0.5">
              &ldquo;{headline}&rdquo;
            </p>
          )}
        </div>

        {/* Skills Tags */}
        {skills.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5 mb-4">
            {skills.slice(0, 3).map((skill, index) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: skills come from a raw comma-separated field a user typed, so the same tag can repeat; the capped list is read-only and never reorders
                key={index}
                className="text-xs px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30"
              >
                {getSkillIcon(skill)} {skill}
              </span>
            ))}
            {skills.length > 3 && (
              <span className="text-xs px-2 py-1 text-muted-foreground">+{skills.length - 3} more</span>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-border/50 my-3" />

        {/* Location & Availability */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-base">📍</span>
            <span className="truncate">{location || "Location TBD"}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-base">🕐</span>
            <span>{availabilityDisplay}</span>
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
 * Get icon for a skill
 */
function getSkillIcon(skill: string): string {
  const lower = skill.toLowerCase();
  if (lower.includes("driv") || lower.includes("delivery")) return "🚗";
  if (lower.includes("cook")) return "👨‍🍳";
  if (lower.includes("organiz")) return "📋";
  if (lower.includes("social")) return "📱";
  if (lower.includes("photo")) return "📸";
  if (lower.includes("translat")) return "🌐";
  if (lower.includes("tech") || lower.includes("cod")) return "💻";
  if (lower.includes("outreach") || lower.includes("community")) return "🤝";
  return "✨";
}

export default VolunteerPostcard;
