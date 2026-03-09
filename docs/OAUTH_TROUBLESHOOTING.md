# OAuth "Missing OAuth Secret" Error - Deep Investigation

## Error Message
```json
{
  "code": 400,
  "error_code": "validation_failed",
  "msg": "Unsupported provider: missing OAuth secret"
}
```

## Root Cause Analysis

### The Problem
The error occurs because **OAuth providers are configured in two separate places**, and there's a mismatch:

1. **Frontend (Web App)**: Shows OAuth buttons based on `NEXT_PUBLIC_OAUTH_*_ENABLED` environment variables
2. **Backend (Supabase GoTrue)**: Handles actual OAuth authentication using `GOTRUE_EXTERNAL_*` environment variables

When the frontend shows a Google OAuth button but the backend doesn't have the Google OAuth secrets configured in GoTrue, users get the "missing OAuth secret" error.

### Architecture Overview

```
User clicks "Sign in with Google"
         ↓
Web App (foodshare-web)
  - Checks: NEXT_PUBLIC_OAUTH_GOOGLE_ENABLED=true ✓
  - Shows Google button ✓
         ↓
Supabase Client calls: supabase.auth.signInWithOAuth({ provider: 'google' })
         ↓
Supabase GoTrue Service (Self-Hosted)
  - Checks: GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID ✗ (MISSING!)
  - Checks: GOTRUE_EXTERNAL_GOOGLE_SECRET ✗ (MISSING!)
  - Returns: "Unsupported provider: missing OAuth secret" ✗
```

### Why GitHub Secrets Alone Don't Work

The GitHub Secrets we configured (`GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID` and `GOTRUE_EXTERNAL_GOOGLE_SECRET`) are used in the CI/CD pipeline but **do NOT automatically configure the running Supabase instance**.

Here's what happens:

1. **GitHub Secrets** → Used during CI/CD builds and deployments
2. **VPS `.env` file** → Used by the actual running Supabase Docker containers
3. **Supabase Vault** → Alternative secure storage for secrets

The OAuth secrets need to be in the **actual Supabase GoTrue service's environment**, which is configured via:
- The `.env` file on the VPS where Supabase is running
- OR environment variables in the `docker-compose.yml` for the GoTrue service

## Solution: Three-Step Fix

### Step 1: Configure Backend (Supabase GoTrue)

**Option A: Using the Configuration Script (Recommended)**

```bash
cd foodshare-backend
./scripts/configure-oauth.sh google
```

The script will:
1. Prompt for Google Client ID and Secret
2. SSH to the VPS
3. Update the `.env` file with OAuth configuration
4. Restart the Supabase auth service

**Option B: Manual Configuration**

SSH to the VPS and edit the backend `.env` file:

```bash
ssh organic@vps.foodshare.club
cd /home/organic/dev/foodshare-backend

# Edit .env file
nano .env

# Add these lines:
GOTRUE_EXTERNAL_GOOGLE_ENABLED=true
GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID=your-google-client-id-here
GOTRUE_EXTERNAL_GOOGLE_SECRET=your-google-client-secret-here
GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI=https://api.foodshare.club/auth/v1/callback

# Restart auth service
docker compose restart auth
# OR if using standalone GoTrue:
docker restart gotrue
```

### Step 2: Enable in Web App

The web app needs to know the provider is available:

```bash
# Set GitHub Secret for production
gh secret set NEXT_PUBLIC_OAUTH_GOOGLE_ENABLED --body "true" --repo Foodshareclub/foodshare-web

# OR for local development, add to .env.local:
echo "NEXT_PUBLIC_OAUTH_GOOGLE_ENABLED=true" >> .env.local
```

### Step 3: Deploy and Test

```bash
# Trigger web app deployment
cd foodshare-web
git commit --allow-empty -m "chore: enable Google OAuth"
git push

# Wait for deployment to complete, then test:
# Visit https://foodshare.club
# Click "Sign in with Google"
# Should redirect to Google OAuth consent screen
```

## Verification Checklist

Use this checklist to verify OAuth is properly configured:

### Backend (Supabase GoTrue)
- [ ] SSH to VPS: `ssh organic@vps.foodshare.club`
- [ ] Check `.env` file contains:
  ```bash
  cd /home/organic/dev/foodshare-backend
  grep GOTRUE_EXTERNAL_GOOGLE .env
  ```
- [ ] Should see:
  ```
  GOTRUE_EXTERNAL_GOOGLE_ENABLED=true
  GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID=314120228176-...
  GOTRUE_EXTERNAL_GOOGLE_SECRET=GOCSPX-...
  GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI=https://api.foodshare.club/auth/v1/callback
  ```
- [ ] Auth service is running:
  ```bash
  docker ps | grep auth
  ```

### Frontend (Web App)
- [ ] GitHub Secret is set:
  ```bash
  gh secret list --repo Foodshareclub/foodshare-web | grep OAUTH
  ```
- [ ] Should see: `NEXT_PUBLIC_OAUTH_GOOGLE_ENABLED`
- [ ] Latest deployment includes the secret
- [ ] Google button appears on login page

### OAuth Provider (Google Console)
- [ ] Authorized redirect URI includes: `https://api.foodshare.club/auth/v1/callback`
- [ ] OAuth consent screen is configured
- [ ] App is published (not in testing mode)

### Test the Flow
- [ ] Visit https://foodshare.club
- [ ] Click "Sign in with Google"
- [ ] Redirects to Google OAuth consent screen (not error page)
- [ ] After consent, redirects back to app
- [ ] User is logged in successfully

## Common Issues

### Issue 1: "Redirect URI mismatch"
**Cause**: The redirect URI in Google Console doesn't match Supabase's callback URL

**Solution**:
1. Go to Google Cloud Console → Credentials
2. Edit OAuth 2.0 Client ID
3. Add to "Authorized redirect URIs": `https://api.foodshare.club/auth/v1/callback`
4. Save and wait 5 minutes for propagation

### Issue 2: Still getting "missing OAuth secret" after configuration
**Cause**: Auth service wasn't restarted after updating `.env`

**Solution**:
```bash
ssh organic@vps.foodshare.club
cd /home/organic/dev/foodshare-backend
docker compose restart auth
```

### Issue 3: Google button doesn't appear
**Cause**: Web app doesn't have `NEXT_PUBLIC_OAUTH_GOOGLE_ENABLED=true`

**Solution**:
```bash
gh secret set NEXT_PUBLIC_OAUTH_GOOGLE_ENABLED --body "true" --repo Foodshareclub/foodshare-web
# Then trigger deployment
```

### Issue 4: "Invalid client" error from Google
**Cause**: Client ID or Secret is incorrect

**Solution**:
1. Verify credentials in Google Console
2. Copy them again carefully (no extra spaces)
3. Update `.env` on VPS
4. Restart auth service

## Testing OAuth Configuration

### Test Backend Configuration

```bash
# SSH to VPS
ssh organic@vps.foodshare.club

# Check if GoTrue has the secrets
cd /home/organic/dev/foodshare-backend
docker compose exec auth env | grep GOTRUE_EXTERNAL_GOOGLE

# Should output:
# GOTRUE_EXTERNAL_GOOGLE_ENABLED=true
# GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID=314120228176-...
# GOTRUE_EXTERNAL_GOOGLE_SECRET=GOCSPX-...
```

### Test API Endpoint

```bash
# Check Supabase auth settings
curl -s https://api.foodshare.club/auth/v1/settings | jq '.external.google'

# Should return:
# {
#   "enabled": true,
#   "url": "https://accounts.google.com/o/oauth2/v2/auth?..."
# }
```

If `enabled: false` or the endpoint returns an error, the backend configuration is incorrect.

### Test Frontend

```bash
# Check if web app has the environment variable
# (This is set at build time, so check the deployment logs)
gh run view --repo Foodshareclub/foodshare-web --log | grep NEXT_PUBLIC_OAUTH_GOOGLE_ENABLED
```

## Security Best Practices

1. **Never commit OAuth secrets to Git**
   - Use `.env` files (gitignored)
   - Use GitHub Secrets for CI/CD
   - Use Supabase Vault for additional secrets

2. **Rotate secrets regularly**
   - Generate new Client Secret in Google Console
   - Update `.env` on VPS
   - Restart auth service

3. **Restrict OAuth scopes**
   - Only request necessary permissions
   - Review scopes in Google Console

4. **Monitor OAuth usage**
   - Check Supabase logs for failed auth attempts
   - Set up alerts for unusual activity

## Additional OAuth Providers

The same process applies to other providers:

### GitHub OAuth
```bash
GOTRUE_EXTERNAL_GITHUB_ENABLED=true
GOTRUE_EXTERNAL_GITHUB_CLIENT_ID=your-github-client-id
GOTRUE_EXTERNAL_GITHUB_SECRET=your-github-client-secret
GOTRUE_EXTERNAL_GITHUB_REDIRECT_URI=https://api.foodshare.club/auth/v1/callback
```

### Facebook OAuth
```bash
GOTRUE_EXTERNAL_FACEBOOK_ENABLED=true
GOTRUE_EXTERNAL_FACEBOOK_CLIENT_ID=your-facebook-app-id
GOTRUE_EXTERNAL_FACEBOOK_SECRET=your-facebook-app-secret
GOTRUE_EXTERNAL_FACEBOOK_REDIRECT_URI=https://api.foodshare.club/auth/v1/callback
```

### Apple OAuth
```bash
GOTRUE_EXTERNAL_APPLE_ENABLED=true
GOTRUE_EXTERNAL_APPLE_CLIENT_ID=your-apple-services-id
GOTRUE_EXTERNAL_APPLE_SECRET=your-generated-client-secret
GOTRUE_EXTERNAL_APPLE_REDIRECT_URI=https://api.foodshare.club/auth/v1/callback
```

## References

- [Supabase Self-Hosting Auth](https://supabase.com/docs/guides/self-hosting/docker#running-supabase)
- [GoTrue Environment Variables](https://github.com/supabase/gotrue#configuration)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
- [OAuth 2.0 RFC](https://datatracker.ietf.org/doc/html/rfc6749)

## Summary

The "missing OAuth secret" error occurs because:

1. **Frontend shows OAuth button** (controlled by `NEXT_PUBLIC_OAUTH_*_ENABLED`)
2. **Backend doesn't have OAuth secrets** (needs `GOTRUE_EXTERNAL_*` in Supabase's `.env`)

**The fix requires configuring BOTH places:**
- Backend: Add `GOTRUE_EXTERNAL_*` variables to VPS `.env` file
- Frontend: Set `NEXT_PUBLIC_OAUTH_*_ENABLED=true` in GitHub Secrets

GitHub Secrets alone don't work because they're for CI/CD, not for the running Supabase instance.
