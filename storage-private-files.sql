-- ==========================================
-- Make uploaded-file buckets private.
--
-- RUN THIS LAST. Order of rollout:
--   1. Deploy the code that stores /api/files/... references.
--   2. npx ts-node scripts/migrate-file-urls.ts --apply   (rewrites existing public URLs)
--   3. Run this script.
-- Running it before step 2 breaks every existing photo, logo, book and attachment.
-- Files are then served only through /api/files/<bucket>/<path>, which checks the caller's
-- school and redirects to a short-lived signed URL.
-- ==========================================

UPDATE storage.buckets SET public = false WHERE id IN ('school-assets', 'books');

DROP POLICY IF EXISTS "Public Access Books" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
