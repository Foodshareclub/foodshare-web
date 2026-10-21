-- Stop publishing every member's PII, and stop publishing live email-verification
-- codes to anyone who asks.
--
-- `public.profiles` carried, and still carries:
--
--   CREATE POLICY "Allow public read access to profiles"
--     ON public.profiles FOR SELECT USING (true);
--
-- created in the baseline and never dropped. Combined with the blanket grant in
-- 20260812225000 (`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon,
-- authenticated`), the public anon key — which is in every browser bundle — reads
-- every row of `profiles`:
--
--   curl "$API/rest/v1/profiles?select=id,email,phone,birth_date,location,verification_code" \
--        -H "apikey: $ANON"
--
-- The columns that come back include `email`, `phone`, `phone_number`,
-- `whatsapp_phone`, `birth_date`, `location` (a PostGIS point: the member's home
-- coordinates), `telegram_id`, `food_allergies`, and — the one that turns this
-- from a privacy problem into an account-takeover problem —
-- `verification_code varchar(6)` with `verification_code_expires_at`.
--
-- `foodshare-backend/supabase/functions/api-v1-auth/lib/verify.ts` reads that
-- column, compares it to the code in a confirm request and then sets
-- `email_verified = true`. So an unauthenticated caller can harvest every
-- *currently pending* verification code and confirm those accounts without ever
-- receiving the email. The same shape exists in the WhatsApp and Telegram bots.
-- For a food-sharing platform, publishing every member's home coordinates and
-- phone number is also a physical-safety problem, not only a compliance one.
--
-- RLS cannot restrict *columns*, so a policy alone cannot fix this. The fix is
-- three parts:
--
--   1. `profiles` becomes readable only by its owner or an admin.
--   2. A `profiles_public` view exposes the columns that are genuinely public,
--      with the location rounded to an ~11 km cell in the database — so the anon
--      key cannot obtain an exact point even by scraping, rather than relying on
--      every client to coarsen it.
--   3. The grant of ALL on `profiles` to `anon` is revoked, since RLS should not
--      be the only thing standing between the public key and INSERT/UPDATE/DELETE.
--
-- The schema already models the intent: `profile_visibility` and
-- `location_sharing_enabled` exist and nothing read them.
--
-- WHAT DOES NOT CHANGE: every edge function and the mobile apps connect with the
-- service role, which bypasses RLS entirely, so `api-v1-auth`'s verification
-- code read keeps working untouched. Only reads made with the anon or a user JWT
-- are affected, and the three public read paths in the app are moved to the view
-- in the same change.

BEGIN;

-- ── 1. profiles: owner or admin, never the world ────────────────────────────

DROP POLICY IF EXISTS "Allow public read access to profiles" ON public.profiles;

-- The baseline created an identical policy under a second name; drop it too so
-- a name change in the past cannot leave a hole behind.
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;

CREATE POLICY "Users can read own profile"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (id = (SELECT auth.uid()));

-- Admins keep full read, which is what the CRM and campaign surfaces depend on:
-- they join through a user JWT and need other members' names and email
-- addresses. Scoped to admins rather than left to "the app only calls this from
-- /admin", because the app-side check and the RLS check are independent and
-- both have to be right.
CREATE POLICY "Admins can read any profile"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- RLS already blocked anon writes, but the *grant* should not be there for
-- `anon` to rely on. Explicit, because the blanket grant in 20260812225000 is
-- still in force for every table created before it.
REVOKE ALL ON public.profiles FROM anon;

-- Re-grant for the roles that still need it. `authenticated` keeps its writes
-- (own-row policies already exist for insert/update/delete).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- ── 2. profiles_public: the public projection ───────────────────────────────

-- A column-restricting view is the documented Postgres answer to "RLS cannot do
-- columns". Deliberately NOT `security_invoker = true`: an invoker view applies
-- the base table's RLS, and the anon role can no longer pass it. This view runs
-- with the owner's rights (as `posts_with_location` would if it were not an
-- invoker) and is safe for exactly the reason a *plain projection* is safe —
-- it selects a fixed column list and computes, and it is not a function
-- surface. Note the difference from a definer *function*, which really is not a
-- security boundary.
--
-- Deliberately absent: email, phone, phone_number, whatsapp_phone, birth_date,
-- telegram_id, food_allergies, dietary_preferences, notification_preferences,
-- theme_preferences, verification_* and every other credential or preference
-- column. If a future column looks harmless, it still has to be added here on
-- purpose.

CREATE OR REPLACE VIEW public.profiles_public AS
    SELECT
        p.id,
        p.nickname,
        p.first_name,
        p.second_name,
        p.avatar_url,
        p.about_me,
        p.created_time,
        p.is_active,
        p.is_verified,
        p.language,
        p.profile_visibility,
        p.search_radius_km,
        -- Rounded here, in the database, so the coarsening is a property of the
        -- grant rather than a convention every reader has to remember. Flooring
        -- (not rounding) keeps a point inside its own ~11 km cell, so the same
        -- address always produces the same cell. The client coarsens again as
        -- defence in depth; the operation is idempotent.
        CASE
            WHEN p.location IS NULL THEN NULL
            ELSE extensions.st_setsrid(
                     extensions.st_makepoint(
                         floor(extensions.st_x(p.location::extensions.geometry) * 10) / 10,
                         floor(extensions.st_y(p.location::extensions.geometry) * 10) / 10
                     ),
                     4326
                 )::extensions.geography
        END AS location,
        -- Kept so the reader can honour the opt-out. The web profile page now
        -- does; nothing did before.
        p.location_sharing_enabled
      FROM public.profiles p
     -- A member who set their profile to private, or who is deactivated, is not
     -- in the public projection at all. Previously the policy ignored both.
     WHERE p.profile_visibility = 'public'
       AND p.is_active;

COMMENT ON VIEW public.profiles_public IS
  'Public projection of profiles: the columns that are safe to hand to the anon '
  'key, with location rounded to an ~11 km cell. Replaces a USING (true) policy '
  'that published email, phone, birth date, home coordinates and live email-'
  'verification codes to anyone with the public anon key.';

GRANT SELECT ON public.profiles_public TO anon, authenticated, service_role;

-- ── Verify ─────────────────────────────────────────────────────────────────

DO $$
DECLARE
    leaked text;
    stale text;
BEGIN
    -- (a) No SELECT policy on profiles may be reachable by anon any more. Checked
    -- from the catalog rather than by policy name, because a recreated policy
    -- with a sensible name and `USING (true)` is the same hole.
    SELECT string_agg(policyname, ', ')
      INTO leaked
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'profiles'
       AND cmd IN ('SELECT', 'ALL')
       AND (
             roles IS NULL
             OR roles && ARRAY['anon']::name[]
           );

    IF leaked IS NOT NULL THEN
        RAISE EXCEPTION 'a SELECT policy on profiles is still reachable by anon: %', leaked;
    END IF;

    -- (b) The view must not carry a credential column. Asserted by name so that
    -- adding one to the projection fails the migration rather than production.
    SELECT string_agg(column_name, ', ')
      INTO stale
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'profiles_public'
       AND column_name IN (
             'email', 'phone', 'phone_number', 'whatsapp_phone', 'birth_date',
             'verification_code', 'verification_code_expires_at',
             'verification_attempts', 'verification_locked_until', 'telegram_id',
             'food_allergies', 'dietary_preferences', 'notification_preferences',
             'theme_preferences'
           );

    IF stale IS NOT NULL THEN
        RAISE EXCEPTION 'profiles_public exposes credential columns: %', stale;
    END IF;

    -- (c) The two grants, which together are the whole point. Checking the
    -- privilege directly rather than trusting the statements above to have run:
    -- if either is wrong, the fix silently does nothing.
    IF has_table_privilege('anon', 'public.profiles', 'SELECT') THEN
        RAISE EXCEPTION 'anon still holds SELECT on profiles — the PII is still public';
    END IF;

    IF NOT has_table_privilege('anon', 'public.profiles_public', 'SELECT') THEN
        RAISE EXCEPTION
            'anon has no SELECT on profiles_public — the public profile pages, the '
            'challenge leaderboard and the OG member count would all read empty';
    END IF;
END
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';
