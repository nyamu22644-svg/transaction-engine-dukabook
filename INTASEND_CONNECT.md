# How to Connect IntaSend Payment

## Setup Instructions

### 1. Get IntaSend API Keys
1. Go to https://intasend.com and sign up
2. Log in to your dashboard
3. Go to **Settings** → **API Keys**
4. Copy your **Public Key** and **Secret Key**

### 2. Add Environment Variables
Create a `.env.local` file in the root directory:

```env
VITE_INTASEND_PUBLIC_KEY=your_public_key_here
VITE_INTASEND_SECRET_KEY=your_secret_key_here
```

Or add to your existing `.env.local`:
```
VITE_INTASEND_PUBLIC_KEY=ISPubKey_live_xxxxxxxxxxxxx
VITE_INTASEND_SECRET_KEY=ISSecretKey_live_xxxxxxxxxxxxx
```

### 3. Configure Callback URL
In your IntaSend dashboard:
1. Go to **Developers** → **Webhooks** or **Settings**
2. Add this callback URL:
   ```
   http://localhost:3000/?payment=success
   ```
   
   For production:
   ```
   https://yourdomain.com/?payment=success
   ```

### 4. Test the Payment Flow
1. Start the app: `npm run dev`
2. Click "Upgrade" on any plan
3. Select a plan and click "Pay"
4. Enter a phone number: `0712345678`
5. Click the pay button
6. You'll be redirected to IntaSend checkout
7. Complete the payment
8. You'll be redirected back and your plan will activate

## How It Works

1. **User enters phone number** → Click "Pay"
2. **Frontend calls IntaSend API** → Gets checkout URL
3. **User redirected to IntaSend** → Enters payment details
4. **Payment processed** → Redirected back to app
5. **Plan automatically activated** → Can use all features

## Troubleshooting

### "Payment failed" error
- Check your API keys are correct
- Make sure callback URL is configured in IntaSend
- Check browser console for error details

### Keys not working
- Verify they're in `.env.local` (not `.env`)
- Restart the dev server: `npm run dev`
- Check you have the latest keys from IntaSend dashboard

### Still having issues?
- Contact IntaSend support: https://intasend.com/support
- Check their API docs: https://developers.intasend.com/docs/mpesa/
