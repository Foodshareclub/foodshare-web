// Migrated from Foodshareclub/foodshare-docs (GitBook, 2022-2023) → web guides
// Archived source: 7 product-guides cherry-picked (stale overview/fundamentals/use-cases + 2021 Tesco app-not-working skipped)
// Each guide retains original intent but modernized for Next.js 16.3 prod (no Firebase/FlutterFlow refs)

export type GuideCategory = "Safety" | "Sharing" | "Food" | "Borrow" | "Legal";

export interface GuideMeta {
  slug: string;
  title: string;
  description: string;
  category: GuideCategory;
  keywords: string[];
  // for sitemap lastModified — docs last updated 2023-01-21, web guides refreshed 2026
  updatedAt: string;
}

export const guides: GuideMeta[] = [
  {
    slug: "food-safety",
    title: "Food Safety",
    description:
      "How to share and collect food safely on FoodShare — domestic kitchens and business donations.",
    category: "Safety",
    keywords: ["food safety", "HACCP", "FoodShare", "allergen"],
    updatedAt: "2026-09-03",
  },
  {
    slug: "safe-sharing",
    title: "Safe Sharing",
    description: "Community trust and safety tips for sharing on FoodShare.",
    category: "Safety",
    keywords: ["safe sharing", "trust", "FoodShare safety"],
    updatedAt: "2026-09-03",
  },
  {
    slug: "sharing-guidelines",
    title: "Guidelines for Sharing on FoodShare",
    description: "Five simple guidelines that keep FoodShare kind and useful.",
    category: "Sharing",
    keywords: ["sharing guidelines", "community", "FoodShare"],
    updatedAt: "2026-09-03",
  },
  {
    slug: "what-can-i-share",
    title: "What Can I Share?",
    description: "What food and non-food items you can and cannot share on FoodShare.",
    category: "Food",
    keywords: ["what to share", "food sharing", "FoodShare rules"],
    updatedAt: "2026-09-03",
  },
  {
    slug: "expiry-dates",
    title: "Expiry Dates Explained",
    description: "Use By vs Best Before — what they mean and what you can share when.",
    category: "Food",
    keywords: ["expiry", "use by", "best before", "food waste"],
    updatedAt: "2026-09-03",
  },
  {
    slug: "borrow",
    title: "Borrow — Lend & Borrow Things",
    description: "How Borrow works for lending and borrowing household items on FoodShare.",
    category: "Borrow",
    keywords: ["borrow", "lending", "sharing", "FoodShare Borrow"],
    updatedAt: "2026-09-03",
  },
  {
    slug: "cookie-policy",
    title: "Cookie Policy",
    description: "How FoodShare uses cookies and how to manage them.",
    category: "Legal",
    keywords: ["cookie", "privacy", "FoodShare"],
    updatedAt: "2026-09-03",
  },
];

export function getGuide(slug: string): GuideMeta | undefined {
  return guides.find((g) => g.slug === slug);
}

export function getAllGuideSlugs(): string[] {
  return guides.map((g) => g.slug);
}
