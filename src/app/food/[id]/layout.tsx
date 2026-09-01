import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/metadata";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const supa = await createClient();

  const { data, error } = await supa
    .from("posts")
    .select("id, title, description, images, created_at, updated_at")
    .eq("id", params.id)
    .single();

  if (error || !data) {
    return {};
  }

  return generatePageMetadata({
    title: data.title,
    description: data.description,
    path: `/food/${data.id}`,
    images:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data.images?.map((img: any) => ({
        url: img.url,
        alt: img.alt || data.title,
      })) || [],
    noIndex: false,
    type: "website",
  });
}

export default function ProductDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
