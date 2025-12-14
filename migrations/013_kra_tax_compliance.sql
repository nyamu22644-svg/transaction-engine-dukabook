-- Migration: KRA/iDEAL Tax Compliance
-- Purpose: Track taxable sales, generate KRA reports, iDEAL integration ready

CREATE TABLE IF NOT EXISTS public.tax_compliance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  
  -- Tax Period
  tax_period_start DATE NOT NULL,
  tax_period_end DATE NOT NULL,
  period_type VARCHAR(50), -- 'MONTHLY' | 'QUARTERLY' | 'ANNUAL'
  
  -- Sales Summary
  gross_sales DECIMAL(10, 2),
  exempt_sales DECIMAL(10, 2), -- e.g., medicines, bread
  taxable_sales DECIMAL(10, 2),
  
  -- Tax Calculation
  tax_rate DECIMAL(5, 2), -- Usually 16% VAT in Kenya
  tax_amount DECIMAL(10, 2),
  
  -- Payments & Remittances
  tax_paid_amount DECIMAL(10, 2),
  tax_balance DECIMAL(10, 2),
  
  -- iDEAL Filing
  ideal_filing_status VARCHAR(50), -- 'DRAFT' | 'READY' | 'FILED' | 'CONFIRMED'
  ideal_filing_date DATE,
  ideal_confirmation_date DATE,
  ideal_reference_number VARCHAR(100),
  
  -- KRA Compliance
  kra_status VARCHAR(50), -- 'PENDING' | 'SUBMITTED' | 'VERIFIED' | 'ISSUE'
  kra_reference VARCHAR(100),
  kra_issue_notes TEXT,
  
  -- Audit Trail
  prepared_by VARCHAR(255),
  approved_by VARCHAR(255),
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tax exemption categories (what qualifies as exempt)
CREATE TABLE IF NOT EXISTS public.tax_exemption_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  
  category_name VARCHAR(255), -- e.g., "Medicine", "Bread", "Basic Food"
  category_code VARCHAR(50), -- KRA category code
  
  is_exempt BOOLEAN DEFAULT TRUE,
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tax payment schedule
CREATE TABLE IF NOT EXISTS public.tax_payment_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  
  -- Schedule
  payment_due_date DATE,
  period_type VARCHAR(50), -- Monthly (25th), Quarterly (within 30 days), Annual
  
  -- Amount Due
  amount_due DECIMAL(10, 2),
  amount_paid DECIMAL(10, 2) DEFAULT 0,
  
  -- Status
  is_paid BOOLEAN DEFAULT FALSE,
  payment_date DATE,
  payment_method VARCHAR(50), -- 'BANK_TRANSFER' | 'MPESA'
  payment_reference VARCHAR(100),
  
  -- Alert
  days_until_due INT,
  is_overdue BOOLEAN DEFAULT FALSE,
  
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- KRA Compliance dashboard view
CREATE OR REPLACE VIEW kra_compliance_status AS
SELECT 
  store_id,
  COUNT(*) as total_periods_filed,
  COUNT(CASE WHEN ideal_filing_status = 'FILED' THEN 1 END) as ideal_filed_count,
  COUNT(CASE WHEN kra_status = 'VERIFIED' THEN 1 END) as kra_verified_count,
  COUNT(CASE WHEN kra_status = 'ISSUE' THEN 1 END) as kra_issue_count,
  SUM(tax_amount) as total_tax_calculated,
  SUM(tax_paid_amount) as total_tax_paid,
  SUM(tax_balance) as outstanding_tax,
  ROUND(AVG(CAST(taxable_sales AS NUMERIC)), 2) as avg_taxable_sales
FROM public.tax_compliance_records
GROUP BY store_id;

-- Indexes
CREATE INDEX idx_tax_compliance_records_store_id ON public.tax_compliance_records(store_id);
CREATE INDEX idx_tax_compliance_records_period ON public.tax_compliance_records(tax_period_start, tax_period_end);
CREATE INDEX idx_tax_compliance_records_ideal_status ON public.tax_compliance_records(ideal_filing_status);
CREATE INDEX idx_tax_compliance_records_kra_status ON public.tax_compliance_records(kra_status);
CREATE INDEX idx_tax_payment_schedule_store_id ON public.tax_payment_schedule(store_id);
CREATE INDEX idx_tax_payment_schedule_due_date ON public.tax_payment_schedule(payment_due_date);

-- RLS Policies
ALTER TABLE public.tax_compliance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_exemption_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_payment_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tax compliance for their store"
  ON public.tax_compliance_records
  FOR SELECT
  USING (
    store_id IN (
      SELECT store_id FROM public.store_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view tax exemption rules for their store"
  ON public.tax_exemption_rules
  FOR SELECT
  USING (
    store_id IN (
      SELECT store_id FROM public.store_users WHERE user_id = auth.uid()
    )
  );

-- Default tax exemption categories for Kenya
INSERT INTO public.tax_exemption_rules (store_id, category_name, category_code, is_exempt, tax_rate)
SELECT s.id, 'Medicine & Pharmaceuticals', 'MED001', TRUE, 0 FROM stores s
ON CONFLICT DO NOTHING;

INSERT INTO public.tax_exemption_rules (store_id, category_name, category_code, is_exempt, tax_rate)
SELECT s.id, 'Basic Food Items', 'FOOD001', TRUE, 0 FROM stores s
ON CONFLICT DO NOTHING;

INSERT INTO public.tax_exemption_rules (store_id, category_name, category_code, is_exempt, tax_rate)
SELECT s.id, 'General Goods', 'GEN001', FALSE, 16 FROM stores s
ON CONFLICT DO NOTHING;
