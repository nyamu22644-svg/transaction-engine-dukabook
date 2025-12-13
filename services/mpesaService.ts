/**
 * M-Pesa Payment Service
 * Handles STK Push payments via Supabase Edge Functions
 */

import { supabase, isSupabaseEnabled } from './supabaseClient';

// Supabase Edge Function URLs
const getEdgeFunctionUrl = (functionName: string): string => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  return `${supabaseUrl}/functions/v1/${functionName}`;
};

export interface STKPushRequest {
  phone: string;
  amount: number;
  storeId: string;
  planId: string;
  accountReference?: string;
}

export interface STKPushResponse {
  success: boolean;
  checkoutRequestId?: string;
  merchantRequestId?: string;
  responseDescription?: string;
  error?: string;
  errorCode?: string;
}

export interface PaymentStatusResponse {
  success: boolean;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  mpesaReceipt?: string;
  error?: string;
}

/**
 * Initiate M-Pesa STK Push payment
 * Sends payment prompt to customer's phone
 */
export const initiateSTKPush = async (request: STKPushRequest): Promise<STKPushResponse> => {
  if (!isSupabaseEnabled) {
    // Demo mode - simulate success after delay
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          checkoutRequestId: `demo-${Date.now()}`,
          merchantRequestId: `demo-merchant-${Date.now()}`,
          responseDescription: 'Demo payment initiated',
        });
      }, 2000);
    });
  }

  try {
    const response = await fetch(getEdgeFunctionUrl('mpesa-stk-push'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase?.auth.getSession())?.data.session?.access_token || ''}`,
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('STK Push error:', error);
    return {
      success: false,
      error: error.message || 'Failed to initiate payment',
    };
  }
};

/**
 * Check payment status
 * Polls to see if payment was completed
 */
export const checkPaymentStatus = async (checkoutRequestId: string): Promise<PaymentStatusResponse> => {
  if (!isSupabaseEnabled || checkoutRequestId.startsWith('demo-')) {
    // Demo mode - simulate completion after a few polls
    const pollCount = parseInt(sessionStorage.getItem(`poll-${checkoutRequestId}`) || '0');
    sessionStorage.setItem(`poll-${checkoutRequestId}`, String(pollCount + 1));
    
    if (pollCount >= 2) {
      return { success: true, status: 'COMPLETED', mpesaReceipt: 'DEMO123456' };
    }
    return { success: false, status: 'PENDING' };
  }

  try {
    const response = await fetch(getEdgeFunctionUrl('mpesa-query'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase?.auth.getSession())?.data.session?.access_token || ''}`,
      },
      body: JSON.stringify({ checkoutRequestId }),
    });

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Payment status check error:', error);
    return {
      success: false,
      status: 'PENDING',
      error: error.message,
    };
  }
};

/**
 * Format phone number for M-Pesa (254XXXXXXXXX)
 */
export const formatPhoneForMpesa = (phone: string): string => {
  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.slice(1);
  } else if (cleaned.startsWith('+254')) {
    cleaned = cleaned.slice(1);
  } else if (cleaned.startsWith('254')) {
    // Already correct format
  } else if (cleaned.length === 9) {
    cleaned = '254' + cleaned;
  }
  
  return cleaned;
};

/**
 * Validate Kenyan phone number
 */
export const isValidKenyanPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  
  // Should be 9 digits (without country code) or 12 digits (with 254)
  if (cleaned.length === 9 && /^[17]\d{8}$/.test(cleaned)) {
    return true;
  }
  if (cleaned.length === 10 && /^0[17]\d{8}$/.test(cleaned)) {
    return true;
  }
  if (cleaned.length === 12 && /^254[17]\d{8}$/.test(cleaned)) {
    return true;
  }
  
  return false;
};

/**
 * Get payment history for a store
 */
export const getPaymentHistory = async (storeId: string): Promise<any[]> => {
  if (!isSupabaseEnabled || !supabase) return [];

  try {
    const { data, error } = await supabase
      .from('payment_history')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching payment history:', error);
    return [];
  }
};

/**
 * Get pending payments for a store
 */
export const getPendingPayments = async (storeId: string): Promise<any[]> => {
  if (!isSupabaseEnabled || !supabase) return [];

  try {
    const { data, error } = await supabase
      .from('mpesa_payments')
      .select('*')
      .eq('store_id', storeId)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching pending payments:', error);
    return [];
  }
};

// M-Pesa Payment Config (for display purposes)
export const MPESA_CONFIG = {
  tillNumber: '400200',
  accountNumber: '1017341',
  businessName: 'DukaBook',
  paybillNumber: '400200', // Same as Till for Co-op
};
