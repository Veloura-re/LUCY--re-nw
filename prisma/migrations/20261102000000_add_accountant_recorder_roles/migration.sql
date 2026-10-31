-- Two staff roles a director can invite by email: ACCOUNTANT (school finance) and RECORDER (student records).
-- Idempotent: safe on databases that were created with `prisma db push`.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ACCOUNTANT';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'RECORDER';
