# Breaking Bulk Implementation Checklist

## Quick Start

The **Breaking Bulk Converter** feature is now fully implemented. Here's what you need to do to activate it:

---

## 1. Database Migration (REQUIRED)

Run the updated SQL schema in Supabase:

```bash
# In Supabase SQL Editor:
```

```sql
-- Add columns to inventory_items table
ALTER TABLE inventory_items
  ADD COLUMN bulk_unit_name TEXT,
  ADD COLUMN breakout_unit_name TEXT,
  ADD COLUMN conversion_rate DECIMAL(10,2),
  ADD COLUMN parent_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
  ADD COLUMN is_bulk_parent BOOLEAN DEFAULT false;

-- Add column to inventory_batches table
ALTER TABLE inventory_batches
  ADD COLUMN parent_batch_id UUID REFERENCES inventory_batches(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_bulk_parent ON inventory_items(is_bulk_parent);
CREATE INDEX IF NOT EXISTS idx_inventory_items_parent_id ON inventory_items(parent_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_parent_batch ON inventory_batches(parent_batch_id);
```

**Status in Code:** ✓ Updated `SUPABASE_SCHEMA_FIXED.sql` with these fields

---

## 2. Frontend Components Integration

### 2.1 Add Breaking Bulk Setup Modal to Inventory Management

In your inventory/stock intake screen, import and use:

```typescript
import { BreakingBulkSetup } from './components/BreakingBulkSetup';

// In your component state:
const [showBreakingBulkSetup, setShowBreakingBulkSetup] = useState(false);
const [selectedBulkItem, setSelectedBulkItem] = useState<InventoryItem | null>(null);

// When user selects a bulk item to configure:
const handleConfigureBulk = (item: InventoryItem) => {
  setSelectedBulkItem(item);
  setShowBreakingBulkSetup(true);
};

// In JSX:
{showBreakingBulkSetup && selectedBulkItem && (
  <BreakingBulkSetup
    item={selectedBulkItem}
    batch={selectedBatch}  // Optional: if stock just received
    onSetupComplete={(parentItem, breakoutItem) => {
      // Refresh inventory after setup
      fetchInventory(store.id).then(setInventory);
      setShowBreakingBulkSetup(false);
    }}
    onCancel={() => setShowBreakingBulkSetup(false)}
  />
)}
```

**Files Modified:** 
- ✓ `components/BreakingBulkSetup.tsx` (created)
- ✓ `components/BreakingBulkAudit.tsx` (created)

---

### 2.2 Add Breaking Bulk Audit Widget to Dashboard

In your store health/admin dashboard:

```typescript
import { BreakingBulkAudit } from './components/BreakingBulkAudit';

// In dashboard component:
const bulkItems = inventory.filter(item => item.is_bulk_parent);

return (
  <div>
    {/* ... other dashboard sections ... */}
    
    {store.business_type === 'WINES' || store.business_type === 'GENERAL' ? (
      <BreakingBulkAudit
        store_id={store.id}
        bulkItems={bulkItems}
      />
    ) : null}
  </div>
);
```

**Recommended Location:**
- `components/StoreHealthDashboard.tsx` – Add as a new dashboard section
- `components/SuperAdminDashboard.tsx` – Add as a widget for oversight

---

### 2.3 Update Sales Entry Form

When a sale is recorded, check if the item is a unit and deduct accordingly:

```typescript
// In components/SalesEntryForm.tsx - in handleSaleSubmit()

import { deductBreakoutUnits } from '../services/inventoryService';

const handleSaleSubmit = async (e: React.FormEvent) => {
  // ... existing code ...

  // NEW: Handle breaking bulk unit deduction
  const selectedItem = inventory.find(i => i.id === selectedItemId);
  
  if (selectedItem?.parent_item_id) {
    // This is a unit item (e.g., Tot), deduct from unit stock
    const deductSuccess = await deductBreakoutUnits(
      selectedItemId,
      Number(quantity),
      selectedBatchId  // If using FEFO batches
    );
    
    if (!deductSuccess) {
      console.warn('Failed to deduct units, but sale recorded');
    }
  } else if (selectedItem?.is_bulk_parent) {
    // This is a bulk item, deduct normally (standard inventory logic)
    // ... existing code ...
  }

  // ... rest of sale submission ...
};
```

---

## 3. Service Functions Available

All helper functions are in `services/inventoryService.ts`:

| Function | Purpose | Parameters |
|----------|---------|-----------|
| `createBreakoutUnitItem()` | Create derived unit item | `parentItem`, `conversionInfo` |
| `populateBreakoutBatches()` | Create unit batches from bulk batch | `bulkBatch`, `bulkItem`, `conversionInfo`, `breakoutItem` |
| `deductBreakoutUnits()` | Deduct units on sale | `breakoutItemId`, `quantitySold`, `batchId?` |
| `calculateAuditVariance()` | Check for discrepancies | `parentItemId`, `physicalStock` |
| `getBreakoutItemsForParent()` | Get all units for a bulk item | `parentItemId` |
| `disposeBulkBatch()` | Mark bulk batch as consumed | `bulkBatchId` |

**Example Usage:**

```typescript
import {
  createBreakoutUnitItem,
  deductBreakoutUnits,
  calculateAuditVariance,
} from '../services/inventoryService';

// Setup conversion on stock intake
const breakoutItem = await createBreakoutUnitItem(bottleItem, {
  bulkUnitName: 'Bottle (750ml)',
  breakoutUnitName: 'Tot (30ml)',
  conversionRate: 25,
});

// Deduct on sale
await deductBreakoutUnits(breakoutItem.id, 2);  // Sold 2 tots

// Audit physical stock
const audit = await calculateAuditVariance(bottleItem.id, 0);  // 0 = empty
// Returns: { riskLevel: 'CRITICAL', message: '3 units unaccounted for!' }
```

---

## 4. Type Definitions

All types are in `types.ts`:

```typescript
// New types
export type UnitMeasurement = 'ml' | 'l' | 'kg' | 'g' | 'units' | 'items' | 'pieces';

export interface ConversionInfo {
  bulkUnitName: string;
  breakoutUnitName: string;
  conversionRate: number;
  unitMeasurement?: UnitMeasurement;
}

// Enhanced interfaces
export interface InventoryItem {
  // ... existing fields ...
  bulk_unit_name?: string;
  breakout_unit_name?: string;
  conversion_rate?: number;
  parent_item_id?: string;
  is_bulk_parent?: boolean;
}

export interface InventoryBatch {
  // ... existing fields ...
  parent_batch_id?: string;
}
```

---

## 5. Testing Workflow

### Test 1: Setup Conversion
1. Go to inventory management
2. Select a bulk item (or create: "Bottle (750ml)")
3. Click "Configure Breaking Bulk"
4. Use preset: Wine (750ml → 25x 30ml Tots)
5. ✓ Verify: Derived item "Tot (30ml)" created
6. ✓ Verify: Stock shows 25 tots (1 bottle × 25)

### Test 2: Record Sale of Units
1. In Sales Entry Form
2. Select "Tot (30ml)" item
3. Enter quantity: 2
4. Submit sale
5. ✓ Verify: Tot stock decreases (25 → 23)
6. ✓ Verify: Audit log shows unit deduction

### Test 3: Audit Variance Detection
1. Go to Breaking Bulk Audit widget
2. Set physical bottle count to 0 (empty)
3. System shows: 23 tots remaining
4. ✓ Verify: Shows "CRITICAL - 23 units unaccounted for"
5. ✓ Verify: Correct risk level display

### Test 4: Multiple Items
1. Setup 2+ different bulk items (Wine, Cereal)
2. Configure each with different conversion rates
3. ✓ Verify: Audit shows all items correctly
4. ✓ Verify: Sales only deduct from selected item

---

## 6. Deployment Steps

1. **Backup Database**
   ```bash
   # Supabase automatically backs up, but good practice
   ```

2. **Apply Migrations**
   ```sql
   -- Run the SQL schema updates in Supabase SQL Editor
   ```

3. **Deploy Code**
   ```bash
   npm run build
   # Deploy to Vercel / your hosting
   ```

4. **Test in Staging**
   ```bash
   # Test the workflow above in staging environment
   ```

5. **Production Rollout**
   ```bash
   # Deploy to production
   # Notify users of new feature
   ```

---

## 7. Staff Training

### For Store Owners
- "Breaking Bulk" prevents employee theft by tracking sold units automatically
- Setup is one-time (Quick Presets available for common items)
- Weekly audits flag missing stock instantly

### For Employees
- Sell units normally (Tots, Bags, Shots)
- System tracks each sale automatically
- No additional work required

### For Managers
- Run weekly/daily audits from dashboard
- Check "CRITICAL" items immediately
- Export audit logs for records

---

## 8. Common Issues & Fixes

### Issue: "Conversion item not created"
**Fix:** Check that:
- Parent item has `is_bulk_parent = true`
- Conversion rate > 0
- Unit names are unique

### Issue: "Units not deducting on sale"
**Fix:** Ensure:
- Sale function calls `deductBreakoutUnits()` for unit items
- Unit item has `parent_item_id` set
- Batch ID matches if using FEFO

### Issue: "Audit shows variance but count is correct"
**Fix:** 
- Verify physical count includes partial bottles (0.5 = half unit)
- Check if recent sales haven't been synced yet
- Run "Refresh Audit" button

---

## 9. Files Changed Summary

| File | Status | Purpose |
|------|--------|---------|
| `types.ts` | ✓ Modified | Added `ConversionInfo`, `UnitMeasurement` types, enhanced `InventoryItem` & `InventoryBatch` |
| `SUPABASE_SCHEMA_FIXED.sql` | ✓ Modified | Added bulk conversion fields to tables |
| `services/inventoryService.ts` | ✓ Created | All helper functions for breaking bulk logic |
| `components/BreakingBulkSetup.tsx` | ✓ Created | UI for configuring conversions |
| `components/BreakingBulkAudit.tsx` | ✓ Created | Audit dashboard widget |
| `BREAKING_BULK_GUIDE.md` | ✓ Created | Complete feature documentation |

---

## 10. Next Steps

- [ ] Run database migration in Supabase
- [ ] Integrate components into your inventory screens
- [ ] Update `SalesEntryForm.tsx` to call `deductBreakoutUnits()`
- [ ] Add audit widget to dashboard
- [ ] Test entire workflow (setup → sale → audit)
- [ ] Deploy to staging
- [ ] Train staff
- [ ] Deploy to production

---

## Support

For issues, questions, or enhancements:
1. Check `BREAKING_BULK_GUIDE.md` for detailed docs
2. Review component code comments in `.tsx` files
3. Test locally with dev server running on port 3001

**Good luck! 🎉 This feature will significantly improve inventory control for bulk retailers.**
