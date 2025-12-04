-- ============================================================================
-- CRM Data Backfill Migration
-- ============================================================================
-- This migration populates the crm_customers table from existing profiles
-- and calculates initial metrics using existing data from profile_stats,
-- forum_user_stats, and interaction tables.
--
-- This migration is IDEMPOTENT - safe to re-run without duplicates
-- ============================================================================

-- ============================================================================
-- 1. Backfill CRM Customers from Existing Profiles
-- ============================================================================
DO $$
DECLARE
  v_profile RECORD;
  v_customer_type TEXT;
  v_engagement_score INTEGER;
  v_churn_risk_score INTEGER;
  v_ltv_score DECIMAL;
  v_lifecycle_stage TEXT;
  v_first_interaction TIMESTAMPTZ;
  v_last_interaction TIMESTAMPTZ;
  v_total_interactions INTEGER;
  v_customer_id UUID;
BEGIN
  -- Loop through all profiles
  FOR v_profile IN SELECT id, created_at FROM public.profiles ORDER BY created_at
  LOOP
    -- Skip if customer already exists
    IF EXISTS (SELECT 1 FROM public.crm_customers WHERE profile_id = v_profile.id) THEN
      CONTINUE;
    END IF;

    -- Determine customer type from profile_stats
    v_customer_type := determine_customer_type(v_profile.id);

    -- Calculate first interaction date from various sources
    SELECT LEAST(
      COALESCE((SELECT MIN(created_at) FROM public.posts WHERE creator_id = v_profile.id), now()),
      COALESCE((SELECT MIN(created_at) FROM public.rooms WHERE user1_id = v_profile.id OR user2_id = v_profile.id), now()),
      COALESCE((SELECT MIN(created_at) FROM public.forum_posts WHERE author_id = v_profile.id), now()),
      COALESCE((SELECT MIN(created_at) FROM public.reviews WHERE reviewer_id = v_profile.id), now()),
      COALESCE(v_profile.created_at, now())
    ) INTO v_first_interaction;

    -- Calculate last interaction date from various sources
    SELECT GREATEST(
      COALESCE((SELECT MAX(updated_at) FROM public.posts WHERE creator_id = v_profile.id), '1970-01-01'::TIMESTAMPTZ),
      COALESCE((SELECT MAX(updated_at) FROM public.rooms WHERE user1_id = v_profile.id OR user2_id = v_profile.id), '1970-01-01'::TIMESTAMPTZ),
      COALESCE((SELECT MAX(created_at) FROM public.forum_posts WHERE author_id = v_profile.id), '1970-01-01'::TIMESTAMPTZ),
      COALESCE((SELECT MAX(created_at) FROM public.reviews WHERE reviewer_id = v_profile.id), '1970-01-01'::TIMESTAMPTZ),
      COALESCE((SELECT MAX(updated_at) FROM public.messages WHERE sender_id = v_profile.id), '1970-01-01'::TIMESTAMPTZ)
    ) INTO v_last_interaction;

    -- If no interactions found, use profile creation date
    IF v_last_interaction = '1970-01-01'::TIMESTAMPTZ THEN
      v_last_interaction := v_profile.created_at;
    END IF;

    -- Calculate total interactions from various sources
    SELECT
      COALESCE((SELECT COUNT(*) FROM public.posts WHERE creator_id = v_profile.id), 0) +
      COALESCE((SELECT COUNT(*) FROM public.messages WHERE sender_id = v_profile.id), 0) +
      COALESCE((SELECT COUNT(*) FROM public.forum_posts WHERE author_id = v_profile.id), 0) +
      COALESCE((SELECT COUNT(*) FROM public.reviews WHERE reviewer_id = v_profile.id), 0) +
      COALESCE((SELECT COUNT(*) FROM public.likes WHERE user_id = v_profile.id), 0)
    INTO v_total_interactions;

    -- Insert customer record with initial data
    INSERT INTO public.crm_customers (
      profile_id,
      customer_type,
      engagement_score,
      lifecycle_stage,
      churn_risk_score,
      ltv_score,
      total_interactions,
      first_interaction_at,
      last_interaction_at,
      preferred_contact_method,
      is_archived,
      created_at,
      updated_at
    )
    VALUES (
      v_profile.id,
      v_customer_type,
      0, -- Will be calculated next
      'lead', -- Will be calculated next
      0, -- Will be calculated next
      0.00, -- Will be calculated next
      v_total_interactions,
      v_first_interaction,
      v_last_interaction,
      'email',
      false,
      v_profile.created_at,
      now()
    )
    RETURNING id INTO v_customer_id;

    -- Calculate and update metrics
    v_engagement_score := calculate_engagement_score(v_profile.id);
    v_churn_risk_score := calculate_churn_risk_score(v_profile.id);
    v_ltv_score := calculate_ltv_score(v_profile.id);
    v_lifecycle_stage := determine_lifecycle_stage(v_profile.id);

    UPDATE public.crm_customers
    SET
      engagement_score = v_engagement_score,
      churn_risk_score = v_churn_risk_score,
      ltv_score = v_ltv_score,
      lifecycle_stage = v_lifecycle_stage
    WHERE id = v_customer_id;

  END LOOP;

  RAISE NOTICE 'CRM customer backfill completed successfully';
END;
$$;

-- ============================================================================
-- 2. Auto-Assign System Tags Based on Customer Data
-- ============================================================================
DO $$
DECLARE
  v_customer RECORD;
  v_tag_id UUID;
BEGIN
  FOR v_customer IN
    SELECT
      c.id,
      c.profile_id,
      c.customer_type,
      c.engagement_score,
      c.lifecycle_stage,
      c.churn_risk_score,
      c.ltv_score,
      ps.items_shared,
      ps.items_received,
      fs.reputation_score,
      EXTRACT(EPOCH FROM (now() - c.created_at))::INTEGER / 86400 AS days_since_created
    FROM public.crm_customers c
    LEFT JOIN public.profile_stats ps ON ps.profile_id = c.profile_id
    LEFT JOIN public.forum_user_stats fs ON fs.user_id = c.profile_id
  LOOP
    -- Assign "High Value" tag
    IF v_customer.ltv_score >= 100 THEN
      SELECT id INTO v_tag_id FROM public.crm_customer_tags WHERE name = 'High Value';
      INSERT INTO public.crm_customer_tag_assignments (customer_id, tag_id)
      VALUES (v_customer.id, v_tag_id)
      ON CONFLICT (customer_id, tag_id) DO NOTHING;
    END IF;

    -- Assign "At Risk" tag
    IF v_customer.churn_risk_score >= 50 THEN
      SELECT id INTO v_tag_id FROM public.crm_customer_tags WHERE name = 'At Risk';
      INSERT INTO public.crm_customer_tag_assignments (customer_id, tag_id)
      VALUES (v_customer.id, v_tag_id)
      ON CONFLICT (customer_id, tag_id) DO NOTHING;
    END IF;

    -- Assign "New User" tag (less than 30 days)
    IF v_customer.days_since_created < 30 THEN
      SELECT id INTO v_tag_id FROM public.crm_customer_tags WHERE name = 'New User';
      INSERT INTO public.crm_customer_tag_assignments (customer_id, tag_id)
      VALUES (v_customer.id, v_tag_id)
      ON CONFLICT (customer_id, tag_id) DO NOTHING;
    END IF;

    -- Assign "Active" tag
    IF v_customer.engagement_score >= 60 THEN
      SELECT id INTO v_tag_id FROM public.crm_customer_tags WHERE name = 'Active';
      INSERT INTO public.crm_customer_tag_assignments (customer_id, tag_id)
      VALUES (v_customer.id, v_tag_id)
      ON CONFLICT (customer_id, tag_id) DO NOTHING;
    END IF;

    -- Assign "Inactive" tag
    IF v_customer.engagement_score < 30 AND v_customer.days_since_created > 30 THEN
      SELECT id INTO v_tag_id FROM public.crm_customer_tags WHERE name = 'Inactive';
      INSERT INTO public.crm_customer_tag_assignments (customer_id, tag_id)
      VALUES (v_customer.id, v_tag_id)
      ON CONFLICT (customer_id, tag_id) DO NOTHING;
    END IF;

    -- Assign "VIP" tag (champions with high LTV)
    IF v_customer.lifecycle_stage = 'champion' AND v_customer.ltv_score >= 200 THEN
      SELECT id INTO v_tag_id FROM public.crm_customer_tags WHERE name = 'VIP';
      INSERT INTO public.crm_customer_tag_assignments (customer_id, tag_id)
      VALUES (v_customer.id, v_tag_id)
      ON CONFLICT (customer_id, tag_id) DO NOTHING;
    END IF;

    -- Assign "Donor" tag
    IF v_customer.customer_type IN ('donor', 'both') THEN
      SELECT id INTO v_tag_id FROM public.crm_customer_tags WHERE name = 'Donor';
      INSERT INTO public.crm_customer_tag_assignments (customer_id, tag_id)
      VALUES (v_customer.id, v_tag_id)
      ON CONFLICT (customer_id, tag_id) DO NOTHING;
    END IF;

    -- Assign "Receiver" tag
    IF v_customer.customer_type IN ('receiver', 'both') THEN
      SELECT id INTO v_tag_id FROM public.crm_customer_tags WHERE name = 'Receiver';
      INSERT INTO public.crm_customer_tag_assignments (customer_id, tag_id)
      VALUES (v_customer.id, v_tag_id)
      ON CONFLICT (customer_id, tag_id) DO NOTHING;
    END IF;

    -- Assign "Power User" tag (high forum reputation)
    IF COALESCE(v_customer.reputation_score, 0) >= 500 THEN
      SELECT id INTO v_tag_id FROM public.crm_customer_tags WHERE name = 'Power User';
      INSERT INTO public.crm_customer_tag_assignments (customer_id, tag_id)
      VALUES (v_customer.id, v_tag_id)
      ON CONFLICT (customer_id, tag_id) DO NOTHING;
    END IF;

  END LOOP;

  RAISE NOTICE 'System tags auto-assigned successfully';
END;
$$;

-- ============================================================================
-- 3. Create Triggers for Automatic CRM Customer Creation
-- ============================================================================
-- When a new profile is created, automatically create a CRM customer record

CREATE OR REPLACE FUNCTION create_crm_customer_for_new_profile()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_type TEXT;
BEGIN
  -- Determine initial customer type (default to 'donor')
  v_customer_type := 'donor';

  -- Create CRM customer record
  INSERT INTO public.crm_customers (
    profile_id,
    customer_type,
    engagement_score,
    lifecycle_stage,
    churn_risk_score,
    ltv_score,
    total_interactions,
    first_interaction_at,
    last_interaction_at,
    preferred_contact_method,
    is_archived,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    v_customer_type,
    0,
    'lead',
    0,
    0.00,
    0,
    NEW.created_at,
    NEW.created_at,
    'email',
    false,
    NEW.created_at,
    now()
  );

  -- Auto-assign "New User" tag
  INSERT INTO public.crm_customer_tag_assignments (customer_id, tag_id)
  SELECT
    c.id,
    t.id
  FROM public.crm_customers c
  CROSS JOIN public.crm_customer_tags t
  WHERE c.profile_id = NEW.id
    AND t.name = 'New User'
  ON CONFLICT (customer_id, tag_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_crm_customer_on_profile_insert
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_crm_customer_for_new_profile();

-- ============================================================================
-- 4. Create Triggers for Automatic Interaction Tracking
-- ============================================================================

-- Track post creation as interaction
CREATE OR REPLACE FUNCTION track_post_creation_interaction()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM track_customer_interaction(NEW.creator_id, 'post_created');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_post_creation
  AFTER INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION track_post_creation_interaction();

-- Track forum post as interaction
CREATE OR REPLACE FUNCTION track_forum_post_interaction()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM track_customer_interaction(NEW.author_id, 'forum_post');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_forum_post
  AFTER INSERT ON public.forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION track_forum_post_interaction();

-- Track review as interaction
CREATE OR REPLACE FUNCTION track_review_interaction()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM track_customer_interaction(NEW.reviewer_id, 'review_given');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_review
  AFTER INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION track_review_interaction();

-- Track message as interaction
CREATE OR REPLACE FUNCTION track_message_interaction()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM track_customer_interaction(NEW.sender_id, 'message_sent');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION track_message_interaction();

-- ============================================================================
-- 5. Verification Queries (for manual testing)
-- ============================================================================

-- These are commented out but can be used to verify the backfill

-- Check total customers created
-- SELECT COUNT(*) AS total_customers FROM public.crm_customers;

-- Check lifecycle stage distribution
-- SELECT lifecycle_stage, COUNT(*) AS count
-- FROM public.crm_customers
-- GROUP BY lifecycle_stage
-- ORDER BY count DESC;

-- Check engagement score distribution
-- SELECT
--   CASE
--     WHEN engagement_score >= 80 THEN 'Very High (80-100)'
--     WHEN engagement_score >= 60 THEN 'High (60-79)'
--     WHEN engagement_score >= 40 THEN 'Medium (40-59)'
--     WHEN engagement_score >= 20 THEN 'Low (20-39)'
--     ELSE 'Very Low (0-19)'
--   END AS engagement_level,
--   COUNT(*) AS count
-- FROM public.crm_customers
-- GROUP BY engagement_level
-- ORDER BY MIN(engagement_score) DESC;

-- Check customer type distribution
-- SELECT customer_type, COUNT(*) AS count
-- FROM public.crm_customers
-- GROUP BY customer_type;

-- Check tag assignments
-- SELECT t.name, COUNT(*) AS customer_count
-- FROM public.crm_customer_tags t
-- LEFT JOIN public.crm_customer_tag_assignments ta ON ta.tag_id = t.id
-- GROUP BY t.id, t.name
-- ORDER BY customer_count DESC;

-- Top 10 customers by LTV
-- SELECT
--   c.id,
--   p.full_name,
--   p.email,
--   c.ltv_score,
--   c.engagement_score,
--   c.lifecycle_stage
-- FROM public.crm_customers c
-- JOIN public.profiles p ON p.id = c.profile_id
-- ORDER BY c.ltv_score DESC
-- LIMIT 10;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TRIGGER create_crm_customer_on_profile_insert ON public.profiles IS 'Automatically creates CRM customer record when new profile is created';
COMMENT ON TRIGGER track_post_creation ON public.posts IS 'Tracks post creation as customer interaction';
COMMENT ON TRIGGER track_forum_post ON public.forum_posts IS 'Tracks forum posts as customer interaction';
COMMENT ON TRIGGER track_review ON public.reviews IS 'Tracks reviews as customer interaction';
COMMENT ON TRIGGER track_message ON public.messages IS 'Tracks messages as customer interaction';
