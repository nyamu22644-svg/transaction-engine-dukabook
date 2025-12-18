-- ============================================================================
-- STORE CREDENTIALS & ACCESS CODES - Secure credential management
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- STEP 1: Store Access Codes Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS store_access_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  
  -- Access Code Details
  code VARCHAR(20) NOT NULL UNIQUE,  -- Unique access code
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

-- ============================================================================
-- STEP 2: Store Credentials Table (PIN, Password hashes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS store_credentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL UNIQUE REFERENCES stores(id) ON DELETE CASCADE,
  
  -- Hashed values (never store plain text!)
  pin_hash VARCHAR(255),  -- Argon2 hash
  password_hash VARCHAR(255),  -- Argon2 hash
  
  -- Audit
  pin_updated_at TIMESTAMPTZ,
  password_updated_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_store_credentials_store_id ON store_credentials(store_id);

-- ============================================================================
-- STEP 3: RLS Policies
-- ============================================================================

ALTER TABLE store_access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_credentials ENABLE ROW LEVEL SECURITY;

-- Store owners can manage their own access codes
DROP POLICY IF EXISTS "Store owners view own access codes" ON store_access_codes;
CREATE POLICY "Store owners view own access codes"
  ON store_access_codes
  FOR SELECT
  USING (
    (SELECT owner_id FROM stores WHERE stores.id = store_access_codes.store_id) = auth.uid()
    OR auth.role() = 'service_role'
  );

DROP POLICY IF EXISTS "Store owners create own access codes" ON store_access_codes;
CREATE POLICY "Store owners create own access codes"
  ON store_access_codes
  FOR INSERT
  WITH CHECK (
    (SELECT owner_id FROM stores WHERE stores.id = store_access_codes.store_id) = auth.uid()
  );

DROP POLICY IF EXISTS "Store owners update own access codes" ON store_access_codes;
CREATE POLICY "Store owners update own access codes"
  ON store_access_codes
  FOR UPDATE
  USING (
    (SELECT owner_id FROM stores WHERE stores.id = store_access_codes.store_id) = auth.uid()
  );

-- Store credentials - more restrictive
DROP POLICY IF EXISTS "Store owners view own credentials" ON store_credentials;
CREATE POLICY "Store owners view own credentials"
  ON store_credentials
  FOR SELECT
  USING (
    (SELECT owner_id FROM stores WHERE stores.id = store_credentials.store_id) = auth.uid()
    OR auth.role() = 'service_role'
  );

DROP POLICY IF EXISTS "Store owners update own credentials" ON store_credentials;
CREATE POLICY "Store owners update own credentials"
  ON store_credentials
  FOR UPDATE
  USING (
    (SELECT owner_id FROM stores WHERE stores.id = store_credentials.store_id) = auth.uid()
  );

-- ============================================================================
-- STEP 4: RPC Function to Create Access Code
-- ============================================================================

-- Create access code with uniqueness validation
CREATE OR REPLACE FUNCTION create_access_code(
  p_store_id UUID,
  p_code VARCHAR,
  p_label VARCHAR DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  store_id UUID,
  code VARCHAR,
  label VARCHAR,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  usage_count INTEGER
) AS $$
BEGIN
  -- Check if code already exists for this store or globally
  IF EXISTS(SELECT 1 FROM store_access_codes WHERE code = p_code) THEN
    RAISE EXCEPTION 'Access code already exists';
  END IF;

  -- Insert new access code
  RETURN QUERY
  INSERT INTO store_access_codes (store_id, code, label, created_by)
  VALUES (p_store_id, p_code, p_label, auth.uid())
  RETURNING
    store_access_codes.id,
    store_access_codes.store_id,
    store_access_codes.code,
    store_access_codes.label,
    store_access_codes.is_active,
    store_access_codes.created_at,
    store_access_codes.last_used_at,
    store_access_codes.expires_at,
    store_access_codes.usage_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 6: Verification
-- ============================================================================

SELECT 
  'Access Codes Table' as object,
  COUNT(*) as count
FROM store_access_codes
UNION ALL
SELECT 
  'Credentials Table' as object,
  COUNT(*) as count
FROM store_credentials;
