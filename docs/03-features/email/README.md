# Admin Email CRM - Complete Setup Guide

Beautiful, comprehensive email management system for FoodShare admins with smart routing, real-time quota monitoring, and complete control over email operations.

---

## 📧 Email Service Architecture

FoodShare uses `UnifiedEmailService` for all email delivery:

### UnifiedEmailService

The optimized email service with:

- **Smart provider routing** based on email type (auth → Resend, app → Brevo)
- **Request coalescing** for health checks (multiple calls share one DB query)
- **Buffered metrics** (non-blocking database writes)
- **Lazy provider initialization** (tree-shaking friendly)
- **Automatic retry queue** when all providers fail

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

Provider credentials are managed via `src/lib/email/vault.ts`, which fetches secrets from Supabase Vault with automatic fallback to environment variables for local development.

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

**Local Development:** Set environment variables directly - the vault service will use them automatically:

```bash
RESEND_API_KEY=re_xxx
BREVO_API_KEY=xkeysib-xxx
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=us-east-1
```

**Production:** Store secrets in Supabase Vault via Dashboard → Settings → Vault. The `get_secrets` RPC function retrieves them securely.

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
- **Email-type specific routing** (auth → Resend, app → Brevo)
- **Full quota transparency** for informed decisions

---

## 📂 Files Created

### Admin CRM Components

```
src/components/admin/
├── EmailQuotaDashboard.tsx          # Real-time quota meters with auto-refresh
├── EmailStatsDashboard.tsx          # 24h statistics and success rates
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
└── EmailCRMClient.tsx               # Main email CRM dashboard (client component)
```

**Architecture Note:** The email CRM page uses Next.js 16 server-first architecture:

- `page.tsx` is a Server Component that handles translations and layout
- `EmailCRMClient` is a Client Component wrapped in Suspense for streaming
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
└── admin-email.ts                   # Server-side data fetching for monitoring
    ├── getProviderStatus()          # Provider health + circuit breaker state
    ├── getQuotaStatus()             # Daily quota usage per provider
    ├── getRecentEmails()            # Recent email logs
    ├── getHealthEvents()            # Health events and alerts
    └── getEmailMonitoringData()     # All monitoring data (parallel fetch)
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
└── email.ts                         # Email server actions
    ├── getEmailPreferences()        # Get user's email preferences
    ├── updateEmailPreferences()     # Update user's email preferences
    ├── resetEmailPreferences()      # Reset to defaults
    └── sendAdminEmail()             # Send email immediately (admin only)
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

### Main Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│                   Email Management CRM                       │
│         Smart routing, quota monitoring, and control         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  System Overview                                             │
│  ┌──────────┬──────────┬──────────┬────────────┐           │
│  │ Sent 24h │ Failed   │ Queued   │ Success %  │           │
│  │   245    │    3     │    12    │   98.8%    │           │
│  └──────────┴──────────┴──────────┴────────────┘           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Email Provider Quotas                                       │
│  ┌──────────────┬──────────────┬──────────────┐            │
│  │   Brevo      │   Resend     │   AWS SES    │            │
│  │   [████░░]   │   [██░░░░]   │   [█░░░░░]   │            │
│  │   150/300    │    20/100    │    5/100     │            │
│  │   50% used   │   20% used   │    5% used   │            │
│  │   ✅ OK      │   ✅ OK      │   ✅ OK      │            │
│  └──────────────┴──────────────┴──────────────┘            │
└─────────────────────────────────────────────────────────────┘

┌───────────────────────────────┬─────────────────────────────┐
│  Manual Email Sender          │  Smart Routing Info         │
│  ┌─────────────────────────┐  │  ┌───────────────────────┐ │
│  │ To: user@example.com    │  │  │ 1. Quota Check        │ │
│  │ Subject: ...            │  │  │ 2. Channel Selection  │ │
│  │ Message: ...            │  │  │ 3. Failover           │ │
│  │ Type: Chat              │  │  │ 4. Retry Queue        │ │
│  │ Provider: Auto-select   │  │  └───────────────────────┘ │
│  │ [Send Email]            │  │  Provider Channels:       │
│  └─────────────────────────┘  │  • Brevo (Primary)        │
│                                │  • Resend (Auth)          │
│                                │  • AWS SES (Failover)     │
└───────────────────────────────┴─────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Email History                                               │
│  [Delivery Logs] [Queue (12)]                               │
│  ┌───────────┬─────────────┬─────────┬──────────┬────────┐ │
│  │ Time      │ Recipient   │ Subject │ Provider │ Status │ │
│  ├───────────┼─────────────┼─────────┼──────────┼────────┤ │
│  │ 2:45 PM   │ user@...    │ Chat... │ brevo    │ ✅ Sent│ │
│  │ 2:44 PM   │ admin@...   │ Food... │ brevo    │ ✅ Sent│ │
│  │ 2:43 PM   │ test@...    │ Auth... │ resend   │ ✅ Sent│ │
│  └───────────┴─────────────┴─────────┴──────────┴────────┘ │
└─────────────────────────────────────────────────────────────┘
```

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

### 2. Smart Routing System

**How it works:**

```
User sends email → Check email type → Query quotas → Select provider
                         ↓
                  Email Type Routing:
                  • auth → Resend first
                  • chat → Brevo first
                  • food_listing → Brevo first
                         ↓
                  Provider has quota?
                     Yes → Send via provider
                     No → Try next in priority
```

**Priority Logic:**

```typescript
PRIORITY = {
  auth: ["resend", "brevo", "aws_ses"],
  chat: ["brevo", "aws_ses", "resend"],
  food_listing: ["brevo", "aws_ses", "resend"],
  feedback: ["brevo", "aws_ses", "resend"],
  review_reminder: ["brevo", "aws_ses", "resend"],
  newsletter: ["brevo", "aws_ses", "resend"],
  announcement: ["brevo", "aws_ses", "resend"],
};
```

### 3. Manual Email Sender

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

### 4. Email History & Queue Management

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

### 5. Provider Channel Management

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

- **Gradient headers** with green color scheme
- **Glass-morphism cards** for modern look
- **Smooth animations** on hover and transitions
- **Responsive layout** for mobile/tablet/desktop
- **Status indicators** with color coding
- **Real-time updates** without page refresh

### User Experience

- **Auto-refresh** for live data (30s intervals)
- **Loading states** with spinners
- **Error handling** with user-friendly messages
- **Form validation** with instant feedback
- **Keyboard shortcuts** (future enhancement)
- **Accessibility** WCAG compliant

### Visual Hierarchy

1. **Page header** - Clear title and description
2. **System overview** - High-level metrics
3. **Quota dashboard** - Visual capacity meters
4. **Main actions** - Manual sender and routing info
5. **History** - Detailed logs and queue

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

### Server-Side Monitoring (Recommended)

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
  nodeEnv: "production",
  vercelEnv: "production"
}
```

Fix options:

1. **Add `SUPABASE_SERVICE_ROLE_KEY` to Vercel** (recommended for vault access)
   - Go to Vercel Dashboard → Project → Settings → Environment Variables
   - Add `SUPABASE_SERVICE_ROLE_KEY` with your service role key from Supabase

2. **Or add email provider keys directly** (simpler, no vault needed)
   - Add `RESEND_API_KEY`, `BREVO_API_KEY`, etc. directly to Vercel env vars
   - The vault service will use these automatically without needing vault access

**Note:** The vault service prioritizes environment variables over Supabase Vault. If any provider key is set in env vars, vault lookup is skipped entirely.

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

**Last Updated:** 2025-12-10
**Status:** ✅ Production Ready
**URL:** `/admin/email`
