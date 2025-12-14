-- Migration: Debt Collections Automation
-- Purpose: Track debt aging, auto-send SMS reminders, enforce credit ceilings

CREATE TABLE IF NOT EXISTS public.debt_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  
  -- Debt Details
  original_amount DECIMAL(10, 2) NOT NULL,
  remaining_amount DECIMAL(10, 2) NOT NULL,
  due_date DATE,
  
  -- Aging
  days_overdue INT,
  aging_bucket VARCHAR(50), -- '1-30' | '31-60' | '61-90' | '90+'
  
  -- Status
  status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE | OVERDUE | SUSPENDED | PARTIALLY_PAID | COLLECTED | WRITTEN_OFF
  
  -- Reminders
  last_reminder_date DATE,
  reminder_count INT DEFAULT 0,
  next_reminder_date DATE,
  
  -- Collection Actions
  is_credit_ceiling_breach BOOLEAN DEFAULT FALSE,
  collection_agent_assigned VARCHAR(255),
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- SMS Reminders sent log
CREATE TABLE IF NOT EXISTS public.debt_reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  debt_id UUID NOT NULL REFERENCES public.debt_collections(id) ON DELETE CASCADE,
  
  customer_name VARCHAR(255),
  customer_phone VARCHAR(20),
  remaining_amount DECIMAL(10, 2),
  days_overdue INT,
  
  -- Message
  reminder_type VARCHAR(50), -- 'DUE_IN_7' | 'OVERDUE_7' | 'OVERDUE_14' | 'OVERDUE_30' | 'CRITICAL'
  message_template TEXT,
  message_sent TEXT,
  
  sms_sent BOOLEAN DEFAULT FALSE,
  sms_status VARCHAR(50), -- 'PENDING' | 'SENT' | 'FAILED'
  sms_error TEXT,
  
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Credit ceiling configuration per customer
CREATE TABLE IF NOT EXISTS public.customer_credit_ceilings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  
  -- Credit Limits
  credit_limit DECIMAL(10, 2) DEFAULT 0,
  current_debt DECIMAL(10, 2) DEFAULT 0,
  available_credit DECIMAL(10, 2),
  
  -- Enforcement
  block_sales_on_ceiling_breach BOOLEAN DEFAULT TRUE,
  suspension_days_overdue INT DEFAULT 30, -- Block after 30+ days overdue
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Debt Collections Dashboard View
CREATE OR REPLACE VIEW debt_collections_dashboard AS
SELECT 
  store_id,
  COUNT(*) as total_active_debts,
  SUM(remaining_amount) as total_outstanding,
  SUM(CASE WHEN aging_bucket = '1-30' THEN remaining_amount ELSE 0 END) as debt_1_30_days,
  SUM(CASE WHEN aging_bucket = '31-60' THEN remaining_amount ELSE 0 END) as debt_31_60_days,
  SUM(CASE WHEN aging_bucket = '61-90' THEN remaining_amount ELSE 0 END) as debt_61_90_days,
  SUM(CASE WHEN aging_bucket = '90+' THEN remaining_amount ELSE 0 END) as debt_90_plus_days,
  COUNT(CASE WHEN is_credit_ceiling_breach THEN 1 END) as ceiling_breaches,
  COUNT(DISTINCT customer_id) as unique_debtors,
  ROUND(AVG(days_overdue), 0) as avg_days_overdue
FROM public.debt_collections
WHERE status IN ('ACTIVE', 'OVERDUE', 'SUSPENDED')
GROUP BY store_id;

-- Indexes
CREATE INDEX idx_debt_collections_store_id ON public.debt_collections(store_id);
CREATE INDEX idx_debt_collections_customer_id ON public.debt_collections(customer_id);
CREATE INDEX idx_debt_collections_status ON public.debt_collections(status);
CREATE INDEX idx_debt_collections_aging_bucket ON public.debt_collections(aging_bucket);
CREATE INDEX idx_debt_reminder_logs_store_id ON public.debt_reminder_logs(store_id);
CREATE INDEX idx_debt_reminder_logs_customer_phone ON public.debt_reminder_logs(customer_phone);

-- RLS Policies
ALTER TABLE public.debt_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_reminder_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_credit_ceilings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view debt collections for their store"
  ON public.debt_collections
  FOR SELECT
  USING (
    store_id IN (
      SELECT store_id FROM public.store_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view credit ceilings for their store"
  ON public.customer_credit_ceilings
  FOR SELECT
  USING (
    store_id IN (
      SELECT store_id FROM public.store_users WHERE user_id = auth.uid()
    )
  );

-- Sample data
INSERT INTO public.debt_collections (store_id, customer_name, customer_phone, original_amount, remaining_amount, due_date, days_overdue, aging_bucket, status)
VALUES
  ((SELECT id FROM stores LIMIT 1), 'John Ngetich', '+254712345678', 5000, 3500, CURRENT_DATE - 15, 15, '1-30', 'OVERDUE'),
  ((SELECT id FROM stores LIMIT 1), 'Mary Ouma', '+254722334455', 8000, 8000, CURRENT_DATE - 45, 45, '31-60', 'OVERDUE'),
  ((SELECT id FROM stores LIMIT 1), 'Peter Kipchoge', '+254733445566', 12000, 12000, CURRENT_DATE - 95, 95, '90+', 'OVERDUE')
ON CONFLICT DO NOTHING;
