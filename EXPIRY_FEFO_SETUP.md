# Expiry Alert System (FEFO) - Complete Setup Guide

## 🎯 Overview

The Expiry Alert System prevents stockkeepers in **Agro-Vets, Chemists, and other niches** from selling expired products. Using **FEFO (First Expire, First Out)**, the system:

1. ✅ Tracks batch numbers and expiry dates
2. ✅ Warns staff at the sales screen
3. ✅ Sends SMS/WhatsApp alerts to owners
4. ✅ Prevents lawsuits and arrests from selling expired goods

---

## 📦 What's Included

### Database Tables
- `inventory_batches` - Track each batch separately (FEFO sorting)
- `notifications` - Store expiry alerts and other notifications

### Frontend
- Sales screen shows **FEFO warnings** when selecting items
- Color-coded alerts:
  - 🔴 **RED** (Expired): DO NOT SELL
  - 🔴 **RED** (0-7 days): URGENT - Sell FIRST, Put on offer
  - 🟠 **AMBER** (8-30 days): Prioritize selling

### Backend
- `api/expiry-checker.js` - Cron job that runs nightly
- Queries batches expiring within 30 days
- Sends SMS/WhatsApp alerts to store owners

---

## ⚙️ Setup Steps

### Step 1: Deploy Database Schema

Run the SQL migration in Supabase:

```sql
-- 1. Navigate to Supabase Dashboard
-- 2. Go to SQL Editor
-- 3. Create new query and paste content from SUPABASE_SCHEMA_FIXED.sql
-- 4. Click RUN

-- This creates:
-- - inventory_batches table (FEFO tracking)
-- - notifications table (alert records)
```

**Or use migration:**
```bash
supabase db push
```

### Step 2: Configure SMS/WhatsApp Provider

Choose ONE provider and set environment variables:

#### **Option A: Africa's Talking (Recommended for Kenya)**

1. Sign up: https://africastalking.com/sms
2. Get API Key from dashboard
3. Add to `.env.local`:

```env
SMS_PROVIDER=africas-talking
AT_USERNAME=your_username
AT_API_KEY=your_api_key
VITE_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

#### **Option B: Twilio (International)**

1. Sign up: https://www.twilio.com/
2. Get Account SID, Auth Token, and Twilio Phone Number
3. Add to `.env.local`:

```env
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE=+1234567890
VITE_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

#### **Option C: Twilio WhatsApp**

Same as Twilio, but add:
```env
TWILIO_WHATSAPP_FROM=whatsapp:+1234567890
```

### Step 3: Enable Cron Job

The cron job is already configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/expiry-checker",
      "schedule": "0 2 * * *"  // 2 AM UTC daily
    }
  ]
}
```

**To deploy to Vercel:**
```bash
vercel deploy
```

The cron will now run automatically every night at 2 AM UTC.

### Step 4: Test the System

#### Test 1: Add a Product with Expiry Date
1. Login to your store
2. Add inventory item with:
   - Item name: "Dap Fertilizer"
   - Expiry date: Tomorrow
   - Batch number: "BATCH-A23"

#### Test 2: See FEFO Warning on Sales Screen
1. Go to Sales Entry
2. Select the item you just added
3. You should see: **"🚨 URGENT: 1 days left! Sell this FIRST (FEFO). Put on offer!"**

#### Test 3: Manual Cron Test
```bash
curl https://yourapp.vercel.app/api/expiry-checker
```

You should see:
```json
{
  "ok": true,
  "scanned": 5,
  "notifications_sent": 2
}
```

#### Test 4: Check SMS Received
- Owner receives SMS: "⚠️ EXPIRY ALERT: 10 units of 'Dap Fertilizer' (Batch: BATCH-A23) expire in 2 days. Take action now!"

---

## 📱 How It Works for Users

### **For Agro-Vet Staff/Chemist Employees:**

1. **Customer wants to buy fertilizer**
2. Staff selects item in sales screen
3. **RED WARNING appears:** "🚨 URGENT: 3 days left! Sell Batch A-2024 FIRST (FEFO). Put on offer!"
4. Staff sells the expiring batch first
5. Sale completes ✅

### **For Store Owners:**

1. **Nightly at 2 AM UTC:**
   - Cron job scans all inventory
   - Finds batches expiring within 30 days
2. **Owner receives SMS/WhatsApp:**
   - "⚠️ EXPIRY ALERT: 15 bottles of Pesticide (Batch: B-2024-001) expire in 5 days. Put them on offer!"
3. **Owner takes action:**
   - Discounts the expiring products
   - Moves them to front of shelf
   - Avoids losing KES 50,000+ in stock

---

## 🗂️ Batch Management

### Adding Stock with Batch Numbers

**In Sales Entry Form:**
```
Item: DAP Fertilizer
Batch Number: BATCH-A23
Expiry Date: 2024-12-25
Quantity: 100 units
```

This creates a new batch record. Multiple batches of the same item are tracked separately.

### FEFO Sorting

When selling, batches are automatically suggested in expiry order (earliest first).

---

## 🔧 API Endpoints

### Expiry Checker (Cron Job)

**Endpoint:** `GET /api/expiry-checker`

**Runs:** Daily at 2 AM UTC (configurable in `vercel.json`)

**What it does:**
1. Queries all batches expiring within EXPIRY_ALERT_DAYS (default: 30)
2. Checks if notification already sent for each batch
3. Sends SMS/WhatsApp to store owner
4. Records notification in database

**Response:**
```json
{
  "ok": true,
  "scanned": 15,
  "notifications_sent": 3
}
```

---

## 🚨 Alert Types

### Alert 1: Expiry Warning (0-7 days)
- **Appearance:** 🔴 Red, Bold text
- **Message:** "🚨 URGENT: X days left! Sell this FIRST (FEFO). Put on offer!"
- **When:** At sales screen when item is selected
- **SMS:** Sent nightly to owner

### Alert 2: Expiry Alert (8-30 days)
- **Appearance:** 🟠 Amber, Normal text
- **Message:** "⚠️ Expires in X days. Prioritize selling this batch."
- **When:** At sales screen when item is selected
- **SMS:** Sent nightly to owner

### Alert 3: Expired (Past expiry)
- **Appearance:** 🔴 Red, Urgent
- **Message:** "⚠️ EXPIRED! This product expired X days ago. DO NOT SELL!"
- **When:** At sales screen when item is selected
- **Action:** Staff should file damage report

---

## 📊 Environment Variables

### Required for Cron Job
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SMS_PROVIDER=africas-talking|twilio|whatsapp
EXPIRY_ALERT_DAYS=30  # Alert on items expiring within 30 days
```

### Africa's Talking
```env
AT_USERNAME=your_username
AT_API_KEY=your_api_key
```

### Twilio
```env
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE=+1234567890
TWILIO_WHATSAPP_FROM=whatsapp:+1234567890  # Optional
```

---

## ✅ Features Implemented

| Feature | Status | Details |
|---------|--------|---------|
| Batch number tracking | ✅ | Separate `inventory_batches` table |
| Expiry date tracking | ✅ | ISO format dates, auto-sorted FEFO |
| Sales screen warnings | ✅ | Color-coded alerts (Red/Amber) |
| SMS alerts | ✅ | Africa's Talking or Twilio |
| WhatsApp alerts | ✅ | Via Twilio WhatsApp Business |
| Cron job | ✅ | Vercel cron: Daily 2 AM UTC |
| Notification records | ✅ | Avoid duplicate alerts |
| Dashboard visibility | ✅ | Owners see pending alerts |

---

## 🐛 Troubleshooting

### SMS Not Being Sent?

1. **Check environment variables:**
   ```bash
   echo $AT_API_KEY  # Africa's Talking
   echo $TWILIO_ACCOUNT_SID  # Twilio
   ```

2. **Check phone number format:**
   - Must be: `+254712345678` (for Kenya)
   - NOT: `0712345678`

3. **Check Vercel logs:**
   ```bash
   vercel logs --follow
   ```

4. **Test manually:**
   ```bash
   curl https://yourapp.vercel.app/api/expiry-checker
   ```

### Warnings Not Showing?

1. **Ensure expiry_date is set** on inventory items
2. **Check date format:** Must be ISO `YYYY-MM-DD`
3. **Refresh page** to reload inventory data
4. **Check browser console** for errors

### Batch Table Empty?

1. **Apply migration:** `supabase db push`
2. **Manually add data:**
   ```sql
   INSERT INTO inventory_batches 
   (store_id, inventory_item_id, batch_number, expiry_date, current_stock)
   VALUES (store-id, item-id, 'BATCH-001', '2024-12-25', 100);
   ```

---

## 📞 Support

For issues:
1. Check `vercel logs --follow`
2. Verify environment variables are set
3. Test SMS provider credentials directly
4. Check Supabase table `notifications` for error records

---

## 🎉 You're All Set!

Your expiry alert system is now fully functional. Staff will see warnings when selling near-expiry items, and owners will get nightly alerts via SMS/WhatsApp about inventory about to expire.

**Remember:** This system protects against lawsuits, arrests, and waste - especially critical for chemists and agro-vets selling medicines and chemicals!
