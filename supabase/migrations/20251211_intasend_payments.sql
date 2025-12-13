-- Migration: Create intasend_payments table for payment history
CREATE TABLE IF NOT EXISTS intasend_payments (
  id BIGSERIAL PRIMARY KEY,
  event TEXT,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
