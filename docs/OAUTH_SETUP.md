# OAuth Provider Setup Guide

## Issue

If you see the error: `{"code": 400,"error_code": "validation_failed","msg": "Unsupported provider: missing OAuth secret"}`, it means an OAuth provider is enabled in your app but not configured in Supabase.

## Solution

### 1. Access Supabase Dashboard

Go to: `https://supabase.com/dashboard/project/[your-project-id]/auth/providers`

### 2. Configure Each Provider

#### Google OAuth

1. **Get Credentials:**
   - Go to: https://console.cloud.google.com/apis/credentials
   - Create OAuth 2.0 Client ID (Web application)
   - Add authorized redirect URI: `https://api.foodshare.club/auth/v1/callback`
   - Copy Client ID and Client Secret

2. **Configure in Supabase:**
   - Enable Google provider
   - Paste Client ID
   - Paste Client Secret
   - Redirect URL: `https://api.foodshare.club/auth/v1/callback`

#### GitHub OAuth

1. **Get Credentials:**
   - Go to: https://github.com/settings/developers
   - Create New OAuth App
   - Authorization callback URL: `https://api.foodshare.club/auth/v1/callback`
   - Copy Client ID and Client Secret

2. **Configure in Supabase:**
   - Enable GitHub provider
   - Paste Client ID
   - Paste Client Secret
   - Redirect URL: `https://api.foodshare.club/auth/v1/callback`

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
