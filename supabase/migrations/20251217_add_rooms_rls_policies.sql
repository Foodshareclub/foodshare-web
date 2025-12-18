-- Migration: Add RLS policies for rooms table
-- Ensures users can only access chat rooms they participate in

-- Enable RLS on rooms table (if not already enabled)
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view their rooms" ON public.rooms;
DROP POLICY IF EXISTS "Users can create rooms as requester" ON public.rooms;
DROP POLICY IF EXISTS "Users can update their rooms" ON public.rooms;

-- Policy: Users can only view rooms where they are the sharer OR requester
CREATE POLICY "Users can view their rooms" ON public.rooms
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) = sharer OR (SELECT auth.uid()) = requester
  );

-- Policy: Users can create rooms where they are the requester
-- (sharers don't create rooms - requesters initiate contact)
CREATE POLICY "Users can create rooms as requester" ON public.rooms
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = requester
  );

-- Policy: Users can update rooms they participate in
-- (for marking as read, arranging food, archiving, etc.)
CREATE POLICY "Users can update their rooms" ON public.rooms
  FOR UPDATE TO authenticated
  USING (
    (SELECT auth.uid()) = sharer OR (SELECT auth.uid()) = requester
  )
  WITH CHECK (
    (SELECT auth.uid()) = sharer OR (SELECT auth.uid()) = requester
  );

-- Also ensure room_participants has proper RLS
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON public.room_participants;
DROP POLICY IF EXISTS "Users can send messages in their rooms" ON public.room_participants;

-- Policy: Users can only view messages in rooms they participate in
CREATE POLICY "Users can view messages in their rooms" ON public.room_participants
  FOR SELECT TO authenticated
  USING (
    room_id IN (
      SELECT id FROM public.rooms
      WHERE sharer = (SELECT auth.uid()) OR requester = (SELECT auth.uid())
    )
  );

-- Policy: Users can only send messages in rooms they participate in
CREATE POLICY "Users can send messages in their rooms" ON public.room_participants
  FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = (SELECT auth.uid()) AND
    room_id IN (
      SELECT id FROM public.rooms
      WHERE sharer = (SELECT auth.uid()) OR requester = (SELECT auth.uid())
    )
  );

-- Add comment for documentation
COMMENT ON POLICY "Users can view their rooms" ON public.rooms IS
  'Restricts room visibility to participants only (sharer or requester)';
COMMENT ON POLICY "Users can create rooms as requester" ON public.rooms IS
  'Only requesters can create chat rooms (initiate contact with sharers)';
COMMENT ON POLICY "Users can update their rooms" ON public.rooms IS
  'Room participants can update room metadata (mark read, arrange food, archive)';
