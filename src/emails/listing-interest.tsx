/**
 * Listing Interest Email - React Email Template
 *
 * Sent when someone expresses interest in a user's listing.
 */

import { Text, Section, Img, Row, Column } from "@react-email/components";
import {
  EmailLayout,
  EmailCard,
  EmailButton,
  EmailButtonOutline,
  EmailInfoBox,
  EmailListingCard,
  colors,
  styles,
} from "./components/base";

interface ListingInterestEmailProps {
  interestedUserName?: string;
  interestedUserAvatar?: string;
  interestedUserRating?: string;
  interestedUserShares?: string;
  listingTitle?: string;
  listingImage?: string;
  listingType?: string;
  listingLocation?: string;
  messageUrl?: string;
  listingUrl?: string;
}

export function ListingInterestEmail({
  interestedUserName = "{{ .InterestedUserName }}",
  interestedUserAvatar = "{{ .InterestedUserAvatar }}",
  interestedUserRating = "{{ .InterestedUserRating }}",
  interestedUserShares = "{{ .InterestedUserShares }}",
  listingTitle = "{{ .ListingTitle }}",
  listingImage = "{{ .ListingImage }}",
  listingType = "{{ .ListingType }}",
  listingLocation = "{{ .ListingLocation }}",
  messageUrl = "{{ .MessageURL }}",
  listingUrl = "{{ .ListingURL }}",
}: ListingInterestEmailProps): React.ReactElement {
  return (
    <EmailLayout
      preview={`${interestedUserName} is interested in your listing on Foodshare`}
      headerColor={colors.orange}
      title="Someone's Interested!"
      subtitle="Your listing is getting attention"
      emoji="🙋"
    >
      <EmailCard>
        <Text style={styles.paragraph}>Great news! 🎉</Text>
        <Text style={styles.paragraph}>
          <strong style={{ color: colors.orange }}>{interestedUserName}</strong> has expressed
          interest in your listing:
        </Text>

        {/* Listing Card */}
        <EmailListingCard
          imageUrl={listingImage}
          title={listingTitle}
          type={listingType}
          location={listingLocation}
          accentColor={colors.orange}
        />

        {/* Interested User */}
        <Section
          style={{
            margin: "25px 0",
            backgroundColor: "#f8f8f8",
            borderRadius: "8px",
            padding: "20px",
          }}
        >
          <Row>
            <Column style={{ width: "60px" }}>
              <Img
                src={interestedUserAvatar}
                alt={interestedUserName}
                width={50}
                height={50}
                style={{ borderRadius: "50%", border: `3px solid ${colors.orange}` }}
              />
            </Column>
            <Column style={{ paddingLeft: "15px" }}>
              <Text style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: colors.text }}>
                {interestedUserName}
              </Text>
              <Text style={{ margin: "4px 0 0", fontSize: "14px", color: colors.textLight }}>
                ⭐ {interestedUserRating} rating • {interestedUserShares} shares
              </Text>
            </Column>
          </Row>
        </Section>

        {/* CTA Buttons */}
        <EmailButton href={messageUrl} color={colors.orange}>
          💬 Message Them
        </EmailButton>
        <EmailButtonOutline href={listingUrl} color={colors.orange}>
          View Listing
        </EmailButtonOutline>
      </EmailCard>

      {/* Tip */}
      <EmailInfoBox color="#4caf50" bgColor="#e8f5e9">
        <strong style={{ color: "#2e7d32" }}>💡 Tip:</strong> Respond quickly! Fast responses lead
        to successful shares and better ratings.
      </EmailInfoBox>
    </EmailLayout>
  );
}

export default ListingInterestEmail;

ListingInterestEmail.PreviewProps = {
  interestedUserName: "Mike Chen",
  interestedUserAvatar: "https://i.pravatar.cc/100?u=mike",
  interestedUserRating: "4.9",
  interestedUserShares: "23",
  listingTitle: "Homemade Sourdough Bread",
  listingImage: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400",
  listingType: "Food",
  listingLocation: "Downtown Sacramento",
  messageUrl: "https://foodshare.club/messages/new?user=mike",
  listingUrl: "https://foodshare.club/listings/123",
} as ListingInterestEmailProps;
