-- Add onboarding_completed to profiles
ALTER TABLE public.profiles 
  ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT false;

-- Backfill existing profiles
UPDATE public.profiles 
  SET onboarding_completed = true;
