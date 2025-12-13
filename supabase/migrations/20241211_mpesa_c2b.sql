-- M-Pesa C2B (Customer to Business) Transactions Table
-- Records all direct payments to your Till number

-- Create C2B transactions table
CREATE TABLE IF NOT EXISTS mpesa_c2b_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trans_id VARCHAR(50) UNIQUE NOT NULL,           -- M-Pesa receipt number
    trans_type VARCHAR(50),                          -- "Pay Bill" or "Buy Goods"
    trans_time VARCHAR(20),                          -- YYYYMMDDHHmmss format
    trans_amount DECIMAL(12, 2) NOT NULL,            -- Amount paid
    business_short_code VARCHAR(20),                 -- Your Till/Paybill
    bill_ref_number VARCHAR(100),                    -- Account reference (what customer entered)
    invoice_number VARCHAR(100),
    org_account_balance VARCHAR(50),                 -- Balance after transaction
    third_party_trans_id VARCHAR(100),
    msisdn VARCHAR(20),                              -- Customer phone (may be masked)
    first_name VARCHAR(100),
    middle_name VARCHAR(100),
    last_name VARCHAR(100),
    store_id UUID REFERENCES stores(id),             -- Linked store (if matched)
    status VARCHAR(30) DEFAULT 'PENDING',            -- VALIDATING, COMPLETED, PROCESSED, UNMATCHED, CREDITED
    subscription_activated BOOLEAN DEFAULT FALSE,
    plan_id VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_c2b_trans_id ON mpesa_c2b_transactions(trans_id);
CREATE INDEX IF NOT EXISTS idx_c2b_store_id ON mpesa_c2b_transactions(store_id);
CREATE INDEX IF NOT EXISTS idx_c2b_status ON mpesa_c2b_transactions(status);
CREATE INDEX IF NOT EXISTS idx_c2b_bill_ref ON mpesa_c2b_transactions(bill_ref_number);
CREATE INDEX IF NOT EXISTS idx_c2b_msisdn ON mpesa_c2b_transactions(msisdn);
CREATE INDEX IF NOT EXISTS idx_c2b_created_at ON mpesa_c2b_transactions(created_at DESC);

-- Enable RLS
ALTER TABLE mpesa_c2b_transactions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view C2B transactions (for admin dashboard)
CREATE POLICY "Authenticated users can view c2b transactions"
    ON mpesa_c2b_transactions FOR SELECT
    USING (auth.role() = 'authenticated');

-- Service role can insert/update (for edge functions)
CREATE POLICY "Service role can manage c2b transactions"
    ON mpesa_c2b_transactions FOR ALL
    USING (auth.role() = 'service_role');

-- View for unmatched payments (needs manual reconciliation)
CREATE OR REPLACE VIEW unmatched_c2b_payments AS
SELECT 
    id,
    trans_id,
    trans_amount,
    bill_ref_number,
    msisdn,
    first_name || ' ' || COALESCE(middle_name, '') || ' ' || last_name AS customer_name,
    trans_time,
    created_at,
    notes
FROM mpesa_c2b_transactions
WHERE status IN ('UNMATCHED', 'CREDITED')
ORDER BY created_at DESC;

-- Function to manually link a C2B payment to a store
CREATE OR REPLACE FUNCTION link_c2b_payment_to_store(
    p_trans_id VARCHAR,
    p_store_id UUID,
    p_plan_id VARCHAR DEFAULT 'basic-monthly'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payment mpesa_c2b_transactions%ROWTYPE;
    v_months INTEGER;
    v_period_end TIMESTAMP;
BEGIN
    -- Get the payment
    SELECT * INTO v_payment 
    FROM mpesa_c2b_transactions 
    WHERE trans_id = p_trans_id;
    
    IF v_payment.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment not found');
    END IF;
    
    IF v_payment.subscription_activated THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment already processed');
    END IF;
    
    -- Determine subscription months
    v_months := CASE 
        WHEN p_plan_id LIKE '%yearly%' THEN 12
        ELSE 1
    END;
    
    v_period_end := NOW() + (v_months || ' months')::INTERVAL;
    
    -- Update or create subscription
    INSERT INTO subscriptions (store_id, plan_id, status, is_trial, current_period_start, current_period_end, last_payment_date, last_payment_amount, mpesa_receipt_number)
    VALUES (p_store_id, p_plan_id, 'ACTIVE', false, NOW(), v_period_end, NOW(), v_payment.trans_amount, p_trans_id)
    ON CONFLICT (store_id) DO UPDATE SET
        plan_id = EXCLUDED.plan_id,
        status = 'ACTIVE',
        is_trial = false,
        current_period_end = subscriptions.current_period_end + (v_months || ' months')::INTERVAL,
        last_payment_date = NOW(),
        last_payment_amount = v_payment.trans_amount,
        mpesa_receipt_number = p_trans_id,
        updated_at = NOW();
    
    -- Update C2B transaction
    UPDATE mpesa_c2b_transactions
    SET 
        store_id = p_store_id,
        status = 'PROCESSED',
        subscription_activated = true,
        plan_id = p_plan_id,
        notes = 'Manually linked by admin',
        updated_at = NOW()
    WHERE trans_id = p_trans_id;
    
    -- Log payment
    INSERT INTO payment_history (store_id, amount, currency, payment_method, mpesa_receipt, status, plan_id, notes)
    VALUES (p_store_id, v_payment.trans_amount, 'KES', 'MPESA_C2B_MANUAL', p_trans_id, 'COMPLETED', p_plan_id, 'Manually linked C2B payment');
    
    RETURN jsonb_build_object(
        'success', true, 
        'store_id', p_store_id,
        'amount', v_payment.trans_amount,
        'period_end', v_period_end
    );
END;
$$;

-- Grant execute to authenticated users (super admins)
GRANT EXECUTE ON FUNCTION link_c2b_payment_to_store TO authenticated;
