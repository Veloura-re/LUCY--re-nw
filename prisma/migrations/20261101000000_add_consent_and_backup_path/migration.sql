-- Recorded acceptance of the Terms and Privacy Policy, and the storage path of each backup.
-- Idempotent: safe on databases that were created with `prisma db push`.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "legalVersionAccepted" TEXT;
ALTER TABLE "RestorePoint" ADD COLUMN IF NOT EXISTS "filePath" TEXT;

CREATE TABLE IF NOT EXISTS "ConsentRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userAgent" TEXT,
    "source" TEXT NOT NULL,
    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ConsentRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ConsentRecord_userId_documentType_version_key" ON "ConsentRecord"("userId", "documentType", "version");
CREATE INDEX IF NOT EXISTS "ConsentRecord_userId_idx" ON "ConsentRecord"("userId");

ALTER TABLE "ConsentRecord" ENABLE ROW LEVEL SECURITY;
