# Environment Variables Setup Guide

This guide walks you through setting up all required environment variables for the multi-provider email system.

## Quick Setup

1. Copy the example file:

   ```bash
   cp .env.local.example .env.local
   ```

2. Fill in your actual values (see sections below)

3. Restart your development server:
   ```bash
   npm run dev
   ```

---

## Required Environment Variables

### 1. Supabase Configuration

Get these from your Supabase dashboard:

- Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-service-role-key
```

**Note:** The service role key should NEVER be exposed to the client.

---

### 2. Resend API Key

**Status:** You already have Resend configured on Supabase
**Purpose:** Auth emails are now sent via Brevo SMTP (configured in Supabase dashboard)
**Optional:** Keep for future use or additional integrations

Get your API key from: https://resend.com/api-keys

```env
RESEND_API_KEY=re_your_api_key_here
```

---

### 3. Brevo API Key

**Status:** ✅ You provided this earlier
**Purpose:** Primary provider for app notifications (300 emails/day)

Your credentials:

```env
BREVO_API_KEY=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
```

SMTP details (for reference):

```env
BREVO_SMTP_HOST=smtp-relay.brevo.com
BREVO_SMTP_PORT=587
BREVO_SMTP_USER=9cca92001@smtp-brevo.com
```

---

### 4. AWS SES Credentials

**Status:** Needs setup
**Purpose:** Failover provider (100 emails/day)

#### How to Get AWS SES Credentials:

1. **Sign in to AWS Console**
   - Go to: https://console.aws.amazon.com/

2. **Navigate to IAM (Identity and Access Management)**
   - Search for "IAM" in the AWS services search

3. **Create a New User for SES**
   - Click "Users" → "Create user"
   - User name: `foodshare-ses-user`
   - Select "Programmatic access"

4. **Attach SES Permissions**
   - Click "Attach policies directly"
   - Search for and select: `AmazonSESFullAccess`
   - Click "Next" → "Create user"

5. **Save Credentials**
   - **IMPORTANT:** Download and save the Access Key ID and Secret Access Key
   - You won't be able to see the secret again!

6. **Verify SES Region**
   - Go to: https://console.aws.amazon.com/ses/
   - Note the region (e.g., us-east-1)

7. **Request Production Access (if needed)**
   - New AWS accounts start in "sandbox mode" with limits
   - Request production access: https://console.aws.amazon.com/ses/home#/account

Add to your `.env.local`:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
```

---

### 5. Email Configuration

Default sender information:

```env
NEXT_PUBLIC_EMAIL_FROM=noreply@foodshare.app
NEXT_PUBLIC_EMAIL_FROM_NAME=FoodShare
```

Application URLs:

```env
NEXT_PUBLIC_APP_URL=https://foodshare.app
NEXT_PUBLIC_SITE_URL=https://foodshare.app
```

---

## Optional Configuration

### Development Mode

Redirect all emails to a test address during development:

```env
EMAIL_REDIRECT_ALL_TO=your-test-email@example.com
```

### Debug Mode

Enable detailed email logging:

```env
EMAIL_DEBUG=true
```

### Custom Quota Limits

Override default daily limits:

```env
RESEND_DAILY_LIMIT=100
BREVO_DAILY_LIMIT=300
AWS_SES_DAILY_LIMIT=100
```

---

## Verification Checklist

After setting up environment variables, verify everything works:

### 1. Test Email Service Initialization

Create a test script `scripts/test-email-service.ts`:

```typescript
import { createEmailService } from "@/lib/email";

async function testEmailService() {
  try {
    // createEmailService() returns UnifiedEmailService (v2) by default
    // For legacy EnhancedEmailService, use createEnhancedEmailService()
    const emailService = createEmailService();

    // Test health status (includes provider availability and metrics)
    const health = await emailService.getHealthStatus();
    console.log("Service Health:", health);

    console.log("✅ Email service initialized successfully!");
  } catch (error) {
    console.error("❌ Email service initialization failed:", error);
  }
}

testEmailService();
```

Run it:

```bash
npx tsx scripts/test-email-service.ts
```

### 2. Test Supabase Connection

```bash
# In your terminal or browser console
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Test query
const { data, error } = await supabase.from('email_logs').select('count');
console.log(data, error);
```

### 3. Test Environment Loading

Create `scripts/check-env.ts`:

```typescript
const requiredEnvVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "BREVO_API_KEY",
  "NEXT_PUBLIC_EMAIL_FROM",
];

const optionalEnvVars = ["RESEND_API_KEY", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"];

console.log("Checking environment variables...\n");

// Check required
requiredEnvVars.forEach((key) => {
  const value = process.env[key];
  console.log(`${key}: ${value ? "✅ Set" : "❌ Missing"}`);
});

console.log("\nOptional variables:");
optionalEnvVars.forEach((key) => {
  const value = process.env[key];
  console.log(`${key}: ${value ? "✅ Set" : "⚠️  Not set"}`);
});
```

---

## Supabase Vault for Secrets

For sensitive API keys that shouldn't be stored in environment variables (or as a fallback), use Supabase Vault:

### Storing Secrets

```sql
-- Store a secret in vault
SELECT vault.create_secret('XAI_API_KEY', 'xai-your-api-key-here');
```

### Retrieving Secrets (Server-Side Only)

```typescript
// Example: Get secret with caching
const supabase = await createClient();
const { data, error } = await supabase.rpc("get_secrets", {
  secret_names: ["XAI_API_KEY"],
});

const apiKey = data?.find((s) => s.name === "XAI_API_KEY")?.value;
```

### When to Use Vault vs Environment Variables

| Use Case                       | Recommendation                       |
| ------------------------------ | ------------------------------------ |
| Local development              | Environment variables (`.env.local`) |
| Vercel deployment              | Vercel environment variables         |
| Shared secrets across services | Supabase Vault                       |
| Secrets that need rotation     | Supabase Vault                       |
| Edge Functions needing secrets | Supabase Vault                       |

See [AI Moderation docs](../03-features/admin/AI_MODERATION.md) for a complete implementation example.

---

## Security Best Practices

### Never Commit Secrets

Ensure `.env.local` is in `.gitignore`:

```bash
# Check if it's ignored
git check-ignore .env.local
# Should output: .env.local
```

### Use Different Keys for Environments

- **Development**: Use test/sandbox API keys
- **Staging**: Use separate production-like keys
- **Production**: Use production keys with proper access controls

### Rotate Keys Regularly

- Rotate API keys every 90 days
- Use AWS IAM roles instead of access keys when possible
- Monitor key usage in provider dashboards

### Environment-Specific Configuration

Create different env files for each environment:

- `.env.local` - Development
- `.env.staging` - Staging (committed to repo, no secrets)
- `.env.production` - Production (use platform environment variables)

---

## Troubleshooting

### Environment Variables Not Loading

**Problem:** Changes to `.env.local` not reflected

**Solution:**

1. Stop your development server (Ctrl+C)
2. Clear Next.js cache: `rm -rf .next`
3. Restart: `npm run dev`

### Invalid API Key Errors

**Problem:** `401 Unauthorized` or `403 Forbidden`

**Solution:**

1. Verify the API key is correct (no extra spaces)
2. Check if the key has necessary permissions
3. Verify the key hasn't been revoked
4. Try regenerating the key from the provider dashboard

### CORS Errors with Email APIs

**Problem:** CORS errors when testing email sending

**Solution:**

- Email APIs should be called from server-side only
- Never call email providers directly from client-side code
- Use API routes or Supabase Edge Functions

---

## Next Steps

After setting up environment variables:

1. ✅ Verify all providers are accessible
2. ✅ Test email sending with each provider
3. ✅ Set up email queue processor (Phase 9)
4. ✅ Configure monitoring and alerts (Phase 10)

---

**Last Updated:** 2025-11-28
