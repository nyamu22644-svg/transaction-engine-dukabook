# Environment Variables for Chameleon Features (Niche Support + Expiry Alerts)

Add these to your `.env.local` for local development, and set them in Vercel Dashboard for production.

## Core (Already Set)

```bash
VITE_SUPABASE_URL=https://udekwokdxxscahdqranv.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_INTASEND_PUBLIC_KEY=<intasend-public>
VITE_INTASEND_SECRET_KEY=<intasend-secret>
```

## Server-Side Only (Vercel + .env.production)

**These should NEVER be exposed in frontend code**

```bash
# Supabase Service Role Key (for backend API calls)
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# SMS/WhatsApp Provider (choose one)
SMS_PROVIDER=twilio                    # or "africas-talking"
SMS_API_KEY=<provider-api-key>

# Expiry Alert Threshold (days)
EXPIRY_ALERT_DAYS=30

# Optional: Twilio specifics (if using Twilio)
TWILIO_ACCOUNT_SID=<twilio-account-sid>
TWILIO_AUTH_TOKEN=<twilio-auth-token>
TWILIO_PHONE=+1XXXXXXXXXX
```

## How to Set in Vercel

1. Go to: **Vercel Dashboard > Project Settings > Environment Variables**
2. Add each variable:
   - **Name**: (e.g., `SUPABASE_SERVICE_ROLE_KEY`)
   - **Value**: (your secret key)
   - **Environments**: Production (or All)
3. Redeploy after adding/updating

## How to Set Locally

Add to `.env.local`:

```bash
SUPABASE_SERVICE_ROLE_KEY=<key>
SMS_PROVIDER=twilio
SMS_API_KEY=<key>
EXPIRY_ALERT_DAYS=30
```

## Features That Use These

- **Expiry Checker Cron** (`/api/expiry-checker`):
  - Runs nightly at **2 AM UTC** (configured in `vercel.json`)
  - Queries `inventory_batches` table for items expiring within `EXPIRY_ALERT_DAYS`
  - Sends SMS alerts to store owners (`store.phone`)
  - Records notifications in `notifications` table to avoid duplicates

- **FEFO Batch Selection** (SalesEntryForm):
  - Requires `inventory_batches` table (created via migration)
  - No additional env vars needed (uses existing Supabase config)

## Testing Locally

To test the expiry-checker without cron:

```bash
curl http://localhost:3000/api/expiry-checker
```

Or in production:

```bash
curl https://your-vercel-app.vercel.app/api/expiry-checker
```

Expected response:

```json
{
  "ok": true,
  "scanned": 5,
  "notifications_sent": 2
}
```

## Database Tables Required

Ensure these tables exist in Supabase (apply migrations first):

- `inventory_batches` — stores batch info (batch_number, expiry_date, current_stock)
- `notifications` — logs sent alerts (notification_type, payload, sent_at)
- `stores` — must have `phone` column for SMS delivery

---

## Security Best Practices

✅ **DO:**
- Store `SUPABASE_SERVICE_ROLE_KEY` in Vercel environment (never in git)
- Use `SMS_API_KEY` securely (don't commit)
- Rotate keys regularly

❌ **DON'T:**
- Commit secrets to git
- Expose service role key in frontend code
- Log full API keys in error messages

