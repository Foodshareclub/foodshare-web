/**
 * New Message Email - React Email Template
 *
 * Sent when a user receives a new chat message.
 */

import { Text, Section, Img, Row, Column } from "@react-email/components";
import { EmailLayout, EmailCard, EmailButton, EmailUserCard, colors } from "./components/base";

interface NewMessageEmailProps {
  senderName?: string;
  senderAvatar?: string;
  messagePreview?: string;
  conversationUrl?: string;
  listingTitle?: string;
  listingImage?: string;
  listingType?: string;
  unsubscribeUrl?: string;
}

export function NewMessageEmail({
  senderName = "{{ .SenderName }}",
  senderAvatar = "{{ .SenderAvatar }}",
  messagePreview = "{{ .MessagePreview }}",
  conversationUrl = "{{ .ConversationURL }}",
  listingTitle = "{{ .ListingTitle }}",
  listingImage = "{{ .ListingImage }}",
  listingType = "{{ .ListingType }}",
}: NewMessageEmailProps): React.ReactElement {
  return (
    <EmailLayout
      preview={`${senderName} sent you a message on Foodshare`}
      headerColor={colors.teal}
      title="You've Got a Message!"
      subtitle="Someone wants to connect with you"
      emoji="💬"
    >
      {/* Sender Info */}
      <EmailUserCard
        avatarUrl={senderAvatar}
        name={senderName}
        subtitle="sent you a message"
        accentColor={colors.teal}
      />

      {/* Message Preview */}
      <EmailCard>
        <Text
          style={{
            margin: "0 0 15px",
            fontSize: "13px",
            fontWeight: 600,
            color: colors.textLight,
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}
        >
          Message Preview
        </Text>

        {/* Message Bubble */}
        <Section
          style={{
            backgroundColor: "#f0f9f8",
            borderRadius: "12px",
            borderLeft: `4px solid ${colors.teal}`,
            padding: "20px",
          }}
        >
          <Text
            style={{
              margin: 0,
              fontSize: "16px",
              lineHeight: "1.7",
              color: colors.text,
              fontStyle: "italic",
            }}
          >
            &ldquo;{messagePreview}&rdquo;
          </Text>
        </Section>

        <EmailButton href={conversationUrl} color={colors.teal}>
          💬 Reply Now
        </EmailButton>
      </EmailCard>

      {/* Listing Context */}
      <Section
        style={{
          marginTop: "20px",
          backgroundColor: colors.white,
          borderRadius: "8px",
          border: `1px solid ${colors.border}`,
          padding: "20px",
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
            <Text
              style={{
                margin: 0,
                fontSize: "12px",
                fontWeight: 600,
                color: colors.textLight,
                textTransform: "uppercase",
              }}
            >
              Regarding
            </Text>
            <Text
              style={{ margin: "4px 0 0", fontSize: "16px", fontWeight: 700, color: colors.text }}
            >
              {listingTitle}
            </Text>
            <Text style={{ margin: "4px 0 0", fontSize: "14px", color: colors.teal }}>
              {listingType}
            </Text>
          </Column>
        </Row>
      </Section>
    </EmailLayout>
  );
}

export default NewMessageEmail;

NewMessageEmail.PreviewProps = {
  senderName: "Sarah Johnson",
  senderAvatar: "https://i.pravatar.cc/100?u=sarah",
  messagePreview:
    "Hi! I'm interested in the fresh vegetables you posted. Are they still available?",
  conversationUrl: "https://foodshare.club/messages/123",
  listingTitle: "Fresh Garden Vegetables",
  listingImage: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200",
  listingType: "Food",
} as NewMessageEmailProps;
