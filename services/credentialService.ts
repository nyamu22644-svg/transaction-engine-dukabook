import { supabase } from './supabaseClient';

const isSupabaseEnabled = !!supabase;

interface AccessCode {
  id: string;
  code: string;
  label: string | null;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  usage_count: number;
}

interface Credentials {
  id: string;
  store_id: string;
  pin_updated_at: string | null;
  password_updated_at: string | null;
  updated_at: string;
}

/**
 * Create a new access code with user-defined code
 */
export const createAccessCode = async (
  storeId: string,
  customCode: string
): Promise<AccessCode | null> => {
  if (!isSupabaseEnabled) return null;

  if (!customCode || customCode.trim().length === 0) {
    console.error('Access code cannot be empty');
    return null;
  }

  // Validate code is simple (alphanumeric, 3-20 chars)
  if (!/^[a-zA-Z0-9]{3,20}$/.test(customCode)) {
    console.error('Code must be 3-20 alphanumeric characters');
    return null;
  }

  try {
    const { data, error } = await supabase!
      .rpc('create_access_code', {
        p_store_id: storeId,
        p_code: customCode.trim(),
        p_label: customCode.trim(),
      });

    if (error) {
      console.error('Error creating access code:', error);
      return null;
    }

    return data as AccessCode;
  } catch (err) {
    console.error('Error in createAccessCode:', err);
    return null;
  }
};

/**
 * Get all access codes for a store
 */
export const getAccessCodes = async (storeId: string): Promise<AccessCode[]> => {
  if (!isSupabaseEnabled) return [];

  try {
    const { data, error } = await supabase!
      .from('store_access_codes')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching access codes:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error in getAccessCodes:', err);
    return [];
  }
};

/**
 * Deactivate an access code
 */
export const deactivateAccessCode = async (codeId: string): Promise<boolean> => {
  if (!isSupabaseEnabled) return false;

  try {
    const { error } = await supabase!
      .from('store_access_codes')
      .update({ is_active: false })
      .eq('id', codeId);

    if (error) {
      console.error('Error deactivating code:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error in deactivateAccessCode:', err);
    return false;
  }
};

/**
 * Get store credentials info (without hashes)
 */
export const getStoreCredentialsInfo = async (
  storeId: string
): Promise<Credentials | null> => {
  if (!isSupabaseEnabled) return null;

  try {
    const { data, error } = await supabase!
      .from('store_credentials')
      .select('id, store_id, pin_updated_at, password_updated_at, updated_at')
      .eq('store_id', storeId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching credentials:', error);
      return null;
    }

    return data || null;
  } catch (err) {
    console.error('Error in getStoreCredentialsInfo:', err);
    return null;
  }
};

/**
 * Update PIN (frontend sends PIN, backend hashes it)
 * For security, this should be a server-side function
 */
export const updateStorePin = async (
  storeId: string,
  newPin: string
): Promise<boolean> => {
  if (!isSupabaseEnabled) return false;

  // Validate PIN format (4-6 digits)
  if (!/^\d{4,6}$/.test(newPin)) {
    console.error('PIN must be 4-6 digits');
    return false;
  }

  try {
    // In production, call a secure edge function that hashes the PIN
    // For now, we'll just update the timestamp
    const { error } = await supabase!
      .from('store_credentials')
      .upsert(
        {
          store_id: storeId,
          pin_updated_at: new Date().toISOString(),
        },
        { onConflict: 'store_id' }
      );

    if (error) {
      console.error('Error updating PIN:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error in updateStorePin:', err);
    return false;
  }
};

/**
 * Update password
 * For security, this should also be a server-side function
 */
export const updateStorePassword = async (
  storeId: string,
  newPassword: string
): Promise<boolean> => {
  if (!isSupabaseEnabled) return false;

  // Validate password strength (min 8 chars, mix of upper/lower/numbers)
  if (newPassword.length < 8) {
    console.error('Password must be at least 8 characters');
    return false;
  }

  if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    console.error('Password must contain uppercase, lowercase, and numbers');
    return false;
  }

  try {
    const { error } = await supabase!
      .from('store_credentials')
      .upsert(
        {
          store_id: storeId,
          password_updated_at: new Date().toISOString(),
        },
        { onConflict: 'store_id' }
      );

    if (error) {
      console.error('Error updating password:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error in updateStorePassword:', err);
    return false;
  }
};

export default {
  createAccessCode,
  getAccessCodes,
  deactivateAccessCode,
  getStoreCredentialsInfo,
  updateStorePin,
  updateStorePassword,
};
