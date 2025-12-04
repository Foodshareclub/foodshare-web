# Edge Functions

## Overview

FoodShare has 17 Deno-based Edge Functions deployed on Supabase.

## Function List

| Function | Purpose | Status |
|----------|---------|--------|
| `telegram-bot-foodshare` | Telegram bot webhook handler | Active |
| `smart-email-route` | Intelligent email routing | Active |
| `search-functions` | Product search API | Active |
| `update-coordinates` | Geocoding service | Active |
| `resize-tinify-upload-image` | Image processing with Tinify | Active |
| `send-notification` | Push notification sender | Active |
| `process-webhook` | Generic webhook processor | Active |
| `generate-sitemap` | Dynamic sitemap generation | Active |
| `ai-chat` | AI-powered chat features | Active |
| `translate-text` | Translation service | Active |
| `validate-address` | Address validation | Active |
| `calculate-distance` | Distance calculations | Active |
| `export-data` | Data export functionality | Active |
| `import-data` | Data import functionality | Active |
| `cleanup-expired` | Cleanup expired listings | Active |
| `stats-aggregator` | Statistics collection | Active |
| `health-check` | Service health monitoring | Active |

## Function Details

### telegram-bot-foodshare

Handles Telegram bot interactions for the FoodShare Telegram mini-app.

**Endpoint**: `POST /functions/v1/telegram-bot-foodshare`

**Features**:
- User authentication via Telegram
- Product notifications
- Chat integration

---

### smart-email-route

Routes emails to appropriate handlers based on content and recipient.

**Endpoint**: `POST /functions/v1/smart-email-route`

**Providers**: Brevo, AWS SES

---

### search-functions

Full-text search with PostGIS proximity filtering.

**Endpoint**: `POST /functions/v1/search-functions`

**Features**:
- Text search with fuzzy matching
- Location-based filtering
- Category filtering

---

### update-coordinates

Geocoding service that converts addresses to coordinates.

**Endpoint**: `POST /functions/v1/update-coordinates`

**Features**:
- Address to lat/lng conversion
- Batch processing support
- Caching for performance

---

### resize-tinify-upload-image

Image processing pipeline using Tinify API.

**Endpoint**: `POST /functions/v1/resize-tinify-upload-image`

**Features**:
- Image compression
- Resize to standard dimensions
- WebP/AVIF conversion
- Upload to Supabase Storage

---

## Deployment

### Deploy a Single Function

```bash
cd supabase/functions
supabase functions deploy function-name
```

### Deploy All Functions

```bash
supabase functions deploy
```

### Local Development

```bash
supabase functions serve function-name
```

## Environment Variables

Edge Functions use secrets stored in Supabase:

```bash
# Set a secret
supabase secrets set SECRET_NAME=value

# List secrets
supabase secrets list
```

**Common Secrets**:
- `TELEGRAM_BOT_TOKEN` - Telegram bot API token
- `TINIFY_API_KEY` - Tinify image compression
- `OPENAI_API_KEY` - OpenAI API access
- `BREVO_API_KEY` - Email service

## Function Structure

Each function follows this structure:

```
supabase/functions/
├── function-name/
│   ├── index.ts      # Main entry point
│   ├── handler.ts    # Request handler
│   └── utils.ts      # Utility functions
└── _shared/          # Shared utilities
    ├── cors.ts
    ├── supabase.ts
    └── types.ts
```

## Invocation

### From Client

```typescript
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { param: 'value' }
});
```

### Via HTTP

```bash
curl -X POST 'https://***REMOVED***.supabase.co/functions/v1/function-name' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"param": "value"}'
```

---

*Total Functions: 17*
*Runtime: Deno*
*Last Updated: December 2024*
