-- ============================================================
-- StakeHub — Migration 004: Admin User Management & Audit
-- ============================================================

-- 1. Add balance to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0);

-- 2. Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id       UUID REFERENCES profiles(id) ON DELETE SET NULL, -- the user making the change
  target_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- the user being changed
  action         TEXT NOT NULL,
  old_data       JSONB,
  new_data       JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 3. RLS for audit_logs (Only Admins can select, NO ONE can delete/update)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT USING (
    (SELECT role::text FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- We intentionally DO NOT create UPDATE or DELETE policies for audit_logs
-- For insertions, we'll let the trigger handle it using SECURITY DEFINER

-- 4. Trigger to automatically log profile changes
CREATE OR REPLACE FUNCTION public.log_profile_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- We only want to log changes to balance, role, or verification status
  IF (
    NEW.role::text <> OLD.role::text OR 
    NEW.balance <> OLD.balance OR 
    NEW.is_verified IS DISTINCT FROM OLD.is_verified
  ) THEN
    -- If auth.uid() is null (e.g. system generated), it will be null in admin_id
    INSERT INTO public.audit_logs (admin_id, target_user_id, action, old_data, new_data)
    VALUES (
      auth.uid(),
      OLD.id,
      'UPDATE_PROFILE',
      jsonb_build_object('role', OLD.role, 'balance', OLD.balance, 'is_verified', OLD.is_verified),
      jsonb_build_object('role', NEW.role, 'balance', NEW.balance, 'is_verified', NEW.is_verified)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to recreate
DROP TRIGGER IF EXISTS trigger_log_profile_changes ON profiles;

CREATE TRIGGER trigger_log_profile_changes
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_profile_changes();
