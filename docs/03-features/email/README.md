# Admin Email CRM - Complete Setup Guide

Beautiful, comprehensive email management system for FoodShare admins with smart routing, real-time quota monitoring, and complete control over email operations.

---

## 📧 Email Service Architecture

FoodShare uses `UnifiedEmailService` for all email delivery:

### UnifiedEmailService

The optimized email service with:

- **Smart provider routing** based on email type (Resend prioritized for all types)
- **Request coalescing** for health checks (multiple calls share one DB query)
- **Buffered metrics** (non-blocking database writes)
- **Lazy provider initialization** (tree-shaking friendly)
- **Automatic retry queue** when all providers fail
- **Suppression list checking** - Automatically checks bounces, complaints, and unsubscribes before sending
- **Monthly quota tracking** - Tracks both daily and monthly quotas for better capacity planning

```typescript
import { createEmailService } from "@/lib/email";

const emailService = createEmailService();
await emailService.sendEmail(request);
```

Aliases are available for convenience:

```typescript
// These are equivalent
import { createEmailService, createUnifiedEmailService } from "@/lib/email";
import { EmailService, UnifiedEmailService } from "@/lib/email";
```

### Email Secrets Vault

Provider credentials are managed via `src/lib/email/vault.ts`, with environment-aware behavior:

- **Development:** Uses environment variables directly (fast local dev)
- **Production:** Always fetches from Supabase Vault (secure, centralized)

**Secrets stored in Vault:**

- `RESEND_API_KEY` - Resend email provider
- `BREVO_API_KEY` - Brevo email provider
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` - AWS SES

**Usage:**

```typescript
import { getEmailSecrets, getConfiguredProviders } from "@/lib/email";

// Get all secrets (cached for 5 minutes)
const secrets = await getEmailSecrets();

// Check which providers are configured
const providers = await getConfiguredProviders();
// { resend: true, brevo: true, awsSes: false }

// Get individual credentials
import { getResendApiKey, getBrevoApiKey, getAwsCredentials } from "@/lib/email";

const resendKey = await getResendApiKey();
const brevoKey = await getBrevoApiKey();
const awsCreds = await getAwsCredentials();
```

**Local Development (`NODE_ENV=development`):**

Set environment variables in `.env.local` - the vault service will use them automatically:

```bash
RESEND_API_KEY=re_xxx
BREVO_API_KEY=xkeysib-xxx
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=us-east-1
```

**Production (`NODE_ENV=production`):**

Secrets must be stored in Supabase Vault via Dashboard → Settings → Vault. The `get_secrets` RPC function retrieves them securely. Environment variables are ignored in production to ensure centralized secret management.

---

## 🎉 What's Been Built

You now have a **production-ready Admin Email CRM** with:

### ✅ Core Features

- **Real-time quota visualization** across all 3 providers (Brevo, Resend, AWS SES)
- **Smart routing system** that automatically selects the best provider
- **Manual email sender** with HTML/plain text support
- **Complete email history** with filtering and search
- **Queue management** with retry and delete capabilities
- **Provider channel management** treating providers as routes
- **Live statistics dashboard** showing 24h metrics
- **Beautiful, responsive UI** that matches your existing admin design

### ✅ Smart Routing Intelligence

- **Edge Function** for real-time quota checks
- **Automatic failover** when providers are exhausted
- **Email-type specific routing** (Resend prioritized for reliability)
- **Full quota transparency** for informed decisions

---

## 📂 Files Created

### Admin CRM Components

```
src/components/admin/
├── EmailQuotaDashboard.tsx          # Real-time quota meters with auto-refresh
├── EmailStatsDashboard.tsx          # 24h statistics with animated cards, dark mode, skeleton loading
├── ManualEmailSender.tsx            # Manual email sending interface
├── EmailSendingHistory.tsx          # Email logs and queue management
└── (existing admin components)
```

### Admin Pages

```
src/app/admin/email/
└── page.tsx                         # Server Component with Suspense streaming
    └── EmailCRMClient               # Client component for interactive features

src/components/admin/
├── EmailCRMClient.tsx               # Main email CRM dashboard (client component)
│                                    # Features: Dashboard, Campaigns, Automation, Compose, Audience, Providers
│                                    # Modern glass UI with fixed viewport layout (no horizontal scroll)
│                                    # Uses Tailwind v4 + shadcn best practices
│                                    # Real data integration via initialData prop
│                                    # Components: ScrollArea, Card, DropdownMenu for enhanced UX
│
├── email/
│   ├── AutomationBuilder.tsx        # Visual automation flow builder (lazy-loaded)
│   │                                # Features: Step editor, drag-and-drop, template selector
│   │                                # Exports: AutomationBuilder, PresetAutomationCreator
│   │                                # Step types: email, delay, condition, action
│   │
│   ├── EmailContentEditor.tsx       # Email content editor with visual settings
│   │                                # Features: TipTap rich text, device preview (desktop/tablet/mobile)
│   │                                # Visual settings: typography, colors, spacing, alignment
│   │                                # Dark mode preview toggle, real-time style application
│   │                                # Zoom controls: 50-150% zoom with +/- buttons
│   │                                # Copy HTML: One-click copy email HTML to clipboard
│   │                                # Fullscreen mode: Expand editor to full viewport
│   │                                # Props: to, subject, html, onClose, settings, onSettingsChange
│   │
│   ├── EmailCRMDashboard.tsx        # Email CRM dashboard component
│   │
│   └── EmailPreview.tsx             # Email preview with device simulation
│                                    # Features: Desktop/tablet/mobile preview, visual settings panel
│                                    # Typography: font family, size, line height (5 fonts, 3 sizes)
│                                    # Colors: header, button, link, background, text (color pickers)
│                                    # Layout: content width (narrow/medium/wide), border radius
│                                    # Toggles: show logo, show footer
│                                    # Email client chrome simulation with macOS-style window controls
│                                    # Framer Motion animations for settings panel
│                                    # Exports: EmailPreview, EmailVisualSettings, DEFAULT_VISUAL_SETTINGS
│                                    # Props: to, subject, html, onClose, visualSettings?, onSettingsChange?
```

**Architecture Note:** The email CRM page uses Next.js 16 server-first architecture:

- `page.tsx` is a Server Component that fetches real data and passes to client
- `EmailCRMClient` accepts `initialData: EmailCRMData` prop with stats, campaigns, automations, segments, providerHealth
- Horizontal top tab navigation with 6 sections for streamlined access
- Daily quota progress indicator in top bar with provider health status dots
- Skeleton loading state provides instant feedback while data loads

### Email Library

```
src/lib/email/
├── index.ts                         # Module exports
├── unified-service.ts               # Main email service with smart routing
├── vault.ts                         # Secrets management (Supabase Vault + env fallback)
├── types.ts                         # TypeScript definitions
├── constants.ts                     # Email constants
└── providers/                       # Provider implementations
    ├── resend.ts
    ├── brevo.ts
    └── aws-ses.ts
```

### Data Layer (Server-Side)

```
src/lib/data/
├── admin-email.ts                   # Server-side data fetching for monitoring
│   ├── getProviderStatus()          # Provider health + circuit breaker state
│   ├── getQuotaStatus()             # Daily quota usage per provider
│   ├── getRecentEmails()            # Recent email logs
│   ├── getHealthEvents()            # Health events and alerts
│   └── getEmailMonitoringData()     # All monitoring data (parallel fetch)
│
└── automations.ts                   # Email automation data functions
    ├── getAutomationFlows()         # All automation workflows
    ├── getAutomationFlow(id)        # Single flow by ID
    ├── getFlowEnrollments(flowId)   # Enrollments for a flow (with profiles)
    ├── getEmailTemplates()          # All email templates
    ├── getAutomationQueue(status)   # Queue items by status
    ├── getAutomationStats()         # Aggregate automation metrics
    └── Re-exports types from @/types/automations.types.ts

src/types/
└── automations.types.ts             # Shared automation types (client/server)
    ├── AutomationFlow               # Workflow definition
    ├── AutomationStep               # Step configuration
    ├── AutomationEnrollment         # User enrollment state
    ├── EmailTemplate                # Template definition
    ├── AutomationQueueItem          # Queue item state
    └── TRIGGER_TYPES                # Trigger type definitions with labels/icons
```

### API Functions

```
src/api/admin/
└── emailManagement.ts               # All email management API functions
    ├── getProviderQuotas()
    ├── getEmailLogs()
    ├── getQueuedEmails()
    ├── getEmailStats()
    ├── sendManualEmail()
    ├── retryEmail()
    ├── deleteQueuedEmail()
    └── resetProviderQuota()
```

### Server Actions

```
src/app/actions/
├── email.ts                         # Email server actions (Zod-validated, type-safe)
│   │  Uses ServerActionResult<T> pattern with proper error codes
│   │  Admin auth via user_roles table (not profiles.role)
│   │
│   │  Notification Actions (public):
│   ├── sendNewMessageNotification(email, data)      # New chat message notification
│   │   → ServerActionResult<{ messageId?: string }>
│   ├── sendListingInterestNotification(email, data) # Someone interested in listing
│   │   → ServerActionResult<{ messageId?: string }>
│   ├── sendPickupReminder(email, data)              # Pickup reminder email
│   │   → ServerActionResult<{ messageId?: string }>
│   ├── sendReviewRequest(email, data)               # Request review after pickup
│   │   → ServerActionResult<{ messageId?: string }>
│   ├── sendListingExpiredNotification(email, data)  # Listing expired notice
│   │   → ServerActionResult<{ messageId?: string }>
│   │
│   │  Admin-Only Actions:
│   └── previewEmailTemplate(template, props)        # Preview email (admin only)
│       → ServerActionResult<{ html, text, subject }>
│
└── newsletter.ts                    # Newsletter & Campaign server actions
    │
    │  Campaign Management:
    ├── createCampaign(formData)     # Create new email campaign
    │   → { success, campaignId?, error? }
    ├── updateCampaignStatus(id, status)  # Update status (draft/scheduled/sending/sent/paused/cancelled)
    │   → { success, error? }
    ├── scheduleCampaign(id, scheduledAt) # Schedule campaign for future send
    │   → { success, error? }
    │
    │  Subscriber Management:
    ├── addSubscriber(email, firstName?, source?)  # Add email subscriber
    │   → { success, subscriberId?, error? }
    ├── unsubscribeEmail(email, reason?)  # Unsubscribe email address
    │   → { success, error? }
    │
    │  Audience Segments (src/app/actions/segments.ts):
    │  Uses type-safe ServerActionResult<T> pattern with Zod validation and audit logging
    ├── createSegment(input)         # Create audience segment with filter rules
    │   → ServerActionResult<{ id, name, cachedCount }>
    ├── updateSegment(id, input)     # Update segment (non-system only)
    │   → ServerActionResult<{ id, name, cachedCount }>
    ├── deleteSegment(id)            # Delete segment (non-system only)
    │   → ServerActionResult<void>
    ├── refreshSegmentCount(id)      # Recalculate segment member count
    │   → ServerActionResult<number>
    │
    │  Automation Flows (src/app/actions/automations.ts):
    │  Uses type-safe ActionResult<T> pattern with Zod validation
    ├── createAutomationFlow(data)      # Create email automation workflow
    │   → ActionResult<{ id: string }>
    ├── updateAutomationFlow(id, data)  # Update automation flow
    │   → ActionResult<void>
    ├── deleteAutomationFlow(id)        # Archive/delete automation flow (soft delete by default)
    │   → ActionResult<void>
    ├── toggleAutomationStatus(id, status)  # Toggle status (active/paused)
    │   → ActionResult<void>
    ├── duplicateAutomation(id)         # Clone automation as new draft
    │   → ActionResult<{ id: string, name: string }>
    ├── enrollUserInAutomation(flowId, profileId)  # Enroll user in flow
    │   → ActionResult<{ enrollmentId: string }>
    ├── exitUserFromAutomation(enrollmentId, reason?)  # Exit user from flow
    │   → ActionResult<void>
    ├── saveEmailTemplate(data)         # Create/update email template
    │   → ActionResult<{ id: string }>
    ├── deleteEmailTemplate(id)         # Delete email template
    │   → ActionResult<void>
    ├── createPresetAutomation(preset)  # Create preset (welcome/reengagement/food_alert)
    │   → ActionResult<{ id: string }>
    │
    │  Queue Management:
    ├── getQueueStatus()                # Get queue statistics (pending/processing/sent/failed)
    │   → ActionResult<{ pending, processing, sent, failed }>
    ├── triggerQueueProcessing()        # Manually trigger queue processing
    │   → ActionResult<{ message: string }>
    ├── cancelPendingEmails()           # Cancel all pending automation emails
    │   → ActionResult<{ cancelled: number }>
    └── retryFailedEmails()             # Re-queue failed emails for retry
        → ActionResult<{ retried: number }>
```

### Edge Functions

```
supabase/functions/
├── process-email-queue/             # Existing queue processor
│   └── index.ts
└── smart-email-route/               # NEW: Smart routing engine
    └── index.ts
```

### Documentation

```
docs/email-setup/
├── IMPLEMENTATION_COMPLETE.md       # Original implementation guide
├── SMART_ROUTING_DEPLOYMENT.md      # Smart routing deployment
└── ADMIN_EMAIL_CRM.md              # This file
```

### Configuration Updates

```
src/utils/ROUTES.ts                  # Added adminEmail route
src/pages/admin/AdminLayout.tsx      # Added Email CRM nav item
src/components/localization/
└── ChangeLanguageContainer.tsx      # Added route configuration
```

---

## 🚀 Quick Start

### 1. Access the CRM

Navigate to:

```
https://foodshare.app/admin/email
```

**Requirements:**

- Must be logged in as admin
- Protected by RoleGuard component
- Requires `admin` role in your auth system

### 2. Deploy Smart Routing Function

```bash
# Deploy the edge function
supabase functions deploy smart-email-route

# Set environment secrets
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Test the System

**Test Smart Routing:**

```bash
curl -X POST \
  https://your-project.supabase.co/functions/v1/smart-email-route \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"emailType":"chat"}'
```

**Send a Test Email:**

1. Go to Admin Email CRM
2. Fill in the manual email form
3. Select "Auto-select (Smart Routing)"
4. Click "Send Email"
5. Check "Email History" tab for delivery status

---

## 📊 Dashboard Overview

### Top Navigation Bar Layout

The Email CRM uses a modern horizontal tab navigation pattern with quota and provider status indicators:

```
┌───────────────────────────────────────────────────────────────────────┐
│ [Dashboard] [Campaigns] [Automation] [Compose] [Audience] [Providers] │
│                                                                       │
│                                   [Quota: ████░░ 68/500] [●●●] [+New] │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│                    [Main Content Area - Scrollable]                   │
│                                                                       │
│  Dashboard: Stats overview, quick actions, provider health            │
│  Campaigns: Email campaign management with search                     │
│  Automation: Workflow automation flows                                │
│  Compose: Manual email sender with smart routing                      │
│  Audience: Segment builder & user targeting                           │
│  Providers: Provider health status and configuration                  │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

### Navigation Tabs

| Tab        | Icon | Description                                         |
| ---------- | ---- | --------------------------------------------------- |
| Dashboard  | 📊   | Overview stats, provider quotas, quick actions      |
| Campaigns  | 📢   | Create and manage email campaigns                   |
| Automation | 🔄   | Workflow automation (welcome series, re-engagement) |
| Compose    | ✉️   | Manual email sender with smart routing              |
| Audience   | 🎯   | Audience segmentation with growth metrics           |
| Providers  | ⚙️   | Provider health status and configuration            |

### Top Bar Features

- **Tab Navigation**: Horizontal tabs with icons (responsive - icons only on mobile)
- **Daily Quota Indicator**: Progress bar showing quota usage (e.g., 68/500)
- **Provider Status Dots**: Color-coded health indicators (green=healthy, amber=degraded, red=down)
- **New Campaign Button**: Quick action to create new campaigns

### Campaign Types

- **Newsletter** - Regular updates and tips
- **Announcement** - Feature launches and news
- **Promotion** - Special campaigns and drives
- **Onboarding** - Welcome series for new users
- **Re-engagement** - Win back inactive users

### Audience Segments

Pre-built segments for targeted campaigns:

| Segment             | Criteria                                    | Color   | Growth |
| ------------------- | ------------------------------------------- | ------- | ------ |
| Active Sharers      | Shared food in last 30 days, verified email | Emerald | +12%   |
| New Users           | Joined in last 7 days                       | Blue    | +23%   |
| Inactive Users      | No activity in 60+ days                     | Amber   | -5%    |
| Community Champions | Top 10% contributors, 5-star rating         | Violet  | +8%    |
| Mobile Users        | Primarily use mobile app, app installed     | Rose    | +15%   |

**Audience Growth Metrics:**

- Total Subscribers count
- Weekly growth (+/- new subscribers)
- Active Rate percentage
- Unsubscribe Rate tracking
- Per-segment growth indicators

### Automation Flows

Pre-built automation workflows:

| Flow                      | Trigger                    | Status | Conversion |
| ------------------------- | -------------------------- | ------ | ---------- |
| Welcome Series            | User signs up              | Active | 34.5%      |
| First Listing Celebration | User creates first listing | Active | 67.2%      |
| Re-engagement Flow        | 30 days inactive           | Active | 12.3%      |
| Review Request            | Successful pickup          | Paused | —          |

**Automation Builder Features (Dec 2025):**

The Automation tab now includes a full visual automation builder:

- **Visual Step Editor** - Add email, delay, and condition steps with drag-and-drop
- **Step Types**: Email (with template selector), Delay (preset or custom), Condition (field/operator/value)
- **Trigger Configuration** - Configure trigger-specific settings (e.g., inactivity days, radius for nearby food)
- **Edit/Toggle/Delete** - Enhanced automation cards with inline status toggle and dropdown actions
- **Preset Templates** - Quick-start with Welcome Series, Re-engagement, or Food Alert presets
- **Lazy Loading** - AutomationBuilder and PresetAutomationCreator are lazy-loaded for performance

**Queue Control Card (Dec 2025):**

Admin controls for managing the automation email queue:

- **Queue Statistics** - Real-time display of pending, processing, sent, and failed email counts
- **Process Now** - Manually trigger queue processing (bypasses 5-minute cron interval)
- **Retry Failed** - Re-queue all failed emails for another delivery attempt
- **Cancel Pending** - Cancel all pending automation emails (with confirmation)
- **Cron Status** - Shows queue is processed automatically every 5 minutes

### Providers Tab

The Providers tab provides detailed monitoring and management for all email providers:

**Overview Stats Grid:**
| Metric | Description |
|--------|-------------|
| Active Providers | Count of configured providers (3) |
| Avg Health | Average health score across all providers |
| Total Requests | Combined request count across providers |
| Daily Quota | Current usage vs limit (e.g., 68/500) |

**Provider Cards:**

| Provider | Role     | Description                          |
| -------- | -------- | ------------------------------------ |
| Brevo    | Primary  | Transactional & marketing emails     |
| Resend   | Auth     | Authentication & verification emails |
| AWS SES  | Failover | High-volume failover & bulk sending  |

Each provider card displays:

- **Header**: Provider name, role badge, status indicator (Operational/Degraded/Down)
- **Metrics Grid**: Health Score (with progress bar), Success Rate %, Avg Latency (ms), Total Requests
- **Actions**: View Logs, Configure, Test buttons

**Provider Health Indicators:**

- 🟢 **Operational**: Provider healthy and responding normally
- 🟡 **Degraded**: Elevated latency or reduced success rate
- 🔴 **Down**: Provider unavailable or circuit breaker open

**Smart Routing Panel:**
An info panel at the bottom shows smart routing status with toggle:

- All email types → Resend (primary, most reliable)
- Fallback → Brevo (secondary)
- Failover → AWS SES (automatic)

---

## 🎯 Key Features Explained

### 1. Real-Time Quota Visualization

**Auto-refreshes every 30 seconds**

Each provider displays:

- Current usage meter (visual progress bar)
- Emails sent today / Daily limit
- Remaining capacity
- Usage percentage
- Status indicator (OK, Warning, Exhausted)

**Status Indicators:**

- 🟢 **OK**: < 80% used
- 🟡 **Warning**: 80-99% used
- 🔴 **Exhausted**: 100% used

### 2. Suppression List Checking

**Automatic bounce/complaint protection**

Before sending any email, the service checks if the recipient is on the suppression list:

- **Bounced emails** - Hard bounces from previous sends
- **Complaints** - Users who marked emails as spam
- **Unsubscribes** - Users who opted out

```typescript
// Suppression check happens automatically
const result = await emailService.sendEmail({
  emailType: "newsletter",
  options: { to: { email: "user@example.com", name: "User" } },
  content: { subject: "Hello", html: "<p>Content</p>" },
});

// If suppressed, returns:
// { success: false, provider: "brevo", error: "Email address is on suppression list", suppressed: true }
```

**Skip suppression for transactional emails:**

```typescript
// For critical transactional emails (password reset, etc.)
await emailService.sendEmail({
  ...request,
  skipSuppressionCheck: true, // Bypass suppression list
});
```

**Benefits:**

- 🛡️ Protects sender reputation
- 📉 Reduces bounce rates
- ✅ Improves deliverability scores
- 🚫 Prevents spam complaints

### 3. Monthly Quota Tracking

**Capacity planning beyond daily limits**

The service now tracks both daily and monthly quotas:

| Provider | Daily Limit | Monthly Limit |
| -------- | ----------- | ------------- |
| Resend   | 100         | 3,000         |
| Brevo    | 300         | 9,000         |
| AWS SES  | 50,000      | 62,000        |

**ProviderHealth now includes:**

```typescript
interface ProviderHealth {
  provider: EmailProvider;
  healthScore: number;
  quotaRemaining: number; // Daily quota remaining
  monthlyQuotaRemaining: number; // Monthly quota remaining
  avgLatencyMs: number;
  isAvailable: boolean;
}
```

**Use cases:**

- Plan newsletter campaigns based on monthly capacity
- Avoid hitting monthly limits mid-campaign
- Better distribute high-volume sends across the month

### 4. Smart Routing System

**How it works:**

```
User sends email → Check suppression → Check email type → Query quotas → Select provider
                         ↓                    ↓
                  Suppressed?           Email Type Routing:
                  Yes → Return error    • auth → Resend first
                  No → Continue         • chat → Resend first
                                        • newsletter → Resend first
                         ↓
                  Provider has quota (daily + monthly)?
                     Yes → Send via provider
                     No → Try next in priority
```

**Priority Logic:**

Resend is prioritized for all email types since it's the most reliable provider:

```typescript
PRIORITY = {
  auth: ["resend", "brevo", "aws_ses"],
  chat: ["resend", "brevo", "aws_ses"],
  food_listing: ["resend", "brevo", "aws_ses"],
  feedback: ["resend", "brevo", "aws_ses"],
  review_reminder: ["resend", "brevo", "aws_ses"],
  newsletter: ["resend", "brevo", "aws_ses"],
  announcement: ["resend", "brevo", "aws_ses"],
};
```

### 5. Manual Email Sender

**Features:**

- Plain text or HTML mode
- Email type selection (affects routing)
- Provider override (or auto-select)
- Real-time validation
- Success/error feedback

**Smart Routing Integration:**
When set to "Auto-select", the system:

1. Calls `smart-email-route` edge function
2. Gets recommended provider
3. Queues email with recommended provider
4. Shows confirmation with queue ID

### 6. Email History & Queue Management

**Delivery Logs Tab:**

- Last 100 emails sent (24h window)
- Filter by provider, status, email type
- Real-time status updates
- View delivery timestamps

**Queue Tab:**

- Show all queued emails
- Retry failed emails manually
- Delete failed emails
- View attempt count and errors

### 7. Provider Channel Management

**Visual representation of each channel:**

**Brevo Channel:**

- Label: "Primary"
- Capacity: 300/day
- Best for: App notifications, food listings
- Current status: Live indicator

**Resend Channel:**

- Label: "Auth"
- Capacity: 100/day
- Best for: Authentication emails
- Current status: Live indicator

**AWS SES Channel:**

- Label: "Failover"
- Capacity: 100/day
- Best for: Overflow and backup
- Current status: Live indicator

---

## 🔧 Admin Operations

### Send Manual Email

```typescript
// 1. Go to Admin Email CRM
// 2. Fill in form:
{
  to: "user@example.com",
  subject: "Welcome to FoodShare",
  message: "Thanks for joining!",
  emailType: "chat",
  provider: "Auto-select" // Uses smart routing
}
// 3. Click Send
// 4. Email is queued and processed by edge function
```

### Retry Failed Email

```typescript
// 1. Go to Email History → Queue tab
// 2. Find failed email
// 3. Click "Retry" button
// 4. Email is re-queued with next_retry_at = NOW
// 5. Edge function will process on next run
```

### Monitor Provider Health

```typescript
// Real-time monitoring via dashboard:
// - Green meters = healthy
// - Orange meters = approaching limit
// - Red meters = exhausted

// Check specific provider:
getProviderQuotas().then((quotas) => {
  const brevo = quotas.find((q) => q.provider === "brevo");
  console.log(`Brevo: ${brevo.remaining} emails remaining`);
});
```

### Reset Provider Quota (Emergency)

```typescript
// Only use if quota tracking is incorrect
// This does NOT give you more emails - only resets counter

import { resetProviderQuota } from "@/api/admin/emailManagement";

// Reset today's quota for a provider
await resetProviderQuota("brevo"); // Sets emails_sent = 0

// ⚠️ WARNING: Only use if quota is genuinely incorrect
// This doesn't increase your actual provider limit
```

---

## 📈 Monitoring & Analytics

### Real-Time Metrics

The CRM dashboard shows:

**24-Hour Metrics:**

- Total emails sent
- Total failed
- Total queued
- Success rate percentage

**Provider Performance:**

- Emails sent per provider
- Success rate per provider
- Average delivery time (coming soon)

**Queue Health:**

- Items waiting to be processed
- Items currently processing
- Failed items requiring attention

### Monitoring Queries

Use the existing monitoring dashboard:

```sql
-- Run queries from scripts/monitoring/email-dashboard.sql

-- Provider quota status
SELECT * FROM email_provider_quota WHERE date = CURRENT_DATE;

-- Recent emails
SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 20;

-- Queue status
SELECT status, COUNT(*) FROM email_queue GROUP BY status;
```

---

## 🎨 UI/UX Features

### Beautiful Design

- **Animated content transitions** with Framer Motion (AnimatePresence, slide animations)
- **Fixed sidebar navigation** with active state highlighting and daily quota progress
- **Dark mode support** with semantic color tokens (muted, foreground, border)
- **Skeleton loading states** for smooth UX during data fetch
- **Provider performance cards** with animated progress bars
- **Responsive layout** for mobile/tablet/desktop
- **Status indicators** with color-coded badges and icons (emerald/amber/rose)
- **Real-time updates** without page refresh
- **Color-coded quick action cards** (emerald, blue, amber, rose)
- **Switch component** for HTML mode toggle

### User Experience

- **Auto-refresh** for live data (30s intervals)
- **Loading states** with animated spinners (RefreshCw icon)
- **Error handling** with animated result messages
- **Form validation** with instant feedback
- **Direct test button** for Resend provider testing
- **Keyboard shortcuts** (future enhancement)
- **Accessibility** WCAG compliant

### Visual Hierarchy

1. **Top navigation bar** - Horizontal tabs with quota indicator and provider status dots
2. **Dashboard** - High-level metrics with real stats, campaigns, automations, provider health
3. **Campaigns** - Campaign list with status badges, search, open/click rates (real campaigns)
4. **Automation** - Workflow cards with trigger, enrollment, and conversion metrics
5. **Compose** - Manual sender with smart routing info sidebar
6. **Audience** - Segment cards with color-coded criteria, user counts, and growth indicators
7. **Providers** - Provider health status cards with success rates and configuration

---

## 🔐 Security & Access Control

### Authentication

Protected by RoleGuard:

```tsx
<RoleGuard requiredRole="admin">
  <AdminLayout />
</RoleGuard>
```

### Authorization

Only admins can:

- View email CRM dashboard
- Send manual emails
- Retry/delete queued emails
- Reset provider quotas
- Access email logs

### API Security

All API functions use Supabase RLS:

```typescript
// Supabase automatically enforces:
// - User must be authenticated
// - User must have admin role
// - Row-level security policies apply
```

---

## 🚀 Deployment Checklist

### Edge Function Deployment

- [ ] Deploy `smart-email-route` function
- [ ] Set environment secrets
- [ ] Test with sample requests
- [ ] Verify response format
- [ ] Check function logs

### Frontend Deployment

- [ ] Build and deploy React app
- [ ] Verify admin route is accessible
- [ ] Test quota visualization
- [ ] Test manual email sending
- [ ] Check email history loading

### Testing

- [ ] Send test email via CRM
- [ ] Verify smart routing selection
- [ ] Test provider failover
- [ ] Check queue management
- [ ] Monitor for 24 hours

---

## 📚 API Usage Examples

### Server-Side Data Integration (Recommended)

The Email CRM uses server-first architecture with real data passed via props:

```typescript
// Server Component - app/admin/email/page.tsx
import { getEmailCRMData } from "@/lib/data/admin-email";
import { EmailCRMClient } from "@/components/admin/EmailCRMClient";

export default async function EmailCRMPage() {
  const data = await getEmailCRMData();
  return <EmailCRMClient initialData={data} />;
}
```

**EmailCRMData Type:**

```typescript
interface EmailCRMData {
  stats?: {
    dailyQuotaUsed: number;
    dailyQuotaLimit: number;
    // ... other stats
  };
  campaigns: Campaign[]; // Real campaign data from DB
  automations: AutomationFlow[]; // Automation workflows
  segments: AudienceSegment[]; // Audience segments
  providerHealth: ProviderHealth[]; // Provider status
}
```

### Server-Side Monitoring

Use the data layer functions in Server Components for optimal performance:

```typescript
// Server Component - app/admin/email/monitor/page.tsx
import { getEmailMonitoringData } from "@/lib/data/admin-email";

export default async function EmailMonitorPage() {
  const data = await getEmailMonitoringData();
  // data contains: providerStatus, quotaStatus, recentEmails, healthEvents
  return <EmailMonitorClient initialData={data} />;
}
```

**Monitoring Types:**

```typescript
import type {
  ProviderStatus,
  QuotaStatus,
  RecentEmail,
  HealthEvent,
  EmailMonitoringData,
} from "@/lib/data/admin-email";

interface ProviderStatus {
  provider: string;
  state: string; // Circuit breaker state
  failures: number;
  consecutive_successes: number;
  last_failure_time: string | null;
  health_score: number; // 0-100 health score
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
}

interface QuotaStatus {
  provider: string;
  emails_sent: number;
  daily_limit: number;
  remaining: number;
  percentage_used: number;
  date: string;
}

interface RecentEmail {
  id: string;
  email_type: string;
  recipient_email: string;
  provider_used: string;
  status: string;
  created_at: string;
}

interface HealthEvent {
  id: string;
  event_type: string;
  severity: string;
  message: string;
  provider: string;
  created_at: string;
}

interface EmailMonitoringData {
  providerStatus: ProviderStatus[];
  quotaStatus: QuotaStatus[];
  recentEmails: RecentEmail[];
  healthEvents: HealthEvent[];
}
```

Individual functions for granular fetching:

```typescript
import {
  getProviderStatus,
  getQuotaStatus,
  getRecentEmails,
  getHealthEvents,
} from "@/lib/data/admin-email";

// Get provider health with circuit breaker state
const providers = await getProviderStatus();
// [{ provider: 'resend', state: 'closed', health_score: 95, ... }]

// Get today's quota usage
const quotas = await getQuotaStatus();
// [{ provider: 'resend', emails_sent: 45, daily_limit: 100, remaining: 55, ... }]

// Get recent email logs
const emails = await getRecentEmails(20); // last 20 emails

// Get health events/alerts
const events = await getHealthEvents(50); // last 50 events
```

### Client-Side API (Legacy)

```typescript
import { getProviderQuotas } from "@/api/admin/emailManagement";

const quotas = await getProviderQuotas();
console.log(quotas);
// [
//   { provider: 'brevo', emails_sent: 150, daily_limit: 300, ... },
//   { provider: 'resend', emails_sent: 20, daily_limit: 100, ... },
//   { provider: 'aws_ses', emails_sent: 5, daily_limit: 100, ... }
// ]
```

### Send Manual Email

```typescript
import { sendManualEmail } from "@/api/admin/emailManagement";

const result = await sendManualEmail({
  to: "user@example.com",
  subject: "Test Email",
  html: "<p>Hello from FoodShare!</p>",
  emailType: "chat",
  provider: "brevo", // or undefined for auto-select
});

console.log(result); // { success: true, messageId: '...' }
```

### Get Email Logs

```typescript
import { getEmailLogs } from "@/api/admin/emailManagement";

const logs = await getEmailLogs({
  limit: 50,
  provider: "brevo",
  emailType: "chat",
  hours: 24,
});

console.log(`Found ${logs.length} emails`);
```

### Check Email Statistics

```typescript
import { getEmailStats } from "@/api/admin/emailManagement";

const stats = await getEmailStats();
console.log(`Success rate: ${stats.successRate.toFixed(1)}%`);
console.log(`Queued: ${stats.totalQueued}`);
```

---

## 🎓 Best Practices

### 1. Monitor Daily Quotas

Check quotas at least once daily:

- Morning: Verify quotas reset correctly
- Afternoon: Check if approaching limits
- Evening: Review day's usage patterns

### 2. Use Smart Routing

Always prefer auto-select for provider:

- Let the system choose based on quota
- Only manually override when necessary
- Trust the smart routing algorithm

### 3. Keep Queue Healthy

Regularly review queued emails:

- Retry failed emails after investigating
- Delete permanently failed emails
- Monitor queue size (should be < 50)

### 4. Analyze Patterns

Review weekly trends:

- Which providers are most used?
- What's the typical success rate?
- Are there recurring failures?

### 5. Plan for Scale

If approaching limits:

- Upgrade provider plans
- Add additional providers
- Implement email throttling
- Consider email digests

---

## 🐛 Troubleshooting

### CRM Page Not Loading

**Check:**

1. User is logged in as admin
2. Route is properly configured
3. Browser console for errors
4. Network tab for failed API calls

### Quotas Showing Incorrectly

**Solution:**

```sql
-- Check quota records
SELECT * FROM email_provider_quota WHERE date = CURRENT_DATE;

-- If missing, initialize:
INSERT INTO email_provider_quota (provider, date, emails_sent, daily_limit)
VALUES
  ('brevo', CURRENT_DATE, 0, 300),
  ('resend', CURRENT_DATE, 0, 100),
  ('aws_ses', CURRENT_DATE, 0, 100)
ON CONFLICT DO NOTHING;
```

### Manual Email Not Sending

**Check:**

1. Email is queued (check `email_queue` table)
2. Edge function is deployed and running
3. Provider has available quota
4. No validation errors in form

### Smart Routing Returning Error

**Check:**

1. Edge function logs
2. Environment secrets are set
3. Database connection works
4. Quota records exist for today

### Vault Access Issues

**Problem:** Emails not sending, logs show `[Vault] ❌ Missing SUPABASE_SERVICE_ROLE_KEY`

**Solution:**

The vault service logs detailed environment diagnostics:

```
[Vault] 🔧 Environment check: {
  hasSupabaseUrl: true,
  hasServiceRoleKey: false,
  serviceRoleKeyLength: 0,
  nodeEnv: "production"
}
```

**Production requires Supabase Vault access.** Fix by ensuring `SUPABASE_SERVICE_ROLE_KEY` is available to the application.
3. Ensure secrets are stored in Supabase Vault (Dashboard → Settings → Vault)

**Important:** In production, environment variables for email providers (`RESEND_API_KEY`, etc.) are ignored. All secrets must be stored in Supabase Vault for centralized, secure management.

**Local Development:** Environment variables work directly - no vault access needed. Set `RESEND_API_KEY`, `BREVO_API_KEY`, etc. in `.env.local`.

---

## 📖 Related Documentation

- **Email System Overview**: `docs/email-setup/IMPLEMENTATION_COMPLETE.md`
- **Smart Routing Deployment**: `docs/email-setup/SMART_ROUTING_DEPLOYMENT.md`
- **Supabase SMTP Setup**: `docs/email-setup/SUPABASE_SMTP_CONFIGURATION.md`
- **Environment Setup**: `docs/email-setup/ENVIRONMENT_SETUP.md`
- **Monitoring Queries**: `scripts/monitoring/email-dashboard.sql`

---

## 🎉 Summary

Your Admin Email CRM provides:

✅ **Complete Visibility**

- Real-time quota monitoring
- 24-hour statistics
- Full email history
- Queue management

✅ **Smart Operations**

- Intelligent routing
- Automatic failover
- Provider selection
- Retry management

✅ **Admin Control**

- Manual email sending
- Provider override
- Queue operations
- Emergency reset

✅ **Beautiful UI**

- Modern, responsive design
- Real-time updates
- Visual indicators
- Intuitive layout

**You now have enterprise-grade email management!** 🚀

---

**Last Updated:** 2025-12-14
**Status:** ✅ Production Ready (V1 + Queue Control)
**URL:** `/admin/email`

---

## 📧 Email Types Reference

Core TypeScript types for the email system are defined in `src/lib/email/types.ts`.

### Email Status

```typescript
type EmailStatus = "pending" | "sent" | "delivered" | "failed" | "bounced" | "complained";
```

### Bounce Handling Types

```typescript
type BounceType = "hard" | "soft";
type BounceCategory = "invalid" | "full_mailbox" | "blocked" | "spam" | "other";
type SuppressionReason = "hard_bounce" | "soft_bounce" | "complaint" | "unsubscribe" | "manual";
```

### Suppression List

The email system maintains a suppression list to prevent sending to addresses that have bounced or complained:

```typescript
interface SuppressionEntry {
  id: string;
  email: string;
  reason: SuppressionReason;
  provider?: EmailProvider;
  bounceType?: string;
  bounceSubtype?: string;
  suppressedAt: Date;
  expiresAt?: Date; // Soft bounces may expire
}
```

### Bounce Events (Webhooks)

Provider webhooks report bounce and complaint events:

```typescript
interface BounceEvent {
  email: string;
  provider: EmailProvider;
  eventType: "bounce" | "complaint" | "delivery" | "open" | "click" | "unsubscribe";
  bounceType?: BounceType;
  bounceCategory?: BounceCategory;
  messageId?: string;
  timestamp: Date;
  rawPayload?: Record<string, unknown>;
}
```

### Comprehensive Quota

Extended quota tracking with daily and monthly limits:

```typescript
interface ComprehensiveQuota {
  provider: EmailProvider;
  daily: { sent: number; limit: number; remaining: number; percentUsed: number };
  monthly: { sent: number; limit: number; remaining: number; percentUsed: number };
  isAvailable: boolean;
}
```

### Send Email Options

```typescript
interface SendEmailRequest {
  to: EmailAddress | EmailAddress[];
  content: EmailContent;
  options: EmailOptions;
  emailType: EmailType;
  skipSuppressionCheck?: boolean; // For critical transactional emails
}

interface SendEmailResponse {
  success: boolean;
  messageId?: string;
  provider: EmailProvider;
  error?: string;
  suppressed?: boolean; // True if blocked due to suppression list
}
```

---

## 🔮 V3 Features (Now in Production)

The V3 glass UI features have been merged into the main `EmailCRMClient` component (Dec 2025):

- ✅ **Glass morphism design** using Tailwind v4 utilities
- ✅ **Fixed viewport layout** - no horizontal scroll issues
- ✅ **ScrollArea integration** for better scroll handling
- ✅ **Card-based layout** with shadcn Card components
- ✅ **DropdownMenu** for contextual actions
- ✅ **Enhanced animations** with Framer Motion

The legacy `EmailCRMClientV3.tsx` file can be removed as features are now in production.
