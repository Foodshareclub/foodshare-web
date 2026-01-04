import { ImageResponse } from "next/og";
import { getChallengeById } from "@/lib/data/challenges";

export const runtime = "edge";
export const alt = "FoodShare Challenge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// ISR: Regenerate image every 2 minutes
export const revalidate = 120;

export default async function Image({ params }: { params: { id: string } }) {
  const challengeId = parseInt(params.id, 10);
  const challenge = isNaN(challengeId) ? null : await getChallengeById(challengeId);

  const title = challenge?.challenge_title || "Community Challenge";
  const description =
    challenge?.challenge_description?.slice(0, 100) || "Join this challenge on FoodShare";
  const difficulty = challenge?.challenge_difficulty || "medium";
  const participantsCount = Number(challenge?.challenged_people) || 0;

  // Difficulty colors
  const difficultyColors: Record<string, string> = {
    easy: "#10B981",
    medium: "#F59E0B",
    hard: "#EF4444",
  };

  const difficultyColor = difficultyColors[difficulty] || difficultyColors.medium;

  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 50%, #6D28D9 100%)",
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
        {/* Trophy icon */}
        <div
          style={{
            display: "flex",
            fontSize: 80,
            marginBottom: 16,
          }}
        >
          🏆
        </div>

        {/* Challenge badge */}
        <div
          style={{
            display: "flex",
            padding: "6px 16px",
            background: "rgba(255,255,255,0.2)",
            borderRadius: 50,
            fontSize: 16,
            color: "white",
            fontWeight: 600,
            marginBottom: 16,
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}
        >
          Challenge
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            fontSize: 52,
            fontWeight: 800,
            color: "white",
            textShadow: "0 4px 20px rgba(0,0,0,0.3)",
            marginBottom: 12,
            letterSpacing: "-1px",
            textAlign: "center",
            maxWidth: 900,
          }}
        >
          {title}
        </div>

        {/* Description */}
        <div
          style={{
            display: "flex",
            fontSize: 22,
            color: "rgba(255,255,255,0.9)",
            textShadow: "0 2px 10px rgba(0,0,0,0.2)",
            marginBottom: 32,
            maxWidth: 700,
            textAlign: "center",
          }}
        >
          {description}
        </div>

        {/* Stats badges */}
        <div style={{ display: "flex", gap: 16 }}>
          {/* Difficulty badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              background: difficultyColor,
              borderRadius: 50,
              fontSize: 18,
              color: "white",
              fontWeight: 600,
            }}
          >
            <span>⚡</span>
            <span style={{ textTransform: "capitalize" }}>{difficulty}</span>
          </div>

          {/* Participants badge */}
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
              fontWeight: 600,
            }}
          >
            <span>👥</span>
            <span>{participantsCount} Participants</span>
          </div>

          {/* Join badge */}
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
              fontWeight: 600,
            }}
          >
            <span>🎯</span>
            <span>Join Now</span>
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
        "Cache-Control": "public, max-age=120, s-maxage=120, stale-while-revalidate=300",
      },
    }
  );
}
