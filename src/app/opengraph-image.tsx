import { ImageResponse } from "next/og";
import { ogImageSize } from "@/lib/og-image";
import { createClient } from "@/lib/supabase/server";

export const size = ogImageSize;
export const contentType = "image/png";

export async function generateOGImage({
  params,
}: {
  params: { id: string };
}): Promise<ImageResponse> {
  const supa = await createClient();

  const { data, error } = await supa
    .from("posts")
    .select("id, title, description, images, created_at, updated_at")
    .eq("id", params.id)
    .single();

  if (error || !data) {
    // Return a fallback 404-style image
    return new ImageResponse(
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <span
          style={{
            fontSize: 48,
            color: "white",
            textShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          Listing Not Found
        </span>
      </div>,
      ogImageSize
    );
  }

  const gradient =
    {
      default: "linear-gradient(135deg, #00A699 0%, #00C9B7 50%, #7DD3C0 100%)",
      food: "linear-gradient(135deg, #FF6B6B 0%, #FF8E53 50%, #FFC93C 100%)",
    }["food"] || "linear-gradient(135deg, #00A699 0%, #00C9B7 50%, #7DD3C0 100%)";

  const defaultEmoji = "🍽️";

  // Truncate title if too long
  const displayTitle = data.title.length > 50 ? `${data.title.slice(0, 47)}...` : data.title;
  const displaySubtitle =
    data.description && data.description.length > 100
      ? `${data.description.slice(0, 97)}...`
      : data.description;

  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: gradient,
        fontFamily: "system-ui, sans-serif",
        position: "relative",
      }}
    >
      {/* Background image overlay */}
      {data.images?.[0]?.url && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `url(${data.images[0].url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.3,
          }}
        />
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1,
          padding: "40px 60px",
          textAlign: "center",
        }}
      >
        {/* Emoji */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.95)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
            marginBottom: 24,
          }}
        >
          <span style={{ fontSize: 60 }}>{defaultEmoji}</span>
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            fontSize: data.title.length > 30 ? 48 : 56,
            fontWeight: 800,
            color: "white",
            textShadow: "0 4px 12px rgba(0,0,0,0.3)",
            marginBottom: 16,
            maxWidth: "90%",
            lineHeight: 1.2,
          }}
        >
          {displayTitle}
        </div>

        {/* Subtitle */}
        {displaySubtitle && (
          <div
            style={{
              display: "flex",
              fontSize: 28,
              color: "rgba(255,255,255,0.9)",
              textShadow: "0 2px 8px rgba(0,0,0,0.2)",
              maxWidth: "80%",
              lineHeight: 1.4,
            }}
          >
            {displaySubtitle}
          </div>
        )}
      </div>

      {/* FoodShare branding */}
      <div
        style={{
          position: "absolute",
          bottom: 32,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "white",
          }}
        >
          <span style={{ fontSize: 24 }}>🍓</span>
        </div>
        <span
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: "white",
            textShadow: "0 2px 8px rgba(0,0,0,0.2)",
          }}
        >
          FoodShare
        </span>
      </div>
    </div>,
    ogImageSize
  );
}
