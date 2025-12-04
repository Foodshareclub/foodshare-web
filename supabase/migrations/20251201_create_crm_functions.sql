-- ============================================================================
-- CRM Functions Migration
-- ============================================================================
-- This migration creates functions for calculating engagement scores,
-- managing lifecycle stages, and updating customer metrics by leveraging
-- existing infrastructure (profile_stats, forum_user_stats, etc.)
-- ============================================================================

-- ============================================================================
-- 1. Calculate Engagement Score (0-100)
-- ============================================================================
-- Leverages existing profile_stats and forum_user_stats to calculate
-- a comprehensive engagement score
CREATE OR REPLACE FUNCTION calculate_engagement_score(p_profile_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_stats RECORD;
  v_forum_stats RECORD;
  v_days_since_last_activity INTEGER;
BEGIN
  -- Get profile stats
  SELECT * INTO v_stats
  FROM public.profile_stats
  WHERE profile_id = p_profile_id;

  -- Get forum stats if available
  SELECT * INTO v_forum_stats
  FROM public.forum_user_stats
  WHERE user_id = p_profile_id;

  -- Base score from profile activity (max 40 points)
  -- Items shared: 10 points per item (capped at 20 points for 2+ items)
  v_score := v_score + LEAST(COALESCE(v_stats.items_shared, 0) * 10, 20);

  -- Items received: 5 points per item (capped at 10 points for 2+ items)
  v_score := v_score + LEAST(COALESCE(v_stats.items_received, 0) * 5, 10);

  -- Rating: 0-10 points based on average rating (4.0+ = 10 points)
  IF v_stats.rating_average IS NOT NULL AND v_stats.rating_average >= 4.0 THEN
    v_score := v_score + 10;
  ELSIF v_stats.rating_average IS NOT NULL THEN
    v_score := v_score + FLOOR(v_stats.rating_average * 2.5);
  END IF;

  -- Forum engagement (max 30 points)
  IF v_forum_stats IS NOT NULL THEN
    -- Reputation score: up to 10 points (1000+ reputation = 10 points)
    v_score := v_score + LEAST(FLOOR(COALESCE(v_forum_stats.reputation_score, 0) / 100), 10);

    -- Trust level: 0-10 points (5 points per level, max level 4 = 20 points but capped at 10)
    v_score := v_score + LEAST(COALESCE(v_forum_stats.trust_level, 0) * 5, 10);

    -- Time spent: up to 10 points (60+ minutes = 10 points)
    v_score := v_score + LEAST(FLOOR(COALESCE(v_forum_stats.time_spent_minutes, 0) / 6), 10);
  END IF;

  -- Recency bonus/penalty (max 30 points)
  -- Calculate days since last activity
  SELECT GREATEST(
    EXTRACT(EPOCH FROM (now() - COALESCE(
      (SELECT MAX(last_interaction_at) FROM public.crm_customers WHERE profile_id = p_profile_id),
      now()
    )))::INTEGER / 86400,
    0
  ) INTO v_days_since_last_activity;

  -- Recency scoring
  IF v_days_since_last_activity = 0 THEN
    v_score := v_score + 30; -- Active today
  ELSIF v_days_since_last_activity <= 7 THEN
    v_score := v_score + 25; -- Active this week
  ELSIF v_days_since_last_activity <= 30 THEN
    v_score := v_score + 15; -- Active this month
  ELSIF v_days_since_last_activity <= 90 THEN
    v_score := v_score + 5; -- Active in last 3 months
  -- Else: 0 points for inactive users
  END IF;

  -- Cap at 100
  RETURN LEAST(v_score, 100);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. Calculate Churn Risk Score (0-100, higher = more at risk)
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_churn_risk_score(p_profile_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_risk_score INTEGER := 0;
  v_days_since_last_activity INTEGER;
  v_engagement_score INTEGER;
  v_trend_score INTEGER := 0;
  v_stats RECORD;
BEGIN
  -- Get engagement score
  v_engagement_score := calculate_engagement_score(p_profile_id);

  -- Get profile stats
  SELECT * INTO v_stats
  FROM public.profile_stats
  WHERE profile_id = p_profile_id;

  -- Calculate days since last activity
  SELECT GREATEST(
    EXTRACT(EPOCH FROM (now() - COALESCE(
      (SELECT MAX(last_interaction_at) FROM public.crm_customers WHERE profile_id = p_profile_id),
      now()
    )))::INTEGER / 86400,
    0
  ) INTO v_days_since_last_activity;

  -- Inactivity risk (max 50 points)
  IF v_days_since_last_activity > 90 THEN
    v_risk_score := v_risk_score + 50;
  ELSIF v_days_since_last_activity > 60 THEN
    v_risk_score := v_risk_score + 35;
  ELSIF v_days_since_last_activity > 30 THEN
    v_risk_score := v_risk_score + 20;
  ELSIF v_days_since_last_activity > 14 THEN
    v_risk_score := v_risk_score + 10;
  END IF;

  -- Low engagement risk (max 30 points)
  IF v_engagement_score < 20 THEN
    v_risk_score := v_risk_score + 30;
  ELSIF v_engagement_score < 40 THEN
    v_risk_score := v_risk_score + 20;
  ELSIF v_engagement_score < 60 THEN
    v_risk_score := v_risk_score + 10;
  END IF;

  -- Low activity risk (max 20 points)
  IF COALESCE(v_stats.items_shared, 0) = 0 AND COALESCE(v_stats.items_received, 0) = 0 THEN
    v_risk_score := v_risk_score + 20; -- Never transacted
  ELSIF COALESCE(v_stats.items_shared, 0) + COALESCE(v_stats.items_received, 0) < 2 THEN
    v_risk_score := v_risk_score + 10; -- Very low activity
  END IF;

  -- Cap at 100
  RETURN LEAST(v_risk_score, 100);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. Calculate Lifetime Value (LTV) Score
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_ltv_score(p_profile_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_ltv_score DECIMAL := 0.00;
  v_stats RECORD;
  v_forum_stats RECORD;
  v_days_active INTEGER;
BEGIN
  -- Get profile stats
  SELECT * INTO v_stats
  FROM public.profile_stats
  WHERE profile_id = p_profile_id;

  -- Get forum stats
  SELECT * INTO v_forum_stats
  FROM public.forum_user_stats
  WHERE user_id = p_profile_id;

  -- Calculate days active (from crm_customers.first_interaction_at)
  SELECT GREATEST(
    EXTRACT(EPOCH FROM (now() - COALESCE(first_interaction_at, now())))::INTEGER / 86400,
    1
  ) INTO v_days_active
  FROM public.crm_customers
  WHERE profile_id = p_profile_id;

  -- Food sharing value (items shared * 10 points each)
  v_ltv_score := v_ltv_score + (COALESCE(v_stats.items_shared, 0) * 10.00);

  -- Community value (items received * 5 points each)
  v_ltv_score := v_ltv_score + (COALESCE(v_stats.items_received, 0) * 5.00);

  -- Quality bonus (high rating multiplier)
  IF v_stats.rating_average IS NOT NULL AND v_stats.rating_average >= 4.5 THEN
    v_ltv_score := v_ltv_score * 1.5; -- 50% bonus for excellent rating
  ELSIF v_stats.rating_average IS NOT NULL AND v_stats.rating_average >= 4.0 THEN
    v_ltv_score := v_ltv_score * 1.25; -- 25% bonus for good rating
  END IF;

  -- Forum contribution value
  IF v_forum_stats IS NOT NULL THEN
    v_ltv_score := v_ltv_score + (COALESCE(v_forum_stats.reputation_score, 0) * 0.1);
  END IF;

  -- Longevity bonus (active for longer = higher value)
  IF v_days_active > 365 THEN
    v_ltv_score := v_ltv_score * 1.3; -- 30% bonus for 1+ year
  ELSIF v_days_active > 180 THEN
    v_ltv_score := v_ltv_score * 1.2; -- 20% bonus for 6+ months
  ELSIF v_days_active > 90 THEN
    v_ltv_score := v_ltv_score * 1.1; -- 10% bonus for 3+ months
  END IF;

  RETURN ROUND(v_ltv_score, 2);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. Determine Lifecycle Stage
-- ============================================================================
CREATE OR REPLACE FUNCTION determine_lifecycle_stage(p_profile_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_engagement_score INTEGER;
  v_churn_risk_score INTEGER;
  v_total_interactions INTEGER;
  v_days_since_last_activity INTEGER;
  v_stats RECORD;
BEGIN
  -- Get metrics
  v_engagement_score := calculate_engagement_score(p_profile_id);
  v_churn_risk_score := calculate_churn_risk_score(p_profile_id);

  -- Get stats
  SELECT * INTO v_stats
  FROM public.profile_stats
  WHERE profile_id = p_profile_id;

  -- Get total interactions
  SELECT total_interactions INTO v_total_interactions
  FROM public.crm_customers
  WHERE profile_id = p_profile_id;

  -- Calculate days since last activity
  SELECT GREATEST(
    EXTRACT(EPOCH FROM (now() - COALESCE(
      (SELECT MAX(last_interaction_at) FROM public.crm_customers WHERE profile_id = p_profile_id),
      now()
    )))::INTEGER / 86400,
    0
  ) INTO v_days_since_last_activity;

  -- Lifecycle stage logic
  -- Churned: No activity in 90+ days OR very high churn risk
  IF v_days_since_last_activity > 90 OR v_churn_risk_score >= 80 THEN
    RETURN 'churned';

  -- At Risk: Low engagement or moderate churn risk
  ELSIF v_engagement_score < 30 OR v_churn_risk_score >= 50 THEN
    RETURN 'at_risk';

  -- Champion: High engagement, active, low churn risk
  ELSIF v_engagement_score >= 70 AND v_churn_risk_score < 20 AND COALESCE(v_total_interactions, 0) >= 10 THEN
    RETURN 'champion';

  -- Active: Moderate to high engagement
  ELSIF v_engagement_score >= 40 AND COALESCE(v_total_interactions, 0) >= 3 THEN
    RETURN 'active';

  -- Lead: New or low activity users
  ELSE
    RETURN 'lead';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. Determine Customer Type (donor/receiver/both)
-- ============================================================================
CREATE OR REPLACE FUNCTION determine_customer_type(p_profile_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_stats RECORD;
BEGIN
  -- Get profile stats
  SELECT * INTO v_stats
  FROM public.profile_stats
  WHERE profile_id = p_profile_id;

  IF COALESCE(v_stats.items_shared, 0) > 0 AND COALESCE(v_stats.items_received, 0) > 0 THEN
    RETURN 'both';
  ELSIF COALESCE(v_stats.items_received, 0) > 0 THEN
    RETURN 'receiver';
  ELSE
    RETURN 'donor'; -- Default to donor (includes new users)
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. Update CRM Customer Metrics (Main Update Function)
-- ============================================================================
-- This function should be called periodically to refresh CRM metrics
CREATE OR REPLACE FUNCTION update_crm_customer_metrics(p_profile_id UUID)
RETURNS VOID AS $$
DECLARE
  v_engagement_score INTEGER;
  v_churn_risk_score INTEGER;
  v_ltv_score DECIMAL;
  v_lifecycle_stage TEXT;
  v_customer_type TEXT;
BEGIN
  -- Calculate all metrics
  v_engagement_score := calculate_engagement_score(p_profile_id);
  v_churn_risk_score := calculate_churn_risk_score(p_profile_id);
  v_ltv_score := calculate_ltv_score(p_profile_id);
  v_lifecycle_stage := determine_lifecycle_stage(p_profile_id);
  v_customer_type := determine_customer_type(p_profile_id);

  -- Update the customer record
  UPDATE public.crm_customers
  SET
    engagement_score = v_engagement_score,
    churn_risk_score = v_churn_risk_score,
    ltv_score = v_ltv_score,
    lifecycle_stage = v_lifecycle_stage,
    customer_type = v_customer_type,
    updated_at = now()
  WHERE profile_id = p_profile_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. Batch Update All CRM Customer Metrics
-- ============================================================================
-- Useful for nightly jobs to refresh all customer metrics
CREATE OR REPLACE FUNCTION update_all_crm_customer_metrics()
RETURNS TABLE(updated_count INTEGER) AS $$
DECLARE
  v_customer RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_customer IN SELECT profile_id FROM public.crm_customers WHERE is_archived = false
  LOOP
    PERFORM update_crm_customer_metrics(v_customer.profile_id);
    v_count := v_count + 1;
  END LOOP;

  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. Track Customer Interaction (Update total_interactions and last_interaction_at)
-- ============================================================================
-- This should be called whenever a customer performs any action
CREATE OR REPLACE FUNCTION track_customer_interaction(
  p_profile_id UUID,
  p_interaction_type TEXT DEFAULT 'general'
)
RETURNS VOID AS $$
BEGIN
  -- Update interaction tracking
  UPDATE public.crm_customers
  SET
    total_interactions = total_interactions + 1,
    last_interaction_at = now(),
    updated_at = now()
  WHERE profile_id = p_profile_id;

  -- If first interaction, set first_interaction_at
  UPDATE public.crm_customers
  SET first_interaction_at = now()
  WHERE profile_id = p_profile_id
    AND first_interaction_at IS NULL;

  -- Recalculate metrics after significant interactions
  IF p_interaction_type IN ('post_created', 'item_shared', 'item_received', 'forum_post', 'review_given') THEN
    PERFORM update_crm_customer_metrics(p_profile_id);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. Archive Customer
-- ============================================================================
CREATE OR REPLACE FUNCTION archive_crm_customer(
  p_customer_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.crm_customers
  SET
    is_archived = true,
    archived_at = now(),
    archived_reason = p_reason,
    updated_at = now()
  WHERE id = p_customer_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 10. Unarchive Customer
-- ============================================================================
CREATE OR REPLACE FUNCTION unarchive_crm_customer(p_customer_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.crm_customers
  SET
    is_archived = false,
    archived_at = NULL,
    archived_reason = NULL,
    updated_at = now()
  WHERE id = p_customer_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 11. Get Customer Summary (for admin dashboard)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_crm_customer_summary(p_customer_id UUID)
RETURNS TABLE(
  customer_id UUID,
  profile_id UUID,
  full_name TEXT,
  email TEXT,
  customer_type TEXT,
  engagement_score INTEGER,
  lifecycle_stage TEXT,
  churn_risk_score INTEGER,
  ltv_score DECIMAL,
  total_interactions INTEGER,
  items_shared INTEGER,
  items_received INTEGER,
  forum_reputation INTEGER,
  tags TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS customer_id,
    c.profile_id,
    p.full_name,
    p.email,
    c.customer_type,
    c.engagement_score,
    c.lifecycle_stage,
    c.churn_risk_score,
    c.ltv_score,
    c.total_interactions,
    COALESCE(ps.items_shared, 0) AS items_shared,
    COALESCE(ps.items_received, 0) AS items_received,
    COALESCE(fs.reputation_score, 0) AS forum_reputation,
    ARRAY(
      SELECT t.name
      FROM public.crm_customer_tag_assignments ta
      JOIN public.crm_customer_tags t ON t.id = ta.tag_id
      WHERE ta.customer_id = c.id
    ) AS tags
  FROM public.crm_customers c
  JOIN public.profiles p ON p.id = c.profile_id
  LEFT JOIN public.profile_stats ps ON ps.profile_id = c.profile_id
  LEFT JOIN public.forum_user_stats fs ON fs.user_id = c.profile_id
  WHERE c.id = p_customer_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON FUNCTION calculate_engagement_score IS 'Calculates 0-100 engagement score from profile_stats and forum_user_stats';
COMMENT ON FUNCTION calculate_churn_risk_score IS 'Calculates 0-100 churn risk (higher = more at risk)';
COMMENT ON FUNCTION calculate_ltv_score IS 'Calculates lifetime value score based on contributions and engagement';
COMMENT ON FUNCTION determine_lifecycle_stage IS 'Determines customer lifecycle stage: lead → active → champion → at_risk → churned';
COMMENT ON FUNCTION update_crm_customer_metrics IS 'Updates all CRM metrics for a single customer';
COMMENT ON FUNCTION update_all_crm_customer_metrics IS 'Batch updates all customer metrics (use in cron jobs)';
COMMENT ON FUNCTION track_customer_interaction IS 'Tracks customer interactions and updates metrics';
