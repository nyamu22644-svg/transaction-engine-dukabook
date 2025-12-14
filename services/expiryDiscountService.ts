import { supabase } from './supabaseService';
import type { ExpiryDiscountRule, InventoryExpiryStatus, ExpiryClearance } from '../types';
import { differenceInCalendarDays } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';

// Get expiry discount rules for a store
export async function getExpiryDiscountRules(storeId: string): Promise<ExpiryDiscountRule[]> {
  try {
    const { data, error } = await supabase
      .from('expiry_discount_rules')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('days_before_expiry', { ascending: true });

    if (error) throw error;
    return (data || []) as ExpiryDiscountRule[];
  } catch (err) {
    console.error('Error fetching expiry discount rules:', err);
    throw err;
  }
}

// Get items by expiry status
export async function getInventoryByExpiryStatus(storeId: string): Promise<InventoryExpiryStatus[]> {
  try {
    const { data, error } = await supabase
      .from('inventory_expiry_status')
      .select('*')
      .eq('store_id', storeId)
      .in('expiry_status', ['EXPIRED', 'CRITICAL', 'URGENT', 'CAUTION'])
      .order('days_until_expiry', { ascending: true });

    if (error) throw error;
    return (data || []) as InventoryExpiryStatus[];
  } catch (err) {
    console.error('Error fetching inventory by expiry status:', err);
    throw err;
  }
}

// Get critical/urgent items (expiring within 7 days)
export async function getCriticalExpiryItems(storeId: string): Promise<InventoryExpiryStatus[]> {
  try {
    const { data, error } = await supabase
      .from('inventory_expiry_status')
      .select('*')
      .eq('store_id', storeId)
      .in('expiry_status', ['EXPIRED', 'CRITICAL', 'URGENT'])
      .order('days_until_expiry', { ascending: true });

    if (error) throw error;
    return (data || []) as InventoryExpiryStatus[];
  } catch (err) {
    console.error('Error fetching critical expiry items:', err);
    throw err;
  }
}

// Analyze expiry status for an item
export async function analyzeItemExpiry(storeId: string, itemId: string): Promise<InventoryExpiryStatus | null> {
  try {
    const { data, error } = await supabase
      .from('inventory_expiry_status')
      .select('*')
      .eq('store_id', storeId)
      .eq('inventory_item_id', itemId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return (data || null) as InventoryExpiryStatus | null;
  } catch (err) {
    console.error('Error analyzing item expiry:', err);
    throw err;
  }
}

// Record an expiry clearance (sale, donation, or disposal)
export async function recordExpiryClearance(storeId: string, data: {
  inventoryItemId: string;
  itemName: string;
  quantityCleared: number;
  originalPrice: number;
  clearancePrice: number;
  discountPercent: number;
  clearedVia: 'DISCOUNTED_SALE' | 'DONATION' | 'DISPOSED';
  saleId?: string;
  clearedBy: string;
}): Promise<ExpiryClearance | null> {
  try {
    const { data: clearance, error } = await supabase
      .from('expiry_clearances')
      .insert({
        store_id: storeId,
        inventory_item_id: data.inventoryItemId,
        item_name: data.itemName,
        quantity_cleared: data.quantityCleared,
        original_price: data.originalPrice,
        clearance_price: data.clearancePrice,
        discount_percent: data.discountPercent,
        cleared_via: data.clearedVia,
        sale_id: data.saleId,
        cleared_by: data.clearedBy,
        cleared_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return (clearance || null) as ExpiryClearance | null;
  } catch (err) {
    console.error('Error recording expiry clearance:', err);
    throw err;
  }
}

// Get clearance history
export async function getExpiryClearanceHistory(storeId: string, days: number = 30): Promise<ExpiryClearance[]> {
  try {
    const { data, error } = await supabase
      .from('expiry_clearances')
      .select('*')
      .eq('store_id', storeId)
      .gte('cleared_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('cleared_at', { ascending: false });

    if (error) throw error;
    return (data || []) as ExpiryClearance[];
  } catch (err) {
    console.error('Error fetching clearance history:', err);
    throw err;
  }
}

// Calculate potential loss from expiry
export async function calculateExpiryLossImpact(storeId: string) {
  try {
    const { data, error } = await supabase
      .from('inventory_expiry_status')
      .select('estimated_loss_if_not_cleared')
      .eq('store_id', storeId)
      .in('expiry_status', ['EXPIRED', 'CRITICAL', 'URGENT']);

    if (error) throw error;

    const items = data || [];
    const totalPotentialLoss = items.reduce((sum, item) => sum + (item.estimated_loss_if_not_cleared || 0), 0);
    const itemsAtRisk = items.length;

    return {
      totalPotentialLoss,
      itemsAtRisk,
      avgLossPerItem: itemsAtRisk > 0 ? totalPotentialLoss / itemsAtRisk : 0
    };
  } catch (err) {
    console.error('Error calculating expiry loss impact:', err);
    throw err;
  }
}

// Get expiry clearance statistics
export async function getExpiryClearanceStats(storeId: string, days: number = 30) {
  try {
    const { data, error } = await supabase
      .from('expiry_clearances')
      .select('*')
      .eq('store_id', storeId)
      .gte('cleared_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;

    const clearances = data || [];
    const totalQuantityCleared = clearances.reduce((sum, c) => sum + c.quantity_cleared, 0);
    const totalOriginalValue = clearances.reduce((sum, c) => sum + (c.original_price * c.quantity_cleared), 0);
    const totalRecovered = clearances.reduce((sum, c) => sum + (c.clearance_price * c.quantity_cleared), 0);
    
    return {
      clearanceCount: clearances.length,
      totalQuantityCleared,
      totalOriginalValue,
      totalRecovered,
      totalLoss: totalOriginalValue - totalRecovered,
      avgDiscountPercent: clearances.length > 0 ? clearances.reduce((sum, c) => sum + c.discount_percent, 0) / clearances.length : 0,
      recoveryRate: totalOriginalValue > 0 ? (totalRecovered / totalOriginalValue) * 100 : 0
    };
  } catch (err) {
    console.error('Error fetching clearance stats:', err);
    throw err;
  }
}

// Update expiry discount rule
export async function updateExpiryDiscountRule(ruleId: string, data: {
  suggestedDiscountPercent?: number;
  autoApply?: boolean;
  isActive?: boolean;
}): Promise<ExpiryDiscountRule | null> {
  try {
    const { data: rule, error } = await supabase
      .from('expiry_discount_rules')
      .update({
        ...(data.suggestedDiscountPercent !== undefined && { suggested_discount_percent: data.suggestedDiscountPercent }),
        ...(data.autoApply !== undefined && { auto_apply: data.autoApply }),
        ...(data.isActive !== undefined && { is_active: data.isActive })
      })
      .eq('id', ruleId)
      .select()
      .single();

    if (error) throw error;
    return (rule || null) as ExpiryDiscountRule | null;
  } catch (err) {
    console.error('Error updating expiry discount rule:', err);
    throw err;
  }
}

// Send SMS alert for items expiring soon
export async function sendExpiryAlert(itemName: string, daysUntilExpiry: number, phoneNumber: string, suggestedDiscount: number): Promise<boolean> {
  try {
    const urgency = daysUntilExpiry <= 7 ? '🚨 URGENT' : daysUntilExpiry <= 14 ? '⚠️ CAUTION' : '📢 ALERT';
    const message = `${urgency}: ${itemName} expires in ${daysUntilExpiry} days. Suggested discount: ${suggestedDiscount}%. Clear stock now!`;

    // TODO: Integrate with SMS service
    console.log(`SMS to ${phoneNumber}: ${message}`);
    
    return true;
  } catch (err) {
    console.error('Error sending expiry alert:', err);
    throw err;
  }
}
