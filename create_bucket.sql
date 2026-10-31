-- Private bucket for school uploads (photos, logos, materials, submissions, receipts).
-- Files are served through /api/files/<bucket>/<path>, never by public URL.
-- Run storage-hardening.sql afterwards for tenant-scoped writes.
INSERT INTO storage.buckets (id, name, public) VALUES ('school-assets', 'school-assets', false) ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
