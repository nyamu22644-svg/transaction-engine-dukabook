-- ============================================================================
-- CONSOLIDATED MIGRATION FILE FOR DUKABOOK
-- Copy-paste this entire file into Supabase SQL Editor
-- Execute once to apply all pending migrations
-- ============================================================================

-- STEP 1: Create store_users table (required by all RLS policies in migrations 006+)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.store_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'staff' CHECK (role IN ('staff', 'manager', 'SUPER_ADMIN')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(store_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_store_users_store_id ON public.store_users(store_id);
CREATE INDEX IF NOT EXISTS idx_store_users_user_id ON public.store_users(user_id);

-- ============================================================================
-- MIGRATION 006: Cash Reconciliation Fraud Detection
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.cash_register_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  register_date DATE NOT NULL,
  opening_balance DECIMAL(10, 2) NOT NULL,
  expected_closing DECIMAL(10, 2) NOT NULL,
  actual_closing DECIMAL(10, 2) NOT NULL,
  variance_amount DECIMAL(10, 2) NOT NULL,
  variance_percentage DECIMAL(5, 2) NOT NULL,
  is_fraud_suspect BOOLEAN DEFAULT FALSE,
  fraud_category VARCHAR(50),
  severity VARCHAR(50) DEFAULT 'LOW',
  reconciled_by VARCHAR(255),
  reconciled_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_register_audits_store_id ON public.cash_register_audits(store_id);
CREATE INDEX IF NOT EXISTS idx_cash_register_audits_register_date ON public.cash_register_audits(register_date);
CREATE INDEX IF NOT EXISTS idx_cash_register_audits_is_fraud_suspect ON public.cash_register_audits(is_fraud_suspect);

CREATE OR REPLACE VIEW public.cash_fraud_patterns AS
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

ALTER TABLE public.cash_register_audits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view cash audits for their store" ON public.cash_register_audits;
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

DROP POLICY IF EXISTS "Users can insert cash audits for their store" ON public.cash_register_audits;
CREATE POLICY "Users can insert cash audits for their store"
  ON public.cash_register_audits
  FOR INSERT
  WITH CHECK (
    store_id IN (
      SELECT store_id FROM public.store_users WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- MIGRATION 007: Expiry Discounting
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.expiry_discount_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  days_before_expiry INTEGER NOT NULL DEFAULT 7,
  discount_percent DECIMAL(5, 2) NOT NULL DEFAULT 10,
  apply_automatically BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inventory_expiry_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  expiry_date DATE NOT NULL,
  quantity_at_risk DECIMAL(10, 2),
  discount_applied BOOLEAN DEFAULT FALSE,
  discount_percent DECIMAL(5, 2),
  loss_if_expired DECIMAL(12, 2),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.expiry_clearances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity_cleared DECIMAL(10, 2),
  clearance_method VARCHAR(50),
  sale_price DECIMAL(10, 2),
  donation_recipient VARCHAR(255),
  loss_amount DECIMAL(12, 2),
  cleared_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expiry_status_store_id ON public.inventory_expiry_status(store_id);
CREATE INDEX IF NOT EXISTS idx_expiry_status_date ON public.inventory_expiry_status(expiry_date);
CREATE INDEX IF NOT EXISTS idx_expiry_clearances_store_id ON public.expiry_clearances(store_id);

-- ============================================================================
-- MIGRATION 008: Debt Collections
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.debt_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  sales_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  debt_amount DECIMAL(12, 2) NOT NULL,
  amount_paid DECIMAL(12, 2) DEFAULT 0,
  outstanding_amount DECIMAL(12, 2) GENERATED ALWAYS AS (debt_amount - amount_paid) STORED,
  collection_status VARCHAR(50) DEFAULT 'OPEN' CHECK (collection_status IN ('OPEN', 'PARTIAL', 'COLLECTED', 'WRITTEN_OFF', 'DISPUTED')),
  sale_date TIMESTAMP,
  last_reminder_date TIMESTAMP,
  collected_date TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.debt_reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_collection_id UUID NOT NULL REFERENCES public.debt_collections(id) ON DELETE CASCADE,
  reminder_type VARCHAR(50),
  reminder_message TEXT,
  sent_via VARCHAR(50),
  sent_at TIMESTAMP DEFAULT NOW(),
  response_received BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.customer_credit_ceilings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  credit_limit DECIMAL(12, 2) NOT NULL,
  current_debt DECIMAL(12, 2) DEFAULT 0,
  is_on_hold BOOLEAN DEFAULT FALSE,
  hold_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(store_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_debt_collections_store_id ON public.debt_collections(store_id);
CREATE INDEX IF NOT EXISTS idx_debt_collections_customer_id ON public.debt_collections(customer_id);
CREATE INDEX IF NOT EXISTS idx_debt_collections_status ON public.debt_collections(collection_status);

-- ============================================================================
-- MIGRATION 009: Product Profitability
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.product_profitability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  item_name VARCHAR(255),
  cost_price DECIMAL(12, 2),
  selling_price DECIMAL(12, 2),
  gross_margin DECIMAL(5, 2),
  units_sold INTEGER DEFAULT 0,
  total_revenue DECIMAL(12, 2) DEFAULT 0,
  total_cost DECIMAL(12, 2) DEFAULT 0,
  total_profit DECIMAL(12, 2) DEFAULT 0,
  profit_trend VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.product_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  period VARCHAR(50),
  total_quantity_sold DECIMAL(10, 2),
  total_revenue DECIMAL(12, 2),
  average_profit_per_unit DECIMAL(10, 2),
  days_in_inventory INTEGER,
  sell_through_rate DECIMAL(5, 2),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_profitability_store_id ON public.product_profitability(store_id);
CREATE INDEX IF NOT EXISTS idx_product_performance_store_id ON public.product_performance(store_id);

-- ============================================================================
-- MIGRATION 010: Stockout Alerts
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.stockout_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  item_name VARCHAR(255),
  current_stock DECIMAL(10, 2),
  reorder_level DECIMAL(10, 2),
  alert_severity VARCHAR(50) DEFAULT 'WARNING',
  alert_status VARCHAR(50) DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stockout_alerts_store_id ON public.stockout_alerts(store_id);
CREATE INDEX IF NOT EXISTS idx_stockout_alerts_status ON public.stockout_alerts(alert_status);

-- ============================================================================
-- MIGRATION 011: Supplier Fraud Detection
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.supplier_fraud_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  supplier_name VARCHAR(255),
  supplier_phone VARCHAR(20),
  supplier_email VARCHAR(255),
  fraud_indicator VARCHAR(100),
  flag_reason TEXT,
  severity VARCHAR(50) DEFAULT 'MEDIUM',
  flagged_date TIMESTAMP DEFAULT NOW(),
  resolved_date TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.supplier_quality_score (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  supplier_name VARCHAR(255),
  total_deliveries INTEGER DEFAULT 0,
  on_time_deliveries INTEGER DEFAULT 0,
  quality_score DECIMAL(5, 2) DEFAULT 100,
  fraud_incidents INTEGER DEFAULT 0,
  last_audit_date TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_supplier_fraud_store_id ON public.supplier_fraud_flags(store_id);
CREATE INDEX IF NOT EXISTS idx_supplier_quality_store_id ON public.supplier_quality_score(store_id);

-- ============================================================================
-- MIGRATION 012: M-Pesa Reconciliation
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.mpesa_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  transaction_id VARCHAR(100) UNIQUE,
  mpesa_code VARCHAR(20),
  amount DECIMAL(12, 2),
  customer_phone VARCHAR(20),
  transaction_date TIMESTAMP,
  reconciliation_status VARCHAR(50) DEFAULT 'PENDING',
  mapped_to_sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mpesa_reconciliation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  reconciliation_date DATE,
  total_mpesa_received DECIMAL(12, 2),
  total_matched_sales DECIMAL(12, 2),
  variance DECIMAL(12, 2),
  status VARCHAR(50) DEFAULT 'PENDING',
  reconciled_by VARCHAR(255),
  reconciled_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_store_id ON public.mpesa_transactions(store_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_date ON public.mpesa_transactions(transaction_date);

-- ============================================================================
-- MIGRATION 013: KRA Tax Compliance
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tax_compliance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  tax_period_start DATE,
  tax_period_end DATE,
  total_sales DECIMAL(12, 2),
  total_tax_collected DECIMAL(12, 2),
  total_tax_paid_to_kra DECIMAL(12, 2),
  tax_rate DECIMAL(5, 2) DEFAULT 16,
  filing_status VARCHAR(50) DEFAULT 'PENDING',
  filed_date TIMESTAMP,
  payment_date TIMESTAMP,
  kra_reference VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tax_exemption_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_category VARCHAR(100),
  exemption_reason VARCHAR(255),
  exemption_percentage DECIMAL(5, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tax_payment_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  due_date DATE,
  tax_amount DECIMAL(12, 2),
  payment_status VARCHAR(50) DEFAULT 'PENDING',
  paid_on DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tax_compliance_store_id ON public.tax_compliance_records(store_id);
CREATE INDEX IF NOT EXISTS idx_tax_compliance_period ON public.tax_compliance_records(tax_period_start, tax_period_end);

-- ============================================================================
-- MIGRATION 014: Global Products (Shared Catalog)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.global_products (
  barcode TEXT PRIMARY KEY,
  generic_name TEXT NOT NULL,
  category TEXT,
  image_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  contribution_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_global_products_category ON public.global_products(category);
CREATE INDEX IF NOT EXISTS idx_global_products_name ON public.global_products(generic_name);
CREATE INDEX IF NOT EXISTS idx_global_products_contribution ON public.global_products(contribution_count DESC);

ALTER TABLE public.global_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS global_products_read ON public.global_products;
CREATE POLICY global_products_read
  ON public.global_products
  FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS global_products_insert ON public.global_products;
CREATE POLICY global_products_insert
  ON public.global_products
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS global_products_update ON public.global_products;
CREATE POLICY global_products_update
  ON public.global_products
  FOR UPDATE
  USING (auth.uid() = created_by OR auth.role() = 'service_role')
  WITH CHECK (auth.uid() = created_by OR auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION update_global_products_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_global_products_timestamp ON public.global_products;

CREATE TRIGGER trigger_update_global_products_timestamp
BEFORE UPDATE ON public.global_products
FOR EACH ROW
EXECUTE FUNCTION update_global_products_timestamp();

-- ============================================================================
-- MIGRATION 015: Shop Inventory (Private per-shop ledger)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.shop_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  barcode TEXT NOT NULL REFERENCES public.global_products(barcode) ON DELETE CASCADE,
  quantity DECIMAL(12, 2) NOT NULL DEFAULT 0,
  selling_price DECIMAL(12, 2) NOT NULL,
  buying_price DECIMAL(12, 2),
  custom_alias TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(shop_id, barcode)
);

CREATE INDEX IF NOT EXISTS idx_shop_inventory_shop_id ON public.shop_inventory(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_inventory_barcode ON public.shop_inventory(barcode);

CREATE OR REPLACE VIEW public.shop_inventory_with_details AS
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
  ROUND(((si.selling_price - COALESCE(si.buying_price, 0)) / NULLIF(si.buying_price, 0) * 100)::numeric, 2) AS margin_percent,
  si.created_at,
  si.updated_at
FROM public.shop_inventory si
LEFT JOIN public.global_products gp ON si.barcode = gp.barcode;

ALTER TABLE public.shop_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shop_inventory_access ON public.shop_inventory;
CREATE POLICY shop_inventory_access
  ON public.shop_inventory
  FOR ALL
  USING (
    shop_id IN (
      SELECT id FROM public.stores WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    shop_id IN (
      SELECT id FROM public.stores WHERE owner_id = auth.uid()
    )
  );

-- ============================================================================
-- SUCCESS: All migrations applied!
-- You now have 27+ tables + views for DukaBook features
-- ============================================================================
