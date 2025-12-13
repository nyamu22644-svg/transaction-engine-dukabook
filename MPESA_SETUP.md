# M-Pesa Production Setup - Complete Guide

## Overview
DukaBook uses M-Pesa for subscription payments with two methods:
1. **STK Push** - Automatic payment prompt sent to user's phone (from app)
2. **C2B (Customer to Business)** - Manual payment by customer (*456# → Buy Goods)

### Payment Details
- **Till Number**: 400200
- **Bank Account**: 1017341 (Co-operative Bank)
- All payments go directly to your Co-op Bank account

---

## QUICK DEPLOY (Copy-Paste Commands)

### Step 1: Install Supabase CLI
```bash
npm install -g supabase
```

### Step 2: Login to Supabase
```bash
supabase login
```

### Step 3: Link Your Project
```bash
supabase link --project-ref YOUR_PROJECT_REF
```
> Replace `YOUR_PROJECT_REF` with your actual project reference from Supabase dashboard

### Step 4: Deploy ALL Edge Functions
```bash
supabase functions deploy mpesa-stk-push --no-verify-jwt
supabase functions deploy mpesa-callback --no-verify-jwt
supabase functions deploy mpesa-query --no-verify-jwt
supabase functions deploy mpesa-c2b-validate --no-verify-jwt
supabase functions deploy mpesa-c2b-confirm --no-verify-jwt
supabase functions deploy mpesa-register-urls --no-verify-jwt
```

### Step 5: Set ALL Secrets
```bash
supabase secrets set MPESA_CONSUMER_KEY="GjifS76PwaV5YE3B2oSdRucAdS8MqUxvRF0Ehv4QL3pK7jc0"
supabase secrets set MPESA_CONSUMER_SECRET="uUCpeQ834QpQ8erDUif2AZfUVXL4wQXnudxIfCPahjlm3MhAzDaKijnVuQNJqTax"
supabase secrets set MPESA_PASSKEY="bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"
supabase secrets set MPESA_SHORTCODE="400200"
supabase secrets set MPESA_CALLBACK_URL="https://YOUR_PROJECT_REF.supabase.co/functions/v1/mpesa-callback"
```

### Step 6: Run Database Migrations
Copy and paste these SQL scripts into Supabase SQL Editor:
1. `supabase/migrations/20241211_mpesa_payments.sql` - STK Push tables
2. `supabase/migrations/20241211_mpesa_c2b.sql` - C2B tables

### Step 7: Register C2B URLs (One-Time)
```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/mpesa-register-urls
```

---

## DETAILED SETUP

## 1. Supabase Edge Functions Deployment

### Prerequisites
- Supabase CLI installed: `npm install -g supabase`
- Login to Supabase: `supabase login`
- Link your project: `supabase link --project-ref YOUR_PROJECT_REF`

### Deploy Edge Functions

```bash
# Deploy STK Push function
supabase functions deploy mpesa-stk-push --no-verify-jwt

# Deploy Callback handler
supabase functions deploy mpesa-callback --no-verify-jwt

# Deploy Query status function
supabase functions deploy mpesa-query --no-verify-jwt
```

## 2. Set Environment Secrets

```bash
# M-Pesa Production Credentials
supabase secrets set MPESA_CONSUMER_KEY="GjifS76PwaV5YE3B2oSdRucAdS8MqUxvRF0Ehv4QL3pK7jc0"
supabase secrets set MPESA_CONSUMER_SECRET="uUCpeQ834QpQ8erDUif2AZfUVXL4wQXnudxIfCPahjlm3MhAzDaKijnVuQNJqTax"
supabase secrets set MPESA_PASSKEY="bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"
supabase secrets set MPESA_SHORTCODE="400200"
supabase secrets set MPESA_CALLBACK_URL="https://YOUR_PROJECT_REF.supabase.co/functions/v1/mpesa-callback"
```

Replace `YOUR_PROJECT_REF` with your actual Supabase project reference.

## 3. Database Migration

Run the SQL migration to create payment tables:

```bash
supabase db push
```

Or manually execute `supabase/migrations/20241211_mpesa_payments.sql` in the Supabase SQL Editor.

## 4. Configure Callback URL in Safaricom Portal

1. Login to [Safaricom Daraja Portal](https://developer.safaricom.co.ke/)
2. Go to your App → APIs → Lipa Na M-Pesa Online
3. Set Callback URL to: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/mpesa-callback`

## 5. Test the Integration

### Test STK Push
```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/mpesa-stk-push \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "254712345678",
    "amount": 1,
    "storeId": "test-store-id",
    "planId": "premium-monthly",
    "accountReference": "TEST-001"
  }'
```

## Payment Flow

```
1. User clicks "Pay Now" → Frontend
2. STK Push initiated → mpesa-stk-push Edge Function
3. M-Pesa prompt appears on user's phone
4. User enters PIN
5. Safaricom sends confirmation → mpesa-callback Edge Function
6. Subscription activated automatically
7. Frontend polls status → mpesa-query Edge Function
8. Success shown to user
```

## Troubleshooting

### "Invalid Access Token"
- Check MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET are correct
- Ensure credentials are for Production, not Sandbox

### "Invalid Passkey"
- The passkey must match what Safaricom provided for your Till
- Contact Safaricom support if unsure

### Callback not received
- Ensure callback URL is publicly accessible (HTTPS)
- Check Supabase Edge Function logs for errors
- Verify the callback URL is registered in Daraja portal

### Payment stuck in "Pending"
- Check if callback was received (Edge Function logs)
- User may have cancelled on their phone
- M-Pesa network delays can take up to 60 seconds

## Security Notes

⚠️ NEVER expose these credentials in frontend code:
- Consumer Key
- Consumer Secret
- Passkey

All sensitive operations happen in Supabase Edge Functions (server-side).

---

# M-Pesa C2B (Customer to Business) Setup

## Overview

C2B handles payments made directly to your Till from a customer's phone (not through STK Push).
This is for when customers manually pay using:
- Lipa na M-Pesa → Buy Goods → Till 400200 → Enter Amount

## 1. Deploy C2B Edge Functions

```bash
# Deploy C2B Validation handler
supabase functions deploy mpesa-c2b-validate --no-verify-jwt

# Deploy C2B Confirmation handler
supabase functions deploy mpesa-c2b-confirm --no-verify-jwt

# Deploy URL Registration (one-time setup)
supabase functions deploy mpesa-register-urls --no-verify-jwt
```

## 2. Run C2B Database Migration

```bash
supabase db push
```

Or manually execute `supabase/migrations/20241211_mpesa_c2b.sql` in the Supabase SQL Editor.

## 3. Register Callback URLs with Safaricom

### Option A: Call the Edge Function (Recommended)

After deploying, make a POST request to register your URLs:

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/mpesa-register-urls
```

This will register:
- **Validation URL**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/mpesa-c2b-validate`
- **Confirmation URL**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/mpesa-c2b-confirm`

### Option B: Manual Registration via Daraja Portal

1. Login to [Safaricom Daraja Portal](https://developer.safaricom.co.ke/)
2. Go to APIs → C2B → Register URL
3. Enter your URLs manually

## 4. How C2B Payment Works

```
1. Customer dials *456#
2. Lipa Na M-PESA → Buy Goods
3. Enters Till Number: 400200
4. Enters Amount: 500 (for Basic monthly)
5. Enters Account Reference: DUKA-XXXX (store access code)
6. Confirms with PIN
7. Safaricom validates → mpesa-c2b-validate
8. Safaricom confirms → mpesa-c2b-confirm
9. Subscription activated automatically!
```

## 5. Account Reference Format

Tell your customers to enter their store access code as the Account Reference:

| Format | Example | Notes |
|--------|---------|-------|
| `DUKA-XXXX` | `DUKA-1234` | Recommended format |
| Access Code | `shop123` | Store's access code |
| Store ID | `abc-123-def` | UUID (if known) |

## 6. Subscription Pricing Detection

The system auto-detects the plan based on payment amount:

| Amount (KES) | Plan | Duration |
|-------------|------|----------|
| 400 - 600 | Basic | 1 month |
| 1,400 - 1,600 | Premium | 1 month |
| 4,500 - 5,500 | Basic | 12 months |
| 14,000 - 16,000 | Premium | 12 months |

## 7. Handling Unmatched Payments

If a customer pays but doesn't enter a valid account reference:
1. Payment is recorded in `mpesa_c2b_transactions` with status `UNMATCHED`
2. Super Admin can view unmatched payments in dashboard
3. Use the SQL function to manually link:

```sql
SELECT link_c2b_payment_to_store('MPESA_RECEIPT_NUMBER', 'STORE_UUID', 'basic-monthly');
```

## 8. Monitoring C2B Payments

### View all C2B transactions:
```sql
SELECT * FROM mpesa_c2b_transactions ORDER BY created_at DESC;
```

### View unmatched payments:
```sql
SELECT * FROM unmatched_c2b_payments;
```

### View successful activations:
```sql
SELECT * FROM mpesa_c2b_transactions 
WHERE subscription_activated = true 
ORDER BY created_at DESC;
```

## C2B vs STK Push Comparison

| Feature | STK Push | C2B |
|---------|----------|-----|
| User initiates from | App (button click) | Phone (*456#) |
| Prompt appears | Automatically | User initiates |
| Account Reference | Set by app | Entered by user |
| Matching | Automatic | Requires correct reference |
| Best for | In-app purchases | Manual payments |

## Troubleshooting C2B

### Payments not appearing
- Check Edge Function logs in Supabase dashboard
- Verify URLs are registered: call `mpesa-register-urls`
- Contact Safaricom if URLs were registered before (production is one-time)

### Payments showing as UNMATCHED
- Customer didn't enter account reference
- Account reference doesn't match any store
- Manually link using `link_c2b_payment_to_store()` function

### Validation URL timeout
- ResponseType is set to "Completed" - payment will still go through
- Check Edge Function performance

### Contact Safaricom
For production C2B issues, email:
- apisupport@safaricom.co.ke
- M-pesabusiness@safaricom.co.ke
