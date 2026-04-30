-- ============================================================
-- StakeHub — Migration 005: Platform IDs
-- ============================================================

-- 1. Create a sequence starting at 1000
CREATE SEQUENCE IF NOT EXISTS profiles_platform_id_seq START 1000;

-- 2. Add the column (allowing nulls temporarily so we can populate)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS platform_id INTEGER UNIQUE;

-- 3. Populate existing rows using the sequence
UPDATE profiles 
SET platform_id = nextval('profiles_platform_id_seq')
WHERE platform_id IS NULL;

-- 4. Set the default so future users get the ID automatically
ALTER TABLE profiles ALTER COLUMN platform_id SET DEFAULT nextval('profiles_platform_id_seq');

-- 5. Make the column NOT NULL now that everyone has an ID
ALTER TABLE profiles ALTER COLUMN platform_id SET NOT NULL;

-- 6. Add an index to make searches fast
CREATE INDEX IF NOT EXISTS idx_profiles_platform_id ON profiles(platform_id);
