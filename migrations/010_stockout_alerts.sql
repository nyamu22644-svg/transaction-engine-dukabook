-- Migration: Inventory Stockout Alerts
-- Purpose: Track when products hit zero stock, lost sales impact

CREATE TABLE IF NOT EXISTS public.stockout_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  
  -- Item Details
  item_name VARCHAR(255),
  stockout_date TIMESTAMP,
  
  -- Impact Assessment
  days_out_of_stock INT,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_date TIMESTAMP,
  
  -- Lost Sales Calculation
  avg_daily_sales_units INT, -- Historical average
  estimated_lost_units INT, -- units * days_out
  estimated_lost_revenue DECIMAL(10, 2), -- units * price
  
  -- Reorder Suggestion
  supplier_id UUID REFERENCES public.suppliers(id),
  suggested_reorder_qty INT,
  reorder_po_created BOOLEAN DEFAULT FALSE,
  po_id UUID REFERENCES public.purchase_orders(id),
  
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Stockout impact view
CREATE OR REPLACE VIEW stockout_impact_summary AS
SELECT 
  store_id,
  COUNT(*) as total_stockouts,
  COUNT(CASE WHEN is_resolved THEN 1 END) as resolved_stockouts,
  COUNT(CASE WHEN NOT is_resolved THEN 1 END) as ongoing_stockouts,
  SUM(CASE WHEN NOT is_resolved THEN days_out_of_stock ELSE 0 END) as total_days_stockout,
  SUM(estimated_lost_revenue) as total_lost_revenue,
  ROUND(AVG(estimated_lost_revenue), 2) as avg_loss_per_stockout,
  COUNT(CASE WHEN reorder_po_created THEN 1 END) as po_created_count
FROM public.stockout_alerts
GROUP BY store_id;

-- Indexes
CREATE INDEX idx_stockout_alerts_store_id ON public.stockout_alerts(store_id);
CREATE INDEX idx_stockout_alerts_item_id ON public.stockout_alerts(inventory_item_id);
CREATE INDEX idx_stockout_alerts_is_resolved ON public.stockout_alerts(is_resolved);
CREATE INDEX idx_stockout_alerts_stockout_date ON public.stockout_alerts(stockout_date);

-- RLS Policies
ALTER TABLE public.stockout_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stockout alerts for their store"
  ON public.stockout_alerts
  FOR SELECT
  USING (
    store_id IN (
      SELECT store_id FROM public.store_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert stockout alerts for their store"
  ON public.stockout_alerts
  FOR INSERT
  WITH CHECK (
    store_id IN (
      SELECT store_id FROM public.store_users WHERE user_id = auth.uid()
    )
  );

-- Sample data
INSERT INTO public.stockout_alerts (store_id, inventory_item_id, item_name, stockout_date, days_out_of_stock, is_resolved, avg_daily_sales_units, estimated_lost_units, estimated_lost_revenue)
SELECT 
  s.id,
  (SELECT id FROM inventory_items LIMIT 1),
  'Sample Item',
  CURRENT_TIMESTAMP - INTERVAL '5 days',
  5,
  FALSE,
  10,
  50,
  2500
FROM stores s
LIMIT 1
ON CONFLICT DO NOTHING;
