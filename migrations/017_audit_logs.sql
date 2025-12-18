-- filepath: migrations/017_audit_logs.sql
-- Migration 017: Audit Logging for Madeni/Debtor Management
-- Purpose: Track all changes to debtor records for accountability and fraud prevention

-- Drop existing table if it exists
DROP TABLE IF EXISTS audit_logs CASCADE;

-- Create audit_logs table - simple structure, no foreign keys to non-existent tables
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  actor_id UUID,
  actor_name VARCHAR(255),
  actor_role VARCHAR(50),
  old_value JSONB,
  new_value JSONB,
  change_description TEXT,
  affected_customer_id UUID,
  affected_customer_name VARCHAR(255),
  affected_customer_phone VARCHAR(20),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast querying
CREATE INDEX idx_audit_logs_store_created 
  ON audit_logs(store_id, created_at DESC);

CREATE INDEX idx_audit_logs_debtor 
  ON audit_logs(affected_customer_id, created_at DESC);

CREATE INDEX idx_audit_logs_action 
  ON audit_logs(store_id, action_type, created_at DESC);

CREATE INDEX idx_audit_logs_actor 
  ON audit_logs(actor_id, store_id, created_at DESC);

COMMIT;
