import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Help Center - FoodShare";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// ISR: Regenerate image every hour (static content)
export const revalidate = 3600;

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
        background: "linear-gradient(135deg, #06B6D4 0%, #0891B2 50%, #22D3EE 100%)",
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

      {/* Floating icons */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: 150,
          fontSize: 44,
          opacity: 0.6,
        }}
      >
        📖
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
        💡
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
        🔧
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
        {/* Help icon */}
        <div
          style={{
            display: "flex",
            fontSize: 100,
            marginBottom: 24,
          }}
        >
          ❓
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
          Help Center
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
          Get answers to your questions and learn how to use FoodShare
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
            📚 Guides
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
            ❔ FAQs
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
            💬 Support
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
        "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=7200",
      },
    }
  );
}
