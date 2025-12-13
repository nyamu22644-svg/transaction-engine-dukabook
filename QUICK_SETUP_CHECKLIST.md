# Quick Setup Checklist

## IntaSend M-Pesa Payment Integration

### ✅ Already Done
- [x] IntaSend API service created (`services/intasendSubscriptionService.ts`)
- [x] Payment form integrated (`components/SubscriptionPayment.tsx`)
- [x] Callback page created (`pages/CallbackPage.tsx`)
- [x] App.tsx routing configured
- [x] Environment variables in `.env.local`
- [x] All legacy Daraja code removed
- [x] UI simplified (no technical jargon)

### ⏳ You Need To Do

**1. Install ngrok (for local testing)**
   ```bash
   # Windows: Download from https://ngrok.com/download
   # Or use Chocolatey:
   choco install ngrok
   ```

**2. Start ngrok tunnel**
   ```bash
   ngrok http 5173
   ```
   Copy the HTTPS URL (e.g., `https://abc123def456.ngrok.io`)

**3. Configure in IntaSend Dashboard**
   - Go to https://dashboard.intasend.com
   - Settings → Webhooks/Callbacks
   - Add callback URL:
     ```
     https://your-ngrok-url.ngrok.io/api/payment-callback
     ```
   - Save

**4. Test Payment Flow**
   ```bash
   # In terminal
   npm run dev
   
   # In browser
   # 1. Login to app (http://localhost:5173)
   # 2. Click "Upgrade" on any store
   # 3. Select a plan
   # 4. Click "Pay KES XXX"
   # 5. Complete M-Pesa payment
   # 6. See "Done!" screen
   ```

**5. Verify Success**
   - Check browser DevTools → Application → Local Storage
   - Look for `intasend_completed_order` key
   - Should contain: `{ subscription_id, reference, status, completed_at }`

---

## Callback URL Examples

### Local Development
```
https://abc123def456.ngrok.io/api/payment-callback
```

### Production
```
https://yourdomain.com/api/payment-callback
```

---

## File Structure

```
dukabook/
├── .env.local                           ✅ API keys already set
├── App.tsx                              ✅ Routes configured
├── pages/
│   └── CallbackPage.tsx                 ✅ Handler created
├── components/
│   └── SubscriptionPayment.tsx          ✅ Form updated
├── services/
│   └── intasendSubscriptionService.ts   ✅ API client ready
├── PAYMENT_INTEGRATION_READY.md         📄 Complete guide
├── INTASEND_CALLBACK_SETUP.md           📄 URL troubleshooting
└── QUICK_SETUP_CHECKLIST.md             📄 This file
```

---

## API Keys Location

File: `.env.local`

```
VITE_INTASEND_PUBLIC_KEY=ISPubKey_live_3b8b7234-5ac1-44fb-b94d-b2f072fb0890
VITE_INTASEND_SECRET_KEY=ISSecretKey_live_61fc199c-1d69-495a-9979-9b9b843b8429
```

---

## Testing Checklist

- [ ] ngrok running and showing HTTPS URL
- [ ] Callback URL configured in IntaSend dashboard
- [ ] App running locally (`npm run dev`)
- [ ] Can login to app
- [ ] Can click "Upgrade" on store
- [ ] Payment form shows with plans
- [ ] Click "Pay" initiates IntaSend payment
- [ ] Complete M-Pesa payment
- [ ] Redirected to "Done!" screen
- [ ] Redirects to home after 2 seconds
- [ ] `intasend_completed_order` visible in localStorage
- [ ] Store tier shows as PREMIUM on dashboard

---

## Common Issues

**"Enter a valid URL" in IntaSend dashboard?**
- Check you used `https://` (not `http://`)
- Verify ngrok is still running
- Remove any `?` or query params from callback URL
- Try: `https://your-url.ngrok.io/callback` (shorter path)

**Payment not redirecting?**
- Check ngrok HTTPS URL is correct
- Check callback URL exactly matches ngrok output
- Check browser console (F12) for errors
- Verify API keys in `.env.local`

**"Processing..." screen doesn't change?**
- Check browser console for errors
- Verify URL has `?status_code=0` parameter
- Check `CallbackPage.tsx` imported in `App.tsx`

---

## Support

- **IntaSend Docs**: https://intasend.com/docs
- **IntaSend Dashboard**: https://dashboard.intasend.com
- **ngrok Setup**: https://ngrok.com/docs
