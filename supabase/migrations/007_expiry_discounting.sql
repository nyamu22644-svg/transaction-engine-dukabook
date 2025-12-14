-- Migration: Expiry Auto-Discounting System
-- Purpose: Track expiry-based pricing suggestions and auto-apply discounts

CREATE TABLE IF NOT EXISTS public.expiry_discount_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  
  -- Days before expiry threshold
  days_before_expiry INT NOT NULL, -- 45, 14, 7
  suggested_discount_percent DECIMAL(5, 2) NOT NULL, -- 20, 40, 80
  
  -- Rule Configuration
  auto_apply BOOLEAN DEFAULT FALSE, -- Auto-apply discount or just suggest
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(store_id, days_before_expiry)
);

-- Inventory items expiry status (materialized view concept)
CREATE TABLE IF NOT EXISTS public.inventory_expiry_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  item_name VARCHAR(255),
  current_stock INT,
  expiry_date DATE,
  
  -- Days until expiry calculation
  days_until_expiry INT,
  
  -- Status
  expiry_status VARCHAR(50), -- 'EXPIRED' | 'CRITICAL' | 'URGENT' | 'CAUTION' | 'OK'
  suggested_discount_percent DECIMAL(5, 2),
  
  -- Lost Sales Impact
  estimated_daily_sales INT, -- Historical avg daily sales
  estimated_loss_if_not_cleared DECIMAL(10, 2), -- Potential loss if expired
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_inventory_expiry_status_store_id ON public.inventory_expiry_status(store_id);
CREATE INDEX idx_inventory_expiry_status_expiry_status ON public.inventory_expiry_status(expiry_status);

-- Expiry clearance transactions (track what was cleared)
CREATE TABLE IF NOT EXISTS public.expiry_clearances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  
  -- Item Details
  item_name VARCHAR(255),
  quantity_cleared INT,
  original_price DECIMAL(10, 2),
  clearance_price DECIMAL(10, 2),
  discount_percent DECIMAL(5, 2),
  
  -- Sale Info
  cleared_via VARCHAR(50), -- 'DISCOUNTED_SALE' | 'DONATION' | 'DISPOSED'
  sale_id UUID, -- Links to sales_records if sold
  
  cleared_by VARCHAR(255),
  cleared_at TIMESTAMP DEFAULT NOW(),
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_expiry_clearances_store_id ON public.expiry_clearances(store_id);
CREATE INDEX idx_expiry_clearances_item_id ON public.expiry_clearances(inventory_item_id);

-- RLS Policies
ALTER TABLE public.expiry_discount_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_expiry_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expiry_clearances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view expiry rules for their store"
  ON public.expiry_discount_rules
  FOR SELECT
  USING (
    store_id IN (
      SELECT store_id FROM public.store_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view expiry status for their store"
  ON public.inventory_expiry_status
  FOR SELECT
  USING (
    store_id IN (
      SELECT store_id FROM public.store_users WHERE user_id = auth.uid()
    )
  );

-- Default discount rules
INSERT INTO public.expiry_discount_rules (store_id, days_before_expiry, suggested_discount_percent, auto_apply, is_active)
SELECT id, 45, 20, FALSE, TRUE FROM stores
ON CONFLICT DO NOTHING;

INSERT INTO public.expiry_discount_rules (store_id, days_before_expiry, suggested_discount_percent, auto_apply, is_active)
SELECT id, 14, 40, FALSE, TRUE FROM stores
ON CONFLICT DO NOTHING;

INSERT INTO public.expiry_discount_rules (store_id, days_before_expiry, suggested_discount_percent, auto_apply, is_active)
SELECT id, 7, 80, FALSE, TRUE FROM stores
ON CONFLICT DO NOTHING;
