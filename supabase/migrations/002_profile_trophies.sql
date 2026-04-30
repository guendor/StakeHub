-- ============================================================
-- StakeHub — Migration 002: Profile Edit + Trophy Showcase
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Add nickname field to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nickname TEXT;

-- ============================================================
-- TROPHIES
-- Trophy showcase for players
-- ============================================================
CREATE TABLE IF NOT EXISTS trophies (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  photo_url        TEXT NOT NULL,
  placement        TEXT NOT NULL,        -- e.g. "1º lugar", "2º lugar", "Final table"
  tournament_name  TEXT NOT NULL,
  prize_amount     NUMERIC(12, 2),       -- prize in BRL, nullable
  tournament_date  DATE NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trophies_player ON trophies(player_id);
CREATE INDEX IF NOT EXISTS idx_trophies_date   ON trophies(tournament_date DESC);

-- ============================================================
-- RLS for trophies
-- ============================================================
ALTER TABLE trophies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trophies are publicly readable"
  ON trophies FOR SELECT USING (true);

CREATE POLICY "Players can insert their own trophies"
  ON trophies FOR INSERT WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Players can update their own trophies"
  ON trophies FOR UPDATE USING (auth.uid() = player_id);

CREATE POLICY "Players can delete their own trophies"
  ON trophies FOR DELETE USING (auth.uid() = player_id);

-- ============================================================
-- STORAGE BUCKETS (run in SQL or create via Supabase Dashboard)
-- Note: If these fail in SQL, create them manually in the
-- Supabase Dashboard > Storage section
-- ============================================================

-- Avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Trophies bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('trophies', 'trophies', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies: avatars
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage policies: trophies
CREATE POLICY "Trophy images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'trophies');

CREATE POLICY "Users can upload their own trophy images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'trophies' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own trophy images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'trophies' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own trophy images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'trophies' AND (storage.foldername(name))[1] = auth.uid()::text);
