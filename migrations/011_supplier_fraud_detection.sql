-- Migration: Supplier Fraud Detection
-- Purpose: Track PO vs GRN mismatches, identify supplier quality issues

CREATE TABLE IF NOT EXISTS public.supplier_fraud_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  
  -- Mismatch Details
  purchase_order_id UUID REFERENCES public.purchase_orders(id),
  grn_id UUID REFERENCES public.goods_received_notes(id),
  supplier_invoice_id UUID REFERENCES public.supplier_invoices(id),
  
  -- Fraud Type
  fraud_type VARCHAR(50), -- 'QUANTITY_MISMATCH' | 'PRICE_OVERCHARGE' | 'QUALITY_ISSUE' | 'DELIVERY_LATE' | 'INVOICE_MISMATCH'
  
  -- Mismatch Details
  po_quantity INT,
  grn_quantity_received INT,
  grn_quantity_rejected INT,
  quantity_variance INT,
  variance_percent DECIMAL(5, 2),
  
  -- Price Mismatch
  po_unit_price DECIMAL(10, 2),
  invoice_unit_price DECIMAL(10, 2),
  price_variance DECIMAL(10, 2),
  total_overcharge DECIMAL(10, 2),
  
  -- Delivery
  po_expected_date DATE,
  grn_actual_date DATE,
  days_late INT,
  
  -- Quality Issues
  rejection_reason TEXT,
  quality_score INT, -- 1-10
  
  -- Status
  severity VARCHAR(50) DEFAULT 'MEDIUM', -- LOW | MEDIUM | HIGH | CRITICAL
  is_resolved BOOLEAN DEFAULT FALSE,
  resolution_notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Supplier score/rating
CREATE TABLE IF NOT EXISTS public.supplier_quality_score (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  
  -- Metrics
  total_orders INT,
  on_time_deliveries INT,
  quality_accepted_percent DECIMAL(5, 2),
  price_accuracy_percent DECIMAL(5, 2),
  
  -- Score (0-100)
  overall_score DECIMAL(5, 2),
  reliability_score DECIMAL(5, 2),
  quality_score DECIMAL(5, 2),
  pricing_score DECIMAL(5, 2),
  
  -- Risk
  is_blacklisted BOOLEAN DEFAULT FALSE,
  blacklist_reason TEXT,
  
  last_evaluated DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Fraud patterns view
CREATE OR REPLACE VIEW supplier_fraud_summary AS
SELECT 
  store_id,
  supplier_id,
  COUNT(*) as fraud_flags_count,
  COUNT(CASE WHEN fraud_type = 'QUANTITY_MISMATCH' THEN 1 END) as quantity_mismatches,
  COUNT(CASE WHEN fraud_type = 'PRICE_OVERCHARGE' THEN 1 END) as price_overcharges,
  COUNT(CASE WHEN fraud_type = 'QUALITY_ISSUE' THEN 1 END) as quality_issues,
  COUNT(CASE WHEN fraud_type = 'DELIVERY_LATE' THEN 1 END) as late_deliveries,
  SUM(CASE WHEN fraud_type = 'PRICE_OVERCHARGE' THEN total_overcharge ELSE 0 END) as total_overcharge_amount,
  ROUND(AVG(CAST(variance_percent AS NUMERIC)), 2) as avg_variance_percent,
  COUNT(CASE WHEN severity IN ('HIGH', 'CRITICAL') THEN 1 END) as high_severity_count
FROM public.supplier_fraud_flags
WHERE is_resolved = FALSE
GROUP BY store_id, supplier_id;

-- Indexes
CREATE INDEX idx_supplier_fraud_flags_store_id ON public.supplier_fraud_flags(store_id);
CREATE INDEX idx_supplier_fraud_flags_supplier_id ON public.supplier_fraud_flags(supplier_id);
CREATE INDEX idx_supplier_fraud_flags_fraud_type ON public.supplier_fraud_flags(fraud_type);
CREATE INDEX idx_supplier_fraud_flags_severity ON public.supplier_fraud_flags(severity);
CREATE INDEX idx_supplier_quality_score_supplier_id ON public.supplier_quality_score(supplier_id);

-- RLS Policies
ALTER TABLE public.supplier_fraud_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_quality_score ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view supplier fraud flags for their store"
  ON public.supplier_fraud_flags
  FOR SELECT
  USING (
    store_id IN (
      SELECT store_id FROM public.store_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view supplier quality scores for their store"
  ON public.supplier_quality_score
  FOR SELECT
  USING (
    store_id IN (
      SELECT store_id FROM public.store_users WHERE user_id = auth.uid()
    )
  );
