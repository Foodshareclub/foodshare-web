-- Create email_preferences table for user notification settings
CREATE TABLE IF NOT EXISTS public.email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chat_notifications BOOLEAN DEFAULT true,
  food_listings_notifications BOOLEAN DEFAULT true,
  feedback_notifications BOOLEAN DEFAULT false,
  review_reminders BOOLEAN DEFAULT true,
  notification_frequency TEXT CHECK (notification_frequency IN ('instant', 'daily_digest', 'weekly_digest')) DEFAULT 'instant',
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index on profile_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_preferences_profile_id ON public.email_preferences(profile_id);

-- Enable Row Level Security
ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own preferences
CREATE POLICY "Users can read their own email preferences"
  ON public.email_preferences
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- Allow users to insert their own preferences
CREATE POLICY "Users can insert their own email preferences"
  ON public.email_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

-- Allow users to update their own preferences
CREATE POLICY "Users can update their own email preferences"
  ON public.email_preferences
  FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_email_preferences_timestamp
  BEFORE UPDATE ON public.email_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_email_preferences_updated_at();

-- Function to create default email preferences for new users
CREATE OR REPLACE FUNCTION create_default_email_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.email_preferences (profile_id)
  VALUES (NEW.id)
  ON CONFLICT (profile_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically create email preferences when a new profile is created
CREATE TRIGGER create_email_preferences_on_profile_creation
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_email_preferences();

-- Add comment to table
COMMENT ON TABLE public.email_preferences IS 'User email notification preferences and settings';
