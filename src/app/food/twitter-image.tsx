import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "FoodShare - Food Listings";
export const size = { width: 1200, height: 600 };
export const contentType = "image/png";

// ISR: Regenerate image every 5 minutes
export const revalidate = 300;

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
        background: "linear-gradient(135deg, #FF6B6B 0%, #FF8E53 50%, #FFC93C 100%)",
        fontFamily: "system-ui, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative circles */}
      <div
        style={{
          position: "absolute",
          top: -100,
          right: -100,
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.1)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -150,
          left: -150,
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.08)",
        }}
      />

      {/* Main content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          zIndex: 1,
        }}
      >
        {/* Emoji badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 140,
            height: 140,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.95)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
            marginBottom: 24,
          }}
        >
          <span style={{ fontSize: 70 }}>🍽️</span>
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            fontSize: 64,
            fontWeight: 800,
            color: "white",
            textShadow: "0 4px 20px rgba(0,0,0,0.3)",
            marginBottom: 12,
            letterSpacing: "-1px",
          }}
        >
          Food Listings
        </div>

        {/* Tagline */}
        <div
          style={{
            display: "flex",
            fontSize: 28,
            color: "rgba(255,255,255,0.95)",
            textShadow: "0 2px 10px rgba(0,0,0,0.2)",
            marginBottom: 40,
          }}
        >
          Share Surplus Food • Reduce Waste • Help Neighbors
        </div>

        {/* Feature badges */}
        <div style={{ display: "flex", gap: 16 }}>
          <div
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
            🆓 Always Free
          </div>
          <div
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
            📍 Local Community
          </div>
          <div
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
            🌍 Reduce Waste
          </div>
        </div>
      </div>

      {/* Branding */}
      <div
        style={{
          position: "absolute",
          bottom: 28,
          display: "flex",
          alignItems: "center",
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
            fontWeight: 600,
            color: "rgba(255,255,255,0.9)",
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
