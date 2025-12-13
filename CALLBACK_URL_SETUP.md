# How to Set Callback URL in IntaSend

## Step-by-Step Guide

### For Development (Local Testing)

If you want to test locally, use ngrok or similar to expose your local server, then:

```
https://your-ngrok-url.com/?payment=success
```

### For Production

Follow these steps in your IntaSend dashboard:

#### Option 1: Via Dashboard Settings

1. **Log in to IntaSend Dashboard**
   - Go to: https://dashboard.intasend.com/
   - Login with your credentials

2. **Find Webhooks/Settings**
   - Click on **Settings** (usually in bottom left or top menu)
   - Look for **Webhooks** or **Integrations**
   - Or go directly to: https://dashboard.intasend.com/settings/webhooks

3. **Add Callback URL**
   - Click "Add Webhook" or "Add URL"
   - **URL**: `https://yourdomain.com/?payment=success`
   - **Event Type**: Select "charge.success" or "subscription.paid"
   - Click **Save**

#### Option 2: Via API Settings

1. Go to: https://dashboard.intasend.com/settings/api
2. Look for **Webhook Endpoint** or **Return URL**
3. Enter your callback URL:
   ```
   https://yourdomain.com/?payment=success
   ```

### Your Callback URLs

**For this app:**

- **Local Development:**
  ```
  http://localhost:3000/?payment=success
  ```

- **Production:**
  ```
  https://yourdomain.com/?payment=success
  ```
  (Replace `yourdomain.com` with your actual domain)

## What Happens After Payment

1. User completes payment on IntaSend
2. IntaSend redirects back to your callback URL
3. App receives the `payment=success` parameter
4. Plan is automatically activated
5. User sees "Done!" message and can continue

## Testing the Callback

### Without ngrok (Simple Way)

1. The app will redirect to IntaSend checkout
2. Complete a test payment on IntaSend
3. You'll be redirected back with status
4. Check browser console (F12) for any errors

### With Real Testing

Ask IntaSend to send you:
- Test API keys (for sandbox testing)
- How to make test transactions without real money

## Troubleshooting Callback Issues

**"Payment returned but plan didn't activate"**
- Check browser console for errors (F12)
- Verify callback URL is correct in IntaSend
- Make sure the app is receiving the redirect

**"Callback URL keeps failing"**
- Check your domain/URL is correct
- Verify IntaSend can reach your server
- Check firewall rules

**"Test payment not working"**
- Use IntaSend test API keys if available
- Ask IntaSend support for test phone numbers

## Need Help?

1. IntaSend Support: https://intasend.com/support
2. IntaSend Docs: https://developers.intasend.com/docs/
3. Check DukaBook docs: See INTASEND_CONNECT.md
