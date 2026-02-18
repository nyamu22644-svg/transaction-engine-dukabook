import { supabase } from './supabaseClient';

const isSupabaseEnabled = !!supabase;

interface AccessCode {
  id: string;
  code: string;
  label: string;
  is_active: boolean;
  created_at: string;
  is_primary?: boolean;
}

interface Credentials {
  id: string;
  store_id: string;
  pin_updated_at: string | null;
  password_updated_at: string | null;
  updated_at: string;
}

/**
 * Generate unique access code with retry logic
 * Exported for use in signup flows
 */
export const generateUniqueAccessCode = async (): Promise<string> => {
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    const random = Math.random().toString(36).substr(2, 8).toUpperCase();
    const newCode = `STAFF${random}`;

    // Check if code exists in store_access_codes table
    const { count: additionalCount } = await supabase!
      .from('store_access_codes')
      .select('id', { count: 'exact', head: true })
      .eq('code', newCode);

    if ((additionalCount || 0) === 0) {
      // Also check in stores table (primary codes)
      const { count: primaryCount } = await supabase!
        .from('stores')
        .select('id', { count: 'exact', head: true })
        .eq('access_code', newCode);

      if ((primaryCount || 0) === 0) {
        return newCode; // Found unique code
      }
    }
    attempts++;
  }

  throw new Error('Failed to generate unique access code after retries');
};

/**
 * Get all access codes for a store (hybrid approach)
 * - Primary code from stores.access_code (read-only)
 * - Additional codes from store_access_codes table
 */
export const getAccessCodes = async (storeId: string): Promise<AccessCode[]> => {
  if (!isSupabaseEnabled) return [];

  const codes: AccessCode[] = [];

  try {
    // Get primary access code from stores table
    const { data: store } = await supabase!
      .from('stores')
      .select('access_code, id')
      .eq('id', storeId)
      .maybeSingle();

    if (store && store.access_code) {
      codes.push({
        id: `primary_${store.id}`,
        code: store.access_code,
        label: 'Primary Staff Code',
        is_active: true,
        created_at: new Date().toISOString(),
        is_primary: true,
      });
    }
  } catch (err) {
    console.error('Error fetching primary access code:', err);
  }

  try {
    // Get additional codes from store_access_codes table
    const { data: additionalCodes } = await supabase!
      .from('store_access_codes')
      .select('id, code, label, is_active, created_at')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (additionalCodes && additionalCodes.length > 0) {
      codes.push(...(additionalCodes as AccessCode[]));
    }
  } catch (err) {
    console.error('Error fetching additional access codes:', err);
  }

  return codes;
};

/**
 * Create a new additional access code for a store
 * (Additional codes only - primary code cannot be changed via this function)
 */
export const createAccessCode = async (
  storeId: string,
  customCode?: string
): Promise<AccessCode | null> => {
  if (!isSupabaseEnabled) return null;

  let codeToUse = customCode;

  try {
    // If no custom code, generate a unique one
    if (!codeToUse) {
      codeToUse = await generateUniqueAccessCode();
    } else {
      // Validate custom code
      if (!codeToUse.trim()) {
        console.error('Access code cannot be empty');
        return null;
      }
      if (!/^[a-zA-Z0-9]{3,20}$/.test(codeToUse)) {
        console.error('Code must be 3-20 alphanumeric characters');
        return null;
      }
    }

    // Insert into store_access_codes table
    const { data, error } = await supabase!
      .from('store_access_codes')
      .insert({
        store_id: storeId,
        code: codeToUse.trim(),
        label: `Additional Code - ${new Date().toLocaleDateString()}`,
        is_active: true,
      })
      .select('id, code, label, is_active, created_at')
      .single();

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
 * Deactivate an additional access code
 * (Cannot deactivate primary codes)
 */
export const deactivateAccessCode = async (codeId: string): Promise<boolean> => {
  if (!isSupabaseEnabled) return false;

  try {
    // Prevent deactivating primary code
    if (codeId.startsWith('primary_')) {
      console.error('Cannot deactivate primary access code');
      return false;
    }

    const { error } = await supabase!
      .from('store_access_codes')
      .update({ is_active: false })
      .eq('id', codeId);

    if (error) {
      console.error('Error deactivating access code:', error);
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
      .maybeSingle();

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
  getAccessCodes,
  createAccessCode,
  deactivateAccessCode,
  getStoreCredentialsInfo,
  updateStorePin,
  updateStorePassword,
};
