-- Internal exports contain account and activity data. They must not be exposed
-- through PostgREST client roles; retain existing owner/service-role grants.
REVOKE ALL PRIVILEGES ON TABLE
  public.analytics_full_users,
  public.analytics_full_rooms,
  public.analytics_full_listings,
  public.analytics_full_reviews,
  public.analytics_full_favorites
FROM PUBLIC, anon, authenticated;

-- Fail the transaction if inherited privileges still make an export reachable.
DO $guard$
DECLARE
  view_name text;
  client_role text;
BEGIN
  FOREACH view_name IN ARRAY ARRAY[
    'analytics_full_users', 'analytics_full_rooms', 'analytics_full_listings',
    'analytics_full_reviews', 'analytics_full_favorites'
  ] LOOP
    FOREACH client_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF has_table_privilege(client_role, 'public.' || view_name,
          'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN')
        OR has_any_column_privilege(client_role, 'public.' || view_name,
          'SELECT,INSERT,UPDATE,REFERENCES') THEN
        RAISE EXCEPTION 'Internal export % remains accessible to %', view_name, client_role;
      END IF;
    END LOOP;
    IF NOT has_table_privilege('service_role', 'public.' || view_name, 'SELECT') THEN
      RAISE EXCEPTION 'Internal export % lost service-role access', view_name;
    END IF;
  END LOOP;
END
$guard$;

NOTIFY pgrst, 'reload schema';
