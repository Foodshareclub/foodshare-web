# FoodShare Telegram Bot - Interface Guide

## Beautiful Message Examples

### Welcome Message (New User)

```
╔══════════════════════════════╗
║   👋 Welcome to FoodShare!   ║
╚══════════════════════════════╝

🎉 Hi Friend!

──────────────────────────────

Your account has been created and linked to your Telegram.

ℹ️ To unlock all features, verify your email:

🍎 Share surplus food with your community
🔍 Find free food near you
📍 Browse food on an interactive map
📊 Track your environmental impact
🏆 Earn badges and achievements

──────────────────────────────

📧 Send your email address to get started

ℹ️ Example: user@example.com

──────────────────────────────

💡 Already have an account? We'll link it automatically!
```

### Verification Code Sent

```
╔══════════════════════════════╗
║   📧 Verification Code Sent  ║
╚══════════════════════════════╝

✅ Check Your Inbox!

──────────────────────────────

A 6-digit verification code has been sent to:

📧 user@example.com

──────────────────────────────

🔑 Enter the code to verify your email and unlock all features.

🍎 Share food with community
🔍 Find food near you
📊 Track your impact

──────────────────────────────

⏱️ Code expires in 15 minutes
🔄 Type /resend if you didn't receive it
```

### Account Linked Successfully

```
╔══════════════════════════════╗
║   🎉 Account Linked!         ║
╚══════════════════════════════╝

✅ Successfully Linked!

──────────────────────────────

Your Telegram account is now linked to your existing FoodShare profile.

📧 Email: user@example.com

──────────────────────────────

✨ What's Preserved:

🍎 All your previous food posts
💬 All your messages and conversations
📊 Your impact statistics
🏆 Your badges and achievements

──────────────────────────────

🚀 Ready to go! Use the menu below to get started.
```

### Email Verified

```
╔══════════════════════════════╗
║   ✅ Email Verified!         ║
╚══════════════════════════════╝

🎉 Welcome to FoodShare!

──────────────────────────────

Your email has been verified successfully.

📧 Email: user@example.com

──────────────────────────────

✨ You can now:

🍎 Share surplus food with /share
🔍 Find free food with /find
📍 Browse nearby food with /nearby
📊 Track your impact with /impact

──────────────────────────────

🚀 Let's get started! Use the menu below.
```

### Error: Invalid Email

```
╔══════════════════════════════╗
║   ❌ Invalid Email Format    ║
╚══════════════════════════════╝

Please send a valid email address.

ℹ️ Example: user@example.com
```

### Error: Invalid Code

```
╔══════════════════════════════╗
║   ❌ Invalid or Expired Code ║
╚══════════════════════════════╝

The verification code is incorrect or has expired.

⏱️ Codes expire after 15 minutes
🔑 Check your email for the correct code
🔄 Type /resend to get a new code
```

### Error: Email Already Registered

```
╔══════════════════════════════╗
║   ❌ Email Already Registered║
╚══════════════════════════════╝

This email is already registered to another account.

📧 Use a different email address
💬 Contact support if this is your email

ℹ️ Type /cancel to start over
```

### Share Food - Step 1

```
📸 Share Food - Step 1/3

████░░░░░░░░ 33%

─────────────────────────

🖼️ Send me a photo of the food you want to share

💡 Tip: Good photos attract more interest!

─────────────────────────

ℹ️ Type /cancel to stop
```

### Share Food - Step 2

```
✅ Photo Received!

📝 Share Food - Step 2/3

████████░░░░ 67%

─────────────────────────

Tell people about your food:

🍎 What is it?
ℹ️ How much?
⏱️ When to pick up?

─────────────────────────

Example:

Fresh Apples from My Garden

About 2kg of organic apples.
Perfect for eating or baking.
Available for pickup today until 6pm.

─────────────────────────
```

### Main Menu (Verified User)

```
╔══════════════════════════════╗
║   👋 Welcome Back, John!     ║
╚══════════════════════════════╝

✨ What would you like to do today?

──────────────────────────────

🍎 Share surplus food with your community
🔍 Find free food near you
📍 Browse food on an interactive map
📊 Track your environmental impact
🏆 Compete on the leaderboard

──────────────────────────────

🌍 Together we're making a difference!

💡 Use the buttons below for quick actions

[🍎 Share Food] [🔍 Find Food]
[📍 Nearby Food] [👤 My Profile]
[📊 My Impact] [🏆 Leaderboard]
[🔗 Open Web App]
```

## Emoji Reference

### Status & Feedback

- ✅ SUCCESS
- ❌ ERROR
- ⚠️ WARNING
- ℹ️ INFO
- 🎉 CELEBRATE
- ✨ SPARKLES

### Actions

- 🍎 FOOD
- 🔍 SEARCH
- 📍 NEARBY
- 👤 USER
- 📧 EMAIL
- 🔑 KEY
- 🔄 REFRESH
- 💬 SUPPORT/CHAT

### Progress

- 📸 CAMERA
- 📝 TEXT
- ⏱️ CLOCK
- 📊 STATS
- 🏆 TROPHY
- 🚀 ROCKET
- 💡 LIGHT_BULB

### Environmental

- 🌍 EARTH
- ♻️ RECYCLE
- 🌱 LEAF

## Message Components

### Boxed Header

```typescript
msg.boxedHeader(`${emoji.WAVE} Welcome!`);
```

### Divider

```typescript
msg.divider("─", 30);
```

### Bullet List

```typescript
msg.bulletList([
  { emoji: emoji.FOOD, text: "Share food" },
  { emoji: emoji.SEARCH, text: "Find food" },
]);
```

### Progress Bar

```typescript
msg.progressBar(2, 3, 12); // 67%
```

### Success Message

```typescript
msg.successMessage("Title", "Description", ["Feature 1", "Feature 2"]);
```

### Error Message

```typescript
msg.errorMessage("Title", "Description");
```

### Info Message

```typescript
msg.infoMessage("Title", "Description");
```

## Inline Keyboards

### Main Menu

```typescript
{
  inline_keyboard: [
    [
      { text: "🍎 Share Food", callback_data: "action_share" },
      { text: "🔍 Find Food", callback_data: "action_find" },
    ],
    [
      { text: "📍 Nearby Food", callback_data: "action_nearby" },
      { text: "👤 My Profile", callback_data: "action_profile" },
    ],
    [
      { text: "📊 My Impact", callback_data: "action_stats" },
      { text: "🏆 Leaderboard", callback_data: "action_leaderboard" },
    ],
    [{ text: "🔗 Open Web App", url: APP_URL }],
  ];
}
```

### Profile Menu

```typescript
{
  inline_keyboard: [
    [
      { text: "📍 Update Location", callback_data: "profile_location" },
      { text: "🧭 Set Radius", callback_data: "profile_radius" },
    ],
    [{ text: "🔗 Open Profile", url: `${APP_URL}/profile/${profile.id}` }],
  ];
}
```

## Best Practices

### ✅ Do

- Use boxed headers for important messages
- Add dividers between sections
- Use emoji bullet lists for features
- Include helpful examples
- Provide clear error messages
- Show progress bars for multi-step flows
- Add actionable hints (e.g., "Type /resend")

### ❌ Don't

- Overuse emojis (1-2 per line max)
- Create walls of text
- Use technical jargon
- Skip error handling
- Forget to show next steps
- Use inconsistent formatting

## Accessibility

- Clear, concise language
- Logical information hierarchy
- Consistent emoji usage
- Helpful error messages
- Multiple ways to accomplish tasks
- Keyboard-friendly navigation

---

**Version:** 2.0
**Last Updated:** 2024-11-30
