-- filepath: migrations/016_debtors.sql
-- Migration 016: Debtors Table for Madeni (Credit) Management
-- Purpose: Track customer debts, payments, and credit history

DROP TABLE IF EXISTS debtors CASCADE;

CREATE TABLE debtors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  customer_id UUID,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  total_debt DECIMAL(15, 2) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(15, 2) NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  last_payment_date TIMESTAMP WITH TIME ZONE,
  date_owed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX idx_debtors_store_id ON debtors(store_id);
CREATE INDEX idx_debtors_customer ON debtors(customer_name, store_id);
CREATE INDEX idx_debtors_status ON debtors(status, store_id);
CREATE INDEX idx_debtors_date_owed ON debtors(date_owed DESC);
CREATE INDEX idx_debtors_last_payment ON debtors(last_payment_date DESC);

COMMIT;
