import { supabase } from './supabaseClient';
import { StoreProfile } from '../types';

const isSupabaseEnabled = !!supabase;

interface StoreOption {
  store_id: string;
  store_name: string;
  owner_phone: string;
  location: string;
  created_at: string;
}

interface DeviceSession {
  id: string;
  device_token: string;
  device_name: string | null;
  expires_at: string;
}

/**
 * Step 1: Look up all stores for a phone number
 * Phone Number is the key to find all stores owned by this person
 */
export const lookupStoresByPhone = async (
  phoneNumber: string
): Promise<StoreOption[]> => {
  if (!isSupabaseEnabled) return [];

  // Normalize phone number (remove spaces, dashes, etc.)
  const normalizedPhone = phoneNumber.replace(/\D/g, '');

  try {
    const { data, error } = await supabase!.rpc('get_stores_by_phone', {
      p_phone: normalizedPhone,
    });

    if (error) {
      console.error('Error looking up stores:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error in lookupStoresByPhone:', err);
    return [];
  }
};

/**
 * Step 2: Verify the passkey for a store
 * Simple, non-unique passkey per store
 */
export const verifyStorePasskey = async (
  storeId: string,
  passkey: string
): Promise<boolean> => {
  if (!isSupabaseEnabled) return false;

  if (!passkey || passkey.length === 0) {
    console.error('Passkey cannot be empty');
    return false;
  }

  try {
    const { data, error } = await supabase!.rpc('verify_store_passkey', {
      p_store_id: storeId,
      p_passkey_plain: passkey,
    });

    if (error) {
      console.error('Error verifying passkey:', error);
      return false;
    }

    return data === true;
  } catch (err) {
    console.error('Error in verifyStorePasskey:', err);
    return false;
  }
};

/**
 * Step 3: Create device session (Remember this device)
 * Allows skipping login on future visits
 */
export const createDeviceSession = async (
  storeId: string,
  phoneNumber: string,
  deviceName?: string
): Promise<DeviceSession | null> => {
  if (!isSupabaseEnabled) return null;

  try {
    // Generate a secure device token
    const deviceToken = generateSecureToken();

    // Get device fingerprint (browser/device info)
    const deviceFingerprint = getDeviceFingerprint();

    const { data, error } = await supabase!.rpc('create_device_session', {
      p_store_id: storeId,
      p_phone_number: phoneNumber,
      p_device_token: deviceToken,
      p_device_name: deviceName || null,
      p_user_agent: navigator?.userAgent || null,
      p_ip_address: null, // IP collected on server side in production
    });

    if (error) {
      console.error('Error creating device session:', error);
      return null;
    }

    // Store the token in localStorage
    if (data && data[0]) {
      const session = data[0];
      saveDeviceToken(storeId, deviceToken);
      return {
        id: session.id,
        device_token: session.device_token,
        device_name: session.device_name,
        expires_at: session.expires_at,
      };
    }

    return null;
  } catch (err) {
    console.error('Error in createDeviceSession:', err);
    return null;
  }
};

/**
 * Step 4: Validate device token on app load
 * If valid, skip store entry flow and go straight to dashboard
 */
export const validateDeviceToken = async (
  deviceToken: string
): Promise<StoreProfile | null> => {
  if (!isSupabaseEnabled || !deviceToken) return null;

  try {
    const { data, error } = await supabase!.rpc('validate_device_token', {
      p_device_token: deviceToken,
    });

    if (error) {
      console.error('Error validating device token:', error);
      return null;
    }

    if (!data || data.length === 0 || !data[0].is_valid) {
      // Token expired or invalid
      clearDeviceToken(deviceToken);
      return null;
    }

    // Token is valid, fetch full store info
    const storeId = data[0].store_id;
    const store = await fetchStoreById(storeId);

    if (store) {
      // Update last accessed time
      await supabase!.rpc('create_device_session', {
        p_store_id: storeId,
        p_phone_number: data[0].phone_number,
        p_device_token: deviceToken,
        p_device_name: data[0].device_name,
      });
    }

    return store;
  } catch (err) {
    console.error('Error in validateDeviceToken:', err);
    return null;
  }
};

/**
 * Get all active device sessions for a store
 */
export const getDeviceSessions = async (
  storeId: string
): Promise<DeviceSession[]> => {
  if (!isSupabaseEnabled) return [];

  try {
    const { data, error } = await supabase!
      .from('device_sessions')
      .select('id, device_token, device_name, expires_at')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('last_accessed_at', { ascending: false });

    if (error) {
      console.error('Error fetching device sessions:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error in getDeviceSessions:', err);
    return [];
  }
};

/**
 * Deactivate a device session (Logout this device)
 */
export const revokeDeviceSession = async (deviceToken: string): Promise<boolean> => {
  if (!isSupabaseEnabled) return false;

  try {
    const { error } = await supabase!
      .from('device_sessions')
      .update({ is_active: false })
      .eq('device_token', deviceToken);

    if (error) {
      console.error('Error revoking device session:', error);
      return false;
    }

    clearDeviceToken(deviceToken);
    return true;
  } catch (err) {
    console.error('Error in revokeDeviceSession:', err);
    return false;
  }
};

/**
 * Update the passkey for a store
 */
export const updateStorePasskey = async (
  storeId: string,
  newPasskey: string
): Promise<boolean> => {
  if (!isSupabaseEnabled) return false;

  if (!newPasskey || newPasskey.length < 3) {
    console.error('Passkey must be at least 3 characters');
    return false;
  }

  try {
    const { data, error } = await supabase!.rpc('set_store_passkey', {
      p_store_id: storeId,
      p_passkey_plain: newPasskey,
    });

    if (error) {
      console.error('Error updating passkey:', error);
      return false;
    }

    return data === true;
  } catch (err) {
    console.error('Error in updateStorePasskey:', err);
    return false;
  }
};

// ============================================================================
// LOCAL STORAGE HELPERS
// ============================================================================

/**
 * Save device token to localStorage
 */
export const saveDeviceToken = (storeId: string, deviceToken: string): void => {
  try {
    const key = `device_token_${storeId}`;
    localStorage.setItem(key, deviceToken);
  } catch (err) {
    console.error('Error saving device token:', err);
  }
};

/**
 * Get device token from localStorage
 */
export const getDeviceToken = (storeId: string): string | null => {
  try {
    const key = `device_token_${storeId}`;
    return localStorage.getItem(key);
  } catch (err) {
    console.error('Error getting device token:', err);
    return null;
  }
};

/**
 * Clear device token from localStorage
 */
export const clearDeviceToken = (storeId: string): void => {
  try {
    const key = `device_token_${storeId}`;
    localStorage.removeItem(key);
  } catch (err) {
    console.error('Error clearing device token:', err);
  }
};

// ============================================================================
// UTILITY HELPERS
// ============================================================================

/**
 * Generate a secure random token
 */
const generateSecureToken = (): string => {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

/**
 * Get device fingerprint for additional security
 */
const getDeviceFingerprint = (): string => {
  const userAgent = navigator?.userAgent || '';
  const language = navigator?.language || '';
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const fingerprint = `${userAgent}|${language}|${timezone}`;
  return btoa(fingerprint).substring(0, 255);
};

/**
 * Fetch full store info by ID
 */
const fetchStoreById = async (storeId: string): Promise<StoreProfile | null> => {
  if (!isSupabaseEnabled) return null;

  try {
    const { data, error } = await supabase!
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .single();

    if (error) {
      console.error('Error fetching store:', error);
      return null;
    }

    return data as StoreProfile;
  } catch (err) {
    console.error('Error in fetchStoreById:', err);
    return null;
  }
};

/**
 * Normalize phone number (remove spaces, dashes, etc.)
 */
export const normalizePhoneNumber = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

/**
 * Format phone number for display
 */
export const formatPhoneNumber = (phone: string): string => {
  const normalized = normalizePhoneNumber(phone);
  // Kenya format: +254 712 345 678
  if (normalized.startsWith('254')) {
    return `+${normalized.substring(0, 3)} ${normalized.substring(3, 6)} ${normalized.substring(6, 9)} ${normalized.substring(9)}`;
  }
  // Local format: 0712345678
  if (normalized.startsWith('0')) {
    return `${normalized.substring(0, 4)} ${normalized.substring(4, 7)} ${normalized.substring(7)}`;
  }
  return normalized;
};
