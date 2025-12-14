-- Migration 015: Shop Inventory (Private Per-Shop Table)
-- Links to global_products but keeps prices and quantities private
-- RLS: Users can ONLY see rows matching their shop_id

-- Create shop_inventory table
CREATE TABLE IF NOT EXISTS shop_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    barcode TEXT NOT NULL,
    FOREIGN KEY (barcode) REFERENCES global_products(barcode) ON DELETE CASCADE,
    quantity DECIMAL(12, 2) NOT NULL DEFAULT 0,
    selling_price DECIMAL(10, 2) NOT NULL,
    custom_alias TEXT, -- e.g., user's internal name: "Simba Mfuko"
    buying_price DECIMAL(10, 2), -- Track cost for profitability
    last_restocked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(shop_id, barcode) -- One entry per barcode per shop
);

-- Create indexes for performance
CREATE INDEX idx_shop_inventory_shop_id ON shop_inventory(shop_id);
CREATE INDEX idx_shop_inventory_barcode ON shop_inventory(barcode);
CREATE INDEX idx_shop_inventory_shop_barcode ON shop_inventory(shop_id, barcode);

-- Enable RLS
ALTER TABLE shop_inventory ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see inventory for their own shops
CREATE POLICY "Users can view own shop inventory" ON shop_inventory
    FOR SELECT
    USING (
        shop_id IN (
            SELECT id FROM stores WHERE owner_id = auth.uid()
        )
    );

-- RLS Policy: Users can insert/update inventory only for their shops
CREATE POLICY "Users can manage own shop inventory" ON shop_inventory
    FOR INSERT
    WITH CHECK (
        shop_id IN (
            SELECT id FROM stores WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own shop inventory" ON shop_inventory
    FOR UPDATE
    USING (
        shop_id IN (
            SELECT id FROM stores WHERE owner_id = auth.uid()
        )
    );

-- RLS Policy: Users can delete only their own inventory
CREATE POLICY "Users can delete own shop inventory" ON shop_inventory
    FOR DELETE
    USING (
        shop_id IN (
            SELECT id FROM stores WHERE owner_id = auth.uid()
        )
    );

-- Create view: Inventory with product details
CREATE OR REPLACE VIEW shop_inventory_with_details AS
SELECT 
    si.id,
    si.shop_id,
    si.barcode,
    gp.generic_name,
    gp.category,
    gp.image_url,
    si.quantity,
    si.selling_price,
    si.buying_price,
    si.custom_alias,
    si.last_restocked_at,
    si.created_at,
    si.updated_at,
    CASE 
        WHEN si.buying_price > 0 THEN ROUND(((si.selling_price - si.buying_price) / si.buying_price * 100)::NUMERIC, 2)
        ELSE 0
    END AS margin_percent
FROM shop_inventory si
JOIN global_products gp ON si.barcode = gp.barcode;

-- Sample data
INSERT INTO shop_inventory (shop_id, barcode, quantity, selling_price, buying_price, custom_alias)
VALUES 
    ('00000000-0000-0000-0000-000000000001', '4800016000115', 50, 750, 600, 'Simba Mfuko'),
    ('00000000-0000-0000-0000-000000000001', '5014158000000', 100, 2800, 2100, 'Crown Paint')
ON CONFLICT (shop_id, barcode) DO NOTHING;

COMMIT;
