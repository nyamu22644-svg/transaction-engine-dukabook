# Store Suspension Feature - Migration Guide

## Problem
The store suspension feature is implemented in the frontend (App.tsx and StoreProfile type) but the database columns don't exist yet, causing 400 errors when trying to suspend stores.

## Solution
Run the migration script to add suspension columns to the stores table.

## How to Apply

### Step 1: Access Supabase SQL Editor
1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your project (dukabook)
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Run the Migration
Copy the entire contents of `migrations/add_suspension_columns.sql` and paste into the SQL Editor, then click **Run**.

The migration will:
- Add `is_suspended` (boolean) column to stores table
- Add `suspension_reason` (text) column to stores table
- Add `suspended_at` (timestamp) column to stores table
- Create index on is_suspended for fast lookups
- Set up trigger to auto-cancel subscriptions when store is suspended

### Step 3: Verify Migration
In SQL Editor, run this query:
```sql
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'stores' AND column_name IN ('is_suspended', 'suspension_reason', 'suspended_at');
```

You should see 3 rows returned showing the new columns.

### Step 4: Test in App
1. Refresh the browser
2. Go to Super Admin Dashboard
3. Try to suspend a store - should now work without 400 error

## API Behavior After Migration

### Suspend Store
```typescript
// Frontend calls:
await suspendStore(storeId, "Reason for suspension");

// Updates database with:
// is_suspended: true
// suspension_reason: "Reason for suspension"
// suspended_at: 2025-12-18T14:30:00Z
// Subscription status: changed to 'cancelled'
```

### Activate Store
```typescript
// Frontend calls:
await activateStore(storeId);

// Updates database with:
// is_suspended: false
// suspension_reason: null
// suspended_at: null
// Subscription status: restored to 'active' (if not expired)
```

### Access Control
When user logs in with suspended store:
- App.tsx checks `activeStore.is_suspended`
- If true, shows suspension modal instead of app
- User can only logout
- No access to any app features

## Files Involved
- **migrations/add_suspension_columns.sql** - The migration script
- **App.tsx** - Lines 179-215 check suspension and show modal
- **types.ts** - StoreProfile interface has suspension fields
- **supabaseService.ts** - suspendStore() and activateStore() functions
- **StoreHealthDashboard.tsx** - UI buttons that trigger suspension

## Troubleshooting

### If you see "column 'is_suspended' already exists"
The migration has already been applied. You can safely ignore this error.

### If suspend still doesn't work after migration
1. Verify the columns exist (see Step 3 above)
2. Clear browser cache/localStorage
3. Refresh the app and try again

### If you need to rollback
```sql
ALTER TABLE stores
DROP COLUMN IF EXISTS is_suspended,
DROP COLUMN IF EXISTS suspension_reason,
DROP COLUMN IF EXISTS suspended_at;

DROP TRIGGER IF EXISTS trigger_store_suspension ON stores;
DROP FUNCTION IF EXISTS handle_store_suspension();
```
