/**
 * Password Reset Email - React Email Template
 *
 * Sent when a user requests to reset their password.
 * Uses Supabase Auth's {{ .ConfirmationURL }} template variable.
 */

import { Text, Section, Link } from "@react-email/components";
import {
  EmailLayout,
  EmailCard,
  EmailButton,
  EmailInfoBox,
  colors,
  styles,
} from "./components/base";

interface PasswordResetEmailProps {
  confirmationUrl?: string;
}

export function PasswordResetEmail({
  confirmationUrl = "{{ .ConfirmationURL }}",
}: PasswordResetEmailProps): React.ReactElement {
  return (
    <EmailLayout
      preview="Reset your Foodshare password"
      headerColor={colors.primary}
      title="Reset Your Password"
      subtitle="No worries, it happens to the best of us"
      emoji="🔐"
    >
      <EmailCard>
        <Text style={styles.paragraph}>Hi there! 👋</Text>
        <Text style={styles.paragraph}>
          We received a request to reset your password for your{" "}
          <strong style={{ color: colors.primary }}>Foodshare</strong> account. Click the button
          below to create a new password:
        </Text>

        <EmailButton href={confirmationUrl}>🔑 Reset Password</EmailButton>

        {/* Security Notice */}
        <EmailInfoBox color="#ffc107" bgColor="#fff3cd">
          <strong style={{ color: "#856404" }}>⚠️ Security Notice</strong>
          <br />
          This link expires in 1 hour. If you didn&apos;t request this reset, please ignore this
          email or contact support if you&apos;re concerned.
        </EmailInfoBox>
      </EmailCard>

      {/* Alternative Link */}
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
        <Text style={{ margin: 0, fontSize: "13px", lineHeight: "1.6", color: "#999999" }}>
          <strong style={{ color: "#666666" }}>Button not working?</strong>
          <br />
          Copy and paste this link into your browser:
          <br />
          <Link href={confirmationUrl} style={{ color: colors.primary, wordBreak: "break-all" }}>
            {confirmationUrl}
          </Link>
        </Text>
      </Section>
    </EmailLayout>
  );
}

export default PasswordResetEmail;

PasswordResetEmail.PreviewProps = {
  confirmationUrl: "https://foodshare.club/auth/reset?token=example",
} as PasswordResetEmailProps;
