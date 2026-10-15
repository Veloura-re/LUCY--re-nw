-- Indexes for tenant-scoped and relation lookups that previously had none.
-- Idempotent: safe on databases that were created with `prisma db push`.

CREATE INDEX IF NOT EXISTS "Grade_schoolId_idx" ON "Grade"("schoolId");
CREATE INDEX IF NOT EXISTS "Class_schoolId_idx" ON "Class"("schoolId");
CREATE INDEX IF NOT EXISTS "Class_gradeId_idx" ON "Class"("gradeId");
CREATE INDEX IF NOT EXISTS "Class_homeroomTeacherId_idx" ON "Class"("homeroomTeacherId");
CREATE INDEX IF NOT EXISTS "Subject_schoolId_idx" ON "Subject"("schoolId");
CREATE INDEX IF NOT EXISTS "ExamAttempt_examId_studentId_idx" ON "ExamAttempt"("examId", "studentId");
CREATE INDEX IF NOT EXISTS "ExamAttempt_studentId_idx" ON "ExamAttempt"("studentId");
CREATE INDEX IF NOT EXISTS "InviteToken_schoolId_idx" ON "InviteToken"("schoolId");
CREATE INDEX IF NOT EXISTS "InviteToken_email_idx" ON "InviteToken"("email");
CREATE INDEX IF NOT EXISTS "Certificate_studentId_idx" ON "Certificate"("studentId");
CREATE INDEX IF NOT EXISTS "Certificate_issuedById_idx" ON "Certificate"("issuedById");
