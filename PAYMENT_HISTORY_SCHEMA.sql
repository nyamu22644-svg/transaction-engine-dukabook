-- ============================================================================
-- PAYMENT HISTORY TABLE - Tracks all payment transactions
-- Run this in Supabase SQL Editor AFTER running STRICT_SUBSCRIPTION_SCHEMA.sql
-- ============================================================================

-- ============================================================================
-- STEP 1: Create Payment Status Enum
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Create Subscription Payments Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  
  -- Payment Details
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'KES',
  plan_name VARCHAR(50),  -- basic_monthly, premium_monthly, etc
  
  -- Payment Method & Status
  payment_method VARCHAR(50),  -- ADMIN_MANUAL, M-PESA, INTASEND, etc
  payment_ref TEXT,  -- External payment reference (from IntaSend, M-Pesa, etc)
  status payment_status DEFAULT 'pending',
  
  -- Dates
  paid_at TIMESTAMPTZ,  -- When payment was actually received
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Additional context
  description TEXT,  -- Why this payment (renewal, upgrade, etc)
  metadata JSONB  -- Flexible field for extra data
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_subscription_payments_store_id ON subscription_payments(store_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_subscription_id ON subscription_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status ON subscription_payments(status);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_paid_at ON subscription_payments(paid_at);

-- ============================================================================
-- STEP 3: RLS Policies on subscription_payments
-- ============================================================================

ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

-- Policy 1: Store owners can view ONLY their own store's payments
DROP POLICY IF EXISTS "Users view own store payments" ON subscription_payments;
CREATE POLICY "Users view own store payments"
  ON subscription_payments
  FOR SELECT
  USING (
    -- Allow if user owns the store OR if superadmin (service_role)
    (
      SELECT owner_id FROM stores 
      WHERE stores.id = subscription_payments.store_id
    ) = auth.uid()
    OR auth.role() = 'service_role'
  );

-- Policy 2: Only service role can create/update payments
DROP POLICY IF EXISTS "Prevent user payment inserts" ON subscription_payments;
CREATE POLICY "Prevent user payment inserts"
  ON subscription_payments
  FOR INSERT
  WITH CHECK (FALSE);

DROP POLICY IF EXISTS "Prevent user payment updates" ON subscription_payments;
CREATE POLICY "Prevent user payment updates"
  ON subscription_payments
  FOR UPDATE
  USING (FALSE);

-- ============================================================================
-- STEP 4: Function to Record Payment
-- ============================================================================

CREATE OR REPLACE FUNCTION record_subscription_payment(
  p_store_id UUID,
  p_subscription_id UUID,
  p_amount DECIMAL,
  p_plan_name VARCHAR(50),
  p_payment_method VARCHAR(50),
  p_payment_ref TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS subscription_payments AS $$
DECLARE
  v_payment subscription_payments;
BEGIN
  -- Insert payment record
  INSERT INTO subscription_payments (
    store_id, 
    subscription_id, 
    amount, 
    plan_name, 
    payment_method, 
    payment_ref, 
    status, 
    paid_at,
    description,
    updated_at
  )
  VALUES (
    p_store_id, 
    p_subscription_id, 
    p_amount, 
    p_plan_name, 
    p_payment_method, 
    p_payment_ref, 
    'completed',
    NOW(),
    p_description,
    NOW()
  )
  RETURNING * INTO v_payment;

  RETURN v_payment;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 5: Update Subscriptions Function to Record Payment
-- ============================================================================

CREATE OR REPLACE FUNCTION update_subscription_after_payment(
  p_store_id UUID,
  p_plan_name VARCHAR(50),
  p_payment_ref TEXT,
  p_expires_at TIMESTAMPTZ,
  p_reason TEXT DEFAULT 'Professional Account Upgrade'
)
RETURNS subscriptions AS $$
DECLARE
  v_sub subscriptions;
  v_amount DECIMAL;
BEGIN
  -- Determine amount based on plan
  v_amount := CASE 
    WHEN p_plan_name = 'premium_monthly' THEN 10000.00
    WHEN p_plan_name = 'basic_monthly' THEN 5000.00
    ELSE 0.00
  END;

  -- Update or insert subscription
  INSERT INTO subscriptions (
    store_id, plan_name, status, payment_ref, payment_method, expires_at, is_trial, last_payment_date, updated_at
  )
  VALUES (
    p_store_id, p_plan_name, 'active', p_payment_ref, 'ADMIN_MANUAL', p_expires_at, FALSE, NOW(), NOW()
  )
  ON CONFLICT (store_id) DO UPDATE
  SET
    plan_name = p_plan_name,
    status = 'active',
    payment_ref = p_payment_ref,
    payment_method = 'ADMIN_MANUAL',
    expires_at = p_expires_at,
    is_trial = FALSE,
    last_payment_date = NOW(),
    updated_at = NOW()
  RETURNING * INTO v_sub;

  -- Record the payment in payment history with the reason
  PERFORM record_subscription_payment(
    p_store_id,
    v_sub.id,
    v_amount,
    p_plan_name,
    'ADMIN_MANUAL',
    p_payment_ref,
    p_reason
  );

  RETURN v_sub;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 6: View for Payment Statistics
-- ============================================================================

CREATE OR REPLACE VIEW payment_stats AS
SELECT 
  sp.store_id,
  s.name as store_name,
  COUNT(*) as total_transactions,
  SUM(CASE WHEN sp.status = 'completed' THEN sp.amount ELSE 0 END) as total_collected,
  SUM(CASE WHEN sp.status = 'failed' THEN sp.amount ELSE 0 END) as failed_amount,
  COUNT(CASE WHEN sp.status = 'completed' THEN 1 END) as successful_payments,
  COUNT(CASE WHEN sp.status = 'failed' THEN 1 END) as failed_payments,
  MAX(sp.paid_at) as last_payment_date,
  AVG(CASE WHEN sp.status = 'completed' THEN sp.amount ELSE NULL END) as avg_payment_amount
FROM subscription_payments sp
LEFT JOIN stores s ON sp.store_id = s.id
GROUP BY sp.store_id, s.name;

-- ============================================================================
-- STEP 7: Verification - Check Payment History
-- ============================================================================

SELECT 
  sp.id,
  s.name as store_name,
  sp.plan_name,
  sp.amount,
  sp.payment_method,
  sp.payment_ref,
  sp.status,
  sp.paid_at,
  sp.description
FROM subscription_payments sp
LEFT JOIN stores s ON sp.store_id = s.id
ORDER BY sp.paid_at DESC
LIMIT 10;
