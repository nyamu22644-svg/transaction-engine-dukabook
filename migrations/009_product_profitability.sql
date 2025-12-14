-- Migration: Product Profitability Tracking
-- Purpose: Track profit by product, identify best/worst performers

CREATE TABLE IF NOT EXISTS public.product_profitability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  
  -- Product Details
  item_name VARCHAR(255),
  current_stock INT,
  
  -- Cost & Pricing
  cost_price DECIMAL(10, 2), -- Buying price
  selling_price DECIMAL(10, 2),
  profit_per_unit DECIMAL(10, 2),
  profit_margin_percent DECIMAL(5, 2),
  
  -- Period Sales (Monthly)
  period_month INT,
  period_year INT,
  units_sold INT,
  total_revenue DECIMAL(10, 2),
  total_cost DECIMAL(10, 2),
  total_profit DECIMAL(10, 2),
  profit_percent_of_store DECIMAL(5, 2), -- % of store's total profit
  
  -- Ranking
  profit_rank INT, -- Rank among all products by profit
  sales_rank INT,
  
  -- Trend
  profit_change_percent DECIMAL(5, 2), -- vs previous month
  sales_velocity INT, -- Units per day
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Best & Worst products by profit
CREATE TABLE IF NOT EXISTS public.product_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  
  -- Top Performers (by profit)
  top_profit_product_id UUID REFERENCES public.inventory_items(id),
  top_profit_amount DECIMAL(10, 2),
  top_profit_margin_percent DECIMAL(5, 2),
  
  -- Bottom Performers (losing money)
  bottom_profit_product_id UUID REFERENCES public.inventory_items(id),
  bottom_profit_amount DECIMAL(10, 2),
  bottom_profit_margin_percent DECIMAL(5, 2),
  
  -- High Velocity (selling fast, thin margin)
  high_velocity_product_id UUID REFERENCES public.inventory_items(id),
  high_velocity_units_per_day INT,
  
  -- Dead Stock (not selling)
  dead_stock_product_id UUID REFERENCES public.inventory_items(id),
  days_without_sale INT,
  
  analysis_period_start DATE,
  analysis_period_end DATE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Profitability trend view
CREATE OR REPLACE VIEW product_profitability_summary AS
SELECT 
  store_id,
  COUNT(DISTINCT inventory_item_id) as total_products_tracked,
  SUM(total_profit) as total_store_profit,
  AVG(profit_margin_percent) as avg_margin_percent,
  MAX(total_profit) as highest_profit_product,
  MIN(total_profit) as lowest_profit_product,
  SUM(CASE WHEN total_profit < 0 THEN 1 ELSE 0 END) as loss_making_products,
  SUM(CASE WHEN profit_margin_percent < 10 THEN 1 ELSE 0 END) as low_margin_products
FROM public.product_profitability
WHERE period_month = EXTRACT(MONTH FROM CURRENT_DATE)
AND period_year = EXTRACT(YEAR FROM CURRENT_DATE)
GROUP BY store_id;

-- Indexes
CREATE INDEX idx_product_profitability_store_id ON public.product_profitability(store_id);
CREATE INDEX idx_product_profitability_item_id ON public.product_profitability(inventory_item_id);
CREATE INDEX idx_product_profitability_profit_rank ON public.product_profitability(profit_rank);
CREATE INDEX idx_product_profitability_period ON public.product_profitability(period_month, period_year);
CREATE INDEX idx_product_performance_store_id ON public.product_performance(store_id);

-- RLS Policies
ALTER TABLE public.product_profitability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view product profitability for their store"
  ON public.product_profitability
  FOR SELECT
  USING (
    store_id IN (
      SELECT store_id FROM public.store_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view product performance for their store"
  ON public.product_performance
  FOR SELECT
  USING (
    store_id IN (
      SELECT store_id FROM public.store_users WHERE user_id = auth.uid()
    )
  );
