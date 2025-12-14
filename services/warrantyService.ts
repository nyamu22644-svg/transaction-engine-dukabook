import { supabase } from './supabaseClient';

export interface SerializedItem {
  id: string;
  store_id: string;
  sale_id: string;
  item_name: string;
  serial_number: string;
  warranty_days: number;
  warranty_start_date: string;
  warranty_expiry_date: string;
  seal_broken: boolean;
  customer_phone?: string;
  customer_name?: string;
  notes?: string;
  created_at: string;
}

export interface WarrantyStatus {
  found: boolean;
  item?: SerializedItem;
  isExpired?: boolean;
  daysLeft?: number;
  saleDate?: Date;
  message: string;
}

/**
 * Create a new serialized item with warranty tracking
 */
export const createSerializedItem = async (
  storeId: string,
  saleId: string,
  itemName: string,
  serialNumber: string,
  warrantyDays: number = 7,
  customerPhone?: string,
  customerName?: string,
  notes?: string
): Promise<SerializedItem | null> => {
  if (!supabase) return null;

  try {
    const now = new Date();
    const warrantyExpiry = new Date(now.getTime() + warrantyDays * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('serialized_items')
      .insert({
        store_id: storeId,
        sale_id: saleId,
        item_name: itemName,
        serial_number: serialNumber.trim().toUpperCase(),
        warranty_days: warrantyDays,
        warranty_start_date: now.toISOString(),
        warranty_expiry_date: warrantyExpiry.toISOString(),
        customer_phone: customerPhone || null,
        customer_name: customerName || null,
        notes: notes || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating serialized item:', error);
      return null;
    }

    return data as SerializedItem;
  } catch (err) {
    console.error('Error creating serialized item:', err);
    return null;
  }
};

/**
 * Look up warranty status by IMEI/Serial Number
 */
export const lookupWarrantyBySerial = async (
  storeId: string,
  serialNumber: string
): Promise<WarrantyStatus> => {
  if (!supabase) {
    return {
      found: false,
      message: 'Database not available'
    };
  }

  try {
    const { data, error } = await supabase
      .from('serialized_items')
      .select('*')
      .eq('store_id', storeId)
      .eq('serial_number', serialNumber.trim().toUpperCase())
      .single();

    if (error || !data) {
      return {
        found: false,
        message: `No warranty record found for Serial: ${serialNumber}`
      };
    }

    const item = data as SerializedItem;
    const now = new Date();
    const expiryDate = new Date(item.warranty_expiry_date);
    const isExpired = now > expiryDate;
    const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const saleDate = new Date(item.warranty_start_date);

    let message = '';
    if (isExpired) {
      const daysOverdue = Math.abs(daysLeft);
      message = `❌ WARRANTY EXPIRED ${daysOverdue} days ago (${saleDate.toLocaleDateString()})`;
    } else if (daysLeft <= 0) {
      message = `⚠️ WARRANTY EXPIRED TODAY`;
    } else if (daysLeft <= 3) {
      message = `🔴 WARRANTY EXPIRING IN ${daysLeft} DAY(S) - Last chance for refund!`;
    } else {
      message = `✅ WARRANTY VALID - ${daysLeft} days remaining`;
    }

    if (item.seal_broken) {
      message += ' | ⚠️ SEAL BROKEN - WARRANTY VOID';
    }

    return {
      found: true,
      item,
      isExpired,
      daysLeft: Math.max(0, daysLeft),
      saleDate,
      message
    };
  } catch (err) {
    console.error('Error looking up warranty:', err);
    return {
      found: false,
      message: 'Error checking warranty status'
    };
  }
};

/**
 * Get all serialized items for a store (for warranty management dashboard)
 */
export const getStoreSerializedItems = async (storeId: string): Promise<SerializedItem[]> => {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('serialized_items')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching serialized items:', error);
      return [];
    }

    return data as SerializedItem[];
  } catch (err) {
    console.error('Error fetching serialized items:', err);
    return [];
  }
};

/**
 * Mark seal as broken (voids warranty)
 */
export const markSealBroken = async (
  itemId: string,
  sealBroken: boolean = true,
  reason?: string
): Promise<boolean> => {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('serialized_items')
      .update({
        seal_broken: sealBroken,
        notes: reason ? `Seal broken: ${reason}` : null
      })
      .eq('id', itemId);

    if (error) {
      console.error('Error updating seal status:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error updating seal status:', err);
    return false;
  }
};

/**
 * Get warranty statistics for store dashboard
 */
export const getWarrantyStats = async (storeId: string) => {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('serialized_items')
      .select('*')
      .eq('store_id', storeId);

    if (error || !data) return null;

    const now = new Date();
    const items = data as SerializedItem[];
    
    const validWarranty = items.filter(i => !i.seal_broken && new Date(i.warranty_expiry_date) > now);
    const expiredWarranty = items.filter(i => new Date(i.warranty_expiry_date) <= now);
    const expiringIn3Days = items.filter(i => {
      const daysLeft = Math.ceil((new Date(i.warranty_expiry_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysLeft > 0 && daysLeft <= 3 && !i.seal_broken;
    });

    return {
      totalItems: items.length,
      validWarranty: validWarranty.length,
      expiredWarranty: expiredWarranty.length,
      expiringIn3Days: expiringIn3Days.length,
      sealBroken: items.filter(i => i.seal_broken).length
    };
  } catch (err) {
    console.error('Error getting warranty stats:', err);
    return null;
  }
};
