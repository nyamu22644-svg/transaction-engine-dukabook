import { useEffect, useState } from 'react';
import { StoreProfile } from '../types';
import {
  validateDeviceToken,
  getDeviceToken,
  clearDeviceToken,
} from '../services/storeEntryService';

interface UseStoreSessionReturn {
  store: StoreProfile | null;
  loading: boolean;
  deviceToken: string | null;
  logout: () => void;
  isValidating: boolean;
}

/**
 * Hook to manage store session from device token
 * Automatically validates device token on mount and checks if session is still valid
 */
export const useStoreSession = (storeId: string | null): UseStoreSessionReturn => {
  const [store, setStore] = useState<StoreProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [deviceToken, setDeviceToken] = useState<string | null>(null);

  useEffect(() => {
    const validateSession = async () => {
      if (!storeId) {
        setLoading(false);
        return;
      }

      setIsValidating(true);

      try {
        // Get stored device token
        const token = getDeviceToken(storeId);
        setDeviceToken(token);

        if (token) {
          // Validate the token
          const validatedStore = await validateDeviceToken(token);

          if (validatedStore) {
            setStore(validatedStore);
          } else {
            // Token is invalid or expired
            clearDeviceToken(storeId);
            setDeviceToken(null);
          }
        }
      } catch (err) {
        console.error('Error validating session:', err);
      }

      setLoading(false);
      setIsValidating(false);
    };

    validateSession();
  }, [storeId]);

  const logout = () => {
    if (storeId && deviceToken) {
      clearDeviceToken(storeId);
    }
    setStore(null);
    setDeviceToken(null);
  };

  return {
    store,
    loading,
    deviceToken,
    logout,
    isValidating,
  };
};

/**
 * Hook to detect if user is on a remembered device
 * Returns true if device token exists and is valid
 */
export const useIsRememberedDevice = (storeId: string | null): boolean => {
  const [isRemembered, setIsRemembered] = useState(false);

  useEffect(() => {
    if (!storeId) {
      setIsRemembered(false);
      return;
    }

    const token = getDeviceToken(storeId);
    setIsRemembered(!!token);
  }, [storeId]);

  return isRemembered;
};

/**
 * Hook to manage device sessions list for a store
 * Allows staff/owner to see and revoke devices
 */
export const useDeviceSessionsList = (storeId: string | null) => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSessions = async () => {
      if (!storeId) {
        setLoading(false);
        return;
      }

      try {
        // This would call a function to get all device sessions for the store
        // For now, placeholder
        const response = await fetch(`/api/stores/${storeId}/device-sessions`);
        const data = await response.json();
        setSessions(data || []);
      } catch (err) {
        console.error('Error loading device sessions:', err);
      }

      setLoading(false);
    };

    loadSessions();
  }, [storeId]);

  return {
    sessions,
    loading,
    refresh: () => {
      // Re-fetch sessions
    },
  };
};
