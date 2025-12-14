import { supabase } from './supabaseClient';
import { InventoryItem } from '../types';

/**
 * Barcode Product Service
 * Handles product lookup and registration by barcode
 */

// Lookup product by barcode
export const lookupProductByBarcode = async (
  barcode: string,
  storeId: string
): Promise<InventoryItem | null> => {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('barcode', barcode)
      .eq('store_id', storeId)
      .single();

    if (error && error.code === 'PGRST116') {
      // No rows found - this is expected for new barcodes
      return null;
    }

    if (error) throw error;
    return data as InventoryItem;
  } catch (error) {
    console.error('Error looking up barcode:', error);
    return null;
  }
};

// Register a new product with barcode
export const registerProductByBarcode = async (
  storeId: string,
  data: {
    barcode: string;
    item_name: string;
    buying_price: number;
    unit_price: number;
    current_stock: number;
    category?: string;
    description?: string;
    reorder_level?: number;
    supplier_id?: string;
  }
): Promise<InventoryItem | null> => {
  try {
    const { data: newProduct, error } = await supabase
      .from('inventory_items')
      .insert({
        store_id: storeId,
        barcode: data.barcode,
        item_name: data.item_name,
        buying_price: data.buying_price,
        unit_price: data.unit_price,
        current_stock: data.current_stock,
        category: data.category || 'Uncategorized',
        description: data.description || '',
        reorder_level: data.reorder_level || 10,
        supplier_id: data.supplier_id,
        status: 'active',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return newProduct as InventoryItem;
  } catch (error) {
    console.error('Error registering product:', error);
    throw error;
  }
};

// Check if barcode exists
export const barcodeExists = async (
  barcode: string,
  storeId: string
): Promise<boolean> => {
  try {
    const { count, error } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true })
      .eq('barcode', barcode)
      .eq('store_id', storeId);

    if (error) throw error;
    return count ? count > 0 : false;
  } catch (error) {
    console.error('Error checking barcode:', error);
    return false;
  }
};

// Update product stock after sale
export const updateProductStock = async (
  itemId: string,
  quantitySold: number
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('inventory_items')
      .update({
        current_stock: supabase.raw('current_stock - ?', [quantitySold]),
        last_updated: new Date().toISOString(),
      })
      .eq('id', itemId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating stock:', error);
    return false;
  }
};

// Get products by category
export const getProductsByCategory = async (
  storeId: string,
  category: string
): Promise<InventoryItem[]> => {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('store_id', storeId)
      .eq('category', category)
      .eq('status', 'active');

    if (error) throw error;
    return data as InventoryItem[];
  } catch (error) {
    console.error('Error fetching products by category:', error);
    return [];
  }
};

// Search for low stock items
export const getLowStockItems = async (
  storeId: string
): Promise<InventoryItem[]> => {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('store_id', storeId)
      .lte('current_stock', supabase.raw('reorder_level'))
      .eq('status', 'active');

    if (error) throw error;
    return data as InventoryItem[];
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    return [];
  }
};
