-- Supabase is primary application storage. Restore API-role access only with
-- restrictive owner boundaries, so permissive legacy policies cannot widen it.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA auth, storage TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid(), auth.role() TO authenticated;
GRANT SELECT ON storage.buckets TO authenticated;
DROP POLICY IF EXISTS foodshare_public_bucket_metadata ON storage.buckets;
CREATE POLICY foodshare_public_bucket_metadata ON storage.buckets
  FOR SELECT TO authenticated USING (public);

DROP POLICY IF EXISTS foodshare_object_owner_access ON storage.objects;
CREATE POLICY foodshare_object_owner_access ON storage.objects FOR ALL TO authenticated
 USING (auth.uid() IS NOT NULL AND (storage.foldername(name))[1]=auth.uid()::text
 AND bucket_id=ANY(ARRAY['food-images','profiles','forum','challenges','rooms','avatars','posts']))
 WITH CHECK (auth.uid() IS NOT NULL AND (storage.foldername(name))[1]=auth.uid()::text
 AND bucket_id=ANY(ARRAY['food-images','profiles','forum','challenges','rooms','avatars','posts']));
DROP POLICY IF EXISTS foodshare_object_read_access ON storage.objects;
CREATE POLICY foodshare_object_read_access ON storage.objects FOR SELECT TO authenticated
 USING (EXISTS(SELECT 1 FROM storage.buckets b WHERE b.id=bucket_id AND b.public)
 OR (auth.uid() IS NOT NULL AND (storage.foldername(name))[1]=auth.uid()::text));
DROP POLICY IF EXISTS foodshare_object_read_boundary ON storage.objects;
CREATE POLICY foodshare_object_read_boundary ON storage.objects AS RESTRICTIVE
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM storage.buckets b WHERE b.id = bucket_id AND b.public)
    OR (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)
  );
DROP POLICY IF EXISTS foodshare_object_insert_boundary ON storage.objects;
CREATE POLICY foodshare_object_insert_boundary ON storage.objects AS RESTRICTIVE
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text
    AND bucket_id = ANY (ARRAY['food-images','profiles','forum','challenges','rooms','avatars','posts'])
  );
DROP POLICY IF EXISTS foodshare_object_update_boundary ON storage.objects;
CREATE POLICY foodshare_object_update_boundary ON storage.objects AS RESTRICTIVE
  FOR UPDATE TO authenticated USING (
    auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text
    AND bucket_id = ANY (ARRAY['food-images','profiles','forum','challenges','rooms','avatars','posts'])
  ) WITH CHECK (
    auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text
    AND bucket_id = ANY (ARRAY['food-images','profiles','forum','challenges','rooms','avatars','posts'])
  );
DROP POLICY IF EXISTS foodshare_object_delete_boundary ON storage.objects;
CREATE POLICY foodshare_object_delete_boundary ON storage.objects AS RESTRICTIVE
  FOR DELETE TO authenticated USING (
    auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text
    AND bucket_id = ANY (ARRAY['food-images','profiles','forum','challenges','rooms','avatars','posts'])
  );
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;

-- The canonical image handler uses this atomic quota RPC. Bind callers to
-- their own identity; privileged server callers retain their explicit scope.
CREATE OR REPLACE FUNCTION public.consume_image_upload_quota(p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $$ DECLARE v_count integer; BEGIN
  IF p_user_id IS NULL OR (auth.role() IS DISTINCT FROM 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id) THEN RETURN false; END IF;
  INSERT INTO public.user_rate_limits(user_id,key,count,reset_at)
  VALUES(p_user_id,'image_upload_count',1,now()+interval '24 hours')
  ON CONFLICT(user_id,key) DO UPDATE SET
    count=CASE WHEN public.user_rate_limits.reset_at<=now() THEN 1 ELSE public.user_rate_limits.count+1 END,
    reset_at=CASE WHEN public.user_rate_limits.reset_at<=now() THEN now()+interval '24 hours' ELSE public.user_rate_limits.reset_at END
  RETURNING count INTO v_count;
  RETURN v_count<=100;
END; $$;
REVOKE ALL ON FUNCTION public.consume_image_upload_quota(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.consume_image_upload_quota(uuid) TO authenticated,service_role;
COMMIT;
NOTIFY pgrst, 'reload schema';
