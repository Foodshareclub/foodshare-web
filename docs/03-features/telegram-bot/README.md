# Telegram Bot Documentation

Documentation for the FoodShare Telegram Bot edge function.

## 📋 Overview

The Telegram Bot allows users to interact with FoodShare through Telegram, enabling them to:

- Post food listings
- Search for available food
- Receive notifications
- Manage their profile
- Use the platform in multiple languages

## 📚 Documentation Files

### Getting Started

- **README.md** - Main bot documentation
- **HOW_TO_POST_FOOD.md** - Guide for posting food via Telegram

### Internationalization (i18n)

- **I18N_GUIDE.md** - Complete i18n implementation guide
- **I18N_QUICK_REFERENCE.md** - Quick reference for translations
- **I18N_COMPLETE.md** - i18n completion report

### Development & Testing

- **TESTING_GUIDE.md** - Testing procedures
- **REFACTORING.md** - Refactoring documentation
- **REFACTOR_SUMMARY.md** - Refactoring summary

### Features & Improvements

- **LOCATION_FEATURE.md** - Location sharing feature
- **IMPROVEMENTS.md** - Planned improvements
- **IMPROVEMENTS_COMPLETE.md** - Completed improvements

### Bug Fixes & Analysis

- **FIXED.md** - Bug fixes log
- **DESKTOP_FIXED.md** - Desktop-specific fixes
- **ANALYSIS_REPORT.md** - Analysis and diagnostics

## 🚀 Quick Start

### Deploy the Bot

```bash
# Deploy telegram bot function
supabase functions deploy telegram-bot-foodshare --no-verify-jwt
```

### Test the Bot

```bash
# Run verification script
./scripts/telegram-bot/verify-deployment.sh
```

### Set Webhook

```bash
# Set Telegram webhook
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://<project-ref>.supabase.co/functions/v1/telegram-bot-foodshare"}'
```

## 🔧 Configuration

The bot requires these environment variables:

- `TELEGRAM_BOT_TOKEN` - Your Telegram bot token
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

## 📖 Related Resources

- **Code**: `supabase/functions/telegram-bot-foodshare/`
- **Scripts**: `scripts/telegram-bot/`
- **Locales**: `supabase/functions/telegram-bot-foodshare/locales/`

## 🌍 Supported Languages

- English (en)
- Czech (cs)
- French (fr)
- Russian (ru)

## 🔍 Troubleshooting

1. **Bot not responding**: Check webhook is set correctly
2. **Translation issues**: Verify locale files are compiled
3. **Database errors**: Check Supabase connection and RLS policies

For detailed troubleshooting, see TESTING_GUIDE.md

---

**Last Updated**: November 30, 2024
