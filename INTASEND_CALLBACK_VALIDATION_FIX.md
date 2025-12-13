# Why IntaSend Says "Enter a valid URL" - And How to Fix It

## The Problem You're Facing

When you try to configure the callback URL in IntaSend dashboard, you get this error:
```
Enter a valid URL
```

This happens because **IntaSend is very strict about URL validation**. It rejects:
- ❌ `http://` (must be `https://`)
- ❌ `localhost:3000` (can't reach local machines)
- ❌ `192.168.x.x` (local network IPs)
- ❌ URLs with invalid characters or formatting

## The Solution

You **MUST expose your local app to the internet** using a tunneling service so IntaSend can reach your callback URL.

### Option 1: ngrok (Recommended - Easiest)

**Step 1: Install ngrok**
- Download: https://ngrok.com/download
- Or on Windows:
  ```powershell
  choco install ngrok
  ```

**Step 2: Start ngrok**
- Terminal 1: Start your app
  ```bash
  npm run dev
  ```
  (App runs on `http://localhost:5173`)

- Terminal 2: Start ngrok tunnel
  ```bash
  ngrok http 5173
  ```

**Step 3: Copy the HTTPS URL**
- ngrok displays:
  ```
  Forwarding                    https://abc123def456.ngrok.io -> http://localhost:5173
  ```
- Copy: `https://abc123def456.ngrok.io`

**Step 4: Add to IntaSend Dashboard**
1. Go to https://dashboard.intasend.com
2. Find **Settings** or **API Settings** or **Webhooks**
3. Enter callback URL:
   ```
   https://abc123def456.ngrok.io/api/payment-callback
   ```
4. Click Save/Test
5. You should now see ✅ instead of ❌

**Important:** Every time you restart ngrok, you get a **new URL**. You'll need to update IntaSend dashboard with the new URL.

### Option 2: Upgrade ngrok (No URL Changes)

If you want the same URL every time:
1. Sign up for ngrok account (free): https://dashboard.ngrok.com
2. Get your authtoken: Dashboard → Your Authtoken
3. Add authtoken to ngrok:
   ```bash
   ngrok config add-authtoken YOUR_AUTH_TOKEN
   ```
4. Start ngrok:
   ```bash
   ngrok http 5173
   ```
5. Sign up for ngrok **Pro** ($10/month) to get **reserved domains**
6. Your URL stays the same across sessions

### Option 3: Deploy to Production (Long-term)

Once your app is ready:
1. Deploy to vercel.com, netlify.com, or your own server
2. Use your production domain:
   ```
   https://yourdomain.com/api/payment-callback
   ```
3. Set once and forget - no more URL changes

## Exactly What IntaSend Expects

### Callback URL Format
```
https://[domain]/[path]
```

Valid examples:
- ✅ `https://abc123def456.ngrok.io/api/payment-callback`
- ✅ `https://yourdomain.com/api/payment-callback`
- ✅ `https://your-app.vercel.app/api/payment-callback`
- ✅ `https://dukabook.com/callback`

Invalid examples:
- ❌ `http://abc123def456.ngrok.io/api/payment-callback` (no https)
- ❌ `localhost:5173/api/payment-callback` (localhost)
- ❌ `192.168.1.100:5173/api/payment-callback` (private IP)
- ❌ `https://abc123def456.ngrok.io` (no path - should include `/api/payment-callback`)

### What IntaSend Sends Back
After payment, IntaSend redirects to your callback URL with these parameters:
```
https://your-callback-url.com/api/payment-callback?status_code=0&reference=REF123&subscription_id=SUB123
```

Our `CallbackPage.tsx` handles this automatically. You just need to configure the callback URL.

## Step-by-Step Fix

### 1. Install and Run ngrok
```powershell
# PowerShell (Windows)
ngrok http 5173

# You'll see:
# Forwarding                    https://f5a6b8c9d0e1.ngrok.io -> http://localhost:5173
```

### 2. Note the HTTPS URL
Copy: `https://f5a6b8c9d0e1.ngrok.io`

### 3. Build Callback URL
Add `/api/payment-callback`:
```
https://f5a6b8c9d0e1.ngrok.io/api/payment-callback
```

### 4. Add to IntaSend
1. Login: https://dashboard.intasend.com
2. Settings (look for: Settings, API, Webhooks, Integration, or Configuration)
3. Paste callback URL:
   ```
   https://f5a6b8c9d0e1.ngrok.io/api/payment-callback
   ```
4. Save
5. You should see ✅ (success) not ❌ (error)

### 5. Test Payment
1. Keep ngrok running
2. Go to your app: `http://localhost:5173`
3. Login to any store
4. Click "Upgrade"
5. Select plan → Click "Pay"
6. Complete M-Pesa payment
7. Should redirect to "Done!" screen ✅

## Why This Works

```
When you click "Pay":
┌──────────────────────────────────────────────┐
│  Your App (localhost:5173)                   │
│  ↓                                           │
│  Calls IntaSend API                          │
│  ↓                                           │
│  IntaSend creates payment link               │
│  ↓                                           │
│  User completes M-Pesa payment               │
│  ↓                                           │
│  IntaSend redirects to:                      │
│  https://your-ngrok-url.ngrok.io/api/...    │
│  ↓ (ngrok forwards to)                       │
│  http://localhost:5173/api/...               │
│  ↓                                           │
│  Your app shows "Done!" screen               │
│  ✅ Success!                                 │
└──────────────────────────────────────────────┘
```

IntaSend can reach the public ngrok URL, which tunnels back to your local app.

## Troubleshooting

| Symptom | Solution |
|---------|----------|
| "Enter a valid URL" | 1. Check `https://` not `http://`<br>2. Use full URL from ngrok output<br>3. Add `/api/payment-callback` to the end<br>4. Remove any `?` from callback URL<br>5. Try shorter path: `/callback` |
| "Can't connect to URL" | 1. ngrok might have stopped<br>2. Restart ngrok: `ngrok http 5173`<br>3. Update callback URL with new ngrok output<br>4. Check your internet connection |
| Payment hangs on "Processing..." | 1. Check ngrok is running<br>2. Check callback URL in IntaSend matches ngrok URL<br>3. Check browser console for errors (F12)<br>4. Verify API keys in `.env.local` |
| Gets stuck after "Complete M-Pesa payment" | 1. ngrok URL changed but IntaSend config not updated<br>2. Need to restart ngrok and update IntaSend dashboard<br>3. OR wait for 2 seconds - might redirect silently |

## Key Point

**Your app works. The payment works. The only thing missing is telling IntaSend where to send users after payment.**

You do that by:
1. Exposing your app to internet (ngrok)
2. Telling IntaSend the public URL
3. That's it!

Once IntaSend can reach your callback URL, the payment flow completes automatically.

## Files Already Set Up For You

✅ **`.env.local`** - Has API keys
✅ **`services/intasendSubscriptionService.ts`** - Makes API call
✅ **`components/SubscriptionPayment.tsx`** - Payment form
✅ **`pages/CallbackPage.tsx`** - Handles redirect
✅ **`App.tsx`** - Routes configured

All you need: **Set the callback URL in IntaSend dashboard**

---

## Next Steps

1. Install/run ngrok
2. Get ngrok HTTPS URL
3. Add to IntaSend dashboard as: `https://[ngrok-url]/api/payment-callback`
4. Test a payment
5. See "Done!" screen ✅

**You're 95% done. Just one URL to configure!** 🚀
