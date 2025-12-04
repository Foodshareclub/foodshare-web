# Complete Telegram Bot Verification Flow

## Overview

This document describes all possible scenarios when a user interacts with the FoodShare Telegram bot and how the system handles each case.

---

## Flow Diagram

```
User sends /start with telegram_id
         ↓
┌────────────────────────────────────┐
│ Check: Profile with telegram_id?  │
└────────────────────────────────────┘
         ↓
    ┌────┴────┐
    │   YES   │ → Return profile → Show main menu (verified user)
    └─────────┘
         ↓
    ┌────┴────┐
    │   NO    │ → Create auth user + profile
    └─────────┘
         ↓
Ask user for email
         ↓
User enters email
         ↓
┌────────────────────────────────────┐
│ Validate email format              │
└────────────────────────────────────┘
         ↓
    ┌────┴────┐
    │  VALID  │
    └─────────┘
         ↓
┌────────────────────────────────────┐
│ Check: Email exists in profiles?   │
└────────────────────────────────────┘
         ↓
    ┌────┴────┐
    │   NO    │ → Send verification code → Normal verification
    └─────────┘
         ↓
    ┌────┴────┐
    │   YES   │
    └─────────┘
         ↓
┌────────────────────────────────────┐
│ Check: Same profile ID?            │
└────────────────────────────────────┘
         ↓
    ┌────┴────┐
    │   YES   │ → Send verification code → Normal verification
    └─────────┘
         ↓
    ┌────┴────┐
    │   NO    │ → Different profile
    └─────────┘
         ↓
┌────────────────────────────────────┐
│ Check: Has different telegram_id?  │
└────────────────────────────────────┘
         ↓
    ┌────┴────┐
    │   YES   │ → Error: "Email already linked to another Telegram"
    └─────────┘
         ↓
    ┌────┴────┐
    │   NO    │
    └─────────┘
         ↓
┌────────────────────────────────────┐
│ Check: Email verified?             │
└────────────────────────────────────┘
         ↓
    ┌────┴────┐
    │   NO    │ → Error: "Email not verified, verify on web first"
    └─────────┘
         ↓
    ┌────┴────┐
    │   YES   │
    └─────────┘
         ↓
┌────────────────────────────────────┐
│ Check: Has telegram_id?            │
└────────────────────────────────────┘
         ↓
    ┌────┴────┐
    │   NO    │ → Send code → Link account (preserve data)
    └─────────┘
         ↓
    ┌────┴────┐
    │   YES   │ → Send code → Sign in (link this Telegram)
    └─────────┘
```

---

## Detailed Scenarios

### Scenario 1: New User (First Time)

**Conditions:**

- No profile with this telegram_id exists
- Email doesn't exist in database

**Flow:**

1. User sends `/start`
2. System creates auth user with temporary email `telegram_X@foodshare.temp`
3. Profile created via database trigger
4. Profile updated with telegram_id
5. User prompted for email
6. User enters new email
7. Verification code sent
8. User enters code
9. Email verified, full access granted

**Messages:**

- Welcome message with email prompt
- "Verification Code Sent"
- "Email Verified Successfully"

---

### Scenario 2: Returning User (Already Linked)

**Conditions:**

- Profile with this telegram_id exists
- Email already verified

**Flow:**

1. User sends `/start`
2. System finds existing profile
3. Shows main menu immediately

**Messages:**

- "Welcome Back, [Name]!"
- Main menu with all features

---

### Scenario 3: Account Linking (Web User → Telegram)

**Conditions:**

- No profile with this telegram_id
- Email exists, verified, NO telegram_id

**Flow:**

1. User sends `/start`
2. System creates temporary profile
3. User enters existing email
4. System detects verified account without telegram_id
5. Verification code sent to email
6. User enters code
7. Telegram linked to existing account
8. Temporary profile deleted
9. All data preserved

**Messages:**

- "Link Your Account - Existing Account Found!"
- "Account Linked Successfully!"
- Shows preserved data (posts, messages, stats)

---

### Scenario 4: Sign In (Existing Verified Account)

**Conditions:**

- No profile with this telegram_id
- Email exists, verified, HAS telegram_id (different one)

**Flow:**

1. User sends `/start`
2. System creates temporary profile
3. User enters email
4. System detects verified account with different telegram_id
5. Verification code sent to email
6. User enters code
7. Telegram linked to existing account
8. Temporary profile deleted
9. Previous telegram_id replaced

**Messages:**

- "Sign In to Your Account - Account Found!"
- "Account Linked Successfully!"
- Shows preserved data

---

### Scenario 5: Email Already Linked to Another Telegram

**Conditions:**

- No profile with this telegram_id
- Email exists with DIFFERENT telegram_id (not null)

**Flow:**

1. User sends `/start`
2. System creates temporary profile
3. User enters email
4. System detects email linked to another Telegram
5. Error message shown

**Messages:**

- "Email Already Linked"
- "This email is already linked to another Telegram account"
- Suggests using different email or contacting support

---

### Scenario 6: Email Not Verified

**Conditions:**

- No profile with this telegram_id
- Email exists but NOT verified

**Flow:**

1. User sends `/start`
2. System creates temporary profile
3. User enters email
4. System detects unverified email
5. Error message shown

**Messages:**

- "Email Not Verified"
- "This email is registered but not verified yet"
- Suggests verifying on web app first or using different email

---

### Scenario 7: Re-verification (Same User, Same Email)

**Conditions:**

- Profile with telegram_id exists
- User enters same email again

**Flow:**

1. User sends `/start`
2. System finds existing profile
3. User enters their own email
4. System detects same profile
5. Verification code sent
6. User enters code
7. Email re-verified

**Messages:**

- "Verification Code Sent"
- "Email Verified Successfully"

---

## Error Handling

### Invalid Email Format

```
╔══════════════════════════════╗
║   ❌ Invalid Email Format    ║
╚══════════════════════════════╝

Please send a valid email address.

ℹ️ Example: user@example.com
```

### Email Already Linked

```
╔══════════════════════════════╗
║   ❌ Email Already Linked    ║
╚══════════════════════════════╝

This email is already linked to another Telegram account.

📧 Use a different email address
💬 Contact support if you need help

ℹ️ Type /cancel to start over
```

### Email Not Verified

```
╔══════════════════════════════╗
║   ❌ Email Not Verified      ║
╚══════════════════════════════╝

This email is registered but not verified yet.

📧 Use a different email address
🔗 Or verify it on the web app first
💬 Contact support if you need help

ℹ️ Type /cancel to start over
```

---

## State Management

### User States

#### `awaiting_email`

```typescript
{
  action: "awaiting_email",
  data: {
    next_action?: "share_food" // Optional pending action
  }
}
```

#### `awaiting_verification`

```typescript
{
  action: "awaiting_verification",
  data: {
    profile_id: string,
    email: string
  }
}
```

#### `awaiting_verification_link`

```typescript
{
  action: "awaiting_verification_link",
  data: {
    existing_profile_id: string,  // Profile to link to
    temp_profile_id: string,      // Profile to delete
    email: string
  }
}
```

---

## Database Operations

### Profile Creation

1. Create auth user with `telegram_X@foodshare.temp`
2. Profile auto-created via trigger
3. Update profile with telegram_id and user data

### Account Linking

1. Send verification code to existing profile
2. User verifies ownership
3. Update existing profile with telegram_id
4. Delete temporary profile
5. All data preserved (posts, messages, stats)

### Sign In

1. Send verification code to existing profile
2. User verifies ownership
3. Update existing profile with new telegram_id
4. Delete temporary profile
5. Previous telegram_id replaced

---

## Security Features

✅ **6-digit verification codes**
✅ **15-minute expiration**
✅ **Email format validation**
✅ **Ownership verification via email**
✅ **No duplicate telegram_id linking**
✅ **Temporary profile cleanup**
✅ **Secure code storage**

---

## Testing Checklist

- [ ] New user with new email
- [ ] Returning user (already linked)
- [ ] Web user linking Telegram
- [ ] Sign in with existing email
- [ ] Email already linked to another Telegram
- [ ] Email not verified
- [ ] Invalid email format
- [ ] Invalid code format
- [ ] Expired code
- [ ] Code resend
- [ ] Pending action preservation
- [ ] Profile data preservation

---

**Version:** 3.0
**Last Updated:** 2024-12-01
**Status:** ✅ Production Ready
