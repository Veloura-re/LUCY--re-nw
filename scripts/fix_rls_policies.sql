-- fix_rls_policies.sql
-- Restores functionality for Superadmins and basic data visibility for users.

BEGIN;

-- 1. SCHOOL TABLE POLICIES
DROP POLICY IF EXISTS "Superadmins can manage schools" ON "School";
CREATE POLICY "Superadmins can manage schools" ON "School"
AS PERMISSIVE FOR ALL
TO authenticated
USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'SUPERADMIN')
WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'SUPERADMIN');

DROP POLICY IF EXISTS "Users can view their own school" ON "School";
CREATE POLICY "Users can view their own school" ON "School"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  id = (SELECT "schoolId" FROM "User" WHERE id = auth.uid()::text LIMIT 1)
);

-- 2. USER TABLE POLICIES
DROP POLICY IF EXISTS "Users can read own record" ON "User";
CREATE POLICY "Users can read own record" ON "User"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (id = auth.uid()::text);

DROP POLICY IF EXISTS "Superadmins can manage all users" ON "User";
CREATE POLICY "Superadmins can manage all users" ON "User"
AS PERMISSIVE FOR ALL
TO authenticated
USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'SUPERADMIN')
WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'SUPERADMIN');

-- 3. INVITE TOKEN POLICIES (Needed for management)
DROP POLICY IF EXISTS "Superadmins can manage invite tokens" ON "InviteToken";
CREATE POLICY "Superadmins can manage invite tokens" ON "InviteToken"
AS PERMISSIVE FOR ALL
TO authenticated
USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'SUPERADMIN')
WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'SUPERADMIN');

-- 4. Enable RLS (Should already be enabled, but ensure it)
ALTER TABLE "School" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InviteToken" ENABLE ROW LEVEL SECURITY;

COMMIT;
