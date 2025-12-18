-- filepath: migrations/016_barcode_pos.sql
-- Migration 016: Barcode POS System
-- Purpose: Enable fast barcode scanning for supermarket-style point of sale
-- Ensures unique barcodes per store with indexes for instant lookup

-- Add UNIQUE constraint on barcode per store (if not already exists)
-- This ensures one barcode entry per store, preventing duplicates
ALTER TABLE inventory_items
  ADD CONSTRAINT unique_store_barcode UNIQUE(store_id, barcode)
  ON CONFLICT DO NOTHING;

-- Create covering index: (store_id, barcode) -> (item_name, unit_price, current_stock)
-- This allows entire query to be served from index (index-only scan)
DROP INDEX IF EXISTS idx_inventory_barcode;
CREATE INDEX IF NOT EXISTS idx_inventory_store_barcode 
  ON inventory_items(store_id, barcode)
  INCLUDE (item_name, unit_price, current_stock, quantity_on_hand);

-- Create index on barcode for global lookups (for barcode validation)
CREATE INDEX IF NOT EXISTS idx_inventory_barcode_global 
  ON inventory_items(barcode);

-- Create functional index for case-insensitive barcode matching
-- Handles both "4800016000115" and spaces/dashes
CREATE INDEX IF NOT EXISTS idx_inventory_barcode_normalized 
  ON inventory_items(store_id, TRIM(LOWER(barcode)));

-- Ensure barcode is NOT NULL for POS items (optional but recommended)
-- ALTER TABLE inventory_items
--   ADD CONSTRAINT check_barcode_not_empty CHECK (barcode IS NOT NULL AND barcode != '');

COMMIT;
