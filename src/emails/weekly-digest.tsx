/**
 * Weekly Digest Email - React Email Template
 *
 * Sent weekly with user stats and nearby listings.
 */

import { Text, Section, Img, Row, Column, Link } from "@react-email/components";
import { EmailLayout, EmailCard, EmailButton, colors } from "./components/base";

interface ListingPreview {
  title: string;
  image: string;
  distance: string;
  url: string;
}

interface WeeklyDigestEmailProps {
  weekRange?: string;
  itemsShared?: string;
  foodSaved?: string;
  co2Saved?: string;
  communityFoodSaved?: string;
  listings?: ListingPreview[];
  exploreUrl?: string;
}

export function WeeklyDigestEmail({
  weekRange = "{{ .WeekRange }}",
  itemsShared = "{{ .ItemsShared }}",
  foodSaved = "{{ .FoodSaved }}",
  co2Saved = "{{ .CO2Saved }}",
  communityFoodSaved = "{{ .CommunityFoodSaved }}",
  listings = [],
  exploreUrl = "{{ .ExploreURL }}",
}: WeeklyDigestEmailProps): React.ReactElement {
  // Default listings for template
  const displayListings =
    listings.length > 0
      ? listings
      : [
          {
            title: "{{ .Listing1Title }}",
            image: "{{ .Listing1Image }}",
            distance: "{{ .Listing1Distance }}",
            url: "{{ .Listing1URL }}",
          },
          {
            title: "{{ .Listing2Title }}",
            image: "{{ .Listing2Image }}",
            distance: "{{ .Listing2Distance }}",
            url: "{{ .Listing2URL }}",
          },
          {
            title: "{{ .Listing3Title }}",
            image: "{{ .Listing3Image }}",
            distance: "{{ .Listing3Distance }}",
            url: "{{ .Listing3URL }}",
          },
        ];

  return (
    <EmailLayout
      preview={`Your Foodshare weekly digest for ${weekRange}`}
      headerColor={colors.indigo}
      title="Your Weekly Digest"
      subtitle={weekRange}
      emoji="📊"
    >
      {/* Stats Section */}
      <Section style={{ marginBottom: "20px" }}>
        <Text
          style={{
            margin: "0 0 20px",
            fontSize: "14px",
            fontWeight: 600,
            color: colors.textLight,
            textTransform: "uppercase",
            letterSpacing: "1px",
            textAlign: "center",
          }}
        >
          Your Impact This Week
        </Text>

        {/* Stats Grid */}
        <Row>
          <Column style={{ width: "33%", padding: "10px" }}>
            <Section
              style={{
                backgroundColor: colors.white,
                borderRadius: "12px",
                border: `2px solid ${colors.border}`,
                textAlign: "center",
                padding: "25px 15px",
              }}
            >
              <Text style={{ margin: 0, fontSize: "36px", fontWeight: 800, color: colors.primary }}>
                {itemsShared}
              </Text>
              <Text
                style={{
                  margin: "8px 0 0",
                  fontSize: "13px",
                  color: colors.textLight,
                  fontWeight: 600,
                }}
              >
                Items Shared
              </Text>
            </Section>
          </Column>
          <Column style={{ width: "33%", padding: "10px" }}>
            <Section
              style={{
                backgroundColor: colors.white,
                borderRadius: "12px",
                border: `2px solid ${colors.border}`,
                textAlign: "center",
                padding: "25px 15px",
              }}
            >
              <Text style={{ margin: 0, fontSize: "36px", fontWeight: 800, color: colors.teal }}>
                {foodSaved}
              </Text>
              <Text
                style={{
                  margin: "8px 0 0",
                  fontSize: "13px",
                  color: colors.textLight,
                  fontWeight: 600,
                }}
              >
                kg Saved
              </Text>
            </Section>
          </Column>
          <Column style={{ width: "33%", padding: "10px" }}>
            <Section
              style={{
                backgroundColor: colors.white,
                borderRadius: "12px",
                border: `2px solid ${colors.border}`,
                textAlign: "center",
                padding: "25px 15px",
              }}
            >
              <Text style={{ margin: 0, fontSize: "36px", fontWeight: 800, color: colors.orange }}>
                {co2Saved}
              </Text>
              <Text
                style={{
                  margin: "8px 0 0",
                  fontSize: "13px",
                  color: colors.textLight,
                  fontWeight: 600,
                }}
              >
                kg CO₂
              </Text>
            </Section>
          </Column>
        </Row>
      </Section>

      {/* Nearby Listings */}
      <EmailCard>
        <Text style={{ margin: "0 0 20px", fontSize: "18px", fontWeight: 700, color: colors.text }}>
          🍎 Fresh Near You
        </Text>

        {displayListings.map((listing, index) => (
          <Section
            key={index}
            style={{
              marginBottom: index < displayListings.length - 1 ? "15px" : 0,
              paddingBottom: index < displayListings.length - 1 ? "15px" : 0,
              borderBottom:
                index < displayListings.length - 1 ? `1px solid ${colors.border}` : "none",
            }}
          >
            <Row>
              <Column style={{ width: "70px" }}>
                <Img
                  src={listing.image}
                  alt={listing.title}
                  width={60}
                  height={60}
                  style={{ borderRadius: "8px", objectFit: "cover" }}
                />
              </Column>
              <Column style={{ paddingLeft: "15px" }}>
                <Text style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: colors.text }}>
                  {listing.title}
                </Text>
                <Text style={{ margin: "4px 0 0", fontSize: "13px", color: colors.textLight }}>
                  📍 {listing.distance} away
                </Text>
              </Column>
              <Column style={{ width: "80px", textAlign: "right" }}>
                <Link
                  href={listing.url}
                  style={{
                    display: "inline-block",
                    padding: "8px 16px",
                    backgroundColor: colors.primary,
                    color: colors.white,
                    textDecoration: "none",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  View
                </Link>
              </Column>
            </Row>
          </Section>
        ))}

        <EmailButton href={exploreUrl} color={colors.indigo}>
          🔍 Explore All Listings
        </EmailButton>
      </EmailCard>

      {/* Community Highlight */}
      <Section
        style={{
          marginTop: "20px",
          background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
          backgroundColor: "#fef3c7",
          borderRadius: "12px",
          padding: "25px",
          textAlign: "center",
        }}
      >
        <Text style={{ margin: 0, fontSize: "24px" }}>🏆</Text>
        <Text style={{ margin: "10px 0 0", fontSize: "16px", fontWeight: 700, color: "#92400e" }}>
          Community Milestone!
        </Text>
        <Text style={{ margin: "8px 0 0", fontSize: "14px", color: "#a16207" }}>
          Together we&apos;ve saved <strong>{communityFoodSaved}</strong> of food this month!
        </Text>
      </Section>
    </EmailLayout>
  );
}

export default WeeklyDigestEmail;

WeeklyDigestEmail.PreviewProps = {
  weekRange: "Dec 8-14, 2025",
  itemsShared: "5",
  foodSaved: "12",
  co2Saved: "8",
  communityFoodSaved: "2,500 kg",
  listings: [
    {
      title: "Fresh Baked Bread",
      image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200",
      distance: "0.3 mi",
      url: "https://foodshare.club/listings/1",
    },
    {
      title: "Organic Apples",
      image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=200",
      distance: "0.5 mi",
      url: "https://foodshare.club/listings/2",
    },
    {
      title: "Homemade Pasta",
      image: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=200",
      distance: "0.8 mi",
      url: "https://foodshare.club/listings/3",
    },
  ],
  exploreUrl: "https://foodshare.club/explore",
} as WeeklyDigestEmailProps;
