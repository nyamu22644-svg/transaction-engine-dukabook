import { supabase } from '../index';
import { InventoryItem } from '../types';

/**
 * Product Lookup Service
 * Finds products by barcode and returns complete product details
 */

export async function lookupProductByBarcode(
  storeId: string,
  barcode: string
): Promise<InventoryItem | null> {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select(
        `
        id,
        item_name,
        barcode,
        buying_price,
        unit_price,
        current_stock,
        category,
        sku,
        description,
        low_stock_threshold,
        reorder_level,
        expiry_date,
        supplier_id
      `
      )
      .eq('store_id', storeId)
      .eq('barcode', barcode.trim())
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      console.error('Error looking up product:', error);
      return null;
    }

    return data as InventoryItem;
  } catch (err) {
    console.error('Unexpected error in lookupProductByBarcode:', err);
    return null;
  }
}

/**
 * Search products by name (partial match)
 */
export async function searchProductsByName(
  storeId: string,
  searchTerm: string,
  limit: number = 10
): Promise<InventoryItem[]> {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select(
        `
        id,
        item_name,
        barcode,
        buying_price,
        unit_price,
        current_stock,
        category,
        sku,
        description
      `
      )
      .eq('store_id', storeId)
      .eq('is_active', true)
      .ilike('item_name', `%${searchTerm}%`)
      .limit(limit);

    if (error) {
      console.error('Error searching products:', error);
      return [];
    }

    return (data || []) as InventoryItem[];
  } catch (err) {
    console.error('Unexpected error in searchProductsByName:', err);
    return [];
  }
}

/**
 * Get all products for a store
 */
export async function getAllProducts(
  storeId: string
): Promise<InventoryItem[]> {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select(
        `
        id,
        item_name,
        barcode,
        buying_price,
        unit_price,
        current_stock,
        category,
        sku,
        description,
        low_stock_threshold
      `
      )
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('item_name');

    if (error) {
      console.error('Error fetching products:', error);
      return [];
    }

    return (data || []) as InventoryItem[];
  } catch (err) {
    console.error('Unexpected error in getAllProducts:', err);
    return [];
  }
}

/**
 * Check if product exists by barcode
 */
export async function barcodeExists(
  storeId: string,
  barcode: string
): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from('inventory_items')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .eq('barcode', barcode.trim())
      .eq('is_active', true);

    if (error) {
      console.error('Error checking barcode:', error);
      return false;
    }

    return (count || 0) > 0;
  } catch (err) {
    console.error('Unexpected error in barcodeExists:', err);
    return false;
  }
}

/**
 * Get products by category
 */
export async function getProductsByCategory(
  storeId: string,
  category: string
): Promise<InventoryItem[]> {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select(
        `
        id,
        item_name,
        barcode,
        buying_price,
        unit_price,
        current_stock,
        category,
        sku,
        description
      `
      )
      .eq('store_id', storeId)
      .eq('category', category)
      .eq('is_active', true)
      .order('item_name');

    if (error) {
      console.error('Error fetching products by category:', error);
      return [];
    }

    return (data || []) as InventoryItem[];
  } catch (err) {
    console.error('Unexpected error in getProductsByCategory:', err);
    return [];
  }
}

/**
 * Get low stock products
 */
export async function getLowStockProducts(
  storeId: string
): Promise<InventoryItem[]> {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select(
        `
        id,
        item_name,
        barcode,
        buying_price,
        unit_price,
        current_stock,
        category,
        low_stock_threshold
      `
      )
      .eq('store_id', storeId)
      .eq('is_active', true)
      .lt('current_stock', 'low_stock_threshold')
      .order('current_stock');

    if (error) {
      console.error('Error fetching low stock products:', error);
      return [];
    }

    return (data || []) as InventoryItem[];
  } catch (err) {
    console.error('Unexpected error in getLowStockProducts:', err);
    return [];
  }
}
