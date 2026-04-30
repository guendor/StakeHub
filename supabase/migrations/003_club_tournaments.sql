-- ============================================================
-- StakeHub — Migration 003: Clubs, Official Tournaments & Admin
-- ============================================================

-- 1. Update Enum (must be outside a transaction block if possible, 
-- but Supabase SQL editor usually handles this fine)
COMMIT; -- Ensure we are not in a transaction block
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'club';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';

-- 2. Add verification to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- Policy to allow admins to update profiles (e.g. to verify them)
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE USING (
    (SELECT role::text FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- 3. Create Club Tournaments table
CREATE TABLE IF NOT EXISTS club_tournaments (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  date             DATE NOT NULL,
  buy_in           NUMERIC(12, 2) NOT NULL CHECK (buy_in >= 0),
  guaranteed_prize NUMERIC(12, 2) CHECK (guaranteed_prize >= 0),
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_club_tournaments_club ON club_tournaments(club_id);
CREATE INDEX IF NOT EXISTS idx_club_tournaments_active ON club_tournaments(is_active);

-- 4. Link listings to club tournaments
ALTER TABLE listings ADD COLUMN IF NOT EXISTS club_tournament_id UUID REFERENCES club_tournaments(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_listings_club_tournament ON listings(club_tournament_id);

-- 5. RLS for Club Tournaments
ALTER TABLE club_tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club tournaments are publicly readable"
  ON club_tournaments FOR SELECT USING (true);

CREATE POLICY "Clubs can create their own tournaments"
  ON club_tournaments FOR INSERT WITH CHECK (
    auth.uid() = club_id 
    AND (SELECT role::text FROM profiles WHERE id = auth.uid()) = 'club'
  );

CREATE POLICY "Clubs can update their own tournaments"
  ON club_tournaments FOR UPDATE USING (
    auth.uid() = club_id 
    AND (SELECT role::text FROM profiles WHERE id = auth.uid()) = 'club'
  );

CREATE POLICY "Clubs can delete their own tournaments"
  ON club_tournaments FOR DELETE USING (
    auth.uid() = club_id 
    AND (SELECT role::text FROM profiles WHERE id = auth.uid()) = 'club'
  );

-- Update the computed view to include club_tournament_id
DROP VIEW IF EXISTS listings_computed;
CREATE OR REPLACE VIEW listings_computed AS
SELECT
  l.*,
  (l.buy_in + l.addon + l.other_fees) AS total_cost,
  CASE WHEN l.total_quotas > 0
    THEN ROUND((l.buy_in + l.addon + l.other_fees) * (1 + l.pct_per_quota / 100) / l.total_quotas, 2)
    ELSE 0
  END AS price_per_quota,
  COALESCE((SELECT SUM(i.quotas_wanted) FROM interests i WHERE i.listing_id = l.id), 0) AS quotas_taken
FROM listings l;
