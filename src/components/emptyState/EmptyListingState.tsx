"use client";

import AuthenticationUserModal from "@/components/modals/AuthenticationUser/AuthenticationUserModal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  Apple,
  HandHelping,
  HeartHandshake,
  LampDesk,
  Landmark,
  type LucideIcon,
  PackageSearch,
  Plus,
  Recycle,
  Refrigerator,
  SearchX,
  Sparkles,
  Sprout,
  Trophy,
  Warehouse,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface CategoryEmptyConfig {
  name: string;
  targetType: string;
  icon: LucideIcon;
  actionLabel: string;
  title: string;
  description: string;
  highlightText: string;
}

const CATEGORY_CONFIGS: Record<string, CategoryEmptyConfig> = {
  zerowaste: {
    name: "Zero Waste",
    targetType: "zerowaste",
    icon: Recycle,
    actionLabel: "Share in Zero Waste",
    title: "No zero waste listings in your area yet",
    description:
      "Be the first to share in your area! Give surplus items a second life and help eliminate waste in your community.",
    highlightText: "Help your neighborhood achieve zero waste by sharing surplus goods.",
  },
  food: {
    name: "Food",
    targetType: "food",
    icon: Apple,
    actionLabel: "Share Food",
    title: "No food listings in your area yet",
    description:
      "Be the first to share in your area! Share surplus meals, groceries, or garden harvest with neighbors nearby.",
    highlightText: "Help reduce food waste and share delicious meals with people nearby.",
  },
  thing: {
    name: "Things",
    targetType: "thing",
    icon: LampDesk,
    actionLabel: "Share an Item",
    title: "No item listings in your area yet",
    description:
      "Be the first to share in your area! Pass along household goods, books, or electronics you no longer use.",
    highlightText: "Declutter sustainably by passing useful items forward to your community.",
  },
  things: {
    name: "Things",
    targetType: "thing",
    icon: LampDesk,
    actionLabel: "Share an Item",
    title: "No item listings in your area yet",
    description:
      "Be the first to share in your area! Pass along household goods, books, or electronics you no longer use.",
    highlightText: "Declutter sustainably by passing useful items forward to your community.",
  },
  borrow: {
    name: "Borrow",
    targetType: "borrow",
    icon: HandHelping,
    actionLabel: "Lend an Item",
    title: "No items to borrow in your area yet",
    description: "Be the first to lend in your area! Share tools, kitchen equipment, or games with trusted neighbors.",
    highlightText: "Help your community borrow instead of buying new.",
  },
  wanted: {
    name: "Wanted",
    targetType: "wanted",
    icon: PackageSearch,
    actionLabel: "Post a Wanted Request",
    title: "No wanted requests in your area yet",
    description: "Looking for something specific? Post a request so neighbors in your area can lend a hand.",
    highlightText: "Connect with neighbors who might have exactly what you need.",
  },
  fridge: {
    name: "Fridges",
    targetType: "fridge",
    icon: Refrigerator,
    actionLabel: "Add a Community Fridge",
    title: "No community fridges in your area yet",
    description:
      "Know of a community fridge or pantry in your area? Add it to the map so neighbors can share and find food.",
    highlightText: "Help keep local community fridges stocked and visible.",
  },
  fridges: {
    name: "Fridges",
    targetType: "fridge",
    icon: Refrigerator,
    actionLabel: "Add a Community Fridge",
    title: "No community fridges in your area yet",
    description:
      "Know of a community fridge or pantry in your area? Add it to the map so neighbors can share and find food.",
    highlightText: "Help keep local community fridges stocked and visible.",
  },
  foodbank: {
    name: "Food Banks",
    targetType: "foodbank",
    icon: Warehouse,
    actionLabel: "Add a Food Bank",
    title: "No food banks in your area yet",
    description:
      "Register a local food bank, pantry, or distribution point to connect food support with families in your area.",
    highlightText: "Strengthen your local emergency food support network.",
  },
  foodbanks: {
    name: "Food Banks",
    targetType: "foodbank",
    icon: Warehouse,
    actionLabel: "Add a Food Bank",
    title: "No food banks in your area yet",
    description:
      "Register a local food bank, pantry, or distribution point to connect food support with families in your area.",
    highlightText: "Strengthen your local emergency food support network.",
  },
  volunteer: {
    name: "Volunteers",
    targetType: "volunteer",
    icon: HeartHandshake,
    actionLabel: "Offer to Volunteer",
    title: "No volunteer posts in your area yet",
    description: "Be the first to offer volunteering or post community aid opportunities in your area.",
    highlightText: "Connect passionate volunteers with local community initiatives.",
  },
  volunteers: {
    name: "Volunteers",
    targetType: "volunteer",
    icon: HeartHandshake,
    actionLabel: "Offer to Volunteer",
    title: "No volunteer posts in your area yet",
    description: "Be the first to offer volunteering or post community aid opportunities in your area.",
    highlightText: "Connect passionate volunteers with local community initiatives.",
  },
  vegan: {
    name: "Vegan",
    targetType: "vegan",
    icon: Sprout,
    actionLabel: "Share Vegan Food",
    title: "No vegan listings in your area yet",
    description: "Be the first to share in your area! Share plant-based meals, vegan produce, and cruelty-free goods.",
    highlightText: "Build a thriving local plant-based sharing network.",
  },
  challenge: {
    name: "Challenges",
    targetType: "challenge",
    icon: Trophy,
    actionLabel: "Start a Challenge",
    title: "No challenges in your area yet",
    description: "Start a waste reduction or food sharing challenge to motivate and engage your local community.",
    highlightText: "Turn sustainable habits into an inspiring community achievement.",
  },
  challenges: {
    name: "Challenges",
    targetType: "challenge",
    icon: Trophy,
    actionLabel: "Start a Challenge",
    title: "No challenges in your area yet",
    description: "Start a waste reduction or food sharing challenge to motivate and engage your local community.",
    highlightText: "Turn sustainable habits into an inspiring community achievement.",
  },
  business: {
    name: "Organisations",
    targetType: "business",
    icon: Landmark,
    actionLabel: "Add an Organisation",
    title: "No organisations in your area yet",
    description: "Connect your local business, bakery, grocery, or charity in your area to share surplus food.",
    highlightText: "Empower businesses to cut commercial waste and support the community.",
  },
  organisation: {
    name: "Organisations",
    targetType: "business",
    icon: Landmark,
    actionLabel: "Add an Organisation",
    title: "No organisations in your area yet",
    description: "Connect your local business, bakery, grocery, or charity in your area to share surplus food.",
    highlightText: "Empower businesses to cut commercial waste and support the community.",
  },
  organisations: {
    name: "Organisations",
    targetType: "business",
    icon: Landmark,
    actionLabel: "Add an Organisation",
    title: "No organisations in your area yet",
    description: "Connect your local business, bakery, grocery, or charity in your area to share surplus food.",
    highlightText: "Empower businesses to cut commercial waste and support the community.",
  },
};

const DEFAULT_CONFIG: CategoryEmptyConfig = {
  name: "Listings",
  targetType: "food",
  icon: PackageSearch,
  actionLabel: "Add a listing in your area",
  title: "No listings in your area yet",
  description: "Be the first to share surplus food or items with neighbors in your neighborhood.",
  highlightText: "Start the sharing circle in your local community today.",
};

const EXPLORE_CATEGORIES = [
  { href: "/food", label: "Food", type: "food" },
  { href: "/zerowaste", label: "Zero Waste", type: "zerowaste" },
  { href: "/thing", label: "Things", type: "thing" },
  { href: "/borrow", label: "Borrow", type: "borrow" },
  { href: "/wanted", label: "Wanted", type: "wanted" },
];

function formatDistance(meters: number, locale: string): string {
  if (locale === "en") {
    const miles = meters / 1609.34;
    return `${Math.round(miles)} miles`;
  }
  const km = meters / 1000;
  return `${Math.round(km)} km`;
}

export interface EmptyListingStateProps {
  productType?: string;
  searchTerm?: string;
  isLocationFiltered?: boolean;
  radiusMeters?: number;
  locale?: string;
  onClearSearch?: () => void;
}

export function EmptyListingState({
  productType = "food",
  searchTerm = "",
  isLocationFiltered = false,
  radiusMeters = 5000,
  locale = "en",
  onClearSearch,
}: EmptyListingStateProps) {
  const router = useRouter();
  const { isAuth } = useAuth();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [pendingRedirect, setPendingRedirect] = useState(false);

  const normalizedType = productType.toLowerCase();
  const config = CATEGORY_CONFIGS[normalizedType] || DEFAULT_CONFIG;
  const CategoryIcon = searchTerm ? SearchX : config.icon;

  const handleAction = () => {
    if (isAuth) {
      router.push(`/new?type=${config.targetType}`);
    } else {
      setPendingRedirect(true);
      setIsAuthOpen(true);
    }
  };

  useEffect(() => {
    if (isAuth && pendingRedirect) {
      setPendingRedirect(false);
      setIsAuthOpen(false);
      router.push(`/new?type=${config.targetType}`);
    }
  }, [isAuth, pendingRedirect, router, config.targetType]);

  // Dynamic copy resolution
  let headline = config.title;
  let subheadline = config.description;

  if (searchTerm) {
    headline = `No listings matching "${searchTerm}"`;
    subheadline = `Nothing matched your search in your area. Be the first to add a listing in ${config.name} for your neighborhood!`;
  } else if (isLocationFiltered && radiusMeters) {
    const formattedDist = formatDistance(radiusMeters, locale);
    headline = `Nothing shared within ${formattedDist} yet`;
    subheadline = `Be the first to post in your area! Help neighbors connect and reduce waste in your local community.`;
  }

  const otherCategories = EXPLORE_CATEGORIES.filter((c) => c.type !== normalizedType && c.type !== config.targetType);

  return (
    <div role="status" aria-live="polite" className="w-full max-w-xl mx-auto my-10 px-4">
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-b from-card/95 via-card/80 to-card/60 backdrop-blur-2xl p-8 sm:p-12 text-center shadow-xl">
        {/* Soft background ambient glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 inset-x-0 mx-auto size-72 sm:size-96 rounded-full bg-gradient-to-br from-emerald-500/10 via-primary/5 to-transparent blur-3xl"
        />

        {/* Category Icon Badge */}
        <div className="relative inline-flex items-center justify-center mb-6">
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-2xl bg-muted/40 blur-xl opacity-60 dark:opacity-40"
          />
          <div className="relative size-16 sm:size-20 rounded-2xl bg-muted/60 border border-border/80 flex items-center justify-center text-foreground shadow-inner">
            <CategoryIcon className="size-8 sm:size-10 stroke-[1.75]" aria-hidden="true" />
          </div>
          <div
            aria-hidden="true"
            className="absolute -bottom-1 -end-1 size-6 rounded-full bg-gradient-to-r from-[#FF2D55] to-[#FF385C] text-white flex items-center justify-center shadow-md border-2 border-card"
          >
            <Plus className="size-3.5 stroke-[2.5]" aria-hidden="true" />
          </div>
        </div>

        {/* Category Pill Tag */}
        <div className="mb-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-muted/60 text-foreground border border-border/80 shadow-2xs">
            <Sparkles className="size-3 stroke-[2] text-amber-500" aria-hidden="true" />
            <span>{config.name}</span>
          </span>
        </div>

        {/* Headings */}
        <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mb-3 font-display">
          <span>{headline}</span>
        </h3>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-md mx-auto mb-8">
          <span>{subheadline}</span>
        </p>

        {/* Primary and Secondary Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
          <Button
            type="button"
            onClick={handleAction}
            className="w-full sm:w-auto min-h-12 px-7 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#FF2D55] to-[#FF385C] hover:from-[#E02447] hover:to-[#E0284D] active:scale-95 text-white shadow-md hover:shadow-lg transition-all inline-flex items-center justify-center gap-2"
          >
            <Plus className="size-5 stroke-[2.5]" aria-hidden="true" />
            <span>{config.actionLabel}</span>
          </Button>

          {searchTerm && onClearSearch && (
            <Button
              type="button"
              variant="outline"
              onClick={onClearSearch}
              className="w-full sm:w-auto min-h-12 px-6 rounded-xl text-sm font-semibold border border-border/80 bg-background/80 hover:bg-muted/60 hover:border-foreground/30 active:scale-95 text-foreground shadow-2xs hover:shadow-xs transition-all inline-flex items-center justify-center gap-2"
            >
              <X className="size-4" aria-hidden="true" />
              <span>{"Clear search"}</span>
            </Button>
          )}
        </div>

        {/* Category exploration shortcuts */}
        <div className="pt-6 border-t border-border/40">
          <p className="text-xs text-muted-foreground mb-3 font-medium">
            <span>{"Explore other categories nearby"}</span>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {otherCategories.map((cat) => (
              <Link
                key={cat.href}
                href={cat.href}
                className="text-xs font-semibold px-3.5 py-1.5 rounded-full border border-border/80 bg-background/80 hover:bg-muted/60 hover:border-foreground/30 text-foreground transition-all shadow-2xs hover:shadow-xs active:scale-95"
              >
                <span>{cat.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Authentication modal for guest users */}
      <AuthenticationUserModal
        mode="login"
        isOpen={isAuthOpen}
        onClose={() => {
          setIsAuthOpen(false);
          setPendingRedirect(false);
        }}
      />
    </div>
  );
}
