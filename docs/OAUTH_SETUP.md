# OAuth Provider Setup Guide (Self-Hosted Supabase)

## Issue

If you see the error: `{"code": 400,"error_code": "validation_failed","msg": "Unsupported provider: missing OAuth secret"}`, it means an OAuth provider button is shown but not configured in your self-hosted Supabase instance.

## Quick Fix (Recommended)

The app now automatically hides OAuth buttons for unconfigured providers. **All OAuth providers are disabled by default** until you explicitly enable them.

### To Enable a Provider:

**Step 1: Configure in Self-Hosted Supabase Vault**

Connect to your VPS and use the deployment script to set the provider secrets. This is the source of truth.

```bash
# Example for Google
./scripts/deploy.sh set-secret GOTRUE_EXTERNAL_GOOGLE_ENABLED true
./scripts/deploy.sh set-secret GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID your-client-id
./scripts/deploy.sh set-secret GOTRUE_EXTERNAL_GOOGLE_SECRET your-client-secret
```

**Step 2: Seed via GitHub Secrets (Optional/Initial Only)**

If you want to automate the initial configuration, add the secrets to GitHub Actions. On the next deploy, the script will automatically promote these to the Supabase Vault if they are missing.

**Step 3: Enable in Web App**

Add to GitHub Secrets (for production) or `.env.local` (for development):
```bash
NEXT_PUBLIC_OAUTH_GOOGLE_ENABLED=true
```

**Step 4: Redeploy Web App**
- Push to trigger deployment. The VPS will automatically pull the new configuration from the Vault and restart the services.

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

1. **Get Credentials from Apple Developer Portal:**
   - Go to: [Identifiers List](https://developer.apple.com/account/resources/identifiers/list)
   - **Services ID**: Create or select your Services ID (e.g., `club.foodshare.web`).
   - **Team ID**: Your 10-character Team ID (found in [Membership](https://developer.apple.com/account/)).
   - **Key ID**: Create a "Sign in with Apple" key, download the `.p8` file, and note the 10-character Key ID.
   - **Return URLs**: Add `https://api.foodshare.club/auth/v1/callback`

2. **Configure via CI/CD (Recommended):**

   Add these secrets to your GitHub repository. The CI/CD pipeline will automatically inject them into the production environment. This approach uses the private key directly, so Supabase automatically generates and refreshes its own secrets. **No expiration.**

   **GitHub Secrets to Set:**
   - `GOTRUE_EXTERNAL_APPLE_ENABLED`: `true`
   - `GOTRUE_EXTERNAL_APPLE_CLIENT_ID`: `club.foodshare.web` (Your Services ID)
   - `GOTRUE_EXTERNAL_APPLE_TEAM_ID`: your 10-character team ID
   - `GOTRUE_EXTERNAL_APPLE_KEY_ID`: your 10-character key ID
   - `GOTRUE_EXTERNAL_APPLE_PRIVATE_KEY`: The contents of your `.p8` file (including headers)
   - `GOTRUE_EXTERNAL_APPLE_REDIRECT_URI`: `https://api.foodshare.club/auth/v1/callback`

3. **Deploy:**
   Push your changes or trigger the CI/CD pipeline manually. The deployment script will update the `.env.production` on the VPS and restart the auth service.

4. **Testing:**
   - Attempt to sign in with Apple on `https://foodshare.club`.
   - If you see `invalid_client`, verify that the Team ID and Key ID match your Apple Developer portal precisely.

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
