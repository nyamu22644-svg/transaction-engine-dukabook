const INTASEND_PUBLIC_KEY = import.meta.env.VITE_INTASEND_PUBLIC_KEY || 'ISPubKey_live_3b8b7234-5ac1-44fb-b94d-b2f072fb0890';

export interface SubscriptionPlan {
  name: string;
  amount: number;
  interval: 'monthly' | 'weekly' | 'yearly';
  currency?: string;
  description?: string;
}

export interface CreateSubscriptionRequest {
  email: string;
  phone_number: string;
  plan: SubscriptionPlan;
}

export async function createSubscription(data: CreateSubscriptionRequest) {
  const payload = {
    public_key: INTASEND_PUBLIC_KEY,
    email: data.email,
    phone_number: data.phone_number,
    first_name: data.email.split('@')[0],
    amount: data.plan.amount,
    currency: data.plan.currency || 'KES',
    plan_name: data.plan.name,
    plan_period: data.plan.interval,
  };
  
  try {
    // Call our backend API instead of directly calling IntaSend (avoids CORS)
    const apiUrl = window.location.origin + '/api/intasend-payment';
    console.log('Calling API at:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    console.log('API Response status:', response.status);
    
    if (!response.ok) {
      const error = await response.json();
      console.error('API Error response:', error);
      throw error;
    }
    
    const result = await response.json();
    console.log('API Success:', result);
    return result;
  } catch (error: any) {
    console.error('IntaSend API Error:', error);
    throw error.message || error;
  }
}
