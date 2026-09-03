import { generatePageMetadata } from "@/lib/metadata";

export const metadata = generatePageMetadata({
  title: "Guides",
  description:
    "FoodShare guides — food safety, sharing guidelines, expiry dates, borrowing and more.",
  keywords: ["guides", "help", "FoodShare", "food safety", "borrow"],
  path: "/guides",
});

export default function GuidesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
