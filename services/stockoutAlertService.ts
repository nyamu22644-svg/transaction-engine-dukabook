import { supabase } from './supabaseClient';
import type { StockoutAlert, StockoutImpactSummary } from '../types';

// Record a stockout alert
export async function recordStockoutAlert(storeId: string, data: {
  inventoryItemId: string;
  itemName: string;
  avgDailySalesUnits: number;
  supplierId?: string;
  suggestedReorderQty: number;
  notes?: string;
}): Promise<StockoutAlert | null> {
  try {
    const { data: alert, error } = await supabase
      .from('stockout_alerts')
      .insert({
        store_id: storeId,
        inventory_item_id: data.inventoryItemId,
        item_name: data.itemName,
        stockout_date: new Date().toISOString(),
        is_resolved: false,
        avg_daily_sales_units: data.avgDailySalesUnits,
        supplier_id: data.supplierId,
        suggested_reorder_qty: data.suggestedReorderQty,
        notes: data.notes
      })
      .select()
      .single();

    if (error) throw error;
    return (alert || null) as StockoutAlert | null;
  } catch (err) {
    console.error('Error recording stockout alert:', err);
    throw err;
  }
}

// Get active stockouts (unresolved)
export async function getActiveStockouts(storeId: string): Promise<StockoutAlert[]> {
  try {
    const { data, error } = await supabase
      .from('stockout_alerts')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_resolved', false)
      .order('stockout_date', { ascending: false });

    if (error) throw error;
    return (data || []) as StockoutAlert[];
  } catch (err) {
    console.error('Error fetching active stockouts:', err);
    throw err;
  }
}

// Get critical stockouts (>5 days without stock)
export async function getCriticalStockouts(storeId: string): Promise<StockoutAlert[]> {
  try {
    const { data, error } = await supabase
      .from('stockout_alerts')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_resolved', false)
      .gte('days_out_of_stock', 5)
      .order('days_out_of_stock', { ascending: false });

    if (error) throw error;
    return (data || []) as StockoutAlert[];
  } catch (err) {
    console.error('Error fetching critical stockouts:', err);
    throw err;
  }
}

// Get stockout history for an item
export async function getItemStockoutHistory(inventoryItemId: string): Promise<StockoutAlert[]> {
  try {
    const { data, error } = await supabase
      .from('stockout_alerts')
      .select('*')
      .eq('inventory_item_id', inventoryItemId)
      .order('stockout_date', { ascending: false });

    if (error) throw error;
    return (data || []) as StockoutAlert[];
  } catch (err) {
    console.error('Error fetching item stockout history:', err);
    throw err;
  }
}

// Resolve a stockout (mark as back in stock)
export async function resolveStockout(alertId: string): Promise<StockoutAlert | null> {
  try {
    const { data: alert, error } = await supabase
      .from('stockout_alerts')
      .update({
        is_resolved: true,
        resolved_date: new Date().toISOString()
      })
      .eq('id', alertId)
      .select()
      .single();

    if (error) throw error;
    return (alert || null) as StockoutAlert | null;
  } catch (err) {
    console.error('Error resolving stockout:', err);
    throw err;
  }
}

// Get stockout impact summary
export async function getStockoutImpactSummary(storeId: string): Promise<StockoutImpactSummary | null> {
  try {
    const { data, error } = await supabase
      .from('stockout_impact_summary')
      .select('*')
      .eq('store_id', storeId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return (data || null) as StockoutImpactSummary | null;
  } catch (err) {
    console.error('Error fetching stockout impact summary:', err);
    throw err;
  }
}

// Calculate lost revenue from stockouts
export async function calculateTotalLostRevenue(storeId: string, days: number = 30): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('stockout_alerts')
      .select('estimated_lost_revenue')
      .eq('store_id', storeId)
      .gte('stockout_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;

    const alerts = data || [];
    return alerts.reduce((sum, alert) => sum + (alert.estimated_lost_revenue || 0), 0);
  } catch (err) {
    console.error('Error calculating total lost revenue:', err);
    throw err;
  }
}

// Link stockout to PO (auto-create purchase order)
export async function linkStockoutToPO(alertId: string, poId: string): Promise<StockoutAlert | null> {
  try {
    const { data: alert, error } = await supabase
      .from('stockout_alerts')
      .update({
        reorder_po_created: true,
        po_id: poId
      })
      .eq('id', alertId)
      .select()
      .single();

    if (error) throw error;
    return (alert || null) as StockoutAlert | null;
  } catch (err) {
    console.error('Error linking stockout to PO:', err);
    throw err;
  }
}

// Get items at risk of stockout (low stock)
export async function getStockoutRiskItems(storeId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('id, item_name, current_stock, low_stock_threshold, unit_price')
      .eq('store_id', storeId)
      .lte('current_stock', supabase.raw('low_stock_threshold'))
      .order('current_stock', { ascending: true });

    if (error) throw error;

    // Calculate estimated days until stockout
    return (data || []).map((item: any) => ({
      ...item,
      estimated_days_until_stockout: item.current_stock > 0 ? Math.ceil(item.current_stock / 2) : 0 // Assuming 2 units/day avg
    }));
  } catch (err) {
    console.error('Error fetching stockout risk items:', err);
    throw err;
  }
}

// Send SMS stockout alert
export async function sendStockoutAlert(itemName: string, estimatedLoss: number, phoneNumber: string): Promise<boolean> {
  try {
    const message = `🚨 STOCKOUT ALERT: ${itemName} is out of stock! Estimated lost revenue: KES ${estimatedLoss.toFixed(2)}. Reorder immediately to avoid further losses. -DukaBook`;

    // TODO: Integrate with SMS service
    console.log(`SMS to ${phoneNumber}: ${message}`);
    
    return true;
  } catch (err) {
    console.error('Error sending stockout alert:', err);
    throw err;
  }
}
