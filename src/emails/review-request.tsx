/**
 * Review Request Email - React Email Template
 *
 * Sent after a successful pickup to request a review.
 */

import { Text, Section, Img, Row, Column, Link } from "@react-email/components";
import {
  EmailLayout,
  EmailCard,
  EmailButton,
  EmailInfoBox,
  colors,
  styles,
} from "./components/base";

interface ReviewRequestEmailProps {
  recipientName?: string;
  sharerName?: string;
  listingTitle?: string;
  listingImage?: string;
  pickupDate?: string;
  reviewUrl?: string;
  review1StarUrl?: string;
  review2StarUrl?: string;
  review3StarUrl?: string;
  review4StarUrl?: string;
  review5StarUrl?: string;
}

export function ReviewRequestEmail({
  recipientName = "{{ .RecipientName }}",
  sharerName = "{{ .SharerName }}",
  listingTitle = "{{ .ListingTitle }}",
  listingImage = "{{ .ListingImage }}",
  pickupDate = "{{ .PickupDate }}",
  reviewUrl = "{{ .ReviewURL }}",
  review1StarUrl = "{{ .Review1StarURL }}",
  review2StarUrl = "{{ .Review2StarURL }}",
  review3StarUrl = "{{ .Review3StarURL }}",
  review4StarUrl = "{{ .Review4StarURL }}",
  review5StarUrl = "{{ .Review5StarURL }}",
}: ReviewRequestEmailProps): React.ReactElement {
  return (
    <EmailLayout
      preview={`How was your experience with ${sharerName}?`}
      headerColor={colors.amber}
      title="How Was Your Experience?"
      subtitle="Your feedback helps our community"
      emoji="⭐"
    >
      <EmailCard>
        <Text style={styles.paragraph}>Hi {recipientName}! 👋</Text>
        <Text style={styles.paragraph}>
          You recently picked up an item from{" "}
          <strong style={{ color: colors.amber }}>{sharerName}</strong>. We&apos;d love to hear how
          it went!
        </Text>

        {/* Transaction Summary */}
        <Section
          style={{
            backgroundColor: "#fffbeb",
            borderRadius: "12px",
            padding: "20px",
            marginBottom: "25px",
          }}
        >
          <Row>
            <Column style={{ width: "80px" }}>
              <Img
                src={listingImage}
                alt={listingTitle}
                width={70}
                height={70}
                style={{ borderRadius: "8px", objectFit: "cover" }}
              />
            </Column>
            <Column style={{ paddingLeft: "15px" }}>
              <Text style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: colors.text }}>
                {listingTitle}
              </Text>
              <Text style={{ margin: "5px 0 0", fontSize: "14px", color: colors.textLight }}>
                Picked up on {pickupDate}
              </Text>
            </Column>
          </Row>
        </Section>

        {/* Star Rating */}
        <Text
          style={{
            margin: "0 0 15px",
            fontSize: "16px",
            fontWeight: 600,
            color: colors.text,
            textAlign: "center",
          }}
        >
          Rate your experience:
        </Text>
        <Section style={{ textAlign: "center", padding: "10px 0 25px" }}>
          <Link
            href={review1StarUrl}
            style={{ margin: "0 5px", fontSize: "36px", textDecoration: "none" }}
          >
            ⭐
          </Link>
          <Link
            href={review2StarUrl}
            style={{ margin: "0 5px", fontSize: "36px", textDecoration: "none" }}
          >
            ⭐
          </Link>
          <Link
            href={review3StarUrl}
            style={{ margin: "0 5px", fontSize: "36px", textDecoration: "none" }}
          >
            ⭐
          </Link>
          <Link
            href={review4StarUrl}
            style={{ margin: "0 5px", fontSize: "36px", textDecoration: "none" }}
          >
            ⭐
          </Link>
          <Link
            href={review5StarUrl}
            style={{ margin: "0 5px", fontSize: "36px", textDecoration: "none" }}
          >
            ⭐
          </Link>
        </Section>

        <EmailButton href={reviewUrl} color={colors.amber}>
          ✍️ Write a Review
        </EmailButton>

        {/* Why Review */}
        <EmailInfoBox color={colors.amber} bgColor="#f8f8f8">
          <strong style={{ color: colors.amber }}>Why leave a review?</strong>
          <br />
          Reviews help build trust in our community and let other members know who the great sharers
          are!
        </EmailInfoBox>
      </EmailCard>
    </EmailLayout>
  );
}

export default ReviewRequestEmail;

ReviewRequestEmail.PreviewProps = {
  recipientName: "Alex",
  sharerName: "Sarah Johnson",
  listingTitle: "Fresh Garden Vegetables",
  listingImage: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200",
  pickupDate: "December 13, 2025",
  reviewUrl: "https://foodshare.club/review/123",
  review1StarUrl: "https://foodshare.club/review/123?rating=1",
  review2StarUrl: "https://foodshare.club/review/123?rating=2",
  review3StarUrl: "https://foodshare.club/review/123?rating=3",
  review4StarUrl: "https://foodshare.club/review/123?rating=4",
  review5StarUrl: "https://foodshare.club/review/123?rating=5",
} as ReviewRequestEmailProps;
