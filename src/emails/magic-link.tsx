/**
 * Magic Link Email - React Email Template
 *
 * Sent for passwordless sign-in.
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

interface MagicLinkEmailProps {
  confirmationUrl?: string;
}

export function MagicLinkEmail({
  confirmationUrl = "{{ .ConfirmationURL }}",
}: MagicLinkEmailProps): React.ReactElement {
  return (
    <EmailLayout
      preview="Your magic link to sign in to Foodshare"
      headerColor={colors.purple}
      title="Sign In to Foodshare"
      subtitle="Your magic link is ready"
      emoji="✨"
    >
      <EmailCard>
        <Section style={{ textAlign: "center" }}>
          <Text style={{ margin: 0, fontSize: "60px" }}>🪄</Text>
          <Text
            style={{
              ...styles.paragraph,
              margin: "20px 0",
              textAlign: "center",
            }}
          >
            Click the magic button below to instantly sign in to your{" "}
            <strong style={{ color: colors.purple }}>Foodshare</strong> account. No password needed!
          </Text>

          <EmailButton href={confirmationUrl} color={colors.purple}>
            🔮 Sign In Now
          </EmailButton>

          <EmailInfoBox color={colors.purple} bgColor="#f5f3ff">
            <strong style={{ color: "#6d28d9" }}>⏱️ This link expires in 1 hour</strong>
            <br />
            For your security, magic links can only be used once.
          </EmailInfoBox>
        </Section>
      </EmailCard>

      {/* Security Notice */}
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
          <strong style={{ color: "#666666" }}>🔒 Didn&apos;t request this?</strong>
          <br />
          If you didn&apos;t try to sign in, you can safely ignore this email. Your account is
          secure.
        </Text>
      </Section>
    </EmailLayout>
  );
}

export default MagicLinkEmail;

MagicLinkEmail.PreviewProps = {
  confirmationUrl: "https://foodshare.club/auth/magic?token=example",
} as MagicLinkEmailProps;
