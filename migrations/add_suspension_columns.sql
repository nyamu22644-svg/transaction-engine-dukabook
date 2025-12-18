-- ============================================================================
-- Add Suspension Columns to Stores Table
-- Enables store suspension functionality for admin control
-- Run this migration in Supabase SQL Editor
-- ============================================================================

-- Add suspension-related columns to stores table
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;

-- Create index for quick suspension status lookups
CREATE INDEX IF NOT EXISTS idx_stores_is_suspended ON stores(is_suspended);

-- Add comments for clarity
COMMENT ON COLUMN stores.is_suspended IS 'Whether the store account is suspended';
COMMENT ON COLUMN stores.suspension_reason IS 'Reason for suspension if applicable';
COMMENT ON COLUMN stores.suspended_at IS 'Timestamp when store was suspended';

-- ============================================================================
-- Update RLS Policy to Include Suspension Check
-- ============================================================================

-- Stores table should have a policy preventing access to suspended stores
-- This check happens in the application layer, but we can add a trigger
-- to auto-expire subscriptions if store is suspended

CREATE OR REPLACE FUNCTION handle_store_suspension()
RETURNS TRIGGER AS $$
BEGIN
  -- When a store is suspended, mark its subscription as cancelled
  IF NEW.is_suspended = TRUE AND OLD.is_suspended = FALSE THEN
    UPDATE subscriptions
    SET status = 'cancelled'
    WHERE store_id = NEW.id;
  END IF;
  
  -- When a store is unsuspended, reactivate its subscription if it hasn't expired
  IF NEW.is_suspended = FALSE AND OLD.is_suspended = TRUE THEN
    UPDATE subscriptions
    SET status = 'active'
    WHERE store_id = NEW.id 
      AND status = 'cancelled'
      AND expires_at > NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to handle suspension changes
DROP TRIGGER IF EXISTS trigger_store_suspension ON stores;
CREATE TRIGGER trigger_store_suspension
AFTER UPDATE ON stores
FOR EACH ROW
WHEN (OLD.is_suspended IS DISTINCT FROM NEW.is_suspended)
EXECUTE FUNCTION handle_store_suspension();

-- ============================================================================
-- End of Migration
-- ============================================================================
