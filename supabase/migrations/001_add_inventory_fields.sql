-- migrations/001_add_inventory_fields.sql
BEGIN;

-- Add nullable columns used by niche features (safe to run multiple times)
ALTER TABLE IF EXISTS inventory_items
  ADD COLUMN IF NOT EXISTS expiry_date timestamptz;

ALTER TABLE IF EXISTS inventory_items
  ADD COLUMN IF NOT EXISTS batch_number text;

ALTER TABLE IF EXISTS inventory_items
  ADD COLUMN IF NOT EXISTS imei_serial text;

ALTER TABLE IF EXISTS inventory_items
  ADD COLUMN IF NOT EXISTS parent_unit_qty integer;

COMMIT;
