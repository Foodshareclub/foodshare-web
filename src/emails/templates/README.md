# Foodshare Email Templates (Static HTML)

> **Note:** These are static HTML templates for direct CRM integration.
> For programmatic email sending, use the React Email templates in `src/emails/*.tsx`.
> See `src/emails/README.md` for the modern implementation.

Beautiful, email-client compatible HTML templates for the Foodshare CRM.

## Templates

| Template                    | Purpose                       | Header Color     |
| --------------------------- | ----------------------------- | ---------------- |
| `welcome-confirmation.html` | New user email verification   | Pink (#ff2d55)   |
| `password-reset.html`       | Password reset request        | Pink (#ff2d55)   |
| `magic-link.html`           | Passwordless sign-in          | Purple (#8b5cf6) |
| `new-message.html`          | Chat message notification     | Teal (#00A699)   |
| `listing-interest.html`     | Someone interested in listing | Orange (#FC642D) |
| `review-request.html`       | Post-pickup review request    | Amber (#f59e0b)  |
| `pickup-reminder.html`      | Scheduled pickup reminder     | Green (#10b981)  |
| `listing-expired.html`      | Listing expiration notice     | Slate (#64748b)  |
| `weekly-digest.html`        | Weekly activity summary       | Indigo (#6366f1) |

## Template Variables

All templates use Go template syntax (`{{ .VariableName }}`). Common variables:

### Authentication Templates

- `{{ .ConfirmationURL }}` - Verification/reset/magic link URL

### User Variables

- `{{ .UserName }}` - Recipient's display name
- `{{ .RecipientName }}` - Alternative recipient name

### Listing Variables

- `{{ .ListingTitle }}` - Listing title
- `{{ .ListingImage }}` - Listing image URL
- `{{ .ListingType }}` - Type (food, thing, borrow, etc.)
- `{{ .ListingLocation }}` - Location text
- `{{ .ListingURL }}` - Link to listing

### Message Variables

- `{{ .SenderName }}` - Message sender name
- `{{ .SenderAvatar }}` - Sender avatar URL
- `{{ .MessagePreview }}` - Truncated message text
- `{{ .ConversationURL }}` - Link to conversation

### Pickup Variables

- `{{ .PickupDate }}` - Pickup date
- `{{ .PickupTime }}` - Pickup time
- `{{ .PickupAddress }}` - Pickup location
- `{{ .PickupInstructions }}` - Special instructions
- `{{ .SharerName }}` - Food sharer's name

### Digest Variables

- `{{ .WeekRange }}` - Date range (e.g., "Dec 8-14, 2025")
- `{{ .ItemsShared }}` - Number of items shared
- `{{ .FoodSaved }}` - kg of food saved
- `{{ .CO2Saved }}` - kg of CO2 saved

### Common Variables

- `{{ .UnsubscribeURL }}` - Notification preferences link

## Email Client Compatibility

These templates are optimized for:

- ✅ Gmail (Web & Mobile)
- ✅ Apple Mail
- ✅ Outlook (2016+)
- ✅ Yahoo Mail
- ✅ iOS Mail
- ✅ Android Mail

### Design Decisions

- **No JavaScript** - Email clients don't execute JS
- **Table-based layout** - Maximum compatibility
- **Inline styles** - Many clients strip `<style>` tags
- **Solid color fallbacks** - Gradients not universally supported
- **MSO conditionals** - VML buttons for Outlook
- **No `position: absolute`** - Not supported in emails
- **No `backdrop-filter`** - Not supported in emails

## Usage with Supabase Auth

For Supabase Auth emails, use these templates in your project settings:

1. Go to Authentication → Email Templates
2. Paste the HTML content
3. Ensure `{{ .ConfirmationURL }}` is used for the action link

## Testing

Test emails with:

- [Litmus](https://litmus.com)
- [Email on Acid](https://emailonacid.com)
- [Mail-Tester](https://mail-tester.com)
