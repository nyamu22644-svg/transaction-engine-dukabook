-- ============================================================================
-- HYBRID ACCESS CODES MIGRATION
-- This creates the store_access_codes table for the hybrid approach:
-- - Primary code in stores.access_code (immutable, set during store creation)
-- - Additional codes in store_access_codes table (can be created/deactivated by owner)
-- ============================================================================

-- Create store_access_codes table for additional access codes
CREATE TABLE IF NOT EXISTS store_access_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  
  -- Access Code Details
  code VARCHAR(20) NOT NULL UNIQUE,  -- Unique access code (e.g., "STAFFABC1234")
  label VARCHAR(100),  -- Optional name (e.g., "Manager Code", "Staff Access")
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),  -- Who created it
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  
  -- Security
  expires_at TIMESTAMPTZ,  -- Optional expiration
  usage_count INTEGER DEFAULT 0
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_store_access_codes_store_id ON store_access_codes(store_id);
CREATE INDEX IF NOT EXISTS idx_store_access_codes_code ON store_access_codes(code);
CREATE INDEX IF NOT EXISTS idx_store_access_codes_is_active ON store_access_codes(is_active);

-- Enable Row Level Security
ALTER TABLE store_access_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Store owners can view their own access codes
DROP POLICY IF EXISTS "Store owners view own access codes" ON store_access_codes;
CREATE POLICY "Store owners view own access codes"
  ON store_access_codes
  FOR SELECT
  USING (
    (SELECT owner_id FROM stores WHERE stores.id = store_access_codes.store_id) = auth.uid()
    OR auth.role() = 'service_role'
  );

-- RLS Policy: Store owners can create access codes for their store
DROP POLICY IF EXISTS "Store owners create own access codes" ON store_access_codes;
CREATE POLICY "Store owners create own access codes"
  ON store_access_codes
  FOR INSERT
  WITH CHECK (
    (SELECT owner_id FROM stores WHERE stores.id = store_access_codes.store_id) = auth.uid()
    OR auth.role() = 'service_role'
  );

-- RLS Policy: Store owners can update/deactivate their own access codes
DROP POLICY IF EXISTS "Store owners update own access codes" ON store_access_codes;
CREATE POLICY "Store owners update own access codes"
  ON store_access_codes
  FOR UPDATE
  USING (
    (SELECT owner_id FROM stores WHERE stores.id = store_access_codes.store_id) = auth.uid()
    OR auth.role() = 'service_role'
  );

-- ============================================================================
-- NEXT STEPS:
-- 1. Copy and run this SQL in Supabase SQL Editor
-- 2. The app will now support hybrid access codes:
--    - Primary: stores.access_code (set during signup, cannot be deleted)
--    - Additional: store_access_codes table (created by owner, can be deactivated)
-- ============================================================================
