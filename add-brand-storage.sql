-- Add 'brand' bucket for corporate/school assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('brand', 'brand', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access Brand" ON storage.objects
  FOR SELECT USING (bucket_id = 'brand');

CREATE POLICY "Authenticated Users Can Upload Brand Assets" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'brand' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated Users Can Update Brand Assets" ON storage.objects
  FOR UPDATE USING (bucket_id = 'brand' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated Users Can Delete Brand Assets" ON storage.objects
  FOR DELETE USING (bucket_id = 'brand' AND auth.role() = 'authenticated');
