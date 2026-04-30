-- ============================================================
-- StakeHub — Migration 006: Staking Flow
-- ============================================================

-- 1. Add status to interests
ALTER TABLE interests ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected'));

-- 2. Add escrow_balance and club_tournament_id to listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS escrow_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (escrow_balance >= 0);

-- Note: listings already has club_tournament_id from migration 003, but just in case:
-- ALTER TABLE listings ADD COLUMN IF NOT EXISTS club_tournament_id UUID REFERENCES club_tournaments(id) ON DELETE SET NULL;

-- 3. Recreate listings_computed to only count accepted quotas
DROP VIEW IF EXISTS listings_computed;
CREATE OR REPLACE VIEW listings_computed AS
SELECT
  l.*,
  (l.buy_in + l.addon + l.other_fees) AS total_cost,
  CASE WHEN l.total_quotas > 0
    THEN ROUND((l.buy_in + l.addon + l.other_fees) * (1 + l.pct_per_quota / 100) / l.total_quotas, 2)
    ELSE 0
  END AS price_per_quota,
  COALESCE((SELECT SUM(i.quotas_wanted) FROM interests i WHERE i.listing_id = l.id AND i.status = 'accepted'), 0) AS quotas_taken
FROM listings l;

-- 4. RPC: Admin Adjust Balance
CREATE OR REPLACE FUNCTION public.admin_adjust_balance(p_target_user_id UUID, p_amount NUMERIC)
RETURNS NUMERIC AS $$
DECLARE
    new_balance NUMERIC;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    UPDATE profiles
    SET balance = balance + p_amount
    WHERE id = p_target_user_id
    RETURNING balance INTO new_balance;

    RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC: Reject Staking Interest
CREATE OR REPLACE FUNCTION public.reject_staking_interest(p_interest_id UUID)
RETURNS VOID AS $$
DECLARE
    v_listing_id UUID;
    v_player_id UUID;
BEGIN
    -- Get listing info
    SELECT listing_id INTO v_listing_id FROM interests WHERE id = p_interest_id;
    SELECT player_id INTO v_player_id FROM listings WHERE id = v_listing_id;

    -- Only listing owner can reject
    IF auth.uid() != v_player_id THEN
        RAISE EXCEPTION 'Only the listing owner can reject this proposal';
    END IF;

    UPDATE interests
    SET status = 'rejected'
    WHERE id = p_interest_id AND status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC: Accept Staking Interest (Transação Segura)
CREATE OR REPLACE FUNCTION public.accept_staking_interest(p_interest_id UUID)
RETURNS VOID AS $$
DECLARE
    v_interest RECORD;
    v_listing RECORD;
    v_backer RECORD;
    v_cost NUMERIC;
    v_club_id UUID;
    v_current_taken INT;
BEGIN
    -- Lock the interest row to prevent race conditions
    SELECT * INTO v_interest FROM interests WHERE id = p_interest_id FOR UPDATE;

    IF v_interest.status != 'pending' THEN
        RAISE EXCEPTION 'Proposal is no longer pending';
    END IF;

    -- Lock the listing row
    SELECT * INTO v_listing FROM listings WHERE id = v_interest.listing_id FOR UPDATE;

    IF auth.uid() != v_listing.player_id THEN
        RAISE EXCEPTION 'Only the listing owner can accept this proposal';
    END IF;

    -- Compute current taken quotas
    SELECT COALESCE(SUM(quotas_wanted), 0) INTO v_current_taken FROM interests WHERE listing_id = v_listing.id AND status = 'accepted';

    IF v_current_taken + v_interest.quotas_wanted > v_listing.total_quotas THEN
        RAISE EXCEPTION 'Not enough quotas available';
    END IF;

    -- Calculate total cost for the investor
    v_cost := ROUND((v_listing.buy_in + v_listing.addon + v_listing.other_fees) * (1 + v_listing.pct_per_quota / 100) / v_listing.total_quotas, 2) * v_interest.quotas_wanted;

    -- Check investor balance
    SELECT * INTO v_backer FROM profiles WHERE id = v_interest.backer_id FOR UPDATE;
    IF v_backer.balance < v_cost THEN
        RAISE EXCEPTION 'Investor has insufficient balance';
    END IF;

    -- 1. Deduct from backer
    UPDATE profiles SET balance = balance - v_cost WHERE id = v_interest.backer_id;

    -- 2. Route funds
    IF v_listing.club_tournament_id IS NOT NULL THEN
        -- Route to club
        SELECT club_id INTO v_club_id FROM club_tournaments WHERE id = v_listing.club_tournament_id;
        UPDATE profiles SET balance = balance + v_cost WHERE id = v_club_id;
    ELSE
        -- Route to the listing's escrow_balance (Investment wallet for this staking)
        UPDATE listings SET escrow_balance = escrow_balance + v_cost WHERE id = v_listing.id;
    END IF;

    -- 3. Update interest status
    UPDATE interests SET status = 'accepted' WHERE id = p_interest_id;

    -- 4. Check if listing is fully funded
    IF v_current_taken + v_interest.quotas_wanted = v_listing.total_quotas THEN
        UPDATE listings SET status = 'funded' WHERE id = v_listing.id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
