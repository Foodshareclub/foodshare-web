-- ============================================================================
-- CRM Campaign System - Core Tables
-- ============================================================================
-- This migration creates the foundation for the CRM campaign system,
-- including campaigns, segments, templates, and analytics tracking.
--
-- This migration is IDEMPOTENT - safe to re-run without duplicates
-- ============================================================================

-- ============================================================================
-- 1. Campaign Definitions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.crm_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(name) >= 3),
  description TEXT,

  -- Campaign type
  campaign_type TEXT NOT NULL
    CHECK (campaign_type IN ('email', 'push', 'in_app', 'multi_channel')),

  -- Status
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled')),

  -- Audience targeting (JSONB for flexibility)
  audience_filters JSONB NOT NULL DEFAULT '{}',
  estimated_audience_size INTEGER DEFAULT 0 CHECK (estimated_audience_size >= 0),

  -- Email content
  email_template_id UUID,  -- FK added later
  email_subject TEXT,
  email_content JSONB,     -- { html: string, text: string, variables: {...} }

  -- Push notification content
  push_title TEXT,
  push_body TEXT,
  push_image_url TEXT,
  push_deep_link TEXT,

  -- Scheduling
  trigger_type TEXT NOT NULL
    CHECK (trigger_type IN ('immediate', 'scheduled', 'lifecycle_event', 'score_threshold')),
  scheduled_at TIMESTAMPTZ,
  lifecycle_trigger TEXT,  -- 'lead_to_active', 'active_to_champion', etc.
  score_threshold JSONB,   -- { "field": "engagement_score", "operator": ">=", "value": 80 }

  -- Execution settings
  send_frequency TEXT
    CHECK (send_frequency IN ('once', 'daily', 'weekly', 'monthly')),
  max_sends_per_user INTEGER DEFAULT 1 CHECK (max_sends_per_user > 0),
  respect_quiet_hours BOOLEAN DEFAULT true,
  respect_digest_preferences BOOLEAN DEFAULT true,

  -- Performance tracking
  total_sent INTEGER DEFAULT 0 CHECK (total_sent >= 0),
  total_delivered INTEGER DEFAULT 0 CHECK (total_delivered >= 0),
  total_opened INTEGER DEFAULT 0 CHECK (total_opened >= 0),
  total_clicked INTEGER DEFAULT 0 CHECK (total_clicked >= 0),
  total_converted INTEGER DEFAULT 0 CHECK (total_converted >= 0),
  total_bounced INTEGER DEFAULT 0 CHECK (total_bounced >= 0),
  total_failed INTEGER DEFAULT 0 CHECK (total_failed >= 0),

  -- A/B Testing
  is_ab_test BOOLEAN DEFAULT false,
  ab_test_variants JSONB,  -- [{ id: "A", subject: "...", weight: 50 }, ...]
  ab_test_winner TEXT,     -- Variant ID of winner

  -- Metadata
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_email_content CHECK (
    (campaign_type != 'email') OR
    (email_subject IS NOT NULL AND email_content IS NOT NULL)
  ),
  CONSTRAINT valid_push_content CHECK (
    (campaign_type NOT IN ('push', 'multi_channel')) OR
    (push_title IS NOT NULL AND push_body IS NOT NULL)
  ),
  CONSTRAINT valid_scheduled_time CHECK (
    (trigger_type != 'scheduled') OR
    (scheduled_at IS NOT NULL AND scheduled_at > created_at)
  )
);

-- ============================================================================
-- 2. Campaign Send Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.crm_campaign_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.crm_campaigns(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE,

  -- Delivery tracking
  status TEXT DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'delivered', 'opened', 'clicked', 'converted', 'bounced', 'failed')),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,

  -- Error tracking
  error_message TEXT,
  retry_count INTEGER DEFAULT 0 CHECK (retry_count >= 0),

  -- Links to other systems
  email_queue_id UUID,      -- Link to email_queue for email campaigns
  notification_id BIGINT,   -- Link to notifications table for push campaigns

  -- A/B test variant
  variant_id TEXT,

  -- Engagement metadata
  user_agent TEXT,
  ip_address INET,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  UNIQUE(campaign_id, customer_id, variant_id)
);

-- ============================================================================
-- 3. Campaign Goals
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.crm_campaign_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.crm_campaigns(id) ON DELETE CASCADE,

  goal_type TEXT NOT NULL
    CHECK (goal_type IN ('engagement', 'conversion', 'retention', 'revenue')),
  goal_metric TEXT NOT NULL,  -- 'open_rate', 'click_rate', 'items_shared', 'ltv_increase'
  target_value DECIMAL NOT NULL CHECK (target_value >= 0),
  current_value DECIMAL DEFAULT 0 CHECK (current_value >= 0),

  is_met BOOLEAN GENERATED ALWAYS AS (current_value >= target_value) STORED,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 4. Customer Segments
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.crm_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE CHECK (length(name) >= 3),
  description TEXT,

  -- Filter definition (JSONB for flexibility)
  filters JSONB NOT NULL DEFAULT '{}',

  -- Dynamic vs Static
  is_dynamic BOOLEAN DEFAULT true,

  -- Performance
  last_calculated_at TIMESTAMPTZ,
  member_count INTEGER DEFAULT 0 CHECK (member_count >= 0),

  -- Usage tracking
  times_used INTEGER DEFAULT 0 CHECK (times_used >= 0),
  last_used_at TIMESTAMPTZ,

  -- Metadata
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Index on name for quick lookups
  CONSTRAINT valid_filters CHECK (jsonb_typeof(filters) = 'object')
);

-- ============================================================================
-- 5. Segment Membership
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.crm_segment_members (
  segment_id UUID NOT NULL REFERENCES public.crm_segments(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT now(),

  PRIMARY KEY (segment_id, customer_id)
);

-- ============================================================================
-- 6. Email Templates
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.crm_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE CHECK (length(name) >= 3),
  category TEXT NOT NULL,

  -- Content
  subject_template TEXT NOT NULL,
  html_template TEXT NOT NULL,
  text_template TEXT,

  -- Variables used (for validation)
  required_variables JSONB DEFAULT '[]',
  optional_variables JSONB DEFAULT '[]',

  -- Preview
  preview_image_url TEXT,
  preview_text TEXT,

  -- Performance tracking
  times_used INTEGER DEFAULT 0 CHECK (times_used >= 0),
  avg_open_rate DECIMAL,
  avg_click_rate DECIMAL,

  -- System vs Custom
  is_system_template BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_required_variables CHECK (jsonb_typeof(required_variables) = 'array'),
  CONSTRAINT valid_optional_variables CHECK (jsonb_typeof(optional_variables) = 'array')
);

-- ============================================================================
-- 7. Campaign Analytics (Daily Snapshots)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.crm_campaign_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.crm_campaigns(id) ON DELETE CASCADE,

  -- Snapshot date
  snapshot_date DATE NOT NULL,

  -- Volume metrics
  sent_count INTEGER DEFAULT 0 CHECK (sent_count >= 0),
  delivered_count INTEGER DEFAULT 0 CHECK (delivered_count >= 0),
  bounced_count INTEGER DEFAULT 0 CHECK (bounced_count >= 0),
  failed_count INTEGER DEFAULT 0 CHECK (failed_count >= 0),

  -- Engagement metrics
  opened_count INTEGER DEFAULT 0 CHECK (opened_count >= 0),
  clicked_count INTEGER DEFAULT 0 CHECK (clicked_count >= 0),
  converted_count INTEGER DEFAULT 0 CHECK (converted_count >= 0),
  unsubscribed_count INTEGER DEFAULT 0 CHECK (unsubscribed_count >= 0),

  -- Calculated rates (stored for query performance)
  delivery_rate DECIMAL GENERATED ALWAYS AS (
    CASE
      WHEN sent_count > 0 THEN (delivered_count::DECIMAL / sent_count) * 100
      ELSE 0
    END
  ) STORED,

  open_rate DECIMAL GENERATED ALWAYS AS (
    CASE
      WHEN delivered_count > 0 THEN (opened_count::DECIMAL / delivered_count) * 100
      ELSE 0
    END
  ) STORED,

  click_rate DECIMAL GENERATED ALWAYS AS (
    CASE
      WHEN opened_count > 0 THEN (clicked_count::DECIMAL / opened_count) * 100
      ELSE 0
    END
  ) STORED,

  conversion_rate DECIMAL GENERATED ALWAYS AS (
    CASE
      WHEN clicked_count > 0 THEN (converted_count::DECIMAL / clicked_count) * 100
      ELSE 0
    END
  ) STORED,

  -- Business impact
  ltv_change_total DECIMAL DEFAULT 0,
  items_shared_increase INTEGER DEFAULT 0,
  engagement_score_avg_change DECIMAL DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(campaign_id, snapshot_date)
);

-- ============================================================================
-- 8. Workflow Templates (for automation)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.crm_workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE CHECK (length(name) >= 3),
  description TEXT,

  -- Trigger configuration
  trigger_type TEXT NOT NULL
    CHECK (trigger_type IN ('lifecycle_change', 'score_threshold', 'inactivity', 'milestone', 'manual')),
  trigger_config JSONB NOT NULL,

  -- Workflow steps (array of campaign references with delays)
  steps JSONB NOT NULL,  -- [{ delay_days: 0, campaign_id: "uuid", ... }, ...]

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Performance
  times_executed INTEGER DEFAULT 0 CHECK (times_executed >= 0),
  success_rate DECIMAL,

  -- Metadata
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT valid_trigger_config CHECK (jsonb_typeof(trigger_config) = 'object'),
  CONSTRAINT valid_steps CHECK (jsonb_typeof(steps) = 'array')
);

-- ============================================================================
-- 9. Workflow Executions (active workflow instances)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.crm_workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.crm_workflow_templates(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE,

  current_step INTEGER DEFAULT 0 CHECK (current_step >= 0),
  status TEXT DEFAULT 'running'
    CHECK (status IN ('running', 'paused', 'completed', 'failed', 'cancelled')),

  started_at TIMESTAMPTZ DEFAULT now(),
  paused_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,

  error_message TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  UNIQUE(workflow_id, customer_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Campaign indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.crm_campaigns(status) WHERE status != 'completed';
CREATE INDEX IF NOT EXISTS idx_campaigns_created_by ON public.crm_campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled_at ON public.crm_campaigns(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_campaigns_trigger_type ON public.crm_campaigns(trigger_type);

-- Campaign send indexes
CREATE INDEX IF NOT EXISTS idx_campaign_sends_campaign_id ON public.crm_campaign_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_customer_id ON public.crm_campaign_sends(customer_id);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_status ON public.crm_campaign_sends(status);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_sent_at ON public.crm_campaign_sends(sent_at);

-- Segment indexes
CREATE INDEX IF NOT EXISTS idx_segments_created_by ON public.crm_segments(created_by);
CREATE INDEX IF NOT EXISTS idx_segments_is_dynamic ON public.crm_segments(is_dynamic);
CREATE INDEX IF NOT EXISTS idx_segment_members_customer_id ON public.crm_segment_members(customer_id);

-- Template indexes
CREATE INDEX IF NOT EXISTS idx_templates_category ON public.crm_email_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_is_active ON public.crm_email_templates(is_active) WHERE is_active = true;

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_analytics_campaign_date ON public.crm_campaign_analytics(campaign_id, snapshot_date);

-- Workflow indexes
CREATE INDEX IF NOT EXISTS idx_workflow_templates_is_active ON public.crm_workflow_templates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_customer ON public.crm_workflow_executions(workflow_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON public.crm_workflow_executions(status) WHERE status = 'running';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.crm_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_campaign_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_campaign_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_segment_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_campaign_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_workflow_executions ENABLE ROW LEVEL SECURITY;

-- Admin-only policies for all campaign tables
CREATE POLICY "Admins can manage campaigns"
  ON public.crm_campaigns
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can view campaign sends"
  ON public.crm_campaign_sends
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can manage campaign goals"
  ON public.crm_campaign_goals
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can manage segments"
  ON public.crm_segments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can view segment members"
  ON public.crm_segment_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can manage templates"
  ON public.crm_email_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can view analytics"
  ON public.crm_campaign_analytics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can manage workflows"
  ON public.crm_workflow_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can view workflow executions"
  ON public.crm_workflow_executions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.crm_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_segments_updated_at
  BEFORE UPDATE ON public.crm_segments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON public.crm_email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at
  BEFORE UPDATE ON public.crm_workflow_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.crm_campaigns IS 'Campaign definitions for automated customer engagement';
COMMENT ON TABLE public.crm_campaign_sends IS 'Individual send tracking for campaign performance';
COMMENT ON TABLE public.crm_campaign_goals IS 'Success metrics and targets for campaigns';
COMMENT ON TABLE public.crm_segments IS 'Customer segment definitions for targeting';
COMMENT ON TABLE public.crm_segment_members IS 'Segment membership tracking';
COMMENT ON TABLE public.crm_email_templates IS 'Reusable email templates with variable substitution';
COMMENT ON TABLE public.crm_campaign_analytics IS 'Daily performance snapshots for campaigns';
COMMENT ON TABLE public.crm_workflow_templates IS 'Automated workflow definitions';
COMMENT ON TABLE public.crm_workflow_executions IS 'Active workflow instances for customers';

COMMENT ON COLUMN public.crm_campaigns.audience_filters IS 'JSONB filter definition for segment targeting';
COMMENT ON COLUMN public.crm_campaigns.trigger_type IS 'How the campaign is triggered: immediate, scheduled, lifecycle_event, or score_threshold';
COMMENT ON COLUMN public.crm_campaigns.is_ab_test IS 'Whether this campaign has A/B test variants';
COMMENT ON COLUMN public.crm_segments.is_dynamic IS 'Whether segment membership is recalculated automatically';
COMMENT ON COLUMN public.crm_workflow_templates.steps IS 'Array of campaign steps with delays: [{ delay_days: 0, campaign_id: "uuid" }]';
