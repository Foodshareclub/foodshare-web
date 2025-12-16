-- ============================================================================
-- Migration: Add RLS Policies for Posts Table
-- Date: 2024-12-16
--
-- This migration ensures users can:
-- 1. View active posts (anyone) or their own posts (authenticated)
-- 2. Create their own posts (authenticated)
-- 3. Update their own posts including soft delete (authenticated)
-- 4. Hard delete their own posts from DB (authenticated)
--
-- SAFE TO RE-RUN: Uses DROP POLICY IF EXISTS before creating
-- ============================================================================

-- Step 1: Enable RLS on posts table (idempotent - safe to run multiple times)
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SELECT Policies
-- ============================================================================

-- Policy: Anyone can view active posts (including anonymous users)
DROP POLICY IF EXISTS "Anyone can view active posts" ON posts;
CREATE POLICY "Anyone can view active posts" ON posts
  FOR SELECT
  USING (is_active = true);

-- Policy: Authenticated users can view their own posts (even inactive ones)
DROP POLICY IF EXISTS "Users can view their own posts" ON posts;
CREATE POLICY "Users can view their own posts" ON posts
  FOR SELECT TO authenticated
  USING (profile_id = (SELECT auth.uid()));

-- ============================================================================
-- INSERT Policy
-- ============================================================================

-- Policy: Authenticated users can create posts (only for themselves)
DROP POLICY IF EXISTS "Authenticated users can create posts" ON posts;
CREATE POLICY "Authenticated users can create posts" ON posts
  FOR INSERT TO authenticated
  WITH CHECK (profile_id = (SELECT auth.uid()));

-- ============================================================================
-- UPDATE Policy (used for soft delete from web app)
-- ============================================================================

-- Policy: Users can update their own posts (including is_active = false)
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;
CREATE POLICY "Users can update their own posts" ON posts
  FOR UPDATE TO authenticated
  USING (profile_id = (SELECT auth.uid()))
  WITH CHECK (profile_id = (SELECT auth.uid()));

-- ============================================================================
-- DELETE Policy (used for hard delete from DB dashboard)
-- ============================================================================

-- Policy: Users can hard delete their own posts
DROP POLICY IF EXISTS "Users can delete their own posts" ON posts;
CREATE POLICY "Users can delete their own posts" ON posts
  FOR DELETE TO authenticated
  USING (profile_id = (SELECT auth.uid()));

-- ============================================================================
-- Documentation
-- ============================================================================

COMMENT ON POLICY "Anyone can view active posts" ON posts IS
  'Public read access to active listings';
COMMENT ON POLICY "Users can view their own posts" ON posts IS
  'Owners can see their own posts regardless of is_active status';
COMMENT ON POLICY "Authenticated users can create posts" ON posts IS
  'Users can only create posts with their own profile_id';
COMMENT ON POLICY "Users can update their own posts" ON posts IS
  'Owners can update their posts including soft delete (is_active = false)';
COMMENT ON POLICY "Users can delete their own posts" ON posts IS
  'Owners can hard delete their posts from database';
