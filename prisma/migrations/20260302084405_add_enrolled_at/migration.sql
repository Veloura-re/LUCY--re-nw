/*
  Warnings:

  - A unique constraint covering the columns `[studentId,examId]` on the table `AttendanceRecord` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[studentId,examId]` on the table `GradeRecord` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[teacherCode]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Exam` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `GradeRecord` table without a default value. This is not possible if the table is not empty.
  - Made the column `examId` on table `GradeRecord` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "AuthorizationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ExamCategory" AS ENUM ('QUIZ', 'TEST', 'ASSIGNMENT', 'MID_TERM', 'FINAL_EXAM', 'PROJECT', 'OTHER');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FULFILLED');

-- DropForeignKey
ALTER TABLE "AttendanceRecord" DROP CONSTRAINT "AttendanceRecord_studentId_fkey";

-- DropForeignKey
ALTER TABLE "Certificate" DROP CONSTRAINT "Certificate_studentId_fkey";

-- DropForeignKey
ALTER TABLE "ExamAttempt" DROP CONSTRAINT "ExamAttempt_studentId_fkey";

-- DropForeignKey
ALTER TABLE "GradeRecord" DROP CONSTRAINT "GradeRecord_examId_fkey";

-- DropForeignKey
ALTER TABLE "GradeRecord" DROP CONSTRAINT "GradeRecord_studentId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_studentId_fkey";

-- DropForeignKey
ALTER TABLE "ParentStudentLink" DROP CONSTRAINT "ParentStudentLink_studentId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_invoiceId_fkey";

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "targetRole" "Role";

-- AlterTable
ALTER TABLE "Exam" ADD COLUMN     "category" "ExamCategory" NOT NULL DEFAULT 'TEST',
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "prerequisiteId" TEXT,
ADD COLUMN     "totalMarks" DOUBLE PRECISION NOT NULL DEFAULT 100,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "availableFrom" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "ExamAttempt" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "GradeRecord" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "examId" SET NOT NULL;

-- AlterTable
ALTER TABLE "School" ADD COLUMN     "address" TEXT;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "address" TEXT,
ADD COLUMN     "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "grandfatherName" TEXT,
ADD COLUMN     "guardianName" TEXT,
ADD COLUMN     "guardianPhone" TEXT,
ADD COLUMN     "guardianRelation" TEXT,
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "secondaryPhone" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "gender" "Gender",
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "qualification" TEXT,
ADD COLUMN     "teacherCode" TEXT;

-- CreateTable
CREATE TABLE "AbsenceAuthorization" (
    "id" TEXT NOT NULL,
    "studentId" TEXT,
    "userId" TEXT,
    "requestorId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "status" "AuthorizationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AbsenceAuthorization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "author" TEXT,
    "academicYear" TEXT,
    "edition" TEXT,
    "description" TEXT,
    "expiresAt" TIMESTAMP(3),
    "prerequisiteId" TEXT,
    "teacherNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookRequest" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT,
    "grade" TEXT,
    "reason" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitPack" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnitPack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitPackResource" (
    "id" TEXT NOT NULL,
    "unitPackId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UnitPackResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarklistConfig" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "teacherId" TEXT,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarklistConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarklistColumn" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "maxMarks" DOUBLE PRECISION NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MarklistColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarklistEntry" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "total" DOUBLE PRECISION,
    "percentage" DOUBLE PRECISION,
    "grade" TEXT,
    "remarks" TEXT,

    CONSTRAINT "MarklistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarklistMark" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "columnId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "MarklistMark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffAttendanceRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "reason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffAttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AbsenceAuthorization_studentId_idx" ON "AbsenceAuthorization"("studentId");

-- CreateIndex
CREATE INDEX "AbsenceAuthorization_userId_idx" ON "AbsenceAuthorization"("userId");

-- CreateIndex
CREATE INDEX "AbsenceAuthorization_requestorId_idx" ON "AbsenceAuthorization"("requestorId");

-- CreateIndex
CREATE INDEX "Book_schoolId_idx" ON "Book"("schoolId");

-- CreateIndex
CREATE INDEX "Book_classId_idx" ON "Book"("classId");

-- CreateIndex
CREATE INDEX "Book_subjectId_idx" ON "Book"("subjectId");

-- CreateIndex
CREATE INDEX "BookRequest_schoolId_idx" ON "BookRequest"("schoolId");

-- CreateIndex
CREATE INDEX "BookRequest_userId_idx" ON "BookRequest"("userId");

-- CreateIndex
CREATE INDEX "UnitPack_schoolId_idx" ON "UnitPack"("schoolId");

-- CreateIndex
CREATE INDEX "UnitPackResource_unitPackId_idx" ON "UnitPackResource"("unitPackId");

-- CreateIndex
CREATE INDEX "UnitPackResource_bookId_idx" ON "UnitPackResource"("bookId");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceProgress_userId_bookId_key" ON "ResourceProgress"("userId", "bookId");

-- CreateIndex
CREATE INDEX "MarklistConfig_schoolId_idx" ON "MarklistConfig"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "MarklistConfig_classId_subjectId_key" ON "MarklistConfig"("classId", "subjectId");

-- CreateIndex
CREATE INDEX "MarklistColumn_configId_idx" ON "MarklistColumn"("configId");

-- CreateIndex
CREATE UNIQUE INDEX "MarklistEntry_configId_studentId_key" ON "MarklistEntry"("configId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "MarklistMark_entryId_columnId_key" ON "MarklistMark"("entryId", "columnId");

-- CreateIndex
CREATE INDEX "StaffAttendanceRecord_userId_idx" ON "StaffAttendanceRecord"("userId");

-- CreateIndex
CREATE INDEX "StaffAttendanceRecord_date_idx" ON "StaffAttendanceRecord"("date");

-- CreateIndex
CREATE UNIQUE INDEX "StaffAttendanceRecord_userId_date_key" ON "StaffAttendanceRecord"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_studentId_examId_key" ON "AttendanceRecord"("studentId", "examId");

-- CreateIndex
CREATE INDEX "Event_schoolId_idx" ON "Event"("schoolId");

-- CreateIndex
CREATE INDEX "Event_eventDate_idx" ON "Event"("eventDate");

-- CreateIndex
CREATE INDEX "Exam_classId_idx" ON "Exam"("classId");

-- CreateIndex
CREATE INDEX "Exam_subjectId_idx" ON "Exam"("subjectId");

-- CreateIndex
CREATE INDEX "Exam_createdById_idx" ON "Exam"("createdById");

-- CreateIndex
CREATE INDEX "GradeRecord_studentId_idx" ON "GradeRecord"("studentId");

-- CreateIndex
CREATE INDEX "GradeRecord_examId_idx" ON "GradeRecord"("examId");

-- CreateIndex
CREATE INDEX "GradeRecord_subjectId_idx" ON "GradeRecord"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "GradeRecord_studentId_examId_key" ON "GradeRecord"("studentId", "examId");

-- CreateIndex
CREATE UNIQUE INDEX "User_teacherCode_key" ON "User"("teacherCode");

-- AddForeignKey
ALTER TABLE "ParentStudentLink" ADD CONSTRAINT "ParentStudentLink_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_prerequisiteId_fkey" FOREIGN KEY ("prerequisiteId") REFERENCES "Exam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeRecord" ADD CONSTRAINT "GradeRecord_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeRecord" ADD CONSTRAINT "GradeRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenceAuthorization" ADD CONSTRAINT "AbsenceAuthorization_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenceAuthorization" ADD CONSTRAINT "AbsenceAuthorization_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenceAuthorization" ADD CONSTRAINT "AbsenceAuthorization_requestorId_fkey" FOREIGN KEY ("requestorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_prerequisiteId_fkey" FOREIGN KEY ("prerequisiteId") REFERENCES "Book"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookRequest" ADD CONSTRAINT "BookRequest_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookRequest" ADD CONSTRAINT "BookRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitPack" ADD CONSTRAINT "UnitPack_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitPackResource" ADD CONSTRAINT "UnitPackResource_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitPackResource" ADD CONSTRAINT "UnitPackResource_unitPackId_fkey" FOREIGN KEY ("unitPackId") REFERENCES "UnitPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceProgress" ADD CONSTRAINT "ResourceProgress_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceProgress" ADD CONSTRAINT "ResourceProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarklistConfig" ADD CONSTRAINT "MarklistConfig_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarklistConfig" ADD CONSTRAINT "MarklistConfig_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarklistConfig" ADD CONSTRAINT "MarklistConfig_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarklistConfig" ADD CONSTRAINT "MarklistConfig_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarklistColumn" ADD CONSTRAINT "MarklistColumn_configId_fkey" FOREIGN KEY ("configId") REFERENCES "MarklistConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarklistEntry" ADD CONSTRAINT "MarklistEntry_configId_fkey" FOREIGN KEY ("configId") REFERENCES "MarklistConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarklistEntry" ADD CONSTRAINT "MarklistEntry_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarklistMark" ADD CONSTRAINT "MarklistMark_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "MarklistColumn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarklistMark" ADD CONSTRAINT "MarklistMark_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "MarklistEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAttendanceRecord" ADD CONSTRAINT "StaffAttendanceRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAttendanceRecord" ADD CONSTRAINT "StaffAttendanceRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
