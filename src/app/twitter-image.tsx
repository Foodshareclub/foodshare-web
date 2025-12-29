import { ImageResponse } from "next/og";
import { getOGStats, getSeasonalTheme } from "@/lib/data/og-stats";

export const runtime = "edge";
export const alt = "FoodShare - Share Food, Reduce Waste, Build Community";
export const size = { width: 1200, height: 600 };
export const contentType = "image/png";

// ISR: Regenerate image every 5 minutes
export const revalidate = 300;

export default async function Image() {
  // Fetch dynamic stats
  const stats = await getOGStats();
  const seasonal = getSeasonalTheme();

  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #FF2D55 0%, #E61E4D 50%, #FF6B8A 100%)",
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
        {/* Logo */}
        <img
          src={`${process.env.NEXT_PUBLIC_SITE_URL || "https://foodshare.club"}/logo512.png`}
          alt="FoodShare Logo"
          width={140}
          height={140}
          style={{
            marginBottom: 24,
            borderRadius: "28px",
            boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
          }}
        />

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
          FoodShare
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
          Share Food • Reduce Waste • Build Community
        </div>

        {/* Stats cards */}
        <div
          style={{
            display: "flex",
            gap: 20,
            marginBottom: 32,
          }}
        >
          {/* Listings stat */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "20px 32px",
              background: "rgba(255,255,255,0.15)",
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 36,
                fontWeight: 700,
                color: "white",
              }}
            >
              {stats.totalListings.toLocaleString()}+
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 16,
                color: "rgba(255,255,255,0.9)",
                marginTop: 4,
              }}
            >
              Food Listings
            </div>
          </div>

          {/* Users stat */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "20px 32px",
              background: "rgba(255,255,255,0.15)",
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 36,
                fontWeight: 700,
                color: "white",
              }}
            >
              {stats.activeUsers.toLocaleString()}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 16,
                color: "rgba(255,255,255,0.9)",
                marginTop: 4,
              }}
            >
              Active Members
            </div>
          </div>

          {/* Food saved stat */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "20px 32px",
              background: "rgba(255,255,255,0.15)",
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 36,
                fontWeight: 700,
                color: "white",
              }}
            >
              {stats.foodSaved}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 16,
                color: "rgba(255,255,255,0.9)",
                marginTop: 4,
              }}
            >
              Food Saved
            </div>
          </div>
        </div>

        {/* Feature badges */}
        <div style={{ display: "flex", gap: 12 }}>
          <div
            style={{
              display: "flex",
              padding: "8px 16px",
              background: "rgba(255,255,255,0.2)",
              borderRadius: 50,
              fontSize: 16,
              color: "white",
              fontWeight: 600,
            }}
          >
            ⚡ Fast
          </div>
          <div
            style={{
              display: "flex",
              padding: "8px 16px",
              background: "rgba(255,255,255,0.2)",
              borderRadius: 50,
              fontSize: 16,
              color: "white",
              fontWeight: 600,
            }}
          >
            🌍 21 Languages
          </div>
          <div
            style={{
              display: "flex",
              padding: "8px 16px",
              background: "rgba(255,255,255,0.2)",
              borderRadius: 50,
              fontSize: 16,
              color: "white",
              fontWeight: 600,
            }}
          >
            🔒 Secure
          </div>
          <div
            style={{
              display: "flex",
              padding: "8px 16px",
              background: "rgba(255,255,255,0.2)",
              borderRadius: 50,
              fontSize: 16,
              color: "white",
              fontWeight: 600,
            }}
          >
            💚 Free
          </div>
          <div
            style={{
              display: "flex",
              padding: "8px 16px",
              background: "rgba(255,255,255,0.2)",
              borderRadius: 50,
              fontSize: 16,
              color: "white",
              fontWeight: 600,
            }}
          >
            {seasonal.emoji} {seasonal.season.charAt(0).toUpperCase() + seasonal.season.slice(1)}
          </div>
        </div>
      </div>

      {/* URL */}
      <div
        style={{
          position: "absolute",
          bottom: 28,
          display: "flex",
          fontSize: 22,
          color: "rgba(255,255,255,0.85)",
          fontWeight: 500,
        }}
      >
        foodshare.club
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
