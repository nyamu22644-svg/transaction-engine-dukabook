import { supabase } from './supabaseClient';
import type { ProductProfitability, ProductPerformance, ProductProfitabilitySummary } from '../types';

// Get product profitability for current month
export async function getProductProfitabilityCurrentMonth(storeId: string): Promise<ProductProfitability[]> {
  try {
    const now = new Date();
    const { data, error } = await supabase
      .from('product_profitability')
      .select('*')
      .eq('store_id', storeId)
      .eq('period_month', now.getMonth() + 1)
      .eq('period_year', now.getFullYear())
      .order('total_profit', { ascending: false });

    if (error) throw error;
    return (data || []) as ProductProfitability[];
  } catch (err) {
    console.error('Error fetching product profitability:', err);
    throw err;
  }
}

// Get top profit products
export async function getTopProfitProducts(storeId: string, limit: number = 10): Promise<ProductProfitability[]> {
  try {
    const now = new Date();
    const { data, error } = await supabase
      .from('product_profitability')
      .select('*')
      .eq('store_id', storeId)
      .eq('period_month', now.getMonth() + 1)
      .eq('period_year', now.getFullYear())
      .gt('total_profit', 0)
      .order('total_profit', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as ProductProfitability[];
  } catch (err) {
    console.error('Error fetching top profit products:', err);
    throw err;
  }
}

// Get bottom profit products (loss-makers)
export async function getBottomProfitProducts(storeId: string, limit: number = 10): Promise<ProductProfitability[]> {
  try {
    const now = new Date();
    const { data, error } = await supabase
      .from('product_profitability')
      .select('*')
      .eq('store_id', storeId)
      .eq('period_month', now.getMonth() + 1)
      .eq('period_year', now.getFullYear())
      .lt('total_profit', 0)
      .order('total_profit', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return (data || []) as ProductProfitability[];
  } catch (err) {
    console.error('Error fetching bottom profit products:', err);
    throw err;
  }
}

// Get high-velocity products (selling fast)
export async function getHighVelocityProducts(storeId: string, minUnitsPerDay: number = 10): Promise<ProductProfitability[]> {
  try {
    const now = new Date();
    const { data, error } = await supabase
      .from('product_profitability')
      .select('*')
      .eq('store_id', storeId)
      .eq('period_month', now.getMonth() + 1)
      .eq('period_year', now.getFullYear())
      .gte('sales_velocity', minUnitsPerDay)
      .order('sales_velocity', { ascending: false });

    if (error) throw error;
    return (data || []) as ProductProfitability[];
  } catch (err) {
    console.error('Error fetching high-velocity products:', err);
    throw err;
  }
}

// Get low-margin products (<10% margin)
export async function getLowMarginProducts(storeId: string, maxMargin: number = 10): Promise<ProductProfitability[]> {
  try {
    const now = new Date();
    const { data, error } = await supabase
      .from('product_profitability')
      .select('*')
      .eq('store_id', storeId)
      .eq('period_month', now.getMonth() + 1)
      .eq('period_year', now.getFullYear())
      .lte('profit_margin_percent', maxMargin)
      .gt('total_profit', 0)
      .order('profit_margin_percent', { ascending: true });

    if (error) throw error;
    return (data || []) as ProductProfitability[];
  } catch (err) {
    console.error('Error fetching low-margin products:', err);
    throw err;
  }
}

// Get product performance analysis
export async function getProductPerformance(storeId: string): Promise<ProductPerformance | null> {
  try {
    const { data, error } = await supabase
      .from('product_performance')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return (data || null) as ProductPerformance | null;
  } catch (err) {
    console.error('Error fetching product performance:', err);
    throw err;
  }
}

// Get profitability summary
export async function getProductProfitabilitySummary(storeId: string): Promise<ProductProfitabilitySummary | null> {
  try {
    const { data, error } = await supabase
      .from('product_profitability_summary')
      .select('*')
      .eq('store_id', storeId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return (data || null) as ProductProfitabilitySummary | null;
  } catch (err) {
    console.error('Error fetching profitability summary:', err);
    throw err;
  }
}

// Get product profit trend (month-over-month)
export async function getProductProfitTrend(storeId: string, itemId: string, months: number = 6): Promise<ProductProfitability[]> {
  try {
    const { data, error } = await supabase
      .from('product_profitability')
      .select('*')
      .eq('store_id', storeId)
      .eq('inventory_item_id', itemId)
      .gte('period_year', new Date().getFullYear() - (months > 12 ? 1 : 0))
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false })
      .limit(months);

    if (error) throw error;
    return (data || []) as ProductProfitability[];
  } catch (err) {
    console.error('Error fetching product profit trend:', err);
    throw err;
  }
}

// Calculate profit by item vs total store profit
export async function calculateProductProfitShare(storeId: string, itemId: string): Promise<number> {
  try {
    const now = new Date();
    const { data: itemProfit } = await supabase
      .from('product_profitability')
      .select('total_profit')
      .eq('store_id', storeId)
      .eq('inventory_item_id', itemId)
      .eq('period_month', now.getMonth() + 1)
      .eq('period_year', now.getFullYear())
      .single();

    const { data: storeProfits } = await supabase
      .from('product_profitability')
      .select('total_profit')
      .eq('store_id', storeId)
      .eq('period_month', now.getMonth() + 1)
      .eq('period_year', now.getFullYear());

    const totalStoreProfit = (storeProfits || []).reduce((sum, p) => sum + p.total_profit, 0);
    return totalStoreProfit > 0 ? ((itemProfit?.total_profit || 0) / totalStoreProfit) * 100 : 0;
  } catch (err) {
    console.error('Error calculating profit share:', err);
    throw err;
  }
}

// Identify products to discontinue (negative profit + low velocity)
export async function getDiscontinueRecommendations(storeId: string): Promise<ProductProfitability[]> {
  try {
    const now = new Date();
    const { data, error } = await supabase
      .from('product_profitability')
      .select('*')
      .eq('store_id', storeId)
      .eq('period_month', now.getMonth() + 1)
      .eq('period_year', now.getFullYear())
      .lt('total_profit', 0)
      .lt('sales_velocity', 2)
      .order('total_profit', { ascending: true });

    if (error) throw error;
    return (data || []) as ProductProfitability[];
  } catch (err) {
    console.error('Error getting discontinue recommendations:', err);
    throw err;
  }
}
