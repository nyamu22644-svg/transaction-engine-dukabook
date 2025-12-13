-- M-Pesa Payments Table
-- Stores all STK Push payment requests and their status

CREATE TABLE IF NOT EXISTS mpesa_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  checkout_request_id TEXT UNIQUE NOT NULL,
  merchant_request_id TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  mpesa_receipt_number TEXT,
  transaction_date TEXT,
  result_code INTEGER,
  result_desc TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Index for faster lookups
CREATE INDEX idx_mpesa_payments_checkout_id ON mpesa_payments(checkout_request_id);
CREATE INDEX idx_mpesa_payments_store_id ON mpesa_payments(store_id);
CREATE INDEX idx_mpesa_payments_status ON mpesa_payments(status);

-- Payment History Table (for all completed payments)
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KES',
  payment_method TEXT NOT NULL CHECK (payment_method IN ('MPESA_STK', 'MPESA_PAYBILL', 'MPESA_TILL', 'CARD', 'BANK')),
  mpesa_receipt TEXT,
  phone_number TEXT,
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  plan_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_history_store_id ON payment_history(store_id);

-- Add columns to subscriptions table if the table exists
DO $$ 
BEGIN
  -- Check if subscriptions table exists first
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'last_payment_date') THEN
      ALTER TABLE subscriptions ADD COLUMN last_payment_date TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'last_payment_amount') THEN
      ALTER TABLE subscriptions ADD COLUMN last_payment_amount DECIMAL(10,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'mpesa_receipt_number') THEN
      ALTER TABLE subscriptions ADD COLUMN mpesa_receipt_number TEXT;
    END IF;
  END IF;
END $$;

-- RLS Policies
ALTER TABLE mpesa_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for edge functions)
CREATE POLICY "Service role has full access to mpesa_payments" ON mpesa_payments
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to payment_history" ON payment_history
  FOR ALL USING (auth.role() = 'service_role');

-- Allow store owners to view their own payments
CREATE POLICY "Store owners can view their payments" ON mpesa_payments
  FOR SELECT USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  );

CREATE POLICY "Store owners can view their payment history" ON payment_history
  FOR SELECT USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  );

COMMENT ON TABLE mpesa_payments IS 'Tracks M-Pesa STK Push payment requests';
COMMENT ON TABLE payment_history IS 'Complete payment history for all stores';
