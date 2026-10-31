-- Read-only checks to run in the Supabase SQL editor. Nothing here changes data.

-- 1. Bucket visibility. After the rollout: school-assets, books, messages, school-backups => public = false.
SELECT id, public FROM storage.buckets ORDER BY id;

-- 2. Storage policies. No policy should allow SELECT on school-assets, books or messages to anon/public,
--    and write policies should be the tenant_* ones from storage-hardening.sql.
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;

-- 3. The database role the application connects as. If rolbypassrls is true (or the role owns the
--    tables and FORCE ROW LEVEL SECURITY is off) row-level security does not constrain the app, and
--    school isolation rests on the application's own checks.
SELECT rolname, rolbypassrls, rolsuper FROM pg_roles WHERE rolname = current_user;

-- 4. Tables with row-level security forced (expected: none today).
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' AND relforcerowsecurity;
