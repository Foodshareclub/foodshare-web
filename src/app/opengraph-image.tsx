import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "FoodShare - Share Food, Reduce Waste, Build Community";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #00A699 0%, #00C9B7 50%, #7DD3C0 100%)",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Logo - FoodShare strawberry */}
      {}
      <img
        src={`${process.env.NEXT_PUBLIC_SITE_URL || "https://foodshare.club"}/logo512.png`}
        alt="FoodShare Logo"
        width={160}
        height={160}
        style={{
          marginBottom: 32,
          borderRadius: "24px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
        }}
      />

      {/* Title */}
      <div
        style={{
          display: "flex",
          fontSize: 72,
          fontWeight: 800,
          color: "white",
          textShadow: "0 4px 12px rgba(0,0,0,0.2)",
          marginBottom: 16,
        }}
      >
        FoodShare
      </div>

      {/* Tagline */}
      <div
        style={{
          display: "flex",
          fontSize: 32,
          color: "rgba(255,255,255,0.95)",
          textShadow: "0 2px 8px rgba(0,0,0,0.15)",
          marginBottom: 40,
        }}
      >
        Share Food • Reduce Waste • Build Community
      </div>

      {/* Feature badges */}
      <div
        style={{
          display: "flex",
          gap: 16,
        }}
      >
        {["⚡ Fast", "🌍 21 Languages", "🔒 Secure", "💚 Free"].map((badge) => (
          <div
            key={badge}
            style={{
              display: "flex",
              padding: "12px 24px",
              background: "rgba(255,255,255,0.2)",
              borderRadius: 50,
              fontSize: 20,
              color: "white",
              fontWeight: 600,
            }}
          >
            {badge}
          </div>
        ))}
      </div>

      {/* URL */}
      <div
        style={{
          position: "absolute",
          bottom: 32,
          display: "flex",
          fontSize: 24,
          color: "rgba(255,255,255,0.8)",
        }}
      >
        foodshare.club
      </div>
    </div>,
    { ...size }
  );
}
