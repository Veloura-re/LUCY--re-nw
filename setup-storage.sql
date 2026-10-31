-- ==========================================
-- Supabase Storage Setup Initialization
-- Run this script in your Supabase SQL Editor, then run storage-hardening.sql
-- (write policies are tenant-scoped there, not here).
-- ==========================================

-- Private bucket for books, covers and other uploads: served through /api/files/<bucket>/<path>
INSERT INTO storage.buckets (id, name, public) VALUES ('books', 'books', false) ON CONFLICT (id) DO NOTHING;

-- Public read buckets that the app never writes to from the client
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('brand', 'brand', true) ON CONFLICT (id) DO NOTHING;

-- Private bucket for chat attachments: no client policies, served by /api/messages/attachment
INSERT INTO storage.buckets (id, name, public) VALUES ('messages', 'messages', false) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access Avatars" ON storage.objects;
CREATE POLICY "Public Access Avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Public Access Brand" ON storage.objects;
CREATE POLICY "Public Access Brand" ON storage.objects FOR SELECT USING (bucket_id = 'brand');
