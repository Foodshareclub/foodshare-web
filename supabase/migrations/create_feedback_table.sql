-- Create feedback table for user feedback submissions
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  feedback_type TEXT CHECK (feedback_type IN ('bug', 'feature', 'general', 'complaint')) DEFAULT 'general',
  status TEXT CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')) DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index on profile_id for faster queries
CREATE INDEX IF NOT EXISTS idx_feedback_profile_id ON public.feedback(profile_id);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback(status);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert feedback (authenticated or not)
CREATE POLICY "Anyone can submit feedback"
  ON public.feedback
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow users to read their own feedback
CREATE POLICY "Users can read their own feedback"
  ON public.feedback
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- Allow admins to read all feedback (you'll need to define admin role separately)
CREATE POLICY "Admins can read all feedback"
  ON public.feedback
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      -- Add your admin check here, e.g., AND is_admin = true
    )
  );

-- Allow admins to update feedback status
CREATE POLICY "Admins can update feedback"
  ON public.feedback
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      -- Add your admin check here, e.g., AND is_admin = true
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_feedback_timestamp
  BEFORE UPDATE ON public.feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_feedback_updated_at();

-- Add comment to table
COMMENT ON TABLE public.feedback IS 'User feedback and support requests';
