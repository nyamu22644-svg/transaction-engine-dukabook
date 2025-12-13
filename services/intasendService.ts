// services/intasendService.ts
// IntaSend M-Pesa API integration for payments

import axios from 'axios';

const INTASEND_API_URL = 'https://api.intasend.com/api/v1/payment/mpesa/';
const INTASEND_SECRET_KEY = process.env.INTASEND_SECRET_KEY || 'ISSecretKey_live_61fc199c-1d69-495a-9979-9b9b843b8429';

export interface IntaSendPaymentRequest {
  amount: number;
  phone_number: string;
  email: string;
  currency?: string;
  narrative?: string;
}

export async function initiateMpesaPayment(data: IntaSendPaymentRequest) {
  const payload = {
    ...data,
    currency: data.currency || 'KES',
    public_key: undefined // Not needed for secret key auth
  };
  try {
    const response = await axios.post(INTASEND_API_URL, payload, {
      headers: {
        'Authorization': `Bearer ${INTASEND_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error.message;
  }
}
