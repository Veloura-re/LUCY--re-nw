-- ==========================================
-- Supabase Storage hardening (idempotent)
-- Run in the Supabase SQL Editor after setup-storage.sql / create_bucket.sql.
--
-- Fixes:
--   1. Any authenticated user could insert, update or delete objects in any school's folder.
--      Writes are now limited to the caller's own school folder.
--   2. The 'messages' bucket was public. It is now private with no client policies; the server
--      writes with the service role and serves files through /api/messages/attachment.
-- ==========================================

-- Same definition as prisma/rls_policies.sql, repeated so this script runs on its own.
CREATE OR REPLACE FUNCTION public.get_auth_school_id()
RETURNS TEXT AS $$
  SELECT "schoolId" FROM "User" WHERE id = auth.uid()::text LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- 1. Remove every legacy write policy
DROP POLICY IF EXISTS "Authenticated Users Can Upload Books" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Can Update Books" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Can Delete Books" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Can Upload Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Can Update Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Can Delete Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Can Upload Brand Assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Can Update Brand Assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Can Delete Brand Assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;

-- 2. Messages: private, no client access
UPDATE storage.buckets SET public = false WHERE id = 'messages';
DROP POLICY IF EXISTS "Public Access Messages" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Can Upload Messages" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Can Update Messages" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Can Delete Messages" ON storage.objects;

-- 3. Tenant-scoped writes for the buckets the app uploads to ('books' and 'school-assets').
--    Path layout is "<schoolId>/..." or "unscoped/<userId>/..." for users without a school.
--    'avatars' and 'brand' are never written from the client, so they get no write policy.
DO $$
DECLARE
  b TEXT;
BEGIN
  FOREACH b IN ARRAY ARRAY['books', 'school-assets'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', 'tenant_insert_' || b);
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', 'tenant_update_' || b);
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', 'tenant_delete_' || b);

    EXECUTE format($p$CREATE POLICY %I ON storage.objects FOR INSERT TO authenticated WITH CHECK (
      bucket_id = %L AND (
        (storage.foldername(name))[1] = public.get_auth_school_id()
        OR ((storage.foldername(name))[1] = 'unscoped' AND (storage.foldername(name))[2] = auth.uid()::text)
      ))$p$, 'tenant_insert_' || b, b);

    EXECUTE format($p$CREATE POLICY %I ON storage.objects FOR UPDATE TO authenticated USING (
      bucket_id = %L AND (
        (storage.foldername(name))[1] = public.get_auth_school_id()
        OR ((storage.foldername(name))[1] = 'unscoped' AND (storage.foldername(name))[2] = auth.uid()::text)
      ))$p$, 'tenant_update_' || b, b);

    EXECUTE format($p$CREATE POLICY %I ON storage.objects FOR DELETE TO authenticated USING (
      bucket_id = %L AND (
        (storage.foldername(name))[1] = public.get_auth_school_id()
        OR ((storage.foldername(name))[1] = 'unscoped' AND (storage.foldername(name))[2] = auth.uid()::text)
      ))$p$, 'tenant_delete_' || b, b);
  END LOOP;
END $$;
