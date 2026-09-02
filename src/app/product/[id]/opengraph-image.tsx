import { createCachedClient } from "@/lib/supabase/server";
import { ogImageSize } from "@/lib/og-image";
import { generateOGImage } from "@/lib/og-image";

export const alt = "FoodShare listing";
export const size = ogImageSize;
export const contentType = "image/png";

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "item"
  );
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function Image({ params }: Props) {
  const { id: idParam } = await params;
  const m = idParam.match(/^(\d+)/);
  const productId = m ? parseInt(m[1], 10) : NaN;

  if (isNaN(productId)) {
    return generateOGImage({ title: "Listing Not Found", type: "food" });
  }

  try {
    const supabase = createCachedClient();
    const { data } = await supabase
      .from("posts_with_location")
      .select("id,post_name,post_description,images,post_type")
      .eq("id", productId)
      .eq("is_active", true)
      .single();

    if (!data) return generateOGImage({ title: "Listing Not Found", type: "food" });

    const title = (data.post_name as string) || "Food Item";
    const desc = (data.post_description as string) || "";
    const images = data.images as string[] | null;
    const firstImage =
      Array.isArray(images) && images.length > 0 ? (images[0] as string) : undefined;

    return generateOGImage({
      title,
      subtitle:
        desc.slice(0, 100) || `${(data.post_type as string) || "Food"} available for sharing`,
      type: "food",
      imageUrl: firstImage,
    });
  } catch {
    return generateOGImage({
      title: "FoodShare",
      subtitle: "Share Food, Reduce Waste",
      type: "default",
    });
  }
}
