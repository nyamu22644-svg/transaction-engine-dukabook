-- Migration 000: Create Base Schema (Stores, Customers, Inventory, Sales)
-- Purpose: Foundation tables that all feature migrations depend on

-- 1. STORES (main business account)
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_name VARCHAR(255) NOT NULL,
  store_type VARCHAR(50) DEFAULT 'retail',
  country TEXT DEFAULT 'Kenya',
  city TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  logo_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  subscription_tier TEXT DEFAULT 'basic',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_stores_owner_id ON stores(owner_id);

-- 2. CUSTOMERS (retail customers/debtors)
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  customer_email VARCHAR(255),
  credit_limit DECIMAL(12,2) DEFAULT 0,
  total_debt DECIMAL(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_store_id ON customers(store_id);

-- 3. AGENTS (employees)
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  agent_name VARCHAR(255) NOT NULL,
  agent_phone VARCHAR(20),
  agent_email VARCHAR(255),
  role VARCHAR(50) DEFAULT 'cashier',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agents_store_id ON agents(store_id);

-- 4. INVENTORY_ITEMS (products in stock)
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  item_code VARCHAR(100),
  barcode VARCHAR(100),
  unit_price DECIMAL(12,2) NOT NULL,
  quantity_on_hand DECIMAL(12,2) DEFAULT 0,
  reorder_level DECIMAL(12,2) DEFAULT 0,
  supplier_name VARCHAR(255),
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_store_id ON inventory_items(store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_barcode ON inventory_items(barcode);

-- 5. SALES (transaction records)
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  amount_paid DECIMAL(12,2) DEFAULT 0,
  change_amount DECIMAL(12,2) DEFAULT 0,
  payment_method VARCHAR(50) DEFAULT 'cash',
  sale_date TIMESTAMP DEFAULT NOW(),
  is_completed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_store_id ON sales(store_id);
CREATE INDEX IF NOT EXISTS idx_sales_agent_id ON sales(agent_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);

-- Enable RLS on all tables
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- RLS: Stores - Users can only see their own store
DROP POLICY IF EXISTS stores_rls_owner ON stores;
CREATE POLICY stores_rls_owner
  ON stores
  FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- RLS: Customers - Only see customers from your stores
DROP POLICY IF EXISTS customers_rls_store ON customers;
CREATE POLICY customers_rls_store
  ON customers
  FOR ALL
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()))
  WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

-- RLS: Agents - Only see agents from your stores
DROP POLICY IF EXISTS agents_rls_store ON agents;
CREATE POLICY agents_rls_store
  ON agents
  FOR ALL
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()))
  WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

-- RLS: Inventory - Only see inventory from your stores
DROP POLICY IF EXISTS inventory_rls_store ON inventory_items;
CREATE POLICY inventory_rls_store
  ON inventory_items
  FOR ALL
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()))
  WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

-- RLS: Sales - Only see sales from your stores
DROP POLICY IF EXISTS sales_rls_store ON sales;
CREATE POLICY sales_rls_store
  ON sales
  FOR ALL
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()))
  WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));
