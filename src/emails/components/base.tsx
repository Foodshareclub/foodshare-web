/**
 * Base Email Components - Bleeding Edge React Email Implementation
 *
 * Uses @react-email/components for:
 * - Type-safe email templates
 * - Server-side rendering
 * - Automatic inlining of styles
 * - Cross-client compatibility
 */

import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Hr,
  Row,
  Column,
} from "@react-email/components";
import type { ReactNode } from "react";

// Brand colors
export const colors = {
  primary: "#ff2d55",
  primaryHover: "#e6284d",
  teal: "#00A699",
  orange: "#FC642D",
  amber: "#f59e0b",
  green: "#10b981",
  indigo: "#6366f1",
  purple: "#8b5cf6",
  slate: "#64748b",
  text: "#363a57",
  textMuted: "#555555",
  textLight: "#888888",
  background: "#f0f0f0",
  white: "#ffffff",
  border: "#e0e0e0",
} as const;

// Shared styles
export const styles = {
  main: {
    backgroundColor: colors.background,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  container: {
    maxWidth: "600px",
    margin: "0 auto",
    backgroundColor: colors.white,
    borderRadius: "16px",
    overflow: "hidden" as const,
  },
  header: {
    padding: "50px 30px",
    textAlign: "center" as const,
  },
  logo: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    border: "4px solid rgba(255, 255, 255, 0.4)",
    backgroundColor: colors.white,
    padding: "4px",
  },
  h1: {
    margin: "20px 0 0",
    color: colors.white,
    fontSize: "28px",
    fontWeight: 800,
    letterSpacing: "-0.5px",
  },
  subtitle: {
    margin: "12px 0 0",
    color: "rgba(255, 255, 255, 0.95)",
    fontSize: "16px",
    fontWeight: 500,
  },
  content: {
    padding: "50px 40px",
    backgroundColor: "#fafafa",
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: "12px",
    border: `2px solid ${colors.border}`,
    padding: "30px",
  },
  paragraph: {
    margin: "0 0 20px",
    fontSize: "16px",
    lineHeight: "1.7",
    color: colors.textMuted,
  },
  button: {
    display: "inline-block",
    padding: "18px 48px",
    backgroundColor: colors.primary,
    color: colors.white,
    textDecoration: "none",
    borderRadius: "50px",
    fontWeight: 700,
    fontSize: "16px",
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
  },
  footer: {
    padding: "30px",
    textAlign: "center" as const,
  },
  footerText: {
    margin: "15px 0 0",
    fontSize: "14px",
    color: "rgba(255, 255, 255, 0.9)",
  },
  footerLink: {
    color: colors.white,
    textDecoration: "underline",
  },
  infoBox: {
    margin: "24px 0 0",
    padding: "20px",
    backgroundColor: "#f8f8f8",
    borderRadius: "8px",
    borderLeft: `4px solid ${colors.primary}`,
  },
  infoText: {
    margin: 0,
    fontSize: "14px",
    lineHeight: "1.6",
    color: "#666666",
  },
} as const;

// Logo URL
const LOGO_URL =
  "https://***REMOVED***.supabase.co/storage/v1/object/public/assets/logo-512.png";

interface EmailLayoutProps {
  preview: string;
  headerColor?: string;
  title: string;
  subtitle?: string;
  emoji?: string;
  children: ReactNode;
}

/**
 * Base email layout component
 * Provides consistent structure across all emails
 */
export function EmailLayout({
  preview,
  headerColor = colors.primary,
  title,
  subtitle,
  emoji,
  children,
}: EmailLayoutProps): React.ReactElement {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          {/* Header */}
          <Section style={{ ...styles.header, backgroundColor: headerColor }}>
            <Img src={LOGO_URL} alt="Foodshare Logo" width={80} height={80} style={styles.logo} />
            <Text style={styles.h1}>
              {title} {emoji}
            </Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </Section>

          {/* Content */}
          <Section style={styles.content}>{children}</Section>

          {/* Footer */}
          <Section style={{ ...styles.footer, backgroundColor: headerColor }}>
            <Img
              src={LOGO_URL}
              alt="Foodshare"
              width={40}
              height={40}
              style={{ ...styles.logo, width: "40px", height: "40px" }}
            />
            <Text style={styles.footerText}>Foodshare LLC © 2025</Text>
            <Text style={{ ...styles.footerText, fontSize: "13px" }}>
              <Link href="https://foodshare.club/privacy" style={styles.footerLink}>
                Privacy
              </Link>{" "}
              •{" "}
              <Link href="https://foodshare.club/terms" style={styles.footerLink}>
                Terms
              </Link>{" "}
              •{" "}
              <Link href="mailto:support@foodshare.club" style={styles.footerLink}>
                Support
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

/**
 * Card component for content sections
 */
export function EmailCard({ children }: { children: ReactNode }): React.ReactElement {
  return <Section style={styles.card}>{children}</Section>;
}

/**
 * Primary CTA button
 */
export function EmailButton({
  href,
  children,
  color = colors.primary,
}: {
  href: string;
  children: ReactNode;
  color?: string;
}): React.ReactElement {
  return (
    <Section style={{ textAlign: "center", padding: "20px 0" }}>
      <Link href={href} style={{ ...styles.button, backgroundColor: color }}>
        {children}
      </Link>
    </Section>
  );
}

/**
 * Secondary/outline button
 */
export function EmailButtonOutline({
  href,
  children,
  color = colors.primary,
}: {
  href: string;
  children: ReactNode;
  color?: string;
}): React.ReactElement {
  return (
    <Section style={{ textAlign: "center", padding: "10px 0" }}>
      <Link
        href={href}
        style={{
          display: "inline-block",
          padding: "14px 30px",
          backgroundColor: "transparent",
          color: color,
          textDecoration: "none",
          borderRadius: "50px",
          fontWeight: 600,
          fontSize: "14px",
          border: `2px solid ${color}`,
        }}
      >
        {children}
      </Link>
    </Section>
  );
}

/**
 * Info/tip box
 */
export function EmailInfoBox({
  children,
  color = colors.primary,
  bgColor = "#f8f8f8",
}: {
  children: ReactNode;
  color?: string;
  bgColor?: string;
}): React.ReactElement {
  return (
    <Section
      style={{
        ...styles.infoBox,
        backgroundColor: bgColor,
        borderLeftColor: color,
      }}
    >
      <Text style={styles.infoText}>{children}</Text>
    </Section>
  );
}

/**
 * Divider
 */
export function EmailDivider(): React.ReactElement {
  return <Hr style={{ borderColor: colors.border, margin: "20px 0" }} />;
}

/**
 * User avatar with info
 */
export function EmailUserCard({
  avatarUrl,
  name,
  subtitle,
  accentColor = colors.primary,
}: {
  avatarUrl: string;
  name: string;
  subtitle?: string;
  accentColor?: string;
}): React.ReactElement {
  return (
    <Section style={{ backgroundColor: "#f8f8f8", borderRadius: "8px", padding: "20px" }}>
      <Row>
        <Column style={{ width: "60px" }}>
          <Img
            src={avatarUrl}
            alt={name}
            width={50}
            height={50}
            style={{
              borderRadius: "50%",
              border: `3px solid ${accentColor}`,
            }}
          />
        </Column>
        <Column style={{ paddingLeft: "15px" }}>
          <Text style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: colors.text }}>
            {name}
          </Text>
          {subtitle && (
            <Text style={{ margin: "4px 0 0", fontSize: "14px", color: colors.textLight }}>
              {subtitle}
            </Text>
          )}
        </Column>
      </Row>
    </Section>
  );
}

/**
 * Listing card preview
 */
export function EmailListingCard({
  imageUrl,
  title,
  type,
  location,
  accentColor = colors.primary,
}: {
  imageUrl: string;
  title: string;
  type: string;
  location?: string;
  accentColor?: string;
}): React.ReactElement {
  return (
    <Section
      style={{
        backgroundColor: "#f8f8f8",
        borderRadius: "12px",
        border: `2px solid ${accentColor}`,
        overflow: "hidden",
      }}
    >
      <Img
        src={imageUrl}
        alt={title}
        width="100%"
        style={{ height: "160px", objectFit: "cover" }}
      />
      <Section style={{ padding: "20px" }}>
        <Text
          style={{
            margin: 0,
            fontSize: "12px",
            fontWeight: 600,
            color: accentColor,
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}
        >
          {type}
        </Text>
        <Text style={{ margin: "8px 0 0", fontSize: "18px", fontWeight: 700, color: colors.text }}>
          {title}
        </Text>
        {location && (
          <Text style={{ margin: "8px 0 0", fontSize: "14px", color: colors.textLight }}>
            📍 {location}
          </Text>
        )}
      </Section>
    </Section>
  );
}

// Re-export commonly used components
export { Body, Container, Head, Html, Img, Link, Preview, Section, Text, Hr, Row, Column };
