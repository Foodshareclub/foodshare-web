-- ============================================================================
-- CRM Core Tables Migration
-- ============================================================================
-- This migration creates the foundational CRM tables that leverage existing
-- infrastructure (profiles, profile_stats, forum_user_stats) to provide
-- unified customer relationship management capabilities.
--
-- Strategy: Hybrid approach - extend existing data rather than duplicate
-- ============================================================================

-- ============================================================================
-- 1. CRM Customers Table (Unified Customer View)
-- ============================================================================
-- Links to existing profiles and aggregates data from multiple sources
CREATE TABLE IF NOT EXISTS public.crm_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Customer Classification
  customer_type TEXT CHECK (customer_type IN ('donor', 'receiver', 'both')) NOT NULL DEFAULT 'donor',

  -- Engagement Metrics (calculated from existing stats)
  engagement_score INTEGER CHECK (engagement_score >= 0 AND engagement_score <= 100) DEFAULT 0,
  lifecycle_stage TEXT CHECK (lifecycle_stage IN ('lead', 'active', 'champion', 'at_risk', 'churned')) DEFAULT 'lead',

  -- Aggregated Interaction Data (from posts, rooms, forum, reviews)
  total_interactions INTEGER DEFAULT 0,
  last_interaction_at TIMESTAMPTZ,
  first_interaction_at TIMESTAMPTZ,

  -- Value Metrics
  ltv_score DECIMAL(10, 2) DEFAULT 0.00,
  churn_risk_score INTEGER CHECK (churn_risk_score >= 0 AND churn_risk_score <= 100) DEFAULT 0,

  -- Preferences and Status
  preferred_contact_method TEXT CHECK (preferred_contact_method IN ('email', 'in_app', 'both')) DEFAULT 'email',
  is_archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMPTZ,
  archived_reason TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_crm_customers_profile_id ON public.crm_customers(profile_id);
CREATE INDEX IF NOT EXISTS idx_crm_customers_customer_type ON public.crm_customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_crm_customers_lifecycle_stage ON public.crm_customers(lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_crm_customers_engagement_score ON public.crm_customers(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_crm_customers_churn_risk ON public.crm_customers(churn_risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_crm_customers_last_interaction ON public.crm_customers(last_interaction_at DESC);

-- Composite index for common filtering
CREATE INDEX IF NOT EXISTS idx_crm_customers_active_engaged
  ON public.crm_customers(lifecycle_stage, engagement_score DESC)
  WHERE is_archived = false;

-- Enable RLS
ALTER TABLE public.crm_customers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Service role can manage crm_customers"
  ON public.crm_customers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view all crm_customers"
  ON public.crm_customers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage crm_customers"
  ON public.crm_customers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- ============================================================================
-- 2. CRM Customer Notes Table
-- ============================================================================
-- Allows admins to add private notes about customers
CREATE TABLE IF NOT EXISTS public.crm_customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  note_text TEXT NOT NULL,
  note_type TEXT CHECK (note_type IN ('general', 'call', 'meeting', 'issue', 'opportunity', 'follow_up')) DEFAULT 'general',

  is_pinned BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crm_notes_customer_id ON public.crm_customer_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_notes_admin_id ON public.crm_customer_notes(admin_id);
CREATE INDEX IF NOT EXISTS idx_crm_notes_created_at ON public.crm_customer_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_notes_pinned ON public.crm_customer_notes(is_pinned, created_at DESC) WHERE is_pinned = true;

-- Enable RLS
ALTER TABLE public.crm_customer_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Service role can manage crm_customer_notes"
  ON public.crm_customer_notes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view all notes"
  ON public.crm_customer_notes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can create notes"
  ON public.crm_customer_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
    AND admin_id = auth.uid()
  );

CREATE POLICY "Admins can update their own notes"
  ON public.crm_customer_notes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
    AND admin_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
    AND admin_id = auth.uid()
  );

CREATE POLICY "Admins can delete their own notes"
  ON public.crm_customer_notes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
    AND admin_id = auth.uid()
  );

-- ============================================================================
-- 3. CRM Customer Tags Table
-- ============================================================================
-- Predefined tags for customer segmentation
CREATE TABLE IF NOT EXISTS public.crm_customer_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  color TEXT DEFAULT '#3B82F6', -- Tailwind blue-500
  description TEXT,

  is_system BOOLEAN DEFAULT false, -- System tags cannot be deleted

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crm_tags_name ON public.crm_customer_tags(name);
CREATE INDEX IF NOT EXISTS idx_crm_tags_system ON public.crm_customer_tags(is_system);

-- Enable RLS
ALTER TABLE public.crm_customer_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Service role can manage tags"
  ON public.crm_customer_tags
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view all tags"
  ON public.crm_customer_tags
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can create tags"
  ON public.crm_customer_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update non-system tags"
  ON public.crm_customer_tags
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
    AND is_system = false
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
    AND is_system = false
  );

CREATE POLICY "Admins can delete non-system tags"
  ON public.crm_customer_tags
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
    AND is_system = false
  );

-- ============================================================================
-- 4. CRM Customer Tag Assignments (Many-to-Many)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.crm_customer_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.crm_customer_tags(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(customer_id, tag_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crm_tag_assignments_customer ON public.crm_customer_tag_assignments(customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_tag_assignments_tag ON public.crm_customer_tag_assignments(tag_id);
CREATE INDEX IF NOT EXISTS idx_crm_tag_assignments_assigned_by ON public.crm_customer_tag_assignments(assigned_by);

-- Enable RLS
ALTER TABLE public.crm_customer_tag_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Service role can manage tag assignments"
  ON public.crm_customer_tag_assignments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view all tag assignments"
  ON public.crm_customer_tag_assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can create tag assignments"
  ON public.crm_customer_tag_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete tag assignments"
  ON public.crm_customer_tag_assignments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- ============================================================================
-- 5. Update Triggers
-- ============================================================================

-- Trigger to update updated_at timestamp on crm_customers
CREATE OR REPLACE FUNCTION update_crm_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_crm_customers_timestamp
  BEFORE UPDATE ON public.crm_customers
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_customers_updated_at();

-- Trigger to update updated_at timestamp on crm_customer_notes
CREATE OR REPLACE FUNCTION update_crm_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_crm_notes_timestamp
  BEFORE UPDATE ON public.crm_customer_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_notes_updated_at();

-- Trigger to update updated_at timestamp on crm_customer_tags
CREATE OR REPLACE FUNCTION update_crm_tags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_crm_tags_timestamp
  BEFORE UPDATE ON public.crm_customer_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_tags_updated_at();

-- ============================================================================
-- 6. Insert System Tags
-- ============================================================================
INSERT INTO public.crm_customer_tags (name, color, description, is_system)
VALUES
  ('High Value', '#10B981', 'High lifetime value customers', true),
  ('At Risk', '#EF4444', 'Customers showing signs of churn', true),
  ('New User', '#8B5CF6', 'Recently joined customers', true),
  ('Active', '#3B82F6', 'Highly engaged customers', true),
  ('Inactive', '#6B7280', 'Customers with low recent activity', true),
  ('VIP', '#F59E0B', 'VIP customers requiring special attention', true),
  ('Donor', '#22C55E', 'Primarily food donors', true),
  ('Receiver', '#06B6D4', 'Primarily food receivers', true),
  ('Power User', '#EC4899', 'Highly active on forum/community', true),
  ('Needs Support', '#F97316', 'May need assistance or follow-up', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 7. Comments
-- ============================================================================
COMMENT ON TABLE public.crm_customers IS 'Unified customer view leveraging existing profile and stats tables';
COMMENT ON TABLE public.crm_customer_notes IS 'Admin notes about customers for relationship management';
COMMENT ON TABLE public.crm_customer_tags IS 'Tags for customer segmentation and classification';
COMMENT ON TABLE public.crm_customer_tag_assignments IS 'Many-to-many relationship between customers and tags';

COMMENT ON COLUMN public.crm_customers.engagement_score IS 'Calculated score (0-100) based on profile_stats and forum_user_stats';
COMMENT ON COLUMN public.crm_customers.lifecycle_stage IS 'Customer journey stage: lead → active → champion → at_risk → churned';
COMMENT ON COLUMN public.crm_customers.ltv_score IS 'Lifetime value score based on contributions and engagement';
COMMENT ON COLUMN public.crm_customers.churn_risk_score IS 'ML-calculated churn probability (0-100, higher = more likely to churn)';
