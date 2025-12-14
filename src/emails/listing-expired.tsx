/**
 * Listing Expired Email - React Email Template
 *
 * Sent when a user's listing has expired.
 */

import { Text, Section, Img, Row, Column } from "@react-email/components";
import {
  EmailLayout,
  EmailCard,
  EmailButton,
  EmailButtonOutline,
  EmailInfoBox,
  colors,
  styles,
} from "./components/base";

interface ListingExpiredEmailProps {
  userName?: string;
  listingTitle?: string;
  listingImage?: string;
  listingType?: string;
  expiryDate?: string;
  renewUrl?: string;
  editUrl?: string;
  markSharedUrl?: string;
}

export function ListingExpiredEmail({
  userName = "{{ .UserName }}",
  listingTitle = "{{ .ListingTitle }}",
  listingImage = "{{ .ListingImage }}",
  listingType = "{{ .ListingType }}",
  expiryDate = "{{ .ExpiryDate }}",
  renewUrl = "{{ .RenewURL }}",
  editUrl = "{{ .EditURL }}",
  markSharedUrl = "{{ .MarkSharedURL }}",
}: ListingExpiredEmailProps): React.ReactElement {
  return (
    <EmailLayout
      preview={`Your listing "${listingTitle}" has expired`}
      headerColor={colors.slate}
      title="Listing Expired"
      subtitle="Time to update or renew"
      emoji="📋"
    >
      <EmailCard>
        <Text style={styles.paragraph}>Hi {userName}! 👋</Text>
        <Text style={styles.paragraph}>
          Your listing has expired and is no longer visible to the community:
        </Text>

        {/* Expired Listing Card */}
        <Section
          style={{
            backgroundColor: "#f8fafc",
            borderRadius: "12px",
            border: "2px dashed #cbd5e1",
            overflow: "hidden",
          }}
        >
          <Img
            src={listingImage}
            alt={listingTitle}
            width="100%"
            style={{
              height: "160px",
              objectFit: "cover",
              opacity: 0.7,
              filter: "grayscale(50%)",
            }}
          />
          <Section style={{ padding: "20px" }}>
            <Row>
              <Column>
                <Text
                  style={{
                    margin: 0,
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  {listingType}
                </Text>
                <Text
                  style={{
                    margin: "8px 0 0",
                    fontSize: "18px",
                    fontWeight: 700,
                    color: colors.slate,
                  }}
                >
                  {listingTitle}
                </Text>
                <Text style={{ margin: "8px 0 0", fontSize: "14px", color: "#94a3b8" }}>
                  Expired on {expiryDate}
                </Text>
              </Column>
              <Column style={{ width: "80px", textAlign: "right" }}>
                <Text
                  style={{
                    display: "inline-block",
                    padding: "6px 12px",
                    backgroundColor: "#f1f5f9",
                    color: colors.slate,
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: 600,
                    margin: 0,
                  }}
                >
                  Expired
                </Text>
              </Column>
            </Row>
          </Section>
        </Section>

        {/* Options */}
        <Text
          style={{
            margin: "30px 0 15px",
            fontSize: "16px",
            fontWeight: 600,
            color: colors.text,
            textAlign: "center",
          }}
        >
          What would you like to do?
        </Text>

        {/* CTA Buttons */}
        <EmailButton href={renewUrl} color={colors.green}>
          🔄 Renew Listing
        </EmailButton>
        <EmailButtonOutline href={editUrl} color={colors.slate}>
          ✏️ Edit & Republish
        </EmailButtonOutline>
        <EmailButtonOutline href={markSharedUrl} color={colors.primary}>
          ✅ Mark as Shared
        </EmailButtonOutline>
      </EmailCard>

      {/* Tip */}
      <EmailInfoBox color="#3b82f6" bgColor="#eff6ff">
        <strong style={{ color: "#1e40af" }}>💡 Pro tip:</strong> Listings with fresh photos and
        updated descriptions get 3x more interest!
      </EmailInfoBox>
    </EmailLayout>
  );
}

export default ListingExpiredEmail;

ListingExpiredEmail.PreviewProps = {
  userName: "Alex",
  listingTitle: "Leftover Party Food",
  listingImage: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400",
  listingType: "Food",
  expiryDate: "December 12, 2025",
  renewUrl: "https://foodshare.club/listings/123/renew",
  editUrl: "https://foodshare.club/listings/123/edit",
  markSharedUrl: "https://foodshare.club/listings/123/mark-shared",
} as ListingExpiredEmailProps;
