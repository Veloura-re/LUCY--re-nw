-- ============================================================
-- LUCY Security Hardening: Supabase RLS Policies (STRICT v4)
-- Run this in the Supabase SQL Editor or via Prisma raw query
-- ============================================================

-- ─────────────────────────────────────────────────
-- 1. Helper Functions (Improves Performance & Avoids Recursion)
-- ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_auth_school_id()
RETURNS TEXT AS $$
  SELECT "schoolId" FROM "User" WHERE id = auth.uid()::text LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_auth_role()
RETURNS TEXT AS $$
  SELECT "role"::text FROM "User" WHERE id = auth.uid()::text LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ─────────────────────────────────────────────────
-- 2. Clean up existing permissive policies
-- ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "users_read_own" ON "User";
DROP POLICY IF EXISTS "users_update_own" ON "User";
DROP POLICY IF EXISTS "students_school_read" ON "Student";
DROP POLICY IF EXISTS "students_school_write" ON "Student";
DROP POLICY IF EXISTS "school_read_own" ON "School";
DROP POLICY IF EXISTS "classes_school_read" ON "Class";
DROP POLICY IF EXISTS "classes_school_write" ON "Class";
DROP POLICY IF EXISTS "grades_school_read" ON "Grade";
DROP POLICY IF EXISTS "grade_records_school" ON "GradeRecord";
DROP POLICY IF EXISTS "attendance_school" ON "AttendanceRecord";
DROP POLICY IF EXISTS "exams_school" ON "Exam";
DROP POLICY IF EXISTS "invoices_school" ON "Invoice";
DROP POLICY IF EXISTS "payments_school" ON "Payment";
DROP POLICY IF EXISTS "comments_public_read" ON "PublicComment";
DROP POLICY IF EXISTS "comments_insert" ON "PublicComment";
DROP POLICY IF EXISTS "comments_admin_modify" ON "PublicComment";
DROP POLICY IF EXISTS "comments_admin_delete" ON "PublicComment";
DROP POLICY IF EXISTS "audit_admin_read" ON "AuditLog";
DROP POLICY IF EXISTS "messages_own" ON "Message";
DROP POLICY IF EXISTS "messages_send" ON "Message";
DROP POLICY IF EXISTS "notes_access" ON "InternalNote";
DROP POLICY IF EXISTS "Superadmins can manage schools" ON "School";
DROP POLICY IF EXISTS "Users can view their own school" ON "School";
DROP POLICY IF EXISTS "Users can read own record" ON "User";
DROP POLICY IF EXISTS "Superadmins can manage all users" ON "User";
DROP POLICY IF EXISTS "Superadmins can manage invite tokens" ON "InviteToken";

-- ─────────────────────────────────────────────────
-- 3. ENABLE RLS
-- ─────────────────────────────────────────────────
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Student" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "School" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Class" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Grade" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GradeRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AttendanceRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Exam" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PublicComment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InternalNote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InviteToken" ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────
-- 4. STRICT POLICIES BY ROLE
-- ─────────────────────────────────────────────────

-- ==========================================
-- User
-- ==========================================
CREATE POLICY "user_read_own" ON "User" FOR SELECT USING (id = auth.uid()::text);
CREATE POLICY "user_update_own" ON "User" FOR UPDATE USING (id = auth.uid()::text);
CREATE POLICY "user_read_school_staff" ON "User" FOR SELECT USING (
    get_auth_school_id() = "schoolId" AND get_auth_role() IN ('OWNER', 'PRINCIPAL', 'TEACHER', 'HOMEROOM')
);
CREATE POLICY "user_superadmin_all" ON "User" FOR ALL USING (
    get_auth_role() = 'SUPERADMIN' OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'SUPERADMIN'
);

-- ==========================================
-- School
-- ==========================================
CREATE POLICY "school_read" ON "School" FOR SELECT USING (
    id = get_auth_school_id() 
);
CREATE POLICY "school_superadmin_all" ON "School" FOR ALL USING (
    get_auth_role() = 'SUPERADMIN' OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'SUPERADMIN'
);

-- ==========================================
-- Student
-- ==========================================
CREATE POLICY "student_staff_all" ON "Student" FOR ALL USING (
    "schoolId" = get_auth_school_id() AND get_auth_role() IN ('OWNER', 'PRINCIPAL', 'TEACHER', 'HOMEROOM')
);
CREATE POLICY "student_self_read" ON "Student" FOR SELECT USING (
    "userId" = auth.uid()::text
);
CREATE POLICY "student_parent_read" ON "Student" FOR SELECT USING (
    id IN (SELECT "studentId" FROM "ParentStudentLink" WHERE "parentId" = auth.uid()::text)
);

-- ==========================================
-- Class, Grade, Subject
-- ==========================================
CREATE POLICY "class_read_all" ON "Class" FOR SELECT USING (
    "gradeId" IN (SELECT id FROM "Grade" WHERE "schoolId" = get_auth_school_id())
);
CREATE POLICY "grade_read_all" ON "Grade" FOR SELECT USING (
    "schoolId" = get_auth_school_id()
);
CREATE POLICY "subject_read_all" ON "Subject" FOR SELECT USING (
    "schoolId" = get_auth_school_id()
);
CREATE POLICY "class_staff_write" ON "Class" FOR ALL USING (
    "gradeId" IN (SELECT id FROM "Grade" WHERE "schoolId" = get_auth_school_id()) AND get_auth_role() IN ('OWNER', 'PRINCIPAL')
);

-- ==========================================
-- GradeRecord (Security Hardened)
-- ==========================================
CREATE POLICY "graderecord_staff_all" ON "GradeRecord" FOR ALL USING (
    "studentId" IN (SELECT id FROM "Student" WHERE "schoolId" = get_auth_school_id()) 
    AND get_auth_role() IN ('OWNER', 'PRINCIPAL', 'TEACHER', 'HOMEROOM')
);
CREATE POLICY "graderecord_student_read" ON "GradeRecord" FOR SELECT USING (
    "studentId" IN (SELECT id FROM "Student" WHERE "userId" = auth.uid()::text)
);
CREATE POLICY "graderecord_parent_read" ON "GradeRecord" FOR SELECT USING (
    "studentId" IN (SELECT "studentId" FROM "ParentStudentLink" WHERE "parentId" = auth.uid()::text)
);

-- ==========================================
-- AttendanceRecord
-- ==========================================
CREATE POLICY "attendance_staff_all" ON "AttendanceRecord" FOR ALL USING (
    "studentId" IN (SELECT id FROM "Student" WHERE "schoolId" = get_auth_school_id()) 
    AND get_auth_role() IN ('OWNER', 'PRINCIPAL', 'TEACHER', 'HOMEROOM')
);
CREATE POLICY "attendance_student_read" ON "AttendanceRecord" FOR SELECT USING (
    "studentId" IN (SELECT id FROM "Student" WHERE "userId" = auth.uid()::text)
);
CREATE POLICY "attendance_parent_read" ON "AttendanceRecord" FOR SELECT USING (
    "studentId" IN (SELECT "studentId" FROM "ParentStudentLink" WHERE "parentId" = auth.uid()::text)
);

-- ==========================================
-- Invoices and Payments
-- ==========================================
CREATE POLICY "finance_staff_all" ON "Invoice" FOR ALL USING (
    "studentId" IN (SELECT id FROM "Student" WHERE "schoolId" = get_auth_school_id()) 
    AND get_auth_role() IN ('OWNER', 'PRINCIPAL')
);
CREATE POLICY "finance_student_read" ON "Invoice" FOR SELECT USING (
    "studentId" IN (SELECT id FROM "Student" WHERE "userId" = auth.uid()::text)
);
CREATE POLICY "finance_parent_read" ON "Invoice" FOR SELECT USING (
    "studentId" IN (SELECT "studentId" FROM "ParentStudentLink" WHERE "parentId" = auth.uid()::text)
);

CREATE POLICY "payment_staff_all" ON "Payment" FOR ALL USING (
    "invoiceId" IN (
        SELECT id FROM "Invoice" WHERE "studentId" IN (
            SELECT id FROM "Student" WHERE "schoolId" = get_auth_school_id()
        )
    )
    AND get_auth_role() IN ('OWNER', 'PRINCIPAL')
);

-- ==========================================
-- Invite Tokens
-- ==========================================
CREATE POLICY "invite_superadmin_all" ON "InviteToken" FOR ALL USING (
    get_auth_role() = 'SUPERADMIN' OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'SUPERADMIN'
);
CREATE POLICY "invite_staff_all" ON "InviteToken" FOR ALL USING (
    "schoolId" = get_auth_school_id() AND get_auth_role() IN ('OWNER', 'PRINCIPAL')
);

-- ==========================================
-- Audit Logs
-- ==========================================
CREATE POLICY "audit_admin_read" ON "AuditLog" FOR SELECT USING (
    get_auth_role() IN ('SUPERADMIN', 'OWNER', 'PRINCIPAL')
);

-- ==========================================
-- Messages
-- ==========================================
CREATE POLICY "messages_own" ON "Message" FOR SELECT USING (
    "fromUserId" = auth.uid()::text OR "toUserId" = auth.uid()::text
);
CREATE POLICY "messages_send" ON "Message" FOR INSERT WITH CHECK (
    "fromUserId" = auth.uid()::text
);
