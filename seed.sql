-- IDs
-- School: f1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6
-- Grade: g1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6
-- Class: c1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6
-- Student: s1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6

-- Ensure school exists
INSERT INTO "School" (id, name, "schoolCode", status) 
VALUES ('f1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6', 'LUCY Academy of Excellence', 'LUCY-RE-01', 'ACTIVE')
ON CONFLICT ("schoolCode") DO NOTHING;

-- Ensure schema is up to date
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "attendanceConfig" JSONB DEFAULT '{"type": "PERIOD", "lockAfterMinutes": 30, "enableLateMarking": true}';
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "address" TEXT;

-- 1. Create Subjects
INSERT INTO "Subject" (id, "schoolId", name) 
SELECT t.id, s.id, t.name
FROM (VALUES
    ('sub-math', 'Advanced Mathematics'),
    ('sub-sci', 'Quantum Physics'),
    ('sub-eng', 'Modern Literature')
) AS t(id, name)
CROSS JOIN (SELECT id FROM "School" WHERE "schoolCode" = 'LUCY-RE-01' LIMIT 1) AS s
ON CONFLICT (id) DO NOTHING;

-- 2. Create Grade
INSERT INTO "Grade" (id, "schoolId", name, level)
SELECT 'g1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6', id, 'Grade 10', 10
FROM "School" WHERE "schoolCode" = 'LUCY-RE-01' LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- 3. Create Class
INSERT INTO "Class" (id, "gradeId", name)
SELECT 'c1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6', id, 'Science-A'
FROM "Grade" WHERE id = 'g1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6' LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- 4. Create Teacher User (Placeholder)
INSERT INTO "User" (id, email, name, role, verified, "schoolId", "updatedAt")
SELECT 't1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6', 'teacher@school.edu', 'Prof. Orion Vance', 'TEACHER', true, id, CURRENT_TIMESTAMP
FROM "School" WHERE "schoolCode" = 'LUCY-RE-01' LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- 5. Create Staffing Assignments
INSERT INTO "TeacherAssignment" (id, "teacherId", "classId", "subjectId") VALUES
('ta-math', 't1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6', 'c1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6', 'sub-math'),
('ta-sci', 't1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6', 'c1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6', 'sub-sci')
ON CONFLICT (id) DO NOTHING;

-- 4. Set Attendance Config
UPDATE "School" 
SET "attendanceConfig" = '{"type": "PERIOD", "lockAfterMinutes": 30, "enableLateMarking": true}'
WHERE "schoolCode" = 'LUCY-RE-01';
