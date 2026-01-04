import { ImageResponse } from "next/og";
import { getPublicProfile } from "@/lib/data/profiles";

export const runtime = "edge";
export const alt = "FoodShare Profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// ISR: Regenerate image every 5 minutes
export const revalidate = 300;

export default async function Image({ params }: { params: { id: string } }) {
  const profile = await getPublicProfile(params.id);

  const fullName = [profile?.first_name, profile?.second_name].filter(Boolean).join(" ") || "User";
  const nickname = profile?.nickname || fullName;
  const aboutMe = profile?.about_me?.slice(0, 100) || "FoodShare community member";
  const avatarUrl = profile?.avatar_url;

  // Format member since date
  const memberSince = profile?.created_time
    ? new Date(profile.created_time).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "Member";

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

      {/* Main content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          zIndex: 1,
          padding: "0 60px",
        }}
      >
        {/* Avatar */}
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={nickname}
            width={140}
            height={140}
            style={{
              borderRadius: "50%",
              border: "4px solid rgba(255,255,255,0.3)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
              marginBottom: 24,
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
              border: "4px solid rgba(255,255,255,0.3)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
              marginBottom: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 56,
              fontWeight: 700,
              color: "white",
            }}
          >
            {nickname.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Name */}
        <div
          style={{
            display: "flex",
            fontSize: 52,
            fontWeight: 800,
            color: "white",
            textShadow: "0 4px 20px rgba(0,0,0,0.3)",
            marginBottom: 8,
            letterSpacing: "-1px",
          }}
        >
          {nickname}
        </div>

        {/* About */}
        <div
          style={{
            display: "flex",
            fontSize: 22,
            color: "rgba(255,255,255,0.9)",
            textShadow: "0 2px 10px rgba(0,0,0,0.2)",
            marginBottom: 32,
            maxWidth: 600,
            textAlign: "center",
          }}
        >
          {aboutMe}
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 16 }}>
          {/* Member since */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              background: "rgba(255,255,255,0.2)",
              borderRadius: 50,
              fontSize: 18,
              color: "white",
              fontWeight: 500,
            }}
          >
            <span>📅</span>
            <span>Member since {memberSince}</span>
          </div>

          {/* Community badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              background: "rgba(255,255,255,0.2)",
              borderRadius: 50,
              fontSize: 18,
              color: "white",
              fontWeight: 500,
            }}
          >
            <span>🌱</span>
            <span>Food Sharer</span>
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
