# Supabase Migration Instructions

## Option 1: Apply via Supabase Dashboard (Easiest)

1. Go to: https://app.supabase.com/project/udekwokdxxscahdqranv/sql
2. Click **+ New Query**
3. Paste the SQL below and click **Run**:

```sql
BEGIN;

-- Add nullable columns used by niche features (safe to run multiple times)
ALTER TABLE IF EXISTS inventory_items
  ADD COLUMN IF NOT EXISTS expiry_date timestamptz;

ALTER TABLE IF EXISTS inventory_items
  ADD COLUMN IF NOT EXISTS batch_number text;

ALTER TABLE IF EXISTS inventory_items
  ADD COLUMN IF NOT EXISTS imei_serial text;

ALTER TABLE IF EXISTS inventory_items
  ADD COLUMN IF NOT EXISTS parent_unit_qty integer;

COMMIT;
```

4. Check the result — you should see ✅ **Success**

## Option 2: Apply via CLI (if you have DB password)

```powershell
# If you have the Postgres password, run:
psql "postgresql://postgres:YOUR_PASSWORD@aws-1-eu-central-2.pooler.supabase.com:5432/postgres" -f migrations/001_add_inventory_fields.sql
```

---

## Columns Added

- **expiry_date** (timestamptz): For chemists/agro-vets to track when medicines/fertilizers expire
- **batch_number** (text): For chemists to group items by batch for FEFO (First Expire, First Out)
- **imei_serial** (text): For hardware stores to track device serial numbers (electronics)
- **parent_unit_qty** (integer): For wines/spirits to store qty of child units per parent (e.g., bottles per case)

These are **optional/nullable** and only used when the store's `business_type` is set to `CHEMIST`, `HARDWARE`, or `WINES`.

---

## Features Now Ready

✅ Demo mode uses cloned data (no backend writes)
✅ Chameleon UI shows niche-specific fields based on `store.business_type`
✅ New inventory columns support multiple niches (Hardware, Wines, Chemist, Salon)
✅ Dev server running at http://localhost:3000/
✅ CSS MIME type error fixed

## What's Left

- [ ] Implement FEFO batch selection in sales flow
- [ ] Build expiry-checker backend endpoint & scheduler
- [ ] Add SMS/WhatsApp notifications for expiring stock
