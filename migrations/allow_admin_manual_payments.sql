-- ============================================================================
-- Fix Payment History to Support ADMIN_MANUAL Payments
-- Allows admin to manually set tier and record it as revenue
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Update payment_history table constraint to include ADMIN_MANUAL
ALTER TABLE payment_history 
DROP CONSTRAINT IF EXISTS payment_history_payment_method_check;

ALTER TABLE payment_history
ADD CONSTRAINT payment_history_payment_method_check 
CHECK (payment_method IN ('MPESA_STK', 'MPESA_PAYBILL', 'MPESA_TILL', 'CARD', 'BANK', 'ADMIN_MANUAL'));

-- Add comment for clarity
COMMENT ON CONSTRAINT payment_history_payment_method_check ON payment_history IS 
'Valid payment methods: M-Pesa, Card, Bank, or Admin manual override';

-- ============================================================================
-- End of Migration
-- ============================================================================
