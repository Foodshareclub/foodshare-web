# OAuth Provider Setup Guide (Self-Hosted Supabase)

## Issue

If you see the error: `{"code": 400,"error_code": "validation_failed","msg": "Unsupported provider: missing OAuth secret"}`, it means an OAuth provider button is shown but not configured in your self-hosted Supabase instance.

## Quick Fix (Recommended)

The app now automatically hides OAuth buttons for unconfigured providers. **All OAuth providers are disabled by default** until you explicitly enable them.

### To Enable a Provider:

**Step 1: Configure in Self-Hosted Supabase Backend**

Edit `foodshare-backend/.env` and add:

```bash
# Google OAuth Configuration
GOTRUE_EXTERNAL_GOOGLE_ENABLED=true
GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID=your-google-client-id
GOTRUE_EXTERNAL_GOOGLE_SECRET=your-google-client-secret
GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI=https://api.foodshare.club/auth/v1/callback
```

**Step 2: Restart Supabase Services**

```bash
cd foodshare-backend
docker-compose restart auth
```

**Step 3: Enable in Web App**

Add to GitHub Secrets (for production) or `.env.local` (for development):
```bash
NEXT_PUBLIC_OAUTH_GOOGLE_ENABLED=true
```

**Step 4: Redeploy Web App**
- Development: Restart your dev server
- Production: Push to trigger deployment

**Available Variables:**
- `NEXT_PUBLIC_OAUTH_GOOGLE_ENABLED=true`
- `NEXT_PUBLIC_OAUTH_FACEBOOK_ENABLED=true`
- `NEXT_PUBLIC_OAUTH_APPLE_ENABLED=true`
- `NEXT_PUBLIC_OAUTH_GITHUB_ENABLED=true`

**Note:** Providers are disabled by default in both development and production for security.

## Solution (Detailed Setup)

### 1. Access Self-Hosted Supabase Configuration

Edit: `foodshare-backend/.env`

### 2. Configure Each Provider

#### Google OAuth

1. **Get Credentials:**
   - Go to: https://console.cloud.google.com/apis/credentials
   - Create OAuth 2.0 Client ID (Web application)
   - Add authorized redirect URI: `https://api.foodshare.club/auth/v1/callback`
   - Copy Client ID and Client Secret

2. **Configure in Backend .env:**
   ```bash
   GOTRUE_EXTERNAL_GOOGLE_ENABLED=true
   GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID=your-client-id-here
   GOTRUE_EXTERNAL_GOOGLE_SECRET=your-client-secret-here
   GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI=https://api.foodshare.club/auth/v1/callback
   ```

3. **Restart Auth Service:**
   ```bash
   cd foodshare-backend
   docker-compose restart auth
   ```

4. **Enable in Web App:**
   Add to GitHub Secrets: `NEXT_PUBLIC_OAUTH_GOOGLE_ENABLED=true`

#### GitHub OAuth

1. **Get Credentials:**
   - Go to: https://github.com/settings/developers
   - Create New OAuth App
   - Authorization callback URL: `https://api.foodshare.club/auth/v1/callback`
   - Copy Client ID and Client Secret

2. **Configure in Backend .env:**
   ```bash
   GOTRUE_EXTERNAL_GITHUB_ENABLED=true
   GOTRUE_EXTERNAL_GITHUB_CLIENT_ID=your-client-id-here
   GOTRUE_EXTERNAL_GITHUB_SECRET=your-client-secret-here
   GOTRUE_EXTERNAL_GITHUB_REDIRECT_URI=https://api.foodshare.club/auth/v1/callback
   ```

3. **Restart Auth Service:**
   ```bash
   cd foodshare-backend
   docker-compose restart auth
   ```

4. **Enable in Web App:**
   Add to GitHub Secrets: `NEXT_PUBLIC_OAUTH_GITHUB_ENABLED=true`

#### Facebook OAuth

1. **Get Credentials:**
   - Go to: https://developers.facebook.com/apps
   - Create App → Consumer
   - Add Facebook Login product
   - Valid OAuth Redirect URIs: `https://api.foodshare.club/auth/v1/callback`
   - Copy App ID and App Secret

2. **Configure in Supabase:**
   - Enable Facebook provider
   - Paste App ID as Client ID
   - Paste App Secret as Client Secret
   - Redirect URL: `https://api.foodshare.club/auth/v1/callback`

#### Apple OAuth

1. **Get Credentials:**
   - Go to: https://developer.apple.com/account/resources/identifiers/list
   - Create Services ID
   - Configure Sign in with Apple
   - Return URLs: `https://api.foodshare.club/auth/v1/callback`
   - Generate Client Secret (requires private key)

2. **Configure in Supabase:**
   - Enable Apple provider
   - Paste Services ID as Client ID
   - Paste generated Client Secret
   - Redirect URL: `https://api.foodshare.club/auth/v1/callback`

### 3. Test OAuth Flow

1. Try signing in with the configured provider
2. Check for any redirect URI mismatches
3. Verify the callback URL is whitelisted in both provider and Supabase

## Temporary Workaround

The app now shows a user-friendly error message when OAuth providers aren't configured:

> "[Provider] sign-in is not configured yet. Please use email/password or magic link."

Users can still authenticate using:
- Email/Password
- Magic Link (passwordless email)

## Environment Variables

No environment variables needed in the web app - OAuth is configured entirely in Supabase dashboard.

## Troubleshooting

### "Redirect URI mismatch"
- Ensure the redirect URI in the provider console exactly matches: `https://api.foodshare.club/auth/v1/callback`
- Check for trailing slashes or http vs https

### "Invalid client"
- Verify Client ID and Secret are copied correctly
- Check if the OAuth app is in production mode (not development)

### "Provider not enabled"
- Confirm the provider toggle is ON in Supabase dashboard
- Wait a few seconds for changes to propagate

## References

- [Supabase OAuth Docs](https://supabase.com/docs/guides/auth/social-login)
- [Google OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [GitHub OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-github)
