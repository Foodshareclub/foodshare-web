# Telegram Bot Scripts

Scripts for managing and testing the FoodShare Telegram Bot.

## 📋 Available Scripts

### verify-deployment.sh

Verifies that the Telegram bot is deployed and functioning correctly.

```bash
./scripts/telegram-bot/verify-deployment.sh
```

**What it checks:**

- Function is deployed
- Webhook is configured
- Bot responds to test messages
- Database connectivity
- Environment variables

**Usage:**

```bash
# Run verification
./scripts/telegram-bot/verify-deployment.sh

# With verbose output
DEBUG=1 ./scripts/telegram-bot/verify-deployment.sh
```

## 🚀 Common Tasks

### Deploy Bot

```bash
# Deploy the function
supabase functions deploy telegram-bot-foodshare --no-verify-jwt

# Verify deployment
./scripts/telegram-bot/verify-deployment.sh
```

### Set Webhook

```bash
# Set webhook URL
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"https://${PROJECT_REF}.supabase.co/functions/v1/telegram-bot-foodshare\"}"
```

### Check Webhook Status

```bash
# Get webhook info
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
```

### View Logs

```bash
# Stream function logs
supabase functions logs telegram-bot-foodshare --follow

# View recent logs
supabase functions logs telegram-bot-foodshare --limit 100
```

### Test Bot Locally

```bash
# Serve function locally
supabase functions serve telegram-bot-foodshare --no-verify-jwt

# In another terminal, send test webhook
curl -X POST http://localhost:54321/functions/v1/telegram-bot-foodshare \
  -H "Content-Type: application/json" \
  -d @test-webhook.json
```

## 🔧 Environment Setup

Required environment variables in `.env`:

```bash
TELEGRAM_BOT_TOKEN=your_bot_token_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 📖 Documentation

For detailed documentation, see:

- **Bot Documentation**: `docs/telegram-bot/`
- **Bot Code**: `supabase/functions/telegram-bot-foodshare/`

## 🐛 Troubleshooting

### Bot Not Responding

1. Check webhook is set: `curl https://api.telegram.org/bot${TOKEN}/getWebhookInfo`
2. Verify function is deployed: `supabase functions list`
3. Check logs: `supabase functions logs telegram-bot-foodshare`

### Deployment Fails

1. Ensure Supabase CLI is up to date: `supabase --version`
2. Check you're linked to project: `supabase projects list`
3. Verify environment variables are set

### Webhook Errors

1. Ensure URL is HTTPS
2. Check SSL certificate is valid
3. Verify bot token is correct

## 🔍 Testing

### Manual Testing

1. Send `/start` to your bot
2. Try posting food with `/post`
3. Search for food with `/search`
4. Check translations work in different languages

### Automated Testing

```bash
# Run verification script
./scripts/telegram-bot/verify-deployment.sh
```

## 📊 Monitoring

### Check Bot Health

```bash
# Get bot info
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe"

# Check webhook status
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
```

### View Metrics

```bash
# Function invocations
supabase functions inspect telegram-bot-foodshare

# Error rate
supabase functions logs telegram-bot-foodshare | grep ERROR
```

---

**Last Updated**: November 30, 2024
