-- ============================================================================
-- STORE ENTRY FLOW - Phone Number + Passkey + Device Token System
-- Secure, user-friendly store access without complex shop IDs
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- STEP 1: Store Access Keys (Simple passkeys per store)
-- ============================================================================

CREATE TABLE IF NOT EXISTS store_access_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL UNIQUE REFERENCES stores(id) ON DELETE CASCADE,
  
  -- Simple passkey (non-unique globally, unique per store only)
  -- Owner chooses something simple like: PASS, STORE123, ABC
  passkey_hash VARCHAR(255) NOT NULL,  -- Argon2 hash of the passkey
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_access_keys_store_id ON store_access_keys(store_id);

-- ============================================================================
-- STEP 2: Device Sessions (Remember this device)
-- ============================================================================

CREATE TABLE IF NOT EXISTS device_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  
  -- Device Identification
  device_token VARCHAR(500) NOT NULL UNIQUE,  -- Secure random token
  device_name VARCHAR(255),  -- e.g., "John's Tablet", "Till 1"
  device_fingerprint VARCHAR(255),  -- Browser/device identifier
  
  -- Session Info
  phone_number VARCHAR(20) NOT NULL,  -- Who logged in
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '365 days',
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  user_agent TEXT,
  ip_address INET
);

CREATE INDEX IF NOT EXISTS idx_device_sessions_store_id ON device_sessions(store_id);
CREATE INDEX IF NOT EXISTS idx_device_sessions_device_token ON device_sessions(device_token);
CREATE INDEX IF NOT EXISTS idx_device_sessions_phone ON device_sessions(phone_number);
CREATE INDEX IF NOT EXISTS idx_device_sessions_is_active ON device_sessions(is_active);

-- ============================================================================
-- STEP 3: RLS Policies
-- ============================================================================

ALTER TABLE store_access_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_sessions ENABLE ROW LEVEL SECURITY;

-- Store owners can manage their passkey
DROP POLICY IF EXISTS "Store owners view own passkey" ON store_access_keys;
CREATE POLICY "Store owners view own passkey"
  ON store_access_keys
  FOR SELECT
  USING (
    (SELECT owner_id FROM stores WHERE stores.id = store_access_keys.store_id) = auth.uid()
    OR auth.role() = 'service_role'
  );

DROP POLICY IF EXISTS "Store owners update own passkey" ON store_access_keys;
CREATE POLICY "Store owners update own passkey"
  ON store_access_keys
  FOR UPDATE
  USING (
    (SELECT owner_id FROM stores WHERE stores.id = store_access_keys.store_id) = auth.uid()
  );

-- Device sessions - service role only (created during store entry, not via RLS)
DROP POLICY IF EXISTS "Service role manages device sessions" ON device_sessions;
CREATE POLICY "Service role manages device sessions"
  ON device_sessions
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- STEP 4: Helper Functions
-- ============================================================================

-- Find all stores for a phone number
CREATE OR REPLACE FUNCTION get_stores_by_phone(p_phone VARCHAR)
RETURNS TABLE(
  store_id UUID,
  store_name VARCHAR,
  owner_phone VARCHAR,
  location VARCHAR,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.owner_phone,
    s.location,
    s.created_at
  FROM stores s
  WHERE s.owner_phone = p_phone OR s.phone = p_phone
  ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify passkey for a store
CREATE OR REPLACE FUNCTION verify_store_passkey(
  p_store_id UUID,
  p_passkey_plain VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
  v_stored_hash VARCHAR;
BEGIN
  SELECT passkey_hash INTO v_stored_hash
  FROM store_access_keys
  WHERE store_id = p_store_id;
  
  IF v_stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Simple comparison (in production, use proper argon2 verification)
  -- For now, we'll use crypt for demo purposes
  RETURN v_stored_hash = crypt(p_passkey_plain, v_stored_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a device session after successful entry
CREATE OR REPLACE FUNCTION create_device_session(
  p_store_id UUID,
  p_phone_number VARCHAR,
  p_device_token VARCHAR,
  p_device_name VARCHAR DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  device_token VARCHAR,
  device_name VARCHAR,
  expires_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  INSERT INTO device_sessions (
    store_id,
    phone_number,
    device_token,
    device_name,
    user_agent,
    ip_address
  )
  VALUES (
    p_store_id,
    p_phone_number,
    p_device_token,
    p_device_name,
    p_user_agent,
    p_ip_address
  )
  ON CONFLICT (device_token) DO UPDATE
  SET last_accessed_at = NOW()
  RETURNING
    device_sessions.id,
    device_sessions.device_token,
    device_sessions.device_name,
    device_sessions.expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Validate device token and get store info
CREATE OR REPLACE FUNCTION validate_device_token(p_device_token VARCHAR)
RETURNS TABLE(
  store_id UUID,
  store_name VARCHAR,
  phone_number VARCHAR,
  device_name VARCHAR,
  is_valid BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ds.store_id,
    s.name,
    ds.phone_number,
    ds.device_name,
    (ds.is_active AND ds.expires_at > NOW())::BOOLEAN as is_valid
  FROM device_sessions ds
  JOIN stores s ON s.id = ds.store_id
  WHERE ds.device_token = p_device_token
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set passkey for a store
CREATE OR REPLACE FUNCTION set_store_passkey(
  p_store_id UUID,
  p_passkey_plain VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
  v_passkey_hash VARCHAR;
BEGIN
  -- Hash the passkey using crypt (pgcrypto extension required)
  -- In production, use proper argon2 hashing library
  v_passkey_hash := crypt(p_passkey_plain, gen_salt('bf', 10));
  
  INSERT INTO store_access_keys (store_id, passkey_hash)
  VALUES (p_store_id, v_passkey_hash)
  ON CONFLICT (store_id) DO UPDATE
  SET passkey_hash = v_passkey_hash, updated_at = NOW();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 5: Verification
-- ============================================================================

SELECT 
  'Store Access Keys' as object,
  COUNT(*) as count
FROM store_access_keys
UNION ALL
SELECT 
  'Device Sessions' as object,
  COUNT(*) as count
FROM device_sessions;
