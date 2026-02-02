# Tester Recruitment Newsletter Guide

Guide for sending newsletter emails to new users via FoodShare's smart email routing system to recruit beta testers for the web app and iOS app.

---

## Email System Overview

FoodShare uses a **smart provider routing system** (not round-robin) with automatic failover:

| Provider   | Daily Limit | Monthly Limit | Priority |
|------------|-------------|---------------|----------|
| Resend     | 100         | 3,000         | Primary  |
| Brevo      | 300         | 9,000         | Secondary |
| MailerSend | 400         | 12,000        | Tertiary |
| AWS SES    | 50,000      | 62,000        | Fallback |

**Key Features:**
- Health-based provider selection with circuit breakers
- Automatic retry queue when all providers fail
- Suppression list checking (bounces, complaints, unsubscribes)
- Monthly and daily quota tracking

**Admin Dashboard:** `/admin/email` - Full campaign management, audience segments, and analytics

---

## New User Growth Tracking

With ~10 new registrations per day, target new users using the built-in audience segments:

### Pre-built Segment: "New Users"
- Filter: Users who joined in the last 7 days
- Color: Blue badge in admin UI
- Use case: Welcome series, onboarding, tester recruitment

### Query New Users Directly
```sql
-- Recent registrations (last 7 days)
SELECT id, email, first_name, created_at
FROM profiles
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- Monthly growth tracking
SELECT
  DATE_TRUNC('day', created_at) as signup_date,
  COUNT(*) as new_users
FROM profiles
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY signup_date DESC;
```

---

## Campaign Creation Process

### Step 1: Access Email CRM
Navigate to `/admin/email` (requires admin role)

### Step 2: Create Campaign
1. Go to **Campaigns** tab
2. Click **New Campaign**
3. Fill in campaign details:
   - **Name:** "Tester Recruitment - January 2026"
   - **Type:** `newsletter` or `announcement`
   - **Subject:** See templates below
   - **Content:** HTML email body

### Step 3: Select Audience
1. Go to **Audience** tab
2. Select segment: **"New Users"** (joined in last 7 days)
3. Or create custom segment with specific criteria

### Step 4: Schedule or Send
- **Immediate:** Send to all recipients now
- **Scheduled:** Pick future date/time
- **Draft:** Save for later editing

---

## Newsletter Templates

### Template 1: Web App Tester Recruitment

**Subject:** Help Shape FoodShare's Future - Join Our Web App Beta

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">

  <div style="text-align: center; margin-bottom: 30px;">
    <img src="https://foodshare.app/logo.png" alt="FoodShare" style="height: 48px;">
  </div>

  <h1 style="font-size: 24px; color: #16a34a; margin-bottom: 16px;">
    Welcome to FoodShare!
  </h1>

  <p>Hi {{first_name}},</p>

  <p>Thank you for joining FoodShare! You're now part of a growing community working to reduce food waste and strengthen local food security.</p>

  <p>We're actively building new features and would love your help testing them.</p>

  <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; padding: 24px; margin: 24px 0;">
    <h2 style="font-size: 18px; color: #15803d; margin: 0 0 12px 0;">
      Become a Web App Beta Tester
    </h2>
    <p style="margin: 0 0 16px 0;">Help us improve the FoodShare experience by:</p>
    <ul style="margin: 0; padding-left: 20px;">
      <li>Testing new features before public release</li>
      <li>Reporting bugs and usability issues</li>
      <li>Providing feedback on design and workflows</li>
      <li>Suggesting improvements to existing features</li>
    </ul>
  </div>

  <p><strong>What you'll get:</strong></p>
  <ul>
    <li>Early access to new features</li>
    <li>Direct line to the development team</li>
    <li>Recognition as a founding contributor</li>
    <li>Shape the product roadmap</li>
  </ul>

  <div style="text-align: center; margin: 32px 0;">
    <a href="https://forms.gle/YOUR_WEB_TESTER_FORM" style="display: inline-block; background: #16a34a; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
      Sign Up as Web Tester
    </a>
  </div>

  <p style="color: #6b7280; font-size: 14px;">
    Questions? Reply to this email or reach us at team@foodshare.app
  </p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

  <p style="color: #9ca3af; font-size: 12px; text-align: center;">
    FoodShare - Reducing food waste, one share at a time<br>
    <a href="{{unsubscribe_url}}" style="color: #9ca3af;">Unsubscribe</a>
  </p>

</body>
</html>
```

---

### Template 2: iOS App Tester Recruitment (TestFlight)

**Subject:** Get Early Access - FoodShare iOS App Beta via TestFlight

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">

  <div style="text-align: center; margin-bottom: 30px;">
    <img src="https://foodshare.app/logo.png" alt="FoodShare" style="height: 48px;">
  </div>

  <h1 style="font-size: 24px; color: #16a34a; margin-bottom: 16px;">
    Be Among the First to Try Our iOS App
  </h1>

  <p>Hi {{first_name}},</p>

  <p>Exciting news! We're preparing to launch the FoodShare iOS app, and we're looking for beta testers to help us make it amazing before the public release.</p>

  <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 12px; padding: 24px; margin: 24px 0;">
    <h2 style="font-size: 18px; color: #1d4ed8; margin: 0 0 12px 0;">
      Join Our TestFlight Beta
    </h2>
    <p style="margin: 0 0 16px 0;"><strong>What's TestFlight?</strong></p>
    <p style="margin: 0 0 16px 0;">TestFlight is Apple's official beta testing platform. It lets you install pre-release versions of apps directly on your iPhone or iPad.</p>
    <p style="margin: 0;"><strong>Requirements:</strong></p>
    <ul style="margin: 8px 0 0 0; padding-left: 20px;">
      <li>iPhone or iPad running iOS 17+</li>
      <li>TestFlight app from App Store (free)</li>
      <li>Willingness to provide feedback</li>
    </ul>
  </div>

  <p><strong>As an iOS beta tester, you'll:</strong></p>
  <ul>
    <li>Get the app before anyone else</li>
    <li>Test native iOS features (notifications, maps, camera)</li>
    <li>Help us squash bugs before launch</li>
    <li>Provide feedback via TestFlight or in-app</li>
    <li>Be credited as a founding tester</li>
  </ul>

  <div style="text-align: center; margin: 32px 0;">
    <a href="https://forms.gle/YOUR_IOS_TESTER_FORM" style="display: inline-block; background: #1d4ed8; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
      Sign Up for iOS TestFlight
    </a>
  </div>

  <p style="background: #fef3c7; padding: 16px; border-radius: 8px; font-size: 14px;">
    <strong>Note:</strong> After you sign up, we'll send you a TestFlight invitation link within 24-48 hours. Check your email (including spam folder) for the invitation from Apple.
  </p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

  <p style="color: #9ca3af; font-size: 12px; text-align: center;">
    FoodShare - Reducing food waste, one share at a time<br>
    <a href="{{unsubscribe_url}}" style="color: #9ca3af;">Unsubscribe</a>
  </p>

</body>
</html>
```

---

### Template 3: Combined Web + iOS Recruitment

**Subject:** Help Us Build the Future of Food Sharing - Beta Testers Wanted

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">

  <div style="text-align: center; margin-bottom: 30px;">
    <img src="https://foodshare.app/logo.png" alt="FoodShare" style="height: 48px;">
  </div>

  <h1 style="font-size: 24px; color: #16a34a; margin-bottom: 16px;">
    Join Our Beta Testing Program
  </h1>

  <p>Hi {{first_name}},</p>

  <p>Welcome to FoodShare! We're thrilled to have you in our community of food waste fighters.</p>

  <p>We're building FoodShare across multiple platforms and need passionate testers to help us get it right. Choose your platform (or both!):</p>

  <!-- Web App Card -->
  <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; padding: 24px; margin: 24px 0;">
    <h2 style="font-size: 18px; color: #15803d; margin: 0 0 12px 0;">
      Web App Beta
    </h2>
    <p style="margin: 0 0 16px 0;">Test new features on foodshare.app before public release</p>
    <ul style="margin: 0 0 16px 0; padding-left: 20px;">
      <li>Works on any browser (Chrome, Safari, Firefox)</li>
      <li>No installation required</li>
      <li>Test responsive design on desktop & mobile</li>
    </ul>
    <a href="https://forms.gle/YOUR_WEB_TESTER_FORM" style="display: inline-block; background: #16a34a; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">
      Join Web Beta
    </a>
  </div>

  <!-- iOS App Card -->
  <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 12px; padding: 24px; margin: 24px 0;">
    <h2 style="font-size: 18px; color: #1d4ed8; margin: 0 0 12px 0;">
      iOS App Beta (TestFlight)
    </h2>
    <p style="margin: 0 0 16px 0;">Get early access to our native iPhone app</p>
    <ul style="margin: 0 0 16px 0; padding-left: 20px;">
      <li>Requires iPhone/iPad with iOS 17+</li>
      <li>Native push notifications & offline support</li>
      <li>Camera integration for food photos</li>
    </ul>
    <a href="https://forms.gle/YOUR_IOS_TESTER_FORM" style="display: inline-block; background: #1d4ed8; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">
      Join iOS TestFlight
    </a>
  </div>

  <p><strong>What testers receive:</strong></p>
  <ul>
    <li>Early access to new features</li>
    <li>Direct communication with our team</li>
    <li>Credit as a founding contributor</li>
    <li>Input on product direction</li>
  </ul>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

  <p style="color: #9ca3af; font-size: 12px; text-align: center;">
    FoodShare - Reducing food waste, one share at a time<br>
    <a href="{{unsubscribe_url}}" style="color: #9ca3af;">Unsubscribe</a>
  </p>

</body>
</html>
```

---

## Sending via Server Actions

For programmatic sending (e.g., automated welcome emails), use the newsletter server actions:

### Create a Campaign
```typescript
import { createCampaign } from '@/app/actions/newsletter';

const result = await createCampaign({
  name: 'Tester Recruitment - Week 5',
  type: 'newsletter',
  subject: 'Help Us Build the Future of Food Sharing - Beta Testers Wanted',
  html_content: emailHtml,
  segment_id: 'new-users-segment-id', // Optional: target specific segment
});
```

### Schedule a Campaign
```typescript
import { scheduleCampaign } from '@/app/actions/newsletter';

await scheduleCampaign(
  campaignId,
  new Date('2026-02-03T09:00:00Z') // Monday 9 AM UTC
);
```

### Send Transactional Email
```typescript
import { sendNewMessageNotification } from '@/app/actions/email';
import { createEmailService } from '@/lib/email';

// For custom emails, use UnifiedEmailService directly
const emailService = createEmailService();

await emailService.sendEmail({
  to: user.email,
  subject: 'Welcome to FoodShare - Join Our Beta Program',
  html: emailHtml,
  text: plainTextVersion,
  type: 'newsletter',
});
```

---

## Automation Flow: Welcome Series with Tester Recruitment

Set up an automated flow to send tester recruitment after new user signup:

### Create Automation Flow
1. Go to `/admin/email` > **Automation** tab
2. Click **Create Flow**
3. Configure:
   - **Name:** "New User Welcome + Tester Recruitment"
   - **Trigger:** User signup
   - **Status:** Active

### Flow Steps
```
┌─────────────────────────────────┐
│ Trigger: User Signs Up          │
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│ Step 1: Welcome Email           │
│ (Immediate)                     │
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│ Step 2: Wait 2 Days             │
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│ Step 3: Tester Recruitment      │
│ (Combined Web + iOS email)      │
└─────────────────────────────────┘
```

---

## Best Practices

### Timing
- **Best days:** Tuesday, Wednesday, Thursday
- **Best times:** 9-11 AM or 1-3 PM (recipient's local time if available)
- **Avoid:** Mondays, Fridays, weekends

### Subject Lines That Work
- "Help shape FoodShare's future" (mission-driven)
- "You're invited: FoodShare Beta Program" (exclusive)
- "Get early access to our iOS app" (benefit-focused)
- "Quick favor? We need your feedback" (personal)

### Metrics to Track
- **Open rate:** Target 30-40% for engaged new users
- **Click rate:** Target 5-10% for tester signup links
- **Conversion:** Track form submissions vs emails sent
- **Unsubscribe rate:** Keep below 0.5%

### Provider Quota Management
With ~10 new users/day:
- Monthly volume: ~300 emails/month (well within all quotas)
- Daily peak: ~20-30 emails (safe for all providers)
- Recommended: Let smart routing handle provider selection automatically

---

## Monitoring & Analytics

### Admin Dashboard Metrics
- `/admin/email` > **Dashboard** tab
- View 24-hour stats, provider health, delivery rates

### Key Tables
| Table | Purpose |
|-------|---------|
| `email_logs` | Delivery history and status |
| `newsletter_subscribers` | Subscriber list |
| `newsletter_campaigns` | Campaign definitions |
| `email_provider_quota` | Provider usage tracking |

### Health Monitoring
The system includes automatic health monitoring:
- Provider health checks every 5 minutes
- Quota sync every hour
- Queue processing every 2 minutes (100 emails/batch)

---

## Troubleshooting

### Email Not Delivered
1. Check `email_logs` table for delivery status
2. Verify recipient isn't on suppression list
3. Check provider health in admin dashboard
4. Review Sentry for any errors

### Quota Exceeded
- System automatically falls back to next provider
- Check `/admin/email` > **Providers** tab for quota status
- If all providers exhausted, emails queue for retry

### Low Open Rates
- Test different subject lines (A/B testing)
- Check if emails land in spam
- Review send timing
- Verify HTML renders correctly in email clients

---

## Related Documentation

- [Email System Architecture](../03-features/email/README.md)
- [Email Workers Setup](../EMAIL_WORKERS_SETUP.md)
- [Admin Dashboard](../03-features/admin/README.md)
