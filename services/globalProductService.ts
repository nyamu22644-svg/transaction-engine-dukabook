// globalProductService.ts
// Service for managing the global product catalog
// This is the "Master Brain" - shared across all shops
// READ-ONLY for shops, READ-WRITE for system

import { supabase } from './supabaseClient';

export interface GlobalProduct {
    barcode: string;
    generic_name: string;
    category: string;
    image_url?: string;
    created_by: string;
    created_at: string;
    contribution_count: number; // How many shops confirmed this
}

export interface ProductSearchResult {
    found: boolean;
    product?: GlobalProduct;
    suggestion?: string; // For future ML-based suggestions
}

class GlobalProductService {
    /**
     * Search for a product by barcode in the global catalog
     * Returns the product if found, null if not
     */
    async searchByBarcode(barcode: string): Promise<GlobalProduct | null> {
        try {
            const { data, error } = await supabase
                .from('global_products')
                .select('*')
                .eq('barcode', barcode)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // Not found - this is expected for new items
                    return null;
                }
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Error searching product by barcode:', error);
            return null;
        }
    }

    /**
     * Search for products by name (partial match)
     * Used for browsing the global catalog
     */
    async searchByName(searchTerm: string, limit = 20): Promise<GlobalProduct[]> {
        try {
            const { data, error } = await supabase
                .from('global_products')
                .select('*')
                .ilike('generic_name', `%${searchTerm}%`)
                .order('contribution_count', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error searching products by name:', error);
            return [];
        }
    }

    /**
     * Get all products in a specific category
     */
    async getByCategory(category: string, limit = 50): Promise<GlobalProduct[]> {
        try {
            const { data, error } = await supabase
                .from('global_products')
                .select('*')
                .eq('category', category)
                .order('contribution_count', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching products by category:', error);
            return [];
        }
    }

    /**
     * Get all unique categories in the global catalog
     */
    async getAllCategories(): Promise<string[]> {
        try {
            const { data, error } = await supabase
                .from('global_products')
                .select('category')
                .order('category');

            if (error) throw error;

            // Remove duplicates and null values
            const categories = Array.from(new Set(
                (data || []).map(item => item.category).filter(Boolean)
            ));

            return categories as string[];
        } catch (error) {
            console.error('Error fetching categories:', error);
            return [];
        }
    }

    /**
     * Create a new product in the global catalog
     * This is called when a shop encounters a barcode they don't know
     * Multiple shops can contribute the same barcode (increases contribution_count)
     */
    async createProduct(
        barcode: string,
        name: string,
        category: string,
        imageUrl?: string,
        userId?: string
    ): Promise<GlobalProduct | null> {
        try {
            // First, check if this barcode already exists
            const existingProduct = await this.searchByBarcode(barcode);

            if (existingProduct) {
                // Product exists, increment contribution count
                return await this.incrementContribution(barcode);
            }

            // Get current user ID if not provided
            const currentUserId = userId || (await supabase.auth.getUser()).data.user?.id;

            if (!currentUserId) {
                throw new Error('User must be authenticated to create products');
            }

            // Create new product
            const { data, error } = await supabase
                .from('global_products')
                .insert({
                    barcode,
                    generic_name: name,
                    category,
                    image_url: imageUrl,
                    created_by: currentUserId,
                    contribution_count: 1
                })
                .select()
                .single();

            if (error) throw error;

            console.log('New product added to global catalog:', barcode, name);
            return data;
        } catch (error) {
            console.error('Error creating global product:', error);
            return null;
        }
    }

    /**
     * Increment the contribution count when another shop confirms the same barcode
     */
    private async incrementContribution(barcode: string): Promise<GlobalProduct | null> {
        try {
            const { data, error } = await supabase
                .rpc('increment_product_contribution', {
                    p_barcode: barcode
                });

            if (error) {
                // If RPC doesn't exist, fall back to manual update
                const { data: updateData, error: updateError } = await supabase
                    .from('global_products')
                    .update({ contribution_count: supabase.raw('contribution_count + 1') })
                    .eq('barcode', barcode)
                    .select()
                    .single();

                if (updateError) throw updateError;
                return updateData;
            }

            return data;
        } catch (error) {
            console.error('Error incrementing product contribution:', error);
            return null;
        }
    }

    /**
     * Get statistics about the global catalog
     */
    async getCatalogStats(): Promise<{
        total_products: number;
        total_categories: number;
        most_contributed: GlobalProduct[];
    } | null> {
        try {
            const [productsRes, categoriesRes, topRes] = await Promise.all([
                supabase.from('global_products').select('*', { count: 'exact' }),
                this.getAllCategories(),
                supabase
                    .from('global_products')
                    .select('*')
                    .order('contribution_count', { ascending: false })
                    .limit(5)
            ]);

            return {
                total_products: productsRes.count || 0,
                total_categories: categoriesRes.length,
                most_contributed: topRes.data || []
            };
        } catch (error) {
            console.error('Error fetching catalog stats:', error);
            return null;
        }
    }

    /**
     * Get trending products (most recently added, most confirmed)
     */
    async getTrendingProducts(limit = 10): Promise<GlobalProduct[]> {
        try {
            const { data, error } = await supabase
                .from('global_products')
                .select('*')
                .order('contribution_count', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching trending products:', error);
            return [];
        }
    }
}

export default new GlobalProductService();
