# Telegram Bot User Verification Improvements

## Overview

This document describes the robust user creation and verification system implemented for the FoodShare Telegram bot.

## Key Improvements

### 1. **Immediate Profile Creation** ✅

**Problem:** Users could interact with the bot without having a profile in the database.

**Solution:** Every user interaction now triggers `getOrCreateProfile()` which:

- Checks if a profile exists with the Telegram ID
- If not found, **immediately creates** a new profile with:
  - `telegram_id`: The user's Telegram ID
  - `first_name`: From Telegram
  - `nickname`: From Telegram username
  - `email`: null (to be filled later)
  - `email_verified`: false

**Benefits:**

- Users can browse food immediately without verification
- Profile exists from first interaction
- Clean separation between profile creation and email verification

### 2. **Smart Email Linking** 🔗

**Problem:** Existing FoodShare users with verified emails couldn't link their Telegram account.

**Solution:** When a user enters an email, the system now:

#### Case A: New Email (doesn't exist in database)

- Generates verification code
- Sends email with code
- User verifies → email is marked as verified
- User can now post food

#### Case B: Email Exists with Verified Account (no Telegram linked)

- Detects existing verified profile
- Sends verification code to that email
- User verifies → **Telegram ID is linked to existing profile**
- **Temporary profile is deleted** (cleanup)
- All existing posts, messages preserved

#### Case C: Email Already Taken (has Telegram linked)

- Shows error message
- Asks user to use different email or contact support

### 3. **Dual Verification Flows**

The system now supports two distinct verification flows:

#### Flow 1: New User Email Verification

**State:** `awaiting_verification`

```
User starts bot → Profile created with telegram_id
↓
User enters email → Verification code sent
↓
User enters code → Email verified
↓
User can post food
```

#### Flow 2: Link to Existing Verified Account

**State:** `awaiting_verification_link`

```
User starts bot → Temporary profile created with telegram_id
↓
User enters email (already verified in system)
↓
System detects existing verified profile → Verification code sent
↓
User enters code → telegram_id added to existing profile
↓
Temporary profile deleted → User linked to existing account
```

### 4. **Consistent Profile Checks** 🛡️

**Problem:** Data manipulation operations didn't always check if user profile exists.

**Solution:** All operations now use `getOrCreateProfile()`:

- `/start` - Creates/retrieves profile
- `/share` - Verifies profile exists before allowing food posting
- `/profile` - Always has a profile to display
- `/nearby` - Gets user location from guaranteed profile
- Message tracking - Profile exists for statistics

### 5. **State Management**

The bot uses persistent user states stored in the `telegram_user_states` table:

- `awaiting_email` - Waiting for user to type email
- `awaiting_verification` - Waiting for verification code (new user)
- `awaiting_verification_link` - Waiting for verification code (linking)
- `sharing_food` - Multi-step food sharing process

States persist across bot restarts and include:

- `action`: Current action type
- `data`: Context data (profile IDs, pending actions)
- `step`: Current step in multi-step flows

## API Flow Examples

### Example 1: New User Journey

```
1. User: /start
   Bot: Creates profile immediately
        Shows welcome + "Send email to verify"
        State: awaiting_email

2. User: john@example.com
   Bot: Email doesn't exist → Sends verification code
        State: awaiting_verification

3. User: 123456
   Bot: Code valid → Marks email as verified
        Shows success message
        State: null

4. User: /share
   Bot: Profile verified → Allows sharing
```

### Example 2: Existing User Linking

```
1. User: /start (has verified email jane@foodshare.com)
   Bot: Creates temporary profile
        Shows welcome + "Send email to verify"
        State: awaiting_email

2. User: jane@foodshare.com
   Bot: Email exists & verified & no telegram_id
        Sends code to existing profile
        State: awaiting_verification_link
        Data: { existing_profile_id, temp_profile_id }

3. User: 654321
   Bot: Code valid → Links telegram_id to existing profile
        Deletes temporary profile
        Preserves all posts/messages
        Shows "Account Linked!" message
        State: null

4. User: /share
   Bot: Full access with all existing data
```

## Database Schema Requirements

### Profiles Table

```sql
profiles (
  id UUID PRIMARY KEY,
  telegram_id BIGINT UNIQUE,
  email TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  first_name TEXT,
  nickname TEXT,
  verification_code TEXT,
  verification_code_expires_at TIMESTAMPTZ,
  latitude NUMERIC,
  longitude NUMERIC,
  created_time TIMESTAMPTZ DEFAULT NOW()
)
```

### User States Table

```sql
telegram_user_states (
  user_id BIGINT PRIMARY KEY,
  state JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
)
```

## Security Considerations

1. **Verification Codes:**
   - 6-digit random codes
   - 15-minute expiration
   - Cleared after successful verification

2. **Profile Integrity:**
   - Only one telegram_id per profile
   - Only one telegram_id per email
   - Temporary profiles deleted after linking

3. **Email Privacy:**
   - Emails only shown to profile owner
   - Verification emails clearly indicate source

## Commands Reference

| Command    | Description                    | Requires Verification   |
| ---------- | ------------------------------ | ----------------------- |
| `/start`   | Initialize bot, create profile | No                      |
| `/share`   | Share food                     | Yes                     |
| `/find`    | Search food                    | No                      |
| `/nearby`  | Food near you                  | No (but needs location) |
| `/profile` | View profile                   | No                      |
| `/impact`  | Your impact stats              | No                      |
| `/resend`  | Resend verification code       | Email entered           |
| `/cancel`  | Cancel current action          | No                      |
| `/help`    | Show help                      | No                      |

## Error Handling

The system handles:

- Invalid email formats
- Expired codes
- Duplicate emails
- Missing profiles
- Email sending failures
- Network timeouts

All errors provide clear user feedback and don't crash the bot.

## Testing Checklist

- [ ] New user can start bot and create profile
- [ ] New user can verify email
- [ ] Existing user can link Telegram to verified email
- [ ] Duplicate email shows error
- [ ] Expired code shows error
- [ ] /resend works correctly
- [ ] Profile persists across bot restarts
- [ ] All commands work after verification
- [ ] Temporary profiles are deleted after linking
- [ ] Email constraints prevent duplicate telegrams

## Future Enhancements

1. **Phone Number Verification:** Alternative to email
2. **Social Login:** Link Google/Facebook accounts
3. **Two-Factor Auth:** Extra security for actions
4. **Profile Merging:** Merge duplicate profiles
5. **Bulk Operations:** Admin tools for user management

---

**Last Updated:** 2025-11-30  
**Version:** 3.0  
**Author:** FoodShare Team
