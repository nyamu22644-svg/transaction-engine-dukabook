import { InventoryBatch } from '../types';
import { supabase, isSupabaseEnabled } from './supabaseClient';

const supa = async <T>(fn: () => Promise<T>, fallback: () => T | Promise<T>): Promise<T> => {
  if (isSupabaseEnabled && supabase) {
    try {
      return await fn();
    } catch (err) {
      console.warn('Supabase fallback', err);
    }
  }
  return await fallback();
};

/**
 * Fetch all batches for an inventory item, sorted by expiry date (FEFO)
 */
export const fetchBatchesForItem = async (itemId: string): Promise<InventoryBatch[]> => {
  return supa(async () => {
    const { data, error } = await supabase!
      .from('inventory_batches')
      .select('*')
      .eq('inventory_item_id', itemId)
      .order('expiry_date', { ascending: true });
    if (error) throw error;
    return (data || []) as InventoryBatch[];
  }, async () => {
    return [];
  });
};

/**
 * Create a new batch for an item
 */
export const createBatch = async (batch: Omit<InventoryBatch, 'id' | 'created_at' | 'updated_at'>): Promise<InventoryBatch | null> => {
  if (!isSupabaseEnabled || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('inventory_batches')
      .insert(batch)
      .select('*')
      .single();
    if (error) throw error;
    return data as InventoryBatch | null;
  } catch (err) {
    console.error('Failed to create batch:', err);
    return null;
  }
};

/**
 * Update batch stock level
 */
export const updateBatchStock = async (batchId: string, newStock: number): Promise<boolean> => {
  if (!isSupabaseEnabled || !supabase) return false;
  try {
    const { error } = await supabase
      .from('inventory_batches')
      .update({ current_stock: newStock })
      .eq('id', batchId);
    return !error;
  } catch {
    return false;
  }
};
