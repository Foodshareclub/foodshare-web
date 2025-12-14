/**
 * Welcome Confirmation Email - React Email Template
 *
 * Sent when a new user signs up and needs to verify their email.
 * Uses Supabase Auth's {{ .ConfirmationURL }} template variable.
 */

import { Text, Section } from "@react-email/components";
import {
  EmailLayout,
  EmailCard,
  EmailButton,
  EmailInfoBox,
  colors,
  styles,
} from "./components/base";

interface WelcomeConfirmationEmailProps {
  confirmationUrl?: string;
}

export function WelcomeConfirmationEmail({
  confirmationUrl = "{{ .ConfirmationURL }}",
}: WelcomeConfirmationEmailProps): React.ReactElement {
  return (
    <EmailLayout
      preview="Welcome to Foodshare! Please confirm your email to get started."
      headerColor={colors.primary}
      title="Welcome to Foodshare!"
      subtitle="Let's confirm your email to get started"
      emoji="🎉"
    >
      <EmailCard>
        <Text style={styles.paragraph}>
          Thanks for signing up for{" "}
          <strong style={{ color: colors.primary, fontWeight: 700 }}>Foodshare</strong>! 🥗
        </Text>
        <Text style={styles.paragraph}>
          We&apos;re excited to have you join our community dedicated to reducing food waste and
          sharing delicious meals. To complete your registration and start making a difference,
          please confirm your email address below:
        </Text>

        <EmailButton href={confirmationUrl}>✓ Confirm Your Email</EmailButton>

        <EmailInfoBox color={colors.primary}>
          <strong style={{ color: colors.primary }}>✨ What happens next?</strong>
          <br />
          Once confirmed, your email will be uniquely associated with your account, and you&apos;ll
          gain full access to share and discover food in your community.
        </EmailInfoBox>
      </EmailCard>

      {/* Disclaimer */}
      <Section
        style={{
          marginTop: "30px",
          backgroundColor: colors.white,
          borderRadius: "8px",
          border: "1px dashed #e0e0e0",
          padding: "20px",
          textAlign: "center",
        }}
      >
        <Text style={{ margin: 0, fontSize: "14px", lineHeight: "1.6", color: "#999999" }}>
          <strong style={{ color: "#666666" }}>Didn&apos;t sign up?</strong>
          <br />
          If you didn&apos;t register with Foodshare, you can safely ignore this email.
        </Text>
      </Section>
    </EmailLayout>
  );
}

export default WelcomeConfirmationEmail;

// Preview props for development
WelcomeConfirmationEmail.PreviewProps = {
  confirmationUrl: "https://foodshare.club/auth/confirm?token=example",
} as WelcomeConfirmationEmailProps;
