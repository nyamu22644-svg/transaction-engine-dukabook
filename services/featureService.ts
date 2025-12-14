import { SubscriptionFeature } from '../types';
import { supabase, isSupabaseEnabled } from './supabaseClient';

/**
 * SUBSCRIPTION FEATURES SERVICE
 * 
 * Manages database-driven feature list (instead of hardcoded)
 * SuperAdmins can add/remove/edit features to customize plans
 */

export const getSubscriptionFeatures = async (): Promise<SubscriptionFeature[]> => {
  if (!isSupabaseEnabled) return [];
  try {
    const { data } = await supabase!
      .from('subscription_features')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    return data || [];
  } catch (err) {
    console.error('Error fetching subscription features:', err);
    return [];
  }
};

export const getAllSubscriptionFeatures = async (): Promise<SubscriptionFeature[]> => {
  if (!isSupabaseEnabled) return [];
  try {
    const { data } = await supabase!
      .from('subscription_features')
      .select('*')
      .order('sort_order', { ascending: true });
    return data || [];
  } catch (err) {
    console.error('Error fetching all subscription features:', err);
    return [];
  }
};

export const getPremiumFeatures = async (): Promise<SubscriptionFeature[]> => {
  if (!isSupabaseEnabled) return [];
  try {
    const { data } = await supabase!
      .from('subscription_features')
      .select('*')
      .eq('is_premium', true)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    return data || [];
  } catch (err) {
    console.error('Error fetching premium features:', err);
    return [];
  }
};

export const createSubscriptionFeature = async (
  feature: Omit<SubscriptionFeature, 'id' | 'created_at'>
): Promise<SubscriptionFeature | null> => {
  if (!isSupabaseEnabled) return null;
  try {
    const { data, error } = await supabase!
      .from('subscription_features')
      .insert(feature)
      .select()
      .single();

    if (error) {
      console.error('Error creating feature:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Error creating subscription feature:', err);
    return null;
  }
};

export const updateSubscriptionFeature = async (
  id: string,
  updates: Partial<SubscriptionFeature>
): Promise<boolean> => {
  if (!isSupabaseEnabled) return false;
  try {
    const { error } = await supabase!
      .from('subscription_features')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return !error;
  } catch (err) {
    console.error('Error updating subscription feature:', err);
    return false;
  }
};

export const deleteSubscriptionFeature = async (id: string): Promise<boolean> => {
  if (!isSupabaseEnabled) return false;
  try {
    const { error } = await supabase!
      .from('subscription_features')
      .delete()
      .eq('id', id);

    return !error;
  } catch (err) {
    console.error('Error deleting subscription feature:', err);
    return false;
  }
};

export const toggleFeatureActive = async (id: string, isActive: boolean): Promise<boolean> => {
  return updateSubscriptionFeature(id, { is_active: isActive });
};

export const reorderFeatures = async (
  features: Array<{ id: string; sort_order: number }>
): Promise<boolean> => {
  if (!isSupabaseEnabled) return false;
  try {
    for (const feature of features) {
      await supabase!
        .from('subscription_features')
        .update({ sort_order: feature.sort_order })
        .eq('id', feature.id);
    }
    return true;
  } catch (err) {
    console.error('Error reordering features:', err);
    return false;
  }
};
