-- ============================================================
-- LUCY Security Hardening: Supabase RLS Policies (FIXED v3)
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ─────────────────────────────────────────────────
-- 1. Enable RLS on all critical tables
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

-- ─────────────────────────────────────────────────
-- 2. Clean up existing policies
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

-- ─────────────────────────────────────────────────
-- 3. USER table policies
-- ─────────────────────────────────────────────────

CREATE POLICY "users_read_own" ON "User"
    FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "users_update_own" ON "User"
    FOR UPDATE USING (auth.uid()::text = id);

-- ─────────────────────────────────────────────────
-- 4. SCHOOL-SCOPED tables
-- ─────────────────────────────────────────────────

-- Student Table (HAS schoolId)
CREATE POLICY "students_school_read" ON "Student"
    FOR SELECT USING (
        "schoolId" IN (
            SELECT "schoolId" FROM "User" WHERE id = auth.uid()::text
        )
    );

CREATE POLICY "students_school_write" ON "Student"
    FOR ALL USING (
        "schoolId" IN (
            SELECT "schoolId" FROM "User" WHERE id = auth.uid()::text
        )
    );

-- School Table (id IS the schoolId)
CREATE POLICY "school_read_own" ON "School"
    FOR SELECT USING (
        id IN (
            SELECT "schoolId" FROM "User" WHERE id = auth.uid()::text
        )
    );

-- Class Table (NO schoolId direct, use gradeId -> Grade)
CREATE POLICY "classes_school_read" ON "Class"
    FOR SELECT USING (
        "gradeId" IN (
            SELECT id FROM "Grade" WHERE "schoolId" IN (
                SELECT "schoolId" FROM "User" WHERE id = auth.uid()::text
            )
        )
    );

CREATE POLICY "classes_school_write" ON "Class"
    FOR ALL USING (
        "gradeId" IN (
            SELECT id FROM "Grade" WHERE "schoolId" IN (
                SELECT "schoolId" FROM "User" WHERE id = auth.uid()::text
            )
        )
    );

-- Grade Table (HAS schoolId)
CREATE POLICY "grades_school_read" ON "Grade"
    FOR SELECT USING (
        "schoolId" IN (
            SELECT "schoolId" FROM "User" WHERE id = auth.uid()::text
        )
    );

-- GradeRecords (Use studentId -> Student -> schoolId)
CREATE POLICY "grade_records_school" ON "GradeRecord"
    FOR ALL USING (
        "studentId" IN (
            SELECT id FROM "Student" WHERE "schoolId" IN (
                SELECT "schoolId" FROM "User" WHERE id = auth.uid()::text
            )
        )
    );

-- Attendance (Use studentId -> Student -> schoolId)
CREATE POLICY "attendance_school" ON "AttendanceRecord"
    FOR ALL USING (
        "studentId" IN (
            SELECT id FROM "Student" WHERE "schoolId" IN (
                SELECT "schoolId" FROM "User" WHERE id = auth.uid()::text
            )
        )
    );

-- Exam (NO schoolId direct, use subjectId -> Subject)
CREATE POLICY "exams_school" ON "Exam"
    FOR ALL USING (
        "subjectId" IN (
            SELECT id FROM "Subject" WHERE "schoolId" IN (
                SELECT "schoolId" FROM "User" WHERE id = auth.uid()::text
            )
        )
    );

-- ─────────────────────────────────────────────────
-- 5. FINANCE tables (Use studentId)
-- ─────────────────────────────────────────────────

CREATE POLICY "invoices_school" ON "Invoice"
    FOR ALL USING (
        "studentId" IN (
            SELECT id FROM "Student" WHERE "schoolId" IN (
                SELECT "schoolId" FROM "User" WHERE id = auth.uid()::text
            )
        )
    );

CREATE POLICY "payments_school" ON "Payment"
    FOR ALL USING (
        "invoiceId" IN (
            SELECT id FROM "Invoice" WHERE "studentId" IN (
                SELECT id FROM "Student" WHERE "schoolId" IN (
                    SELECT "schoolId" FROM "User" WHERE id = auth.uid()::text
                )
            )
        )
    );

-- ─────────────────────────────────────────────────
-- 6. PUBLIC COMMENTS
-- ─────────────────────────────────────────────────

CREATE POLICY "comments_public_read" ON "PublicComment"
    FOR SELECT USING (approved = true);

CREATE POLICY "comments_insert" ON "PublicComment"
    FOR INSERT WITH CHECK (true);

CREATE POLICY "comments_admin_modify" ON "PublicComment"
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM "User"
            WHERE id = auth.uid()::text
            AND role IN ('SUPERADMIN', 'PRINCIPAL')
        )
    );

CREATE POLICY "comments_admin_delete" ON "PublicComment"
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM "User"
            WHERE id = auth.uid()::text
            AND role IN ('SUPERADMIN', 'PRINCIPAL')
        )
    );

-- ─────────────────────────────────────────────────
-- 7. AUDIT LOGS
-- ─────────────────────────────────────────────────

CREATE POLICY "audit_admin_read" ON "AuditLog"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "User"
            WHERE id = auth.uid()::text
            AND role IN ('SUPERADMIN', 'PRINCIPAL')
        )
    );

-- ─────────────────────────────────────────────────
-- 8. MESSAGES (HAS schoolId)
-- ─────────────────────────────────────────────────

CREATE POLICY "messages_own" ON "Message"
    FOR SELECT USING (
        "fromUserId" = auth.uid()::text
        OR "toUserId" = auth.uid()::text
    );

CREATE POLICY "messages_send" ON "Message"
    FOR INSERT WITH CHECK (
        "fromUserId" = auth.uid()::text
    );

-- ─────────────────────────────────────────────────
-- 9. INTERNAL NOTES
-- ─────────────────────────────────────────────────

CREATE POLICY "notes_access" ON "InternalNote"
    FOR ALL USING (
        "authorId" = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM "User"
            WHERE id = auth.uid()::text
            AND role IN ('SUPERADMIN', 'PRINCIPAL')
        )
    );
