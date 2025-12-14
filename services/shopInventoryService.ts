// shopInventoryService.ts
// Service for managing shop-specific inventory
// This is PRIVATE - each shop only sees their own prices and quantities

import { supabase } from '../lib/supabaseClient';

export interface ShopInventoryItem {
    id: string;
    shop_id: string;
    barcode: string;
    generic_name: string;
    category: string;
    image_url?: string;
    quantity: number;
    selling_price: number;
    buying_price?: number;
    custom_alias?: string;
    last_restocked_at?: string;
    margin_percent?: number;
    created_at: string;
    updated_at: string;
}

export interface InventoryInsertPayload {
    shop_id: string;
    barcode: string;
    quantity: number;
    selling_price: number;
    buying_price?: number;
    custom_alias?: string;
}

class ShopInventoryService {
    /**
     * Get all inventory items for a specific shop
     */
    async getShopInventory(shopId: string): Promise<ShopInventoryItem[]> {
        try {
            const { data, error } = await supabase
                .from('shop_inventory_with_details')
                .select('*')
                .eq('shop_id', shopId)
                .order('generic_name');

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching shop inventory:', error);
            return [];
        }
    }

    /**
     * Get a specific inventory item by ID
     */
    async getInventoryItem(itemId: string, shopId: string): Promise<ShopInventoryItem | null> {
        try {
            const { data, error } = await supabase
                .from('shop_inventory_with_details')
                .select('*')
                .eq('id', itemId)
                .eq('shop_id', shopId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') return null;
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Error fetching inventory item:', error);
            return null;
        }
    }

    /**
     * Get inventory item by barcode for a shop
     */
    async getByBarcode(shopId: string, barcode: string): Promise<ShopInventoryItem | null> {
        try {
            const { data, error } = await supabase
                .from('shop_inventory_with_details')
                .select('*')
                .eq('shop_id', shopId)
                .eq('barcode', barcode)
                .single();

            if (error) {
                if (error.code === 'PGRST116') return null;
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Error fetching inventory by barcode:', error);
            return null;
        }
    }

    /**
     * Add a new item to shop inventory
     * This links to global_products by barcode
     */
    async addItem(payload: InventoryInsertPayload): Promise<ShopInventoryItem | null> {
        try {
            // First, check if this item already exists in the shop
            const existing = await this.getByBarcode(payload.shop_id, payload.barcode);

            if (existing) {
                // Item exists, update quantity and price
                return await this.updateItem(existing.id, payload.shop_id, {
                    quantity: payload.quantity,
                    selling_price: payload.selling_price,
                    buying_price: payload.buying_price,
                    custom_alias: payload.custom_alias
                });
            }

            // Insert new item
            const { data, error } = await supabase
                .from('shop_inventory')
                .insert(payload)
                .select('*')
                .single();

            if (error) throw error;

            // Return with product details
            return await this.getInventoryItem(data.id, payload.shop_id);
        } catch (error) {
            console.error('Error adding inventory item:', error);
            return null;
        }
    }

    /**
     * Update an inventory item
     */
    async updateItem(
        itemId: string,
        shopId: string,
        updates: Partial<InventoryInsertPayload>
    ): Promise<ShopInventoryItem | null> {
        try {
            const { error } = await supabase
                .from('shop_inventory')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', itemId)
                .eq('shop_id', shopId);

            if (error) throw error;

            return await this.getInventoryItem(itemId, shopId);
        } catch (error) {
            console.error('Error updating inventory item:', error);
            return null;
        }
    }

    /**
     * Update selling price only
     */
    async updatePrice(
        itemId: string,
        shopId: string,
        sellingPrice: number
    ): Promise<ShopInventoryItem | null> {
        return await this.updateItem(itemId, shopId, { selling_price: sellingPrice });
    }

    /**
     * Update quantity (for stock adjustments)
     */
    async updateQuantity(
        itemId: string,
        shopId: string,
        quantity: number
    ): Promise<ShopInventoryItem | null> {
        return await this.updateItem(itemId, shopId, {
            quantity,
            last_restocked_at: new Date().toISOString()
        });
    }

    /**
     * Remove an item from shop inventory
     */
    async removeItem(itemId: string, shopId: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('shop_inventory')
                .delete()
                .eq('id', itemId)
                .eq('shop_id', shopId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error removing inventory item:', error);
            return false;
        }
    }

    /**
     * Get low stock items (quantity below threshold)
     */
    async getLowStockItems(shopId: string, threshold = 10): Promise<ShopInventoryItem[]> {
        try {
            const { data, error } = await supabase
                .from('shop_inventory_with_details')
                .select('*')
                .eq('shop_id', shopId)
                .lt('quantity', threshold)
                .order('quantity');

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching low stock items:', error);
            return [];
        }
    }

    /**
     * Get items in a specific category for a shop
     */
    async getByCategory(shopId: string, category: string): Promise<ShopInventoryItem[]> {
        try {
            const { data, error } = await supabase
                .from('shop_inventory_with_details')
                .select('*')
                .eq('shop_id', shopId)
                .eq('category', category)
                .order('generic_name');

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching inventory by category:', error);
            return [];
        }
    }

    /**
     * Get inventory statistics for a shop
     */
    async getInventoryStats(shopId: string): Promise<{
        total_items: number;
        total_value: number;
        total_cost: number;
        low_stock_count: number;
        avg_margin: number;
    } | null> {
        try {
            const { data, error } = await supabase
                .from('shop_inventory_with_details')
                .select('*')
                .eq('shop_id', shopId);

            if (error) throw error;

            const items = data || [];
            const lowStockItems = items.filter((item: ShopInventoryItem) => item.quantity < 10);

            const totalValue = items.reduce(
                (sum: number, item: ShopInventoryItem) => sum + (item.quantity * item.selling_price),
                0
            );

            const totalCost = items.reduce(
                (sum: number, item: ShopInventoryItem) => sum + (item.quantity * (item.buying_price || 0)),
                0
            );

            const avgMargin = items.length > 0
                ? items.reduce((sum: number, item: ShopInventoryItem) => sum + (item.margin_percent || 0), 0) / items.length
                : 0;

            return {
                total_items: items.length,
                total_value: Math.round(totalValue * 100) / 100,
                total_cost: Math.round(totalCost * 100) / 100,
                low_stock_count: lowStockItems.length,
                avg_margin: Math.round(avgMargin * 100) / 100
            };
        } catch (error) {
            console.error('Error fetching inventory stats:', error);
            return null;
        }
    }

    /**
     * Search inventory by name or barcode
     */
    async searchInventory(shopId: string, searchTerm: string): Promise<ShopInventoryItem[]> {
        try {
            const { data, error } = await supabase
                .from('shop_inventory_with_details')
                .select('*')
                .eq('shop_id', shopId)
                .or(`generic_name.ilike.%${searchTerm}%,barcode.ilike.%${searchTerm}%,custom_alias.ilike.%${searchTerm}%`)
                .order('generic_name');

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error searching inventory:', error);
            return [];
        }
    }

    /**
     * Bulk update prices (for seasonal discounts, etc.)
     */
    async bulkUpdatePrices(
        shopId: string,
        updates: Array<{ itemId: string; newPrice: number }>
    ): Promise<boolean> {
        try {
            const promises = updates.map(({ itemId, newPrice }) =>
                this.updatePrice(itemId, shopId, newPrice)
            );

            await Promise.all(promises);
            return true;
        } catch (error) {
            console.error('Error bulk updating prices:', error);
            return false;
        }
    }
}

export default new ShopInventoryService();
