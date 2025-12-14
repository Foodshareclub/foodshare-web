/**
 * Pickup Reminder Email - React Email Template
 *
 * Sent to remind users about scheduled pickups.
 */

import { Text, Section, Img } from "@react-email/components";
import { EmailLayout, EmailCard, EmailButton, EmailButtonOutline, colors } from "./components/base";

interface PickupReminderEmailProps {
  pickupTime?: string;
  pickupDate?: string;
  listingTitle?: string;
  listingImage?: string;
  sharerName?: string;
  pickupAddress?: string;
  pickupInstructions?: string;
  directionsUrl?: string;
  messageUrl?: string;
}

export function PickupReminderEmail({
  pickupTime = "{{ .PickupTime }}",
  pickupDate = "{{ .PickupDate }}",
  listingTitle = "{{ .ListingTitle }}",
  listingImage = "{{ .ListingImage }}",
  sharerName = "{{ .SharerName }}",
  pickupAddress = "{{ .PickupAddress }}",
  pickupInstructions = "{{ .PickupInstructions }}",
  directionsUrl = "{{ .DirectionsURL }}",
  messageUrl = "{{ .MessageURL }}",
}: PickupReminderEmailProps): React.ReactElement {
  return (
    <EmailLayout
      preview={`Pickup reminder: ${listingTitle} at ${pickupTime}`}
      headerColor={colors.green}
      title="Pickup Reminder"
      subtitle="Don't forget your scheduled pickup!"
      emoji="⏰"
    >
      <EmailCard>
        {/* Time Alert */}
        <Section
          style={{
            backgroundColor: "#ecfdf5",
            borderRadius: "12px",
            padding: "25px",
            textAlign: "center",
            marginBottom: "25px",
          }}
        >
          <Text style={{ margin: 0, fontSize: "48px" }}>🕐</Text>
          <Text style={{ margin: "10px 0 0", fontSize: "24px", fontWeight: 800, color: "#059669" }}>
            {pickupTime}
          </Text>
          <Text
            style={{ margin: "5px 0 0", fontSize: "16px", color: colors.green, fontWeight: 600 }}
          >
            {pickupDate}
          </Text>
        </Section>

        {/* Item Details */}
        <Section
          style={{
            backgroundColor: "#f8f8f8",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          <Img
            src={listingImage}
            alt={listingTitle}
            width="100%"
            style={{ height: "160px", objectFit: "cover" }}
          />
          <Section style={{ padding: "20px" }}>
            <Text style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: colors.text }}>
              {listingTitle}
            </Text>
            <Text style={{ margin: "8px 0 0", fontSize: "14px", color: colors.textLight }}>
              Shared by <strong style={{ color: colors.green }}>{sharerName}</strong>
            </Text>
          </Section>
        </Section>

        {/* Location */}
        <Section
          style={{
            margin: "20px 0",
            backgroundColor: "#f0fdf4",
            borderRadius: "8px",
            borderLeft: `4px solid ${colors.green}`,
            padding: "20px",
          }}
        >
          <Text
            style={{
              margin: 0,
              fontSize: "13px",
              fontWeight: 600,
              color: colors.textLight,
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            📍 Pickup Location
          </Text>
          <Text
            style={{ margin: "8px 0 0", fontSize: "16px", fontWeight: 600, color: colors.text }}
          >
            {pickupAddress}
          </Text>
          <Text style={{ margin: "5px 0 0", fontSize: "14px", color: "#666666" }}>
            {pickupInstructions}
          </Text>
        </Section>

        {/* CTA Buttons */}
        <EmailButton href={directionsUrl} color={colors.green}>
          🗺️ Get Directions
        </EmailButton>
        <EmailButtonOutline href={messageUrl} color={colors.green}>
          Message {sharerName}
        </EmailButtonOutline>
      </EmailCard>

      {/* Reminder Tips */}
      <Section
        style={{
          marginTop: "20px",
          backgroundColor: colors.white,
          borderRadius: "8px",
          border: `1px solid ${colors.border}`,
          padding: "20px",
        }}
      >
        <Text style={{ margin: "0 0 10px", fontSize: "14px", fontWeight: 700, color: colors.text }}>
          💡 Pickup Tips
        </Text>
        <Text style={{ margin: 0, fontSize: "13px", lineHeight: "1.8", color: "#666666" }}>
          • Bring a reusable bag or container
          <br />
          • Be on time - the sharer is waiting for you
          <br />• Can&apos;t make it? Let them know ASAP
        </Text>
      </Section>
    </EmailLayout>
  );
}

export default PickupReminderEmail;

PickupReminderEmail.PreviewProps = {
  pickupTime: "3:00 PM",
  pickupDate: "Today, December 14",
  listingTitle: "Fresh Baked Cookies",
  listingImage: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400",
  sharerName: "Emma Wilson",
  pickupAddress: "123 Main Street, Sacramento",
  pickupInstructions: "Ring doorbell, I'll bring them out",
  directionsUrl: "https://maps.google.com/?q=123+Main+Street+Sacramento",
  messageUrl: "https://foodshare.club/messages/456",
} as PickupReminderEmailProps;
