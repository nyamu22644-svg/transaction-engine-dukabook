-- Create serialized_items table for warranty tracking (Electronics & Phone Repair)
-- Tracks items by IMEI/Serial Number with warranty expiry dates
-- Note: sale_id reference made optional to handle cases where sales table isn't created yet

CREATE TABLE IF NOT EXISTS serialized_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  serial_number VARCHAR(100) NOT NULL, -- IMEI, Serial Number, MAC Address, etc.
  warranty_days INTEGER DEFAULT 7,
  warranty_start_date TIMESTAMP DEFAULT now(),
  warranty_expiry_date TIMESTAMP NOT NULL,
  seal_broken BOOLEAN DEFAULT FALSE,
  customer_phone VARCHAR(20),
  customer_name VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create indexes for fast lookup
CREATE INDEX idx_serialized_items_store_id ON serialized_items(store_id);
CREATE INDEX idx_serialized_items_sale_id ON serialized_items(sale_id);
CREATE INDEX idx_serialized_items_serial_number ON serialized_items(serial_number);
CREATE INDEX idx_serialized_items_warranty_expiry ON serialized_items(warranty_expiry_date);
CREATE INDEX idx_serialized_items_store_serial ON serialized_items(store_id, serial_number);

-- Add RLS policies
ALTER TABLE serialized_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "serialized_items_store_access" ON serialized_items
  USING (store_id IN (
    SELECT id FROM stores WHERE owner_id = auth.uid()
  ));

CREATE POLICY "serialized_items_insert" ON serialized_items
  FOR INSERT WITH CHECK (store_id IN (
    SELECT id FROM stores WHERE owner_id = auth.uid()
  ));
