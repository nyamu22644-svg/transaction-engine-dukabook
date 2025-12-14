-- Migration 014: Global Products Catalog Table
-- Purpose: Shared product catalog across all shops (network effect)
-- This table is READ-ONLY for all users, WRITE-ONLY for new products

CREATE TABLE IF NOT EXISTS global_products (
  barcode TEXT PRIMARY KEY,
  generic_name TEXT NOT NULL,
  category TEXT,
  image_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  contribution_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster category filtering and searches
CREATE INDEX IF NOT EXISTS idx_global_products_category ON global_products(category);
CREATE INDEX IF NOT EXISTS idx_global_products_name ON global_products(generic_name);
CREATE INDEX IF NOT EXISTS idx_global_products_contribution ON global_products(contribution_count DESC);

-- Enable RLS
ALTER TABLE global_products ENABLE ROW LEVEL SECURITY;

-- RLS Policy 1: Everyone can READ the global catalog
CREATE POLICY IF NOT EXISTS global_products_read
  ON global_products
  FOR SELECT
  USING (TRUE);

-- RLS Policy 2: Only authenticated users can INSERT new products (not duplicates)
-- This prevents arbitrary inserts but allows new product registration
CREATE POLICY IF NOT EXISTS global_products_insert
  ON global_products
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND barcode NOT IN (
    SELECT barcode FROM global_products
  ));

-- RLS Policy 3: Only original creator can update their product contribution count
CREATE POLICY IF NOT EXISTS global_products_update
  ON global_products
  FOR UPDATE
  USING (auth.uid() = created_by OR auth.role() = 'service_role')
  WITH CHECK (auth.uid() = created_by OR auth.role() = 'service_role');

-- Trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_global_products_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_global_products_timestamp ON global_products;

CREATE TRIGGER trigger_update_global_products_timestamp
BEFORE UPDATE ON global_products
FOR EACH ROW
EXECUTE FUNCTION update_global_products_timestamp();
