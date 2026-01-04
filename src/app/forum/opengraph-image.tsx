import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Community Forum - FoodShare";
export const size = { width: 1200, height: 630 };
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
        background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 50%, #60A5FA 100%)",
        fontFamily: "system-ui, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative elements */}
      <div
        style={{
          position: "absolute",
          top: -80,
          right: -80,
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.1)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -100,
          left: -100,
          width: 350,
          height: 350,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.08)",
        }}
      />

      {/* Floating chat icons */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: 150,
          fontSize: 44,
          opacity: 0.6,
        }}
      >
        💬
      </div>
      <div
        style={{
          position: "absolute",
          top: 120,
          right: 180,
          fontSize: 52,
          opacity: 0.7,
        }}
      >
        🗣️
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 120,
          left: 220,
          fontSize: 40,
          opacity: 0.5,
        }}
      >
        💡
      </div>

      {/* Main content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          zIndex: 1,
        }}
      >
        {/* Forum icon */}
        <div
          style={{
            display: "flex",
            fontSize: 100,
            marginBottom: 24,
          }}
        >
          📣
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
          Community Forum
        </div>

        {/* Tagline */}
        <div
          style={{
            display: "flex",
            fontSize: 26,
            color: "rgba(255,255,255,0.95)",
            textShadow: "0 2px 10px rgba(0,0,0,0.2)",
            marginBottom: 40,
            maxWidth: 700,
            textAlign: "center",
          }}
        >
          Share tips, ask questions, and connect with the community
        </div>

        {/* Feature badges */}
        <div style={{ display: "flex", gap: 12 }}>
          <div
            style={{
              display: "flex",
              padding: "10px 20px",
              background: "rgba(255,255,255,0.2)",
              borderRadius: 50,
              fontSize: 18,
              color: "white",
              fontWeight: 600,
            }}
          >
            🌱 Sustainability Tips
          </div>
          <div
            style={{
              display: "flex",
              padding: "10px 20px",
              background: "rgba(255,255,255,0.2)",
              borderRadius: 50,
              fontSize: 18,
              color: "white",
              fontWeight: 600,
            }}
          >
            🍳 Recipes
          </div>
          <div
            style={{
              display: "flex",
              padding: "10px 20px",
              background: "rgba(255,255,255,0.2)",
              borderRadius: 50,
              fontSize: 18,
              color: "white",
              fontWeight: 600,
            }}
          >
            🤝 Community
          </div>
        </div>
      </div>

      {/* Logo and URL */}
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
          src={`${process.env.NEXT_PUBLIC_SITE_URL || "https://foodshare.club"}/logo192.png`}
          alt="FoodShare"
          width={40}
          height={40}
          style={{ borderRadius: 8 }}
        />
        <div
          style={{
            display: "flex",
            fontSize: 22,
            color: "rgba(255,255,255,0.9)",
            fontWeight: 500,
          }}
        >
          foodshare.club
        </div>
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
