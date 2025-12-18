-- filepath: migrations/018_blind_closes.sql
-- Migration 018: Blind Close Daily Reconciliation
-- Purpose: Track staff cash counts vs expected amounts without revealing expected to staff
-- This prevents theft, manipulation, and creates accountability

CREATE TABLE IF NOT EXISTS blind_closes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  close_date DATE NOT NULL,
  expected_cash DECIMAL(10, 2) NOT NULL,
  -- Total expected from CASH sales for the day
  counted_cash DECIMAL(10, 2) NOT NULL,
  -- What staff actually counted
  discrepancy_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  -- |counted - expected| in absolute value
  discrepancy_type VARCHAR(20),
  -- 'SHORTAGE' or 'OVERAGE'
  counted_by_staff BOOLEAN DEFAULT true,
  -- Staff performed the count
  staff_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  verified_by_owner BOOLEAN DEFAULT false,
  -- Owner reviewed and verified the count
  verified_at TIMESTAMP WITH TIME ZONE,
  owner_notes TEXT,
  -- Owner's explanation for discrepancy
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_store_date UNIQUE(store_id, close_date)
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_blind_closes_store_date 
  ON blind_closes(store_id, close_date DESC);

CREATE INDEX IF NOT EXISTS idx_blind_closes_status 
  ON blind_closes(store_id, verified_by_owner, close_date DESC);

-- Permissions: 
-- - Staff can see their own count (not expected)
-- - Owner can see everything
ALTER TABLE blind_closes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS blind_closes_read_owner ON blind_closes;
DROP POLICY IF EXISTS blind_closes_read_self ON blind_closes;

CREATE POLICY blind_closes_read_owner ON blind_closes
  FOR SELECT USING (
    store_id IN (
      SELECT store_id FROM stores 
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY blind_closes_read_self ON blind_closes
  FOR SELECT USING (
    staff_id = auth.uid() OR
    store_id IN (
      SELECT store_id FROM stores 
      WHERE owner_id = auth.uid()
    )
  );

COMMIT;
