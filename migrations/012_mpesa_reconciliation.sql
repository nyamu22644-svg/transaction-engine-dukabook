-- Migration: M-Pesa Reconciliation
-- Purpose: Match M-Pesa deposits to sales/payments, flag unmatched transactions

CREATE TABLE IF NOT EXISTS public.mpesa_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  
  -- Transaction Details
  mpesa_ref VARCHAR(50) UNIQUE,
  phone_number VARCHAR(20),
  amount DECIMAL(10, 2),
  transaction_type VARCHAR(50), -- 'DEPOSIT' | 'WITHDRAWAL' | 'PAYMENT' | 'SUBSCRIPTION'
  
  -- Timing
  mpesa_timestamp TIMESTAMP,
  received_at TIMESTAMP DEFAULT NOW(),
  
  -- Reconciliation
  is_reconciled BOOLEAN DEFAULT FALSE,
  reconciled_to_sale_id UUID REFERENCES public.sales_records(id) ON DELETE SET NULL,
  reconciled_to_payment_id UUID REFERENCES public.subscription_payments(id) ON DELETE SET NULL,
  
  -- Mismatch Detection
  matched_sale_amount DECIMAL(10, 2),
  amount_variance DECIMAL(10, 2),
  is_variance_flagged BOOLEAN DEFAULT FALSE,
  
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- M-Pesa reconciliation audit
CREATE TABLE IF NOT EXISTS public.mpesa_reconciliation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  
  -- Reconciliation Period
  period_start DATE,
  period_end DATE,
  reconciliation_date TIMESTAMP,
  
  -- Summary
  total_mpesa_deposits DECIMAL(10, 2),
  total_matched_sales DECIMAL(10, 2),
  total_unmatched DECIMAL(10, 2),
  
  -- Details
  unmatched_count INT,
  variance_count INT,
  total_variance_amount DECIMAL(10, 2),
  
  -- Status
  status VARCHAR(50), -- 'PENDING' | 'IN_PROGRESS' | 'RECONCILED' | 'ISSUES_FOUND'
  notes TEXT,
  
  reconciled_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- M-Pesa reconciliation view
CREATE OR REPLACE VIEW mpesa_reconciliation_status AS
SELECT 
  store_id,
  COUNT(*) as total_transactions,
  COUNT(CASE WHEN is_reconciled THEN 1 END) as reconciled_count,
  COUNT(CASE WHEN NOT is_reconciled THEN 1 END) as unmatched_count,
  SUM(amount) as total_amount,
  SUM(CASE WHEN is_reconciled THEN amount ELSE 0 END) as reconciled_amount,
  SUM(CASE WHEN NOT is_reconciled THEN amount ELSE 0 END) as unmatched_amount,
  SUM(CASE WHEN is_variance_flagged THEN amount_variance ELSE 0 END) as total_variance,
  ROUND(
    (COUNT(CASE WHEN is_reconciled THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2
  ) as reconciliation_percent
FROM public.mpesa_transactions
WHERE mpesa_timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY store_id;

-- Indexes
CREATE INDEX idx_mpesa_transactions_store_id ON public.mpesa_transactions(store_id);
CREATE INDEX idx_mpesa_transactions_mpesa_ref ON public.mpesa_transactions(mpesa_ref);
CREATE INDEX idx_mpesa_transactions_is_reconciled ON public.mpesa_transactions(is_reconciled);
CREATE INDEX idx_mpesa_transactions_phone ON public.mpesa_transactions(phone_number);
CREATE INDEX idx_mpesa_reconciliation_log_store_id ON public.mpesa_reconciliation_log(store_id);
CREATE INDEX idx_mpesa_reconciliation_log_period ON public.mpesa_reconciliation_log(period_start, period_end);

-- RLS Policies
ALTER TABLE public.mpesa_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mpesa_reconciliation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view M-Pesa transactions for their store"
  ON public.mpesa_transactions
  FOR SELECT
  USING (
    store_id IN (
      SELECT store_id FROM public.store_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view M-Pesa reconciliation logs for their store"
  ON public.mpesa_reconciliation_log
  FOR SELECT
  USING (
    store_id IN (
      SELECT store_id FROM public.store_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert M-Pesa transactions for their store"
  ON public.mpesa_transactions
  FOR INSERT
  WITH CHECK (
    store_id IN (
      SELECT store_id FROM public.store_users WHERE user_id = auth.uid()
    )
  );

-- Sample data
INSERT INTO public.mpesa_transactions (store_id, mpesa_ref, phone_number, amount, transaction_type, mpesa_timestamp, is_reconciled)
SELECT 
  s.id,
  'LLK8H7D6C5B4A3Z2' || floor(random() * 1000),
  '+254712345678',
  (floor(random() * 50) + 1) * 1000,
  'DEPOSIT',
  CURRENT_TIMESTAMP - INTERVAL '2 days',
  floor(random() * 2)::BOOLEAN
FROM stores s
LIMIT 1
ON CONFLICT DO NOTHING;
