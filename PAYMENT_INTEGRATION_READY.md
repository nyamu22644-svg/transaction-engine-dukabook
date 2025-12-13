# IntaSend Payment Integration - Complete Setup Guide

## Current Status ✅

Your DukaBook app now has **full IntaSend M-Pesa payment integration**. Here's what's configured:

### What's Ready
- ✅ IntaSend API keys in `.env.local` (VITE_INTASEND_PUBLIC_KEY & VITE_INTASEND_SECRET_KEY)
- ✅ Payment form calls actual IntaSend API
- ✅ Callback page created and integrated in routing
- ✅ Success/error handling with auto-redirect
- ✅ Store tier updates to PREMIUM on payment success
- ✅ All legacy Daraja code removed
- ✅ No technical jargon shown to users

### What Needs Configuration
- ⏳ **Callback URL in IntaSend Dashboard** (you need to do this)

---

## Step 1: Get Your Callback URL

### For Local Development/Testing:
Use **ngrok** to expose your local app to the internet:

```bash
ngrok http 5173
```

This outputs something like:
```
Forwarding https://abc123def456.ngrok.io -> http://localhost:5173
```

### For Production:
Use your actual domain, e.g., `https://yourdomain.com`

---

## Step 2: Configure in IntaSend Dashboard

1. Go to https://dashboard.intasend.com
2. Login with your IntaSend account
3. Find **Settings** → **Webhooks**, **Callbacks**, or **API Configuration**
4. Add callback URL:

   **Use this exact format:**
   ```
   https://your-callback-url.com/api/payment-callback
   ```

   Replace `your-callback-url.com` with:
   - Local dev: `abc123def456.ngrok.io` (from ngrok)
   - Production: `yourdomain.com`

5. Method should be: **POST** (if option available)
6. Save/Enable the webhook
7. Test configuration (IntaSend usually provides a test button)

---

## Step 3: Test the Payment Flow

1. **Start your app:**
   ```bash
   npm run dev
   ```

2. **Login to a store** (any store)

3. **Click "Upgrade"** button

4. **Select a plan** (e.g., "PREMIUM: KES 500/month")

5. **Click "Pay KES 500"**

6. **Complete M-Pesa payment** on your phone when prompted

7. **Expected result:**
   - Redirected to success page showing **"Done!"**
   - Auto-redirects to home after 2 seconds
   - Store tier updates to PREMIUM (visible in next dashboard load)
   - Order saved in browser localStorage (check DevTools → Application → Local Storage → `intasend_completed_order`)

---

## How the Payment Flow Works

```
┌─────────────────────────────────────────────────────────────┐
│                    USER FLOW                                │
└─────────────────────────────────────────────────────────────┘

1. Click "Upgrade" → SubscriptionPayment modal opens
   └─ Shows available plans: FREE → PRO → PREMIUM

2. Select plan + click "Pay KES {amount}"
   └─ Calls: intasendSubscriptionService.createSubscription()
   └─ Saves pending order to localStorage

3. IntaSend API responds with checkout_url
   └─ User redirected to IntaSend payment page
   └─ User completes M-Pesa STK Push

4. IntaSend redirects back to callback URL:
   └─ Pattern: /api/payment-callback?status_code=0&reference=REF123&subscription_id=SUB123

5. CallbackPage.tsx processes response
   └─ Validates status_code === '0' (success)
   └─ Saves completed order to localStorage
   └─ Updates store tier to PREMIUM
   └─ Shows "Done!" message

6. Auto-redirects to home after 2 seconds
   └─ Dashboard shows PREMIUM features
   └─ Subscription is active
```

---

## Important Notes

### URL Format Requirements
- ✅ Must use `https://` (not `http://`)
- ✅ Must be a valid, publicly accessible domain
- ✅ Should include a path segment: `/api/payment-callback`
- ❌ Do NOT include query parameters in the callback URL
  - IntaSend automatically appends: `?status_code=0&reference=REF123&subscription_id=SUB123`

### Common Issues

| Problem | Solution |
|---------|----------|
| **"Enter a valid URL" error** | 1. Check `https://` (not `http://`)<br>2. Verify domain is publicly accessible<br>3. Remove any `?` from callback URL<br>4. Test with simpler path: `/callback` |
| **Payment not redirecting** | 1. Verify callback URL saved in IntaSend<br>2. Check browser console for errors<br>3. Ensure API keys in `.env.local` are correct |
| **Success screen doesn't appear** | 1. Check CallbackPage.tsx imported in App.tsx ✅<br>2. Check browser console for JS errors<br>3. Verify URL parameters received: `?status_code=0` |
| **Using localhost**❌ | IntaSend can't reach localhost. Use ngrok tunnel instead. |

---

## Code References

### Environment Variables (.env.local)
```
VITE_INTASEND_PUBLIC_KEY=ISPubKey_live_3b8b7234-5ac1-44fb-b94d-b2f072fb0890
VITE_INTASEND_SECRET_KEY=ISSecretKey_live_61fc199c-1d69-495a-9979-9b9b843b8429
```

### Payment Service (services/intasendSubscriptionService.ts)
```typescript
// Creates subscription on IntaSend API
POST https://api.intasend.com/api/v1/subscription/
Headers: {
  'Authorization': 'Bearer {VITE_INTASEND_SECRET_KEY}',
  'Content-Type': 'application/json'
}
Body: {
  public_key: VITE_INTASEND_PUBLIC_KEY,
  email: 'store@example.com',
  phone_number: '254712345678',
  first_name: 'Store Name',
  amount: 500,
  currency: 'KES',
  plan_name: 'PREMIUM',
  plan_period: 'monthly'
}
```

### Callback Handler (pages/CallbackPage.tsx)
- Intercepts IntaSend redirect with payment status
- Validates: `status_code === '0'` = success
- Updates localStorage with completed order
- Updates store subscription tier
- Auto-redirects after 2 seconds

---

## Next Steps

1. **Get ngrok running** (or use production domain):
   ```bash
   ngrok http 5173
   ```

2. **Copy the HTTPS URL** from ngrok output

3. **Go to IntaSend Dashboard** and configure callback:
   ```
   https://your-ngrok-url.ngrok.io/api/payment-callback
   ```

4. **Test a payment** to verify the full flow

5. **Check localStorage** to confirm order is saved:
   - Open DevTools (F12)
   - Application → Local Storage
   - Look for `intasend_completed_order`

---

## Need Help?

- **IntaSend Docs**: https://intasend.com/docs
- **IntaSend Support**: support@intasend.com
- **Your API Keys**: Check IntaSend dashboard → Settings → API Keys

---

**Your payment integration is ready! Just configure the callback URL and you're live.** 🚀
