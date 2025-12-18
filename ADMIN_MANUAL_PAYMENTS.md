# Admin Manual Payments - Setup Guide

## Problem
When a superadmin manually upgrades a store tier, the payment wasn't being recorded in revenue. Now it will be!

## Solution
Two parts:
1. Update database to allow ADMIN_MANUAL payments
2. Updated code to record payments when admin sets tier

## How to Apply

### Step 1: Run Database Migration
Go to Supabase SQL Editor and run:

```sql
-- Update payment_history table constraint to include ADMIN_MANUAL
ALTER TABLE payment_history 
DROP CONSTRAINT IF EXISTS payment_history_payment_method_check;

ALTER TABLE payment_history
ADD CONSTRAINT payment_history_payment_method_check 
CHECK (payment_method IN ('MPESA_STK', 'MPESA_PAYBILL', 'MPESA_TILL', 'CARD', 'BANK', 'ADMIN_MANUAL'));

-- Add comment for clarity
COMMENT ON CONSTRAINT payment_history_payment_method_check ON payment_history IS 
'Valid payment methods: M-Pesa, Card, Bank, or Admin manual override';
```

### Step 2: Code Changes (Already Done)
The `setStoreTierAdmin()` function in `billingService.ts` now:
1. Updates the subscription (status, plan, expiry)
2. **Records a payment in payment_history with ADMIN_MANUAL method**
3. Amount = KES 2,999 for PREMIUM (BASIC is free)
4. Payment marked as COMPLETED immediately
5. Notes explain the action taken

### Step 3: Test It
1. Go to Super Admin Dashboard
2. Set a store tier to PREMIUM for 12 months
3. Go to Store Health Dashboard → top performing stores
4. That store should now show revenue including the PREMIUM payment
5. Check Dashboard revenue counts - should increase

## Pricing
- **BASIC**: KES 0 (free - no payment recorded)
- **PREMIUM**: KES 2,999 per upgrade

## What Gets Recorded
When admin upgrades a store to PREMIUM:
```
payment_history entry:
- store_id: [store uuid]
- amount: 2999
- currency: KES
- payment_method: ADMIN_MANUAL (new!)
- status: COMPLETED
- plan_id: PREMIUM
- notes: "Admin manual tier upgrade to PREMIUM for 12 months"
- created_at: [timestamp]
```

This payment now counts toward:
- Monthly revenue
- Store health dashboard
- Platform analytics
- Payment history reports

## Troubleshooting

If you get an error about "payment_method_check" constraint, the migration hasn't been applied yet. Run Step 1 above.

If payments still don't show in revenue, clear browser cache:
```javascript
localStorage.clear()
location.reload()
```

Then refresh the Store Health Dashboard.
