# IntaSend Callback URL Configuration Guide

## Problem
IntaSend is rejecting the callback URL with the error: **"Enter a valid URL"**

This occurs in the IntaSend dashboard when trying to configure the webhook/callback URL for post-payment redirects.

## Solution

### For Local Development (Testing)
Use a tunneling service to expose your local app to the internet:

1. **Using ngrok (Recommended)**
   ```bash
   # Download from https://ngrok.com/download
   ngrok http 5173
   ```
   This gives you a URL like: `https://abc123def456.ngrok.io`

2. **Callback URL in IntaSend Dashboard:**
   ```
   https://abc123def456.ngrok.io/api/payment-callback
   ```

### For Production
Replace with your actual domain:

```
https://yourdomain.com/api/payment-callback
```

## URL Requirements

IntaSend expects:
- ✅ **Protocol**: `https://` (not `http://`)
- ✅ **Valid Domain**: Actual resolvable domain or ngrok tunnel
- ✅ **Path**: `/api/payment-callback` or similar endpoint pattern
- ✅ **No Query Parameters**: Don't include `?status=` or `?reference=` in the callback URL itself
  - IntaSend will **append** parameters like: `?status_code=0&reference=REF123&subscription_id=SUB123`

## Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| "Enter a valid URL" | Use `https://` not `http://`. Check domain validity. |
| Not a real domain | Use ngrok tunnel for local dev, real domain for production |
| URL with `?status=...` | Remove all query params from the callback URL - IntaSend adds them automatically |
| Localhost callback | Won't work - IntaSend can't reach `localhost`. Use ngrok instead. |

## How It Works

1. **Payment Form Submission**
   ```
   User clicks "Pay KES 500" 
   → SubscriptionPayment.tsx calls intasendSubscriptionService
   → IntaSend API returns { checkout_url: "https://..." }
   → User redirected to IntaSend payment page
   ```

2. **After Payment**
   ```
   User completes M-Pesa payment on IntaSend
   → IntaSend redirects to: https://yourdomain.com/api/payment-callback?status_code=0&reference=REF123&subscription_id=SUB123
   → CallbackPage.tsx intercepts the request
   → Processes status_code, subscription_id, reference
   → Updates localStorage with completed order
   → Updates store tier to PREMIUM
   → Shows success screen "Done!"
   → Auto-redirects to home
   ```

## IntaSend Dashboard Configuration

1. Log in to your IntaSend account (https://dashboard.intasend.com)
2. Navigate to **Settings** → **Webhooks/Callbacks** or **Payment Configuration**
3. Enter callback URL: `https://yourdomain.com/api/payment-callback`
4. Select **POST** as the method (if option available)
5. Save settings
6. Test with a payment

## Code Implementation

The callback page (`pages/CallbackPage.tsx`) automatically:
- Parses IntaSend response parameters
- Validates success using `status_code === '0'`
- Saves completed order to localStorage
- Updates store subscription tier
- Handles errors gracefully

No additional code changes needed - just configure the URL in IntaSend dashboard.

## Testing the Integration

### Step 1: Set up Callback URL
- Local: Use ngrok tunnel
- Production: Use real domain

### Step 2: Make a Test Payment
1. Navigate to your app
2. Click "Upgrade" on a store
3. Select a plan (e.g., "PREMIUM: KES 500/month")
4. Click "Pay KES 500"
5. Complete M-Pesa STK Push on your phone
6. Should redirect to callback page with success message

### Step 3: Verify Success
- Success screen displays "Done!"
- Page redirects to home after 2 seconds
- Store tier updates to PREMIUM
- Order saved in localStorage (check browser DevTools → Application → Local Storage)

## Troubleshooting

**Callback URL still rejected?**
1. Verify URL uses `https://` (not `http://`)
2. Test domain is publicly accessible:
   ```bash
   curl https://yourdomain.com/api/payment-callback
   ```
3. Check that no query parameters are in the callback URL field
4. Try simpler path: `/api/callback` instead of `/api/payment-callback`
5. Contact IntaSend support with the exact error message

**Payment not redirecting to callback?**
1. Check browser console for errors
2. Verify callback URL is saved in IntaSend dashboard
3. Check that `intasendSubscriptionService.ts` has correct API keys
4. Verify `SubscriptionPayment.tsx` is calling `createSubscription()`

**Success screen not showing?**
1. Check `CallbackPage.tsx` is imported in `App.tsx`
2. Verify URL parameters are being received (check browser console)
3. Ensure localStorage is not disabled in browser
4. Check that store update logic in `CallbackPage.tsx` executes without errors
