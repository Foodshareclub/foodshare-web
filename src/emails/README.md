# Foodshare Email Templates

Bleeding-edge email templates using React Email (`@react-email/components`).

## Features

- **Type-safe** - Full TypeScript support with prop validation
- **Server-rendered** - Optimal performance with SSR
- **Cross-client compatible** - Works in Gmail, Outlook, Apple Mail, etc.
- **Component-based** - Reusable base components for consistency
- **Preview mode** - Live development preview at localhost:3001

## Quick Start

```bash
# Start email preview server
bun run email:dev

# Export to static HTML
bun run email:export
```

## Templates

| Template               | Purpose                       | Color  |
| ---------------------- | ----------------------------- | ------ |
| `welcome-confirmation` | New user email verification   | Pink   |
| `password-reset`       | Password reset request        | Pink   |
| `magic-link`           | Passwordless sign-in          | Purple |
| `new-message`          | Chat message notification     | Teal   |
| `listing-interest`     | Someone interested in listing | Orange |
| `pickup-reminder`      | Scheduled pickup reminder     | Green  |
| `review-request`       | Post-pickup review request    | Amber  |
| `listing-expired`      | Listing expiration notice     | Slate  |
| `weekly-digest`        | Weekly activity summary       | Indigo |

## Usage

### Server Actions (Recommended)

```typescript
// In a Server Action or API route
import { sendNewMessageNotification } from "@/app/actions/email";

await sendNewMessageNotification("user@example.com", {
  senderName: "John Doe",
  senderAvatar: "https://...",
  messagePreview: "Hey, is this still available?",
  conversationUrl: "https://foodshare.club/messages/123",
  listingTitle: "Fresh Vegetables",
  listingImage: "https://...",
  listingType: "Food",
});
```

### Direct Template Rendering

```typescript
import { sendTemplateEmail } from "@/lib/email";

await sendTemplateEmail({
  to: "user@example.com",
  template: "welcome-confirmation",
  props: {
    confirmationUrl: "https://foodshare.club/confirm?token=abc",
  },
});
```

### Preview (Admin Only)

```typescript
import { previewEmailTemplate } from '@/app/actions/email';

const { html, text, subject } = await previewEmailTemplate(
  'new-message',
  { senderName: 'Test', ... }
);
```

## Creating New Templates

1. Create a new file in `src/emails/`:

```tsx
// src/emails/my-template.tsx
import { Text } from "@react-email/components";
import { EmailLayout, EmailCard, EmailButton, colors, styles } from "./components/base";

interface MyTemplateProps {
  userName: string;
  actionUrl: string;
}

export function MyTemplateEmail({ userName, actionUrl }: MyTemplateProps) {
  return (
    <EmailLayout
      preview="Preview text for inbox"
      headerColor={colors.primary}
      title="Email Title"
      subtitle="Optional subtitle"
      emoji="🎉"
    >
      <EmailCard>
        <Text style={styles.paragraph}>Hi {userName}!</Text>
        <EmailButton href={actionUrl}>Take Action</EmailButton>
      </EmailCard>
    </EmailLayout>
  );
}

export default MyTemplateEmail;

// Preview props for development
MyTemplateEmail.PreviewProps = {
  userName: "Test User",
  actionUrl: "https://example.com",
} as MyTemplateProps;
```

2. Add to `src/emails/types.ts`:

```typescript
export interface MyTemplateProps {
  userName: string;
  actionUrl: string;
}

// Add to EmailTemplateName union
export type EmailTemplateName = ... | 'my-template';

// Add to EmailTemplateProps union
export type EmailTemplateProps = ... | { template: 'my-template'; props: MyTemplateProps };
```

3. Add to `src/emails/render.ts`:

```typescript
const templates = {
  ...
  'my-template': () => import('./my-template').then((m) => m.MyTemplateEmail),
};
```

4. Export from `src/emails/index.ts`:

```typescript
export { MyTemplateEmail } from "./my-template";
```

## Base Components

Import from `./components/base`:

| Component            | Purpose                        |
| -------------------- | ------------------------------ |
| `EmailLayout`        | Base layout with header/footer |
| `EmailCard`          | Content card with border       |
| `EmailButton`        | Primary CTA button             |
| `EmailButtonOutline` | Secondary outline button       |
| `EmailInfoBox`       | Tip/info callout box           |
| `EmailDivider`       | Horizontal divider             |
| `EmailUserCard`      | User avatar with info          |
| `EmailListingCard`   | Listing preview card           |

## Colors

```typescript
import { colors } from "./components/base";

colors.primary; // #ff2d55 - Brand pink
colors.teal; // #00A699 - Messages
colors.orange; // #FC642D - Alerts
colors.amber; // #f59e0b - Reviews
colors.green; // #10b981 - Success
colors.indigo; // #6366f1 - Digest
colors.purple; // #8b5cf6 - Magic link
colors.slate; // #64748b - Expired
```

## Supabase Auth Integration

For Supabase Auth emails, the templates use Go template syntax:

- `{{ .ConfirmationURL }}` - Auth action URL
- `{{ .Token }}` - Raw token (if needed)
- `{{ .TokenHash }}` - Token hash

Configure in Supabase Dashboard → Authentication → Email Templates.

## Testing

```bash
# Run email preview server
bun run email:dev

# Visit http://localhost:3001 to preview all templates
```

## Architecture

```
src/emails/
├── components/
│   └── base.tsx          # Shared components & styles
├── welcome-confirmation.tsx
├── password-reset.tsx
├── magic-link.tsx
├── new-message.tsx
├── listing-interest.tsx
├── pickup-reminder.tsx
├── review-request.tsx
├── listing-expired.tsx
├── weekly-digest.tsx
├── render.ts             # SSR rendering utilities
├── types.ts              # TypeScript definitions
├── index.ts              # Public exports
└── README.md
```
