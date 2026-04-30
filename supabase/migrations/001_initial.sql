-- ============================================================
-- StakeHub — Initial Database Migration
-- Run this in the Supabase SQL Editor after creating your project
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_role AS ENUM ('player', 'backer');
CREATE TYPE listing_status AS ENUM ('open', 'funded', 'in_progress', 'settled');

-- ============================================================
-- PROFILES
-- Extended user profile, linked 1:1 to auth.users
-- ============================================================
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role          user_role NOT NULL DEFAULT 'player',
  display_name  TEXT NOT NULL DEFAULT '',
  bio           TEXT,
  achievements  TEXT[],
  external_links JSONB DEFAULT '[]'::jsonb,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile shell on sign-up (optional, you can also do it client-side)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- LISTINGS
-- Tournament staking announcements posted by players
-- ============================================================
CREATE TABLE listings (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tournament_name  TEXT NOT NULL,
  tournament_date  DATE NOT NULL,
  venue            TEXT,
  buy_in           NUMERIC(12, 2) NOT NULL CHECK (buy_in >= 0),
  addon            NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (addon >= 0),
  other_fees       NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (other_fees >= 0),
  guaranteed_prize NUMERIC(12, 2) CHECK (guaranteed_prize >= 0),
  total_quotas     INT NOT NULL CHECK (total_quotas > 0),
  pct_per_quota    NUMERIC(6, 2) NOT NULL DEFAULT 0 CHECK (pct_per_quota >= 0),
  status           listing_status NOT NULL DEFAULT 'open',
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INTERESTS
-- Backers register interest in specific listing quotas
-- Payment processing will extend this table later
-- ============================================================
CREATE TABLE interests (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id    UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  backer_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quotas_wanted INT NOT NULL CHECK (quotas_wanted > 0),
  message       TEXT,
  -- PAYMENT STUB: reserved for future Stripe/PIX integration
  payment_stub  JSONB DEFAULT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Each backer can only register interest once per listing
  UNIQUE (listing_id, backer_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_listings_player_id ON listings(player_id);
CREATE INDEX idx_listings_status    ON listings(status);
CREATE INDEX idx_listings_date      ON listings(tournament_date);
CREATE INDEX idx_interests_listing  ON interests(listing_id);
CREATE INDEX idx_interests_backer   ON interests(backer_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE interests ENABLE ROW LEVEL SECURITY;

-- PROFILES policies
CREATE POLICY "Public profiles are readable by all"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- LISTINGS policies
CREATE POLICY "Listings are publicly readable"
  ON listings FOR SELECT USING (true);

CREATE POLICY "Players can create listings"
  ON listings FOR INSERT WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Players can update their own listings"
  ON listings FOR UPDATE USING (auth.uid() = player_id);

CREATE POLICY "Players can delete their own listings"
  ON listings FOR DELETE USING (auth.uid() = player_id);

-- INTERESTS policies
CREATE POLICY "Listing owners can see all interests on their listings"
  ON interests FOR SELECT USING (
    auth.uid() = backer_id
    OR auth.uid() = (SELECT player_id FROM listings WHERE id = listing_id)
  );

CREATE POLICY "Authenticated backers can insert interests"
  ON interests FOR INSERT WITH CHECK (auth.uid() = backer_id);

CREATE POLICY "Backers can delete their own interests"
  ON interests FOR DELETE USING (auth.uid() = backer_id);

-- ============================================================
-- HELPFUL VIEW: listing with computed fields
-- ============================================================
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
