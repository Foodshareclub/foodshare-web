import { siteConfig } from "@/lib/metadata";
import { generateOGImage, ogImageSize } from "@/lib/og-image";

export const alt = "FoodShare - Share Food, Reduce Waste, Build Community";
export const size = ogImageSize;
export const contentType = "image/png";

export default async function Image() {
  return generateOGImage({
    title: siteConfig.name,
    subtitle: siteConfig.description.slice(0, 120),
    type: "default",
  });
}
