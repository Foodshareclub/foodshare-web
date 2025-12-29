import { ImageResponse } from "next/og";
import { getProductById } from "@/lib/data/products";

export const runtime = "edge";
export const alt = "FoodShare Listing";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// ISR: Regenerate image every 5 minutes
export const revalidate = 300;

const typeEmojis: Record<string, string> = {
  food: "🍽️",
  thing: "📦",
  borrow: "🤝",
  wanted: "🔍",
  fridge: "❄️",
  foodbank: "🏪",
  business: "🏢",
  volunteer: "🙋",
  challenge: "🏆",
  zerowaste: "♻️",
  vegan: "🌱",
  community: "👥",
};

const typeGradients: Record<string, string> = {
  food: "linear-gradient(135deg, #FF6B6B 0%, #FF8E53 50%, #FFC93C 100%)",
  thing: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  borrow: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
  wanted: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  fridge: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  foodbank: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  business: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  volunteer: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
  challenge: "linear-gradient(135deg, #f093fb 0%, #f5576c 50%, #f093fb 100%)",
  zerowaste: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
  vegan: "linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)",
  community: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  default: "linear-gradient(135deg, #FF2D55 0%, #E61E4D 50%, #FF6B8A 100%)",
};

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Validate id is a valid number to prevent injection
  const productId = parseInt(id, 10);
  if (isNaN(productId) || productId <= 0) {
    // Return default image for invalid IDs
    return new ImageResponse(
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #FF2D55 0%, #E61E4D 50%, #FF6B8A 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <span style={{ fontSize: 80, color: "white" }}>🍓 FoodShare</span>
      </div>,
      { ...size }
    );
  }

  // Fetch product data
  let title = "Food Listing";
  let subtitle = "Available on FoodShare";
  let emoji = "🍓";
  let gradient = typeGradients.default;
  let hasImage = false;
  let imageUrl = "";

  try {
    const product = await getProductById(productId);
    if (product) {
      title = product.post_name || "Food Item";
      subtitle = product.post_stripped_address || product.post_type || "Free on FoodShare";
      const type = product.post_type || "food";
      emoji = typeEmojis[type] || "🍓";
      gradient = typeGradients[type] || typeGradients.default;

      if (product.images?.[0]) {
        hasImage = true;
        imageUrl = product.images[0];
      }
    }
  } catch {
    // Use defaults on error
  }

  // Truncate title if too long
  const displayTitle = title.length > 40 ? `${title.slice(0, 37)}...` : title;
  const displaySubtitle = subtitle.length > 60 ? `${subtitle.slice(0, 57)}...` : subtitle;

  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        background: gradient,
        fontFamily: "system-ui, sans-serif",
        position: "relative",
      }}
    >
      {/* Background image if available */}
      {hasImage && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
          }}
        >
          <img
            src={imageUrl}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.25,
            }}
          />
        </div>
      )}

      {/* Content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          padding: "40px 60px",
          textAlign: "center",
          zIndex: 1,
        }}
      >
        {/* Emoji badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.95)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
            marginBottom: 24,
          }}
        >
          <span style={{ fontSize: 60 }}>{emoji}</span>
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            fontSize: title.length > 25 ? 48 : 56,
            fontWeight: 800,
            color: "white",
            textShadow: "0 4px 16px rgba(0,0,0,0.3)",
            marginBottom: 16,
            maxWidth: "90%",
            lineHeight: 1.2,
          }}
        >
          {displayTitle}
        </div>

        {/* Subtitle/Location */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 28,
            color: "rgba(255,255,255,0.9)",
            textShadow: "0 2px 8px rgba(0,0,0,0.2)",
          }}
        >
          <span>📍</span>
          <span>{displaySubtitle}</span>
        </div>

        {/* FREE badge */}
        <div
          style={{
            display: "flex",
            marginTop: 32,
            padding: "12px 32px",
            background: "rgba(255,255,255,0.25)",
            borderRadius: 50,
            fontSize: 24,
            fontWeight: 700,
            color: "white",
          }}
        >
          FREE
        </div>
      </div>

      {/* FoodShare branding */}
      <div
        style={{
          position: "absolute",
          bottom: 32,
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
        }}
      >
        <img
          src={`${process.env.NEXT_PUBLIC_SITE_URL || "https://foodshare.club"}/logo512.png`}
          alt="FoodShare"
          width={36}
          height={36}
          style={{
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          }}
        />
        <span
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "white",
            textShadow: "0 2px 8px rgba(0,0,0,0.2)",
          }}
        >
          foodshare.club
        </span>
      </div>
    </div>,
    {
      ...size,
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
      },
    }
  );
}
