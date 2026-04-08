-- ==========================================
-- Supabase Storage Setup Initialization
-- Run this script in your Supabase SQL Editor
-- ==========================================

-- 1. Create the 'books' bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('books', 'books', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Create the 'messages' bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('messages', 'messages', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Create the 'avatars' bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;


-- 5. Create Public Access Policies for 'books'
CREATE POLICY "Public Access Books" ON storage.objects
  FOR SELECT USING (bucket_id = 'books');

CREATE POLICY "Authenticated Users Can Upload Books" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'books' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated Users Can Update Books" ON storage.objects
  FOR UPDATE USING (bucket_id = 'books' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated Users Can Delete Books" ON storage.objects
  FOR DELETE USING (bucket_id = 'books' AND auth.role() = 'authenticated');

-- 6. Create Public Access Policies for 'messages'
CREATE POLICY "Public Access Messages" ON storage.objects
  FOR SELECT USING (bucket_id = 'messages');

CREATE POLICY "Authenticated Users Can Upload Messages" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'messages' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated Users Can Update Messages" ON storage.objects
  FOR UPDATE USING (bucket_id = 'messages' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated Users Can Delete Messages" ON storage.objects
  FOR DELETE USING (bucket_id = 'messages' AND auth.role() = 'authenticated');

-- 7. Create Public Access Policies for 'avatars'
CREATE POLICY "Public Access Avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated Users Can Upload Avatars" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated Users Can Update Avatars" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated Users Can Delete Avatars" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- 4. Create the 'brand' bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('brand', 'brand', true)
ON CONFLICT (id) DO NOTHING;

-- 8. Create Public Access Policies for 'brand'
CREATE POLICY "Public Access Brand" ON storage.objects
  FOR SELECT USING (bucket_id = 'brand');

CREATE POLICY "Authenticated Users Can Upload Brand Assets" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'brand' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated Users Can Update Brand Assets" ON storage.objects
  FOR UPDATE USING (bucket_id = 'brand' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated Users Can Delete Brand Assets" ON storage.objects
  FOR DELETE USING (bucket_id = 'brand' AND auth.role() = 'authenticated');
