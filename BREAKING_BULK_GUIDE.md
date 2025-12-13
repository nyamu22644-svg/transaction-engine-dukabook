# Breaking Bulk Converter – Complete Setup Guide

## Overview

The **Breaking Bulk Converter** is a specialized inventory feature designed for businesses that purchase in bulk but sell in units. It automatically converts stock entries and tracks unit deductions to prevent theft and over-pouring.

### Perfect For:
- **Wines & Spirits Shops** (Vipimo Problem): Buy 750ml bottles, sell 30ml tots
- **Cereal & Grain Retailers**: Buy 90kg sacks, sell 1kg bags
- **Cosmetics Dispensers**: Buy large containers, sell small sachets
- **Fuel/Liquid Retailers**: Buy in liters, sell in milliliters

---

## Problem & Solution

### The "Vipimo" Problem (Swahili: "Vipimo" = Measurements)

**Problem:**
- Owner: Buys 1 Bottle (750ml) for KES 600
- Employee: Sells 25 tots (30ml each) at KES 50/tot = KES 1,250 revenue
- **But:** Employee can steal by under-filling glasses (e.g., 25ml instead of 30ml) or adding water
- **Result:** Missing KES 250+ with no audit trail of how much was actually sold

**Solution:**
- System auto-converts: **1 Bottle → 25 Tots** in inventory
- Each tot sale deducts from the tot counter
- When bottle is physically empty but system shows "3 tots remaining" → **CRITICAL ALERT** 🚨

---

## Database Schema

### New Fields in `inventory_items`

```sql
-- Breaking Bulk Configuration
bulk_unit_name TEXT,                      -- e.g., 'Bottle', 'Sack'
breakout_unit_name TEXT,                  -- e.g., 'Tot', '1kg Bag'
conversion_rate DECIMAL(10,2),            -- e.g., 25 (1 Bottle = 25 Tots)
parent_item_id UUID,                      -- Links to the bulk parent item
is_bulk_parent BOOLEAN DEFAULT false;     -- TRUE if this item breaks down
```

### New Field in `inventory_batches`

```sql
parent_batch_id UUID,  -- Tracks which bulk batch a unit batch came from
```

### Examples

#### Wine Shop Setup
```
PARENT ITEM (Bulk):
- item_name: "Bottle (750ml)"
- is_bulk_parent: true
- bulk_unit_name: "Bottle (750ml)"
- breakout_unit_name: "Tot (30ml)"
- conversion_rate: 25
- current_stock: 5 (5 bottles in warehouse)

DERIVED ITEM (Unit):
- item_name: "Tot (30ml) - Bottle (750ml)"
- parent_item_id: <BOTTLE_ID>
- is_bulk_parent: false
- current_stock: 125 (5 bottles × 25 tots per bottle)
- unit_price: KES 50 (KES 1,250 ÷ 25)
```

#### Cereal Shop Setup
```
PARENT ITEM (Bulk):
- item_name: "Sack (90kg) Rice"
- is_bulk_parent: true
- bulk_unit_name: "Sack"
- breakout_unit_name: "1kg Bag"
- conversion_rate: 90
- current_stock: 10 (10 sacks)

DERIVED ITEM (Unit):
- item_name: "1kg Bag - Rice Sack"
- parent_item_id: <SACK_ID>
- current_stock: 900 (10 sacks × 90 bags)
- unit_price: KES 150 (bulk price ÷ 90)
```

---

## Component Usage

### 1. BreakingBulkSetup (Stock Intake)

When a store owner receives bulk stock, configure the conversion:

```tsx
import { BreakingBulkSetup } from './components/BreakingBulkSetup';

<BreakingBulkSetup
  item={bulkItem}
  batch={receivedBatch}
  onSetupComplete={(parentItem, breakoutItem) => {
    // Save to inventory, refresh UI
  }}
  onCancel={() => setShowSetup(false)}
/>
```

**What it does:**
1. Takes bulk item (e.g., Bottle) as input
2. Prompts owner for conversion details (rate, unit names)
3. Auto-creates derived item (Tot)
4. Populates breakout batches (25 tots from 1 bottle)
5. Returns both parent and derived items

**Quick Presets Available:**
- Wine (750ml → 25x 30ml Tots)
- Spirit (1L → 25x 40ml Shots)
- Cereal (90kg Sack → 90x 1kg Bags)
- Rice (90kg Sack → 180x 500g Bags)
- Sugar (50kg Bag → 50x 1kg Packs)

---

### 2. BreakingBulkAudit (Inventory Verification)

Periodically run audits to detect discrepancies:

```tsx
import { BreakingBulkAudit } from './components/BreakingBulkAudit';

<BreakingBulkAudit
  store_id={store.id}
  bulkItems={inventory.filter(i => i.is_bulk_parent)}
/>
```

**What it shows:**
- **SAFE**: Physical stock matches system (balanced inventory)
- **WARNING**: Minor discrepancies (loss/damage)
- **CRITICAL**: Physical empty but units remain (theft/over-pour)

**Example Output:**
```
Bottle #1 (750ml) – CRITICAL
Expected: 0 units (bottle empty)
System: 3 tots remaining
Variance: -3 units
Message: 🚨 CRITICAL: 3 units unaccounted for! Check for theft or over-pouring.
```

---

## Service Functions (inventoryService.ts)

### `createBreakoutUnitItem()`
Creates the derived unit item (e.g., Tot) from a bulk parent.

```typescript
const breakoutItem = await createBreakoutUnitItem(bulkItem, {
  bulkUnitName: 'Bottle',
  breakoutUnitName: 'Tot',
  conversionRate: 25,
});
```

### `populateBreakoutBatches()`
When a bulk batch arrives, creates unit batches for tracking.

```typescript
await populateBreakoutBatches(
  bulkBatch,        // The received 750ml bottle
  bulkItem,
  conversionInfo,
  breakoutItem      // The derived Tot item
);
// Result: Creates batch with 25 tots, tied to bulk batch via parent_batch_id
```

### `deductBreakoutUnits()`
Called on sale to deduct from unit stock and cascade to bulk if needed.

```typescript
const success = await deductBreakoutUnits(
  breakoutItemId,  // e.g., Tot item ID
  quantitySold,    // e.g., 2 tots sold
  batchId          // Optional: specific batch (FEFO)
);
```

### `calculateAuditVariance()`
Compares physical stock vs system units. Returns risk level and message.

```typescript
const audit = await calculateAuditVariance(
  parentItemId,        // e.g., Bottle ID
  physicalStock        // e.g., 0 (empty)
);

// Returns:
// {
//   totalSystemUnits: 3,
//   expectedUnits: 0,
//   variance: 3,
//   riskLevel: 'CRITICAL',
//   message: '🚨 CRITICAL: 3 units unaccounted for!'
// }
```

### `getBreakoutItemsForParent()`
Fetch all unit items linked to a bulk parent.

```typescript
const units = await getBreakoutItemsForParent(bottleId);
// Returns: [Tot item, Tot item variations, etc.]
```

---

## Workflow Example: Wine Shop

### Step 1: Stock Intake
Manager receives 10 bottles (750ml) of wine:
1. Add item to inventory: "Bottle (750ml)"
2. Set bulk_unit_name, is_bulk_parent = true
3. Click "Configure Conversion"
4. System creates "Tot (30ml)" item automatically
5. Receives batch: 10 bottles → System creates 250 tots (10 × 25)

### Step 2: Daily Sales
Employee at counter:
1. Customer orders 2 tots
2. Employee enters: Item="Tot (30ml)", Qty=2
3. System deducts from tot stock (250 → 248)
4. Audit log updated

### Step 3: Inventory Check
Manager physically counts:
- Opens safe, checks bottle stock: **1 bottle left (empty)**
- But system shows: **25 tots remaining**
- Discrepancy: **25 units unaccounted for** = Likely theft/over-pour

### Step 4: Audit Report
Run "Breaking Bulk Audit":
- **Bottle #7**: CRITICAL – 25 units missing
- **Action**: Review security, check employee performance, adjust counts

---

## Integration with Sales

### Sales Form Updates

When employee records a sale:

```tsx
// In SalesEntryForm.tsx
const selectedItem = inventory.find(i => i.id === selectedItemId);

// Check if it's a unit (has parent_item_id)
if (selectedItem?.parent_item_id) {
  // Show breakdown: "2 Tots (from Bottle stock)"
  // Deduct using: deductBreakoutUnits()
}
```

### Sales Record Storage

Sales records include new optional fields:
```typescript
{
  ...existingFields,
  parent_item_id?: string,        // If unit, link to bulk
  conversion_context?: {
    bulkItemId: string,
    bulkItemName: string,
    unitsPerBulk: number,
  }
}
```

---

## Setup Checklist

- [ ] **Database**: Run migration to add `bulk_unit_name`, `breakout_unit_name`, `conversion_rate`, `parent_item_id`, `is_bulk_parent`, `parent_batch_id` fields
- [ ] **Types**: Add `UnitMeasurement`, `ConversionInfo` types (✓ done)
- [ ] **Service**: Implement `inventoryService.ts` helpers (✓ done)
- [ ] **Components**: Add `BreakingBulkSetup.tsx`, `BreakingBulkAudit.tsx` (✓ done)
- [ ] **Sales Integration**: Update `SalesEntryForm.tsx` to call `deductBreakoutUnits()` on unit sales
- [ ] **Dashboard**: Add quick audit widget to `SuperAdminDashboard.tsx` or `StoreHealthDashboard.tsx`
- [ ] **Testing**: Create unit tests for conversion math, audit variance calculations
- [ ] **Deployment**: Apply SQL migrations, deploy code, train staff

---

## Common Scenarios

### Scenario 1: Perfectly Managed Wine Shop
```
Day 1: Received 10 bottles (750ml each)
Day 2: Sold 25 tots (= 1 full bottle worth)
Day 3: Physical check = 9 full bottles + 0 tots remaining
Audit: SAFE ✅
```

### Scenario 2: Suspected Theft
```
Day 1: Received 5 bottles
Day 2: Sold 15 tots (= 0.6 bottles)
Day 3: Physical check = 4 full bottles + 10 tots remaining in system
Expected: 4 × 25 + 10 = 110 units
Actual: 110 units
Audit: SAFE ✅

But... if Day 3 physical check = 3 full bottles + 10 tots system:
Expected: 3 × 25 + 10 = 85 units
Actual: 85 units
Audit: SAFE (but 1 bottle is missing entirely!)
```

### Scenario 3: Over-Pouring Detection
```
Day 1: Received 2 bottles (750ml each)
Day 2: Sold 30 tots (= 1.2 bottles)
Day 3: Physical check = 0 bottles left (empty/finished)
System: Still shows 20 tots remaining
Audit: CRITICAL 🚨
Message: "20 units unaccounted for - check for theft or over-pouring"
```

---

## Tips for Best Results

1. **Use Batches**: Always track receiving batches for better traceability
2. **Regular Audits**: Run weekly or daily audits for high-theft-risk items
3. **Clear Presets**: Use Quick Presets for standard items (Wine, Spirits, Cereal)
4. **Train Staff**: Explain audit system to reduce disputes
5. **Physical Counts**: Schedule daily/weekly physical stock counts
6. **Audit Reports**: Export audit logs for management review

---

## Troubleshooting

### Problem: Conversion Rate Math Doesn't Match
**Solution**: Verify multiplication:
- If 1 Bottle (750ml) = 25 Tots (30ml), then 750 ÷ 30 = 25 ✓
- If 1 Sack (90kg) = 90 Bags, then 90 ÷ 1 = 90 ✓

### Problem: Audit Shows Variance but It's Correct
**Solution**: Check if physical count includes partial bottles:
- Physical check: "0.5 bottles + 15 tots" → System expects 12.5 + 15 = 27.5 units

### Problem: Can't Create Breakout Item
**Solution**: Ensure bulk item has:
- `is_bulk_parent = true`
- Unique `bulk_unit_name`
- `conversion_rate > 0`

---

## Future Enhancements

- [ ] Partial unit tracking (0.5 bottles = partial unit)
- [ ] Sub-batches for multiple expiry dates per bulk item
- [ ] Automated SMS alerts on CRITICAL variance
- [ ] Computer vision for bottle level detection
- [ ] Integration with CCTV for timestamp correlation on missing units
- [ ] Blockchain ledger for unit deductions (immutable audit trail)

---

## Support & Questions

For issues or feature requests, please contact the DukaBook team or check the main documentation.
