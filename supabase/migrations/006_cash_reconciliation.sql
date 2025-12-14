-- Migration: Cash Reconciliation Fraud Detection
-- Purpose: Track daily cash register reconciliation, flag variances >5%, create audit trail

CREATE TABLE IF NOT EXISTS public.cash_register_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  
  -- Register Opening/Closing
  register_date DATE NOT NULL,
  opening_balance DECIMAL(10, 2) NOT NULL,
  
  -- Expected vs Actual
  expected_closing DECIMAL(10, 2) NOT NULL,
  actual_closing DECIMAL(10, 2) NOT NULL,
  variance_amount DECIMAL(10, 2) NOT NULL,
  variance_percentage DECIMAL(5, 2) NOT NULL,
  
  -- Variance Classification
  is_fraud_suspect BOOLEAN DEFAULT FALSE, -- TRUE if >5% variance
  fraud_category VARCHAR(50), -- 'OVERAGE' | 'SHORTAGE' | 'NORMAL'
  severity VARCHAR(50) DEFAULT 'LOW', -- LOW | MEDIUM | HIGH (based on percentage)
  
  -- Reconciliation Details
  reconciled_by VARCHAR(255),
  reconciled_at TIMESTAMP,
  notes TEXT,
  
  -- Audit Trail
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cash_register_audits_store_id ON public.cash_register_audits(store_id);
CREATE INDEX idx_cash_register_audits_register_date ON public.cash_register_audits(register_date);
CREATE INDEX idx_cash_register_audits_is_fraud_suspect ON public.cash_register_audits(is_fraud_suspect);

-- Variance analysis view (10+ variances in 30 days = pattern)
CREATE OR REPLACE VIEW cash_fraud_patterns AS
SELECT 
  store_id,
  COUNT(*) as variance_count_30d,
  AVG(ABS(variance_percentage)) as avg_variance_percent,
  SUM(CASE WHEN is_fraud_suspect THEN 1 ELSE 0 END) as fraud_suspect_count,
  SUM(variance_amount) as total_variance_30d,
  CASE 
    WHEN COUNT(*) >= 10 THEN 'HIGH_RISK'
    WHEN COUNT(*) >= 5 THEN 'MEDIUM_RISK'
    ELSE 'LOW_RISK'
  END as risk_level
FROM public.cash_register_audits
WHERE register_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY store_id;

-- RLS Policies
ALTER TABLE public.cash_register_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cash audits for their store"
  ON public.cash_register_audits
  FOR SELECT
  USING (
    store_id IN (
      SELECT store_id FROM public.store_users WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.store_users su
      WHERE su.store_id = cash_register_audits.store_id
      AND su.user_id = auth.uid()
      AND su.role = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "Users can insert cash audits for their store"
  ON public.cash_register_audits
  FOR INSERT
  WITH CHECK (
    store_id IN (
      SELECT store_id FROM public.store_users WHERE user_id = auth.uid()
    )
  );

-- Sample data for testing
INSERT INTO public.cash_register_audits (store_id, register_date, opening_balance, expected_closing, actual_closing, variance_amount, variance_percentage, is_fraud_suspect, fraud_category, severity)
VALUES
  ((SELECT id FROM stores LIMIT 1), CURRENT_DATE - 1, 5000, 12500, 11900, -600, -4.8, FALSE, 'NORMAL', 'LOW'),
  ((SELECT id FROM stores LIMIT 1), CURRENT_DATE - 2, 4800, 11200, 10500, -700, -6.25, TRUE, 'SHORTAGE', 'MEDIUM'),
  ((SELECT id FROM stores LIMIT 1), CURRENT_DATE - 3, 5200, 13000, 13650, 650, 5.0, TRUE, 'OVERAGE', 'MEDIUM')
ON CONFLICT DO NOTHING;
