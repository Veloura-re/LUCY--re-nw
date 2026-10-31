-- Add 'brand' bucket for corporate/school assets (public read; no client writes).
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand', 'brand', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access Brand" ON storage.objects;
CREATE POLICY "Public Access Brand" ON storage.objects FOR SELECT USING (bucket_id = 'brand');
