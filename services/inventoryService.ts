import { supabase, isSupabaseEnabled } from './supabaseClient';
import { InventoryItem, InventoryBatch, ConversionInfo } from '../types';

/**
 * BREAKING BULK CONVERTER SERVICE
 * 
 * Handles unit conversion for bulk purchases (e.g., 1 Bottle -> 25 Tots, 90kg Sack -> 90x 1kg bags).
 * Prevents theft/over-pouring by tracking breakout units separately.
 */

/**
 * Create a derived breakout unit item from a bulk parent item.
 * E.g., creates "Tots (30ml)" item from "Bottle (750ml)" with conversion_rate = 25.
 * 
 * @param parentItem - The bulk item (e.g., Bottle)
 * @param conversionInfo - Conversion details (breakout unit name, rate, etc.)
 * @returns Created breakout item or null
 */
export const createBreakoutUnitItem = async (
  parentItem: InventoryItem,
  conversionInfo: ConversionInfo
): Promise<InventoryItem | null> => {
  if (!isSupabaseEnabled || !supabase) return null;

  try {
    // Create a new inventory item for the breakout unit
    // Selling price = parent bulk price / conversion rate (cost per unit)
    const unitSellPrice = parentItem.unit_price / conversionInfo.conversionRate;

    const { data, error } = await supabase
      .from('inventory_items')
      .insert({
        store_id: parentItem.store_id,
        item_name: `${conversionInfo.breakoutUnitName} (${parentItem.item_name})`,
        current_stock: 0, // Will be populated when bulk stock is received
        buying_price: parentItem.buying_price / conversionInfo.conversionRate,
        unit_price: unitSellPrice,
        sku: `${parentItem.sku || ''}_${conversionInfo.breakoutUnitName}`.substring(0, 50),
        barcode: parentItem.barcode ? `${parentItem.barcode}-UNIT` : undefined,
        description: `${conversionInfo.conversionRate}x ${conversionInfo.breakoutUnitName} per ${conversionInfo.bulkUnitName}`,
        category: parentItem.category,
        low_stock_threshold: parentItem.low_stock_threshold * conversionInfo.conversionRate,
        reorder_level: parentItem.reorder_level * conversionInfo.conversionRate,
        bulk_unit_name: conversionInfo.bulkUnitName,
        breakout_unit_name: conversionInfo.breakoutUnitName,
        conversion_rate: conversionInfo.conversionRate,
        parent_item_id: parentItem.id,
        is_bulk_parent: false,
        is_active: true,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating breakout unit item:', error);
      return null;
    }

    return data as InventoryItem;
  } catch (err) {
    console.error('Failed to create breakout unit item:', err);
    return null;
  }
};

/**
 * Populate breakout unit batches from a bulk batch.
 * When 1 Bottle is received, creates 25 Tot batches with the same expiry date.
 * 
 * @param bulkBatch - The received bulk batch (e.g., 1 Bottle)
 * @param bulkItem - The bulk inventory item
 * @param conversionInfo - Conversion rate and unit names
 * @param breakoutItem - The derived breakout unit item
 * @returns Array of created breakout batches or empty array on failure
 */
export const populateBreakoutBatches = async (
  bulkBatch: InventoryBatch,
  bulkItem: InventoryItem,
  conversionInfo: ConversionInfo,
  breakoutItem: InventoryItem
): Promise<InventoryBatch[]> => {
  if (!isSupabaseEnabled || !supabase) return [];

  try {
    // For simplicity, create a single breakout batch with total units
    // (In production, you might create multiple batches if needed for sub-tracking)
    const totalBreakoutUnits = bulkBatch.current_stock * conversionInfo.conversionRate;

    const { data, error } = await supabase
      .from('inventory_batches')
      .insert({
        store_id: bulkBatch.store_id,
        inventory_item_id: breakoutItem.id,
        batch_number: `${bulkBatch.batch_number || 'BULK'}_${conversionInfo.breakoutUnitName}`,
        expiry_date: bulkBatch.expiry_date,
        current_stock: totalBreakoutUnits,
        status: 'ACTIVE',
        notes: `Breakout from bulk batch: ${bulkBatch.batch_number}`,
        parent_batch_id: bulkBatch.id,
      })
      .select('*');

    if (error) {
      console.error('Error creating breakout batches:', error);
      return [];
    }

    return data as InventoryBatch[];
  } catch (err) {
    console.error('Failed to populate breakout batches:', err);
    return [];
  }
};

/**
 * Deduct breakout units on sale, cascading back to bulk stock if needed.
 * 
 * @param breakoutItemId - The unit item being sold (e.g., "Tots")
 * @param quantitySold - Number of units sold
 * @param batchId - Specific batch to deduct from (FEFO)
 * @returns true on success, false on failure
 */
export const deductBreakoutUnits = async (
  breakoutItemId: string,
  quantitySold: number,
  batchId?: string
): Promise<boolean> => {
  if (!isSupabaseEnabled || !supabase) return false;

  try {
    // Fetch the breakout item to get parent and conversion info
    const { data: breakoutItem, error: itemError } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('id', breakoutItemId)
      .single();

    if (itemError || !breakoutItem || !breakoutItem.parent_item_id) {
      console.warn('Breakout item not found or no parent item:', itemError);
      return false;
    }

    const parentItemId = breakoutItem.parent_item_id;
    const conversionRate = breakoutItem.conversion_rate || 1;

    // If batch tracking: deduct from specific batch; otherwise deduct from item stock
    if (batchId) {
      // FEFO: deduct from the specified batch
      const { error: batchUpdateError } = await supabase
        .from('inventory_batches')
        .update({ current_stock: supabase.rpc('decrease_batch_stock', { batch_id: batchId, amount: quantitySold }) })
        .eq('id', batchId);

      if (batchUpdateError) {
        console.error('Error deducting from batch:', batchUpdateError);
        return false;
      }
    } else {
      // Simple stock deduction
      const { error: itemUpdateError } = await supabase
        .from('inventory_items')
        .update({ current_stock: supabase.rpc('decrease_item_stock', { item_id: breakoutItemId, amount: quantitySold }) })
        .eq('id', breakoutItemId);

      if (itemUpdateError) {
        console.error('Error deducting from item:', itemUpdateError);
        return false;
      }
    }

    return true;
  } catch (err) {
    console.error('Failed to deduct breakout units:', err);
    return false;
  }
};

/**
 * Get all breakout items and their remaining stock for a bulk parent item.
 * Used for audit: compare system stock vs physical remaining bulk item.
 * 
 * @param parentItemId - The bulk item ID
 * @returns Array of breakout items with current stock
 */
export const getBreakoutItemsForParent = async (
  parentItemId: string
): Promise<Array<InventoryItem & { totalUnits: number }>> => {
  if (!isSupabaseEnabled || !supabase) return [];

  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('parent_item_id', parentItemId)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching breakout items:', error);
      return [];
    }

    return (data || []) as Array<InventoryItem & { totalUnits: number }>;
  } catch (err) {
    console.error('Failed to get breakout items:', err);
    return [];
  }
};

/**
 * Calculate audit variance: if physical bulk item is empty but system shows remaining units.
 * Returns the discrepancy (negative = over-poured/stolen, 0 = balanced).
 * 
 * @param parentItemId - The bulk item
 * @param parentPhysicalStock - Actual physical count (e.g., 0 for empty bottle)
 * @returns Variance report { totalSystemUnits, expectedUnits, variance, riskLevel }
 */
export const calculateAuditVariance = async (
  parentItemId: string,
  parentPhysicalStock: number
): Promise<{
  totalSystemUnits: number;
  expectedUnits: number;
  variance: number;
  riskLevel: 'SAFE' | 'WARNING' | 'CRITICAL';
  message: string;
} | null> => {
  if (!isSupabaseEnabled || !supabase) return null;

  try {
    // Fetch parent item
    const { data: parentItem, error: parentError } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('id', parentItemId)
      .single();

    if (parentError || !parentItem) return null;

    const conversionRate = parentItem.conversion_rate || 1;
    const expectedUnits = parentPhysicalStock * conversionRate;

    // Fetch all breakout items and sum their stock
    const breakoutItems = await getBreakoutItemsForParent(parentItemId);
    const totalSystemUnits = breakoutItems.reduce((sum, item) => sum + item.current_stock, 0);

    const variance = totalSystemUnits - expectedUnits;
    let riskLevel: 'SAFE' | 'WARNING' | 'CRITICAL' = 'SAFE';
    let message = `Inventory balanced: ${totalSystemUnits} units in system matches physical stock.`;

    if (variance > 0) {
      // System has more than expected (data error, unlikely but check)
      riskLevel = 'WARNING';
      message = `⚠️ System overstock: ${variance} extra units. Physical recount recommended.`;
    } else if (variance < 0) {
      // Physical empty but system still has stock = theft/over-pour
      riskLevel = totalSystemUnits > 50 ? 'CRITICAL' : 'WARNING';
      message = `🚨 ${riskLevel}: ${Math.abs(variance)} units unaccounted for! Check for theft or over-pouring.`;
    }

    return {
      totalSystemUnits,
      expectedUnits,
      variance: Math.abs(variance),
      riskLevel,
      message,
    };
  } catch (err) {
    console.error('Failed to calculate audit variance:', err);
    return null;
  }
};

/**
 * Mark a bulk item as consumed (all breakout units sold/used).
 * 
 * @param bulkBatchId - The bulk batch to mark as disposed
 * @returns true on success
 */
export const disposeBulkBatch = async (bulkBatchId: string): Promise<boolean> => {
  if (!isSupabaseEnabled || !supabase) return false;

  try {
    const { error } = await supabase
      .from('inventory_batches')
      .update({ status: 'DISPOSED' })
      .eq('id', bulkBatchId);

    return !error;
  } catch {
    return false;
  }
};
