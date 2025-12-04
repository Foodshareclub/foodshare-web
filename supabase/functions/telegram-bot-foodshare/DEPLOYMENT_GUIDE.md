# Telegram Bot Deployment Guide

## Recent Improvements

### Enhanced User Experience

1. **Beautiful Interface**
   - Boxed headers with emojis
   - Visual dividers for better readability
   - Progress indicators for multi-step flows
   - Consistent formatting throughout
   - Celebration messages for successful actions

2. **Robust Email Verification**
   - Validates email format with helpful examples
   - Validates code format (6 digits)
   - Clear error messages with actionable solutions
   - Improved resend functionality
   - Better expiration handling

3. **Smart Sign In/Register Flow**
   - Detects existing verified accounts
   - Offers sign-in for registered emails
   - Seamless account linking via email verification
   - Preserves all user data (posts, messages, stats)
   - Automatic temporary profile cleanup

4. **User-Friendly Messages**
   - Clear distinction between sign-in and registration
   - Step-by-step guidance
   - Helpful examples for email and code format
   - Informative error messages
   - Success celebrations with next steps

## Deployment Steps

### 1. Login to Supabase CLI

```bash
npx supabase login
```

### 2. Link to Your Project

```bash
npx supabase link --project-ref ***REMOVED***
```

### 3. Deploy the Function (No JWT Verification)

```bash
npx supabase functions deploy telegram-bot-foodshare --no-verify-jwt
```

### 4. Set Environment Variables

Make sure these secrets are set in your Supabase project:

```bash
# Bot token from @BotFather
npx supabase secrets set BOT_TOKEN=your_telegram_bot_token

# Supabase credentials (should already be set)
npx supabase secrets set SUPABASE_URL=https://***REMOVED***.supabase.co
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App URL
npx supabase secrets set APP_URL=https://foodshare.club
```

### 5. Setup Webhook

After deployment, visit:

```
https://***REMOVED***.supabase.co/functions/v1/telegram-bot-foodshare/setup-webhook
```

### 6. Verify Webhook

Check webhook status:

```
https://***REMOVED***.supabase.co/functions/v1/telegram-bot-foodshare/webhook-info
```

### 7. Health Check

Verify the function is running:

```
https://***REMOVED***.supabase.co/functions/v1/telegram-bot-foodshare/health
```

## Testing the Bot

### Test Flow 1: New User Registration

1. User: `/start`
   - Bot creates profile with telegram_id immediately
   - Shows welcome message asking for email

2. User: `newuser@example.com`
   - Bot sends 6-digit verification code
   - Shows beautiful formatted message

3. User: `123456`
   - Bot verifies email
   - Shows success celebration
   - Displays main menu

### Test Flow 2: Existing User Sign In

1. User: `/start`
   - Bot creates temporary profile
   - Shows welcome message

2. User: `existing@example.com`
   - Bot detects existing verified account
   - Shows "Account Found!" message
   - Sends verification code

3. User: `123456`
   - Bot links telegram_id to existing profile
   - Deletes temporary profile
   - Shows "Successfully Signed In!" message
   - Preserves all data

### Test Flow 3: Invalid Inputs

1. Invalid email format:
   - User: `notanemail`
   - Bot: Shows error with example

2. Invalid code format:
   - User: `abc123`
   - Bot: Shows error explaining 6-digit requirement

3. Expired code:
   - User: (waits 16 minutes)
   - Bot: Shows error with /resend option

4. Wrong code:
   - User: `999999`
   - Bot: Shows error asking to check email

### Test Flow 4: Resend Code

1. User: `/resend`
   - Bot generates new code
   - Sends to email
   - Shows success message

## Key Features

### ✅ Immediate Profile Creation

- Profile created with telegram_id on first `/start`
- No temporary accounts needed
- User can browse immediately

### ✅ Email Verification Required for Actions

- Checked before sharing food
- Checked before profile updates
- Clear messaging about requirements

### ✅ Smart Account Detection

- Detects existing verified accounts
- Offers sign-in flow automatically
- Links telegram_id via email verification

### ✅ Data Preservation

- All posts preserved when linking accounts
- All messages preserved
- All statistics preserved
- Temporary profiles cleaned up

### ✅ Beautiful Interface

- Boxed headers with emojis
- Visual dividers
- Progress bars
- Bullet lists with emojis
- Celebration messages

### ✅ Robust Error Handling

- Email format validation
- Code format validation
- Expiration checking
- Clear error messages
- Helpful suggestions

## Architecture

### Profile Creation Flow

```
User sends /start
    ↓
Check if profile exists with telegram_id
    ↓
NO → Create profile immediately with telegram_id
    ↓
Profile exists but email not verified
    ↓
Ask for email
```

### Sign In Flow

```
User enters existing email
    ↓
System detects verified account
    ↓
Send verification code to email
    ↓
User enters code
    ↓
Link telegram_id to existing profile
    ↓
Delete temporary profile
    ↓
Success!
```

### Registration Flow

```
User enters new email
    ↓
Send verification code
    ↓
User enters code
    ↓
Set email_verified = true
    ↓
telegram_id already linked from creation
    ↓
Success!
```

## Security Features

- ✅ 6-digit verification codes
- ✅ 15-minute expiration
- ✅ Email format validation
- ✅ Code format validation
- ✅ Ownership verification via email
- ✅ No duplicate telegram_id linking
- ✅ Secure code storage
- ✅ Automatic cleanup

## Troubleshooting

### Bot not responding

1. Check webhook status at `/webhook-info`
2. Verify BOT_TOKEN is set correctly
3. Check function logs in Supabase dashboard

### Verification emails not sending

1. Verify Resend edge function is deployed
2. Check RESEND_API_KEY is set
3. Check email logs in Supabase

### Profile not linking

1. Verify email is verified in database
2. Check telegram_id is null on existing profile
3. Check temporary profile is being created

## Database Schema Requirements

Ensure `profiles` table has these columns:

- `id` (uuid, primary key)
- `telegram_id` (bigint, nullable, unique)
- `email` (text, nullable)
- `email_verified` (boolean, default false)
- `first_name` (text, nullable)
- `nickname` (text, nullable)
- `verification_code` (text, nullable)
- `verification_code_expires_at` (timestamptz, nullable)
- `latitude` (numeric, nullable)
- `longitude` (numeric, nullable)

## Success Criteria

✅ User created immediately with telegram_id
✅ Verification checked before data manipulation
✅ Existing users can link via email verification
✅ Beautiful, user-friendly interface
✅ Sign in offered for existing emails
✅ telegram_id associated via verification (sign in)
✅ telegram_id associated via verification (register)
✅ Extremely user-friendly experience

## Version

**Version:** 3.1 (Enhanced UX)
**Date:** 2024-12-01
**Status:** Ready for Deployment
