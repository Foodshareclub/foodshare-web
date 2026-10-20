-- Email System Monitoring Dashboard
-- Run these queries to monitor your email system health

-- ============================================
-- 1. PROVIDER QUOTA STATUS (TODAY)
-- ============================================
SELECT
  provider,
  emails_sent,
  daily_limit,
  (daily_limit - emails_sent) as remaining,
  ROUND((emails_sent::NUMERIC / daily_limit) * 100, 2) as usage_percentage,
  CASE
    WHEN emails_sent >= daily_limit THEN '🔴 EXHAUSTED'
    WHEN emails_sent >= (daily_limit * 0.8) THEN '🟡 WARNING'
    ELSE '🟢 OK'
  END as status
FROM email_provider_quota
WHERE date = CURRENT_DATE
ORDER BY provider;

-- ============================================
-- 2. EMAIL QUEUE STATUS
-- ============================================
SELECT
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest_email,
  MAX(created_at) as newest_email,
  AVG(attempts) as avg_attempts
FROM email_queue
GROUP BY status
ORDER BY
  CASE status
    WHEN 'queued' THEN 1
    WHEN 'processing' THEN 2
    WHEN 'failed' THEN 3
    WHEN 'completed' THEN 4
  END;

-- ============================================
-- 3. RECENT EMAIL ACTIVITY (LAST 24 HOURS)
-- ============================================
SELECT
  email_type,
  provider,
  status,
  COUNT(*) as count
FROM email_logs
WHERE sent_at > NOW() - INTERVAL '24 hours'
GROUP BY email_type, provider, status
ORDER BY email_type, provider;

-- ============================================
-- 4. FAILED EMAILS REQUIRING ATTENTION
-- ============================================
SELECT
  id,
  recipient_email,
  email_type,
  template_name,
  attempts,
  max_attempts,
  last_error,
  created_at,
  next_retry_at
FROM email_queue
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 20;

-- ============================================
-- 5. EMAILS WAITING FOR RETRY
-- ============================================
SELECT
  id,
  recipient_email,
  email_type,
  attempts,
  next_retry_at,
  EXTRACT(EPOCH FROM (next_retry_at - NOW())) / 60 as minutes_until_retry,
  last_error
FROM email_queue
WHERE status = 'queued'
  AND next_retry_at > NOW()
ORDER BY next_retry_at ASC
LIMIT 20;

-- ============================================
-- 6. EMAIL DELIVERY SUCCESS RATE (LAST 7 DAYS)
-- ============================================
SELECT
  DATE(sent_at) as date,
  COUNT(*) as total_sent,
  SUM(CASE WHEN status IN ('sent', 'delivered') THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN status IN ('failed', 'bounced') THEN 1 ELSE 0 END) as failed,
  ROUND(
    (SUM(CASE WHEN status IN ('sent', 'delivered') THEN 1 ELSE 0 END)::NUMERIC / COUNT(*)) * 100,
    2
  ) as success_rate_percentage
FROM email_logs
WHERE sent_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(sent_at)
ORDER BY date DESC;

-- ============================================
-- 7. PROVIDER PERFORMANCE COMPARISON
-- ============================================
SELECT
  provider,
  COUNT(*) as emails_sent,
  SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
  ROUND(
    (SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END)::NUMERIC / COUNT(*)) * 100,
    2
  ) as success_rate,
  AVG(
    EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (PARTITION BY provider ORDER BY created_at)))
  ) / 60 as avg_minutes_between_sends
FROM email_logs
WHERE sent_at > NOW() - INTERVAL '7 days'
GROUP BY provider
ORDER BY emails_sent DESC;

-- ============================================
-- 8. EMAIL TYPE BREAKDOWN
-- ============================================
SELECT
  email_type,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
  ROUND(AVG(EXTRACT(EPOCH FROM (created_at - sent_at))), 2) as avg_processing_seconds
FROM email_logs
WHERE sent_at > NOW() - INTERVAL '24 hours'
GROUP BY email_type
ORDER BY total DESC;

-- ============================================
-- 9. TOP RECIPIENTS (LAST 7 DAYS)
-- ============================================
SELECT
  recipient_email,
  COUNT(*) as emails_received,
  SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as delivered,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
FROM email_logs
WHERE sent_at > NOW() - INTERVAL '7 days'
GROUP BY recipient_email
ORDER BY emails_received DESC
LIMIT 10;

-- ============================================
-- 10. QUOTA USAGE TREND (LAST 7 DAYS)
-- ============================================
SELECT
  date,
  provider,
  emails_sent,
  daily_limit,
  ROUND((emails_sent::NUMERIC / daily_limit) * 100, 2) as usage_percentage
FROM email_provider_quota
WHERE date > CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC, provider;

-- ============================================
-- 11. ALERTS: ISSUES REQUIRING ATTENTION
-- ============================================
-- Check for quota exhaustion
SELECT
  '🔴 QUOTA EXHAUSTED' as alert_type,
  provider as details,
  'Provider has reached daily limit' as message
FROM email_provider_quota
WHERE date = CURRENT_DATE
  AND emails_sent >= daily_limit

UNION ALL

-- Check for high failure rate
SELECT
  '🟡 HIGH FAILURE RATE' as alert_type,
  email_type as details,
  'More than 20% of emails failing' as message
FROM (
  SELECT
    email_type,
    COUNT(*) as total,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
  FROM email_logs
  WHERE sent_at > NOW() - INTERVAL '1 hour'
  GROUP BY email_type
) subq
WHERE failed::NUMERIC / total > 0.2
  AND total > 10

UNION ALL

-- Check for stuck queue items
SELECT
  '⚠️ STUCK QUEUE ITEMS' as alert_type,
  COUNT(*)::TEXT || ' emails' as details,
  'Emails queued for more than 2 hours' as message
FROM email_queue
WHERE status = 'queued'
  AND created_at < NOW() - INTERVAL '2 hours'
HAVING COUNT(*) > 0

UNION ALL

-- Check for old failed items
SELECT
  '⚠️ OLD FAILED ITEMS' as alert_type,
  COUNT(*)::TEXT || ' emails' as details,
  'Failed emails older than 24 hours' as message
FROM email_queue
WHERE status = 'failed'
  AND created_at < NOW() - INTERVAL '24 hours'
HAVING COUNT(*) > 0;

-- ============================================
-- 12. CLEANUP RECOMMENDATIONS
-- ============================================
SELECT
  'Cleanup Recommendation' as category,
  CASE
    WHEN (SELECT COUNT(*) FROM email_queue WHERE status = 'completed' AND created_at < NOW() - INTERVAL '30 days') > 0
    THEN 'Run: SELECT cleanup_old_queue_items(); -- Found ' || (SELECT COUNT(*) FROM email_queue WHERE status = 'completed' AND created_at < NOW() - INTERVAL '30 days')::TEXT || ' old completed items'
    ELSE 'No cleanup needed - queue is healthy'
  END as recommendation;
