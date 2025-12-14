-- ============================================================================
-- SHRINKAGE DEBT TRACKING (KES 3 Billion Loss Crisis Fix)
-- ============================================================================
-- This table tracks inventory shrinkage attributed to specific employees
-- when physical stock counts reveal missing items. Helps quantify and 
-- recover losses from theft/over-pouring.

CREATE TABLE IF NOT EXISTS shrinkage_debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,                    -- Denormalized for reporting
  item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,                     -- Denormalized for reporting
  quantity_missing DECIMAL(10,2) NOT NULL,    -- Units missing from physical count
  unit_price DECIMAL(10,2) NOT NULL,          -- Value per unit (KES)
  total_debt_amount DECIMAL(10,2) NOT NULL,   -- quantity_missing * unit_price
  audit_id TEXT NOT NULL,                      -- Reference to inventory count ID
  audit_date TIMESTAMP NOT NULL,               -- When the count was performed
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACKNOWLEDGED', 'RESOLVED', 'DISPUTED')),
  -- PENDING = System flagged, awaiting employee acknowledgment
  -- ACKNOWLEDGED = Employee accepted responsibility
  -- RESOLVED = Amount deducted from salary or settled
  -- DISPUTED = Employee disputes the finding
  notes TEXT,                                  -- Reason for shrinkage (theft, over-pour, error, etc.)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_shrinkage_store_id ON shrinkage_debts(store_id);
CREATE INDEX IF NOT EXISTS idx_shrinkage_agent_id ON shrinkage_debts(agent_id);
CREATE INDEX IF NOT EXISTS idx_shrinkage_status ON shrinkage_debts(status);
CREATE INDEX IF NOT EXISTS idx_shrinkage_audit_date ON shrinkage_debts(audit_date);

-- Enable RLS
ALTER TABLE shrinkage_debts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: All can read their store's shrinkage debts
CREATE POLICY shrinkage_debts_access ON shrinkage_debts 
  FOR ALL USING (true);

-- ============================================================================
-- UPDATE: agents TABLE - Track total shrinkage debt
-- ============================================================================
-- Add fields to track shrinkage liability per employee
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS total_shrinkage_debt DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS acknowledged_shrinkage_debt DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS salary_deduction_pending DECIMAL(10,2) DEFAULT 0;

-- ============================================================================
-- VIEW: Employee Accountability Dashboard
-- ============================================================================
CREATE OR REPLACE VIEW agent_shrinkage_summary AS
SELECT
  a.id as agent_id,
  a.store_id,
  a.name as agent_name,
  COUNT(sd.id) as total_shrinkage_incidents,
  SUM(CASE WHEN sd.status = 'PENDING' THEN 1 ELSE 0 END) as pending_incidents,
  SUM(CASE WHEN sd.status = 'ACKNOWLEDGED' THEN 1 ELSE 0 END) as acknowledged_incidents,
  COALESCE(SUM(sd.total_debt_amount), 0) as total_shrinkage_amount,
  COALESCE(SUM(CASE WHEN sd.status = 'ACKNOWLEDGED' THEN sd.total_debt_amount ELSE 0 END), 0) as acknowledged_amount,
  COALESCE(SUM(CASE WHEN sd.status = 'RESOLVED' THEN sd.total_debt_amount ELSE 0 END), 0) as resolved_amount,
  a.total_sales_value,
  (COALESCE(SUM(sd.total_debt_amount), 0) / NULLIF(a.total_sales_value, 0)) * 100 as shrinkage_to_sales_ratio
FROM agents a
LEFT JOIN shrinkage_debts sd ON a.id = sd.agent_id
WHERE a.is_active = true
GROUP BY a.id, a.store_id, a.name, a.total_sales_value;
