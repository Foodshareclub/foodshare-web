# Facebook App Configuration

## App Details

| Field | Value |
|-------|-------|
| **Facebook App ID** | `2896639917053743` |
| **Site URL** | `https://foodshare.club/` |
| **iOS Bundle ID** | `com.flutterflow.foodshare` |
| **iOS App Store ID** | `1573242804` |

## Meta Developer Dashboard

Dashboard URL: https://developers.facebook.com/apps/2896639917053743/settings/basic/

### Required Settings

| Field | Value |
|-------|-------|
| Website → Site URL | `https://foodshare.club/` |
| iOS → iPhone Store ID | `1573242804` |
| iOS → iPad Store ID | `1573242804` |
| Android → Package Names | *(Remove - no Android app yet)* |

## Secret Storage

All secrets are stored in **Supabase Vault** (not environment variables):

### Supabase Vault (SQL)

```sql
INSERT INTO vault.secrets (name, secret)
VALUES ('FACEBOOK_APP_ID', '2896639917053743')
ON CONFLICT (name) DO UPDATE SET secret = EXCLUDED.secret;
```

### Edge Function Secrets (CLI)

```bash
supabase secrets set FACEBOOK_APP_ID=2896639917053743
```

## Code Integration

The Facebook App ID is fetched from Supabase Vault at runtime:

1. **`src/lib/email/vault.ts`** - Contains `getFacebookAppId()` function
2. **`src/app/layout.tsx`** - Uses `generateMetadata()` to fetch and set `fb:app_id`

### How It Works

```
Request → layout.tsx generateMetadata()
              ↓
        getFacebookAppId() → Supabase Vault RPC
              ↓
        Returns fb:app_id in HTML meta tag
```

## Verification

Use Meta's Sharing Debugger to verify the `fb:app_id` meta tag:
https://developers.facebook.com/tools/debug/?q=https://foodshare.club/

## Troubleshooting

### App Disabled - URL Compliance

If Facebook disables the app due to Platform Term 7.d:

1. Check Site URL returns HTTP 200
2. Verify iOS App Store ID is valid and public
3. Remove Android Package Names if app not published
4. Save changes in Meta Developer Dashboard

### fb:app_id Not Appearing

1. Check Supabase Vault has `FACEBOOK_APP_ID` secret
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is set (required for Vault access)
3. Check server logs for `[Vault]` messages

---

## Sharing Debugger Output (2024-12-28)

```
URL: https://foodshare.club/
Response Code: 200

Warnings:
- Missing Properties: fb:app_id (FIXED - now fetched from Supabase Vault)

Open Graph Properties:
- og:url: https://foodshare.club/
- og:type: website
- og:title: FoodShare - Share Food, Reduce Waste, Build Community
- og:description: Join the FoodShare community...
- og:image: https://foodshare.club/opengraph-image

Stats: 12 likes, shares and comments
```
