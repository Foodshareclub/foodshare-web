# AI-Powered Content Moderation

## Overview

FoodShare uses AI-powered content moderation to help administrators review reported posts efficiently. The system uses xAI's Grok model to analyze reported content and provide structured recommendations.

## Architecture

```
User Report → API Route → Grok AI Analysis → Structured Response → Admin Dashboard
                ↓
        Supabase Vault (API Key)
```

## API Endpoint

**POST** `/api/moderation/analyze`

### Request Body

```typescript
{
  postTitle: string;        // Title of the reported post
  postDescription: string;  // Description/content of the post
  postType: string;         // Type: food, thing, borrow, etc.
  reportReason: string;     // Why the post was reported
  reportDescription: string; // Additional details from reporter
}
```

### Response

```typescript
{
  analysis: {
    summary: string;           // Brief assessment summary
    categories: string[];      // Detected categories (spam, food safety, etc.)
    reasoning: string;         // Detailed reasoning
    suggestedAction: string;   // Recommended action
    riskFactors: string[];     // Identified risks
  };
  severityScore: number;       // 0-100 severity score
  recommendedAction: 'dismiss' | 'warn_user' | 'hide_post' | 'remove_post' | 'ban_user' | 'escalate';
  confidence: number;          // 0-1 confidence level
}
```

## Recommended Actions

| Action | When to Use |
|--------|-------------|
| `dismiss` | Report is unfounded or minor issue |
| `warn_user` | First-time minor violation |
| `hide_post` | Temporarily hide while investigating |
| `remove_post` | Clear violation of guidelines |
| `ban_user` | Repeated or severe violations |
| `escalate` | Complex cases requiring human review |

## Configuration

### API Key Management

The XAI API key is retrieved using a secure fallback pattern:

1. **Environment Variable** (preferred for local dev/Vercel)
   ```bash
   XAI_API_KEY=xai-xxx...
   ```

2. **Supabase Vault** (production fallback)
   - Stored securely in Supabase Vault
   - Retrieved via `get_secrets` RPC function
   - Cached for 5 minutes to reduce vault lookups

### Setting Up Supabase Vault

```sql
-- Store the API key in vault (run once)
SELECT vault.create_secret('XAI_API_KEY', 'xai-your-api-key-here');
```

### Required Database Function

The `get_secrets` RPC function must be available:

```sql
CREATE OR REPLACE FUNCTION get_secrets(secret_names text[])
RETURNS TABLE (name text, value text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT s.name, s.decrypted_secret as value
  FROM vault.decrypted_secrets s
  WHERE s.name = ANY(secret_names);
END;
$$;
```

## Usage Logging

All AI moderation requests are logged to `grok_usage_logs` for monitoring:

```sql
-- View recent usage
SELECT * FROM grok_usage_logs 
ORDER BY created_at DESC 
LIMIT 10;

-- Daily token usage
SELECT 
  DATE(created_at) as date,
  SUM(tokens) as total_tokens,
  COUNT(*) as requests
FROM grok_usage_logs
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## Error Handling

| Status | Meaning |
|--------|---------|
| 200 | Success - analysis returned |
| 400 | Invalid request data |
| 503 | AI service not configured (missing API key) |
| 500 | Analysis failed |

## Security Considerations

- API key never exposed to client
- Vault access requires authenticated server-side request
- Rate limiting recommended for production
- Audit logging for all moderation decisions

## Integration Example

```typescript
// Admin dashboard component
async function analyzeReport(report: Report) {
  const response = await fetch('/api/moderation/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      postTitle: report.post.title,
      postDescription: report.post.description,
      postType: report.post.type,
      reportReason: report.reason,
      reportDescription: report.description,
    }),
  });

  if (!response.ok) {
    throw new Error('Analysis failed');
  }

  return response.json();
}
```

## Related Documentation

- [Admin CRM Guide](./README.md)
- [Security System](../security/README.md)
- [Supabase Vault](https://supabase.com/docs/guides/database/vault)
