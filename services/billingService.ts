/**
 * DukaBook Billing & Subscription Service
 * Handles subscription management and billing
 */

import { supabase, isSupabaseEnabled } from './supabaseClient';
import {
  SubscriptionPlan,
  StoreSubscription,
  SubscriptionPayment,
  PaymentReminder,
  BillingDashboardStats,
  SubscriptionStatus,
  BillingCycle,
  SubscriptionTier,
  StoreProfile,
  PaymentConfig,
  MarketingConfig,
} from '../types';

// ============================================================================
// SUBSCRIPTION PLANS - Kenya Pricing
// ============================================================================

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic-monthly',
    name: 'Basic Monthly',
    tier: 'BASIC',
    billing_cycle: 'MONTHLY',
    price_kes: 500,
    max_staff: 3,
    max_products: 100,
    features: [
      'Record sales & expenses',
      'Basic inventory tracking',
      'Daily reports',
      'Up to 3 staff members',
      'Up to 100 products',
    ],
  },
  {
    id: 'premium-monthly',
    name: 'Premium Monthly',
    tier: 'PREMIUM',
    billing_cycle: 'MONTHLY',
    price_kes: 1500,
    max_staff: 20,
    max_products: 1000,
    is_popular: true,
    features: [
      'Everything in Basic',
      'Profit tracking & analytics',
      'GPS sales location map',
      'Supplier & Customer management',
      'Debt/Credit tracking (Madeni)',
      'Up to 20 staff members',
      'Up to 1000 products',
      'Priority support',
    ],
  },
  {
    id: 'basic-yearly',
    name: 'Basic Yearly',
    tier: 'BASIC',
    billing_cycle: 'YEARLY',
    price_kes: 5000, // 2 months free
    max_staff: 3,
    max_products: 100,
    features: [
      'All Basic features',
      '2 months FREE (save KES 1,000)',
    ],
  },
  {
    id: 'premium-yearly',
    name: 'Premium Yearly',
    tier: 'PREMIUM',
    billing_cycle: 'YEARLY',
    price_kes: 15000, // 2 months free
    max_staff: 20,
    max_products: 1000,
    features: [
      'All Premium features',
      '2 months FREE (save KES 3,000)',
    ],
  },
];

export const TRIAL_DURATION_DAYS = 7; // 7-day free trial (only for registered stores)
export const GRACE_PERIOD_DAYS = 3; // 3 days after expiry before suspension

// ============================================================================
// UTILITY: Calculate days remaining - SINGLE SOURCE OF TRUTH
// ============================================================================
/**
 * Calculate days remaining until expiry date
 * Uses Math.floor() for precision (always rounds down)
 * This is the ONLY function that should be used for days calculation
 */
export const calculateDaysRemaining = (expiresAt: string | Date): number => {
  try {
    const now = new Date();
    const expiryDate = new Date(expiresAt);
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysLeft = Math.floor((expiryDate.getTime() - now.getTime()) / msPerDay);
    return Math.max(0, daysLeft); // Never negative
  } catch (err) {
    console.error('Error calculating days remaining:', err);
    return 0;
  }
};

// Helper to get current plans (dynamic from localStorage or default)
const getCurrentPlans = (): SubscriptionPlan[] => {
  const savedPlans = localStorage.getItem('dukabook_subscription_plans');
  if (savedPlans) {
    try {
      return JSON.parse(savedPlans);
    } catch {
      // Fall back to default
    }
  }
  return SUBSCRIPTION_PLANS;
};

/**
 * Get effective tier for a store from localStorage (sync version for demo/offline)
 * This checks stored subscription data without async Supabase call
 */
export const getEffectiveTierSync = (storeId: string): {
  tier: 'TRIAL' | 'BASIC' | 'PREMIUM' | 'EXPIRED' | 'NONE';
  isTrialActive: boolean;
  trialDaysLeft: number;
  hasFullAccess: boolean;
  canAccessPremiumFeatures: boolean;
} => {
  // Check localStorage for subscription data
  const savedSubs = localStorage.getItem('dukabook_subscriptions');
  if (!savedSubs) {
    return {
      tier: 'NONE',
      isTrialActive: false,
      trialDaysLeft: 0,
      hasFullAccess: false,
      canAccessPremiumFeatures: false,
    };
  }

  try {
    const subscriptions = JSON.parse(savedSubs) as StoreSubscription[];
    const subscription = subscriptions
      .filter(s => s.store_id === storeId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    if (!subscription) {
      return {
        tier: 'NONE',
        isTrialActive: false,
        trialDaysLeft: 0,
        hasFullAccess: false,
        canAccessPremiumFeatures: false,
      };
    }

    const now = new Date();
    const expiresAt = new Date(subscription.expires_at);

    // Check if subscription is expired
    if (subscription.status === 'expired' || subscription.status === 'cancelled') {
      return {
        tier: 'EXPIRED',
        isTrialActive: false,
        trialDaysLeft: 0,
        hasFullAccess: false,
        canAccessPremiumFeatures: false,
      };
    }

    // Check if expired based on expires_at
    if (now > expiresAt) {
      return {
        tier: 'EXPIRED',
        isTrialActive: false,
        trialDaysLeft: 0,
        hasFullAccess: false,
        canAccessPremiumFeatures: false,
      };
    }

    // Check trial
    const daysLeft = calculateDaysRemaining(subscription.expires_at);
    if (subscription.is_trial && subscription.status === 'active') {
      return {
        tier: 'TRIAL',
        isTrialActive: true,
        trialDaysLeft: daysLeft,
        hasFullAccess: true,
        canAccessPremiumFeatures: true,
      };
    }

    // Map plan_name to tier
    // Note: free_trial should NOT be mapped here - is_trial flag handles it above
    const tierMap: { [key: string]: 'BASIC' | 'PREMIUM' } = {
      'basic': 'BASIC',
      'premium': 'PREMIUM',
    };
    const tier = tierMap[subscription.plan_name.toLowerCase()] || 'BASIC';

    return {
      tier,
      isTrialActive: false,
      trialDaysLeft: 0,
      hasFullAccess: tier === 'PREMIUM',
      canAccessPremiumFeatures: tier === 'PREMIUM',
    };
  } catch {
    return {
      tier: 'NONE',
      isTrialActive: false,
      trialDaysLeft: 0,
      hasFullAccess: false,
      canAccessPremiumFeatures: false,
    };
  }
};

// ============================================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================================

/**
 * Create a new subscription with trial period
 */
export const createTrialSubscription = async (
  storeId: string,
  planId: string = 'premium-monthly'
): Promise<StoreSubscription | null> => {
  if (!isSupabaseEnabled) return null;

  const plans = getCurrentPlans();
  const plan = plans.find(p => p.id === planId);
  if (!plan) return null;

  // Only allow trials for registered stores (must have an owner)
  try {
    const { data: storeData, error: storeErr } = await supabase!
      .from('stores')
      .select('id, owner_id')
      .eq('id', storeId)
      .single();

    if (storeErr || !storeData) {
      console.warn('createTrialSubscription: store not found or error', storeErr);
      return null;
    }

    if (!storeData.owner_id) {
      // Store has not been registered/claimed by an owner - do not grant trial
      console.warn('createTrialSubscription: store is not registered (no owner)');
      return null;
    }
  } catch (e) {
    console.error('Error checking store registration for trial:', e);
    return null;
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);

  const subscription: Omit<StoreSubscription, 'id' | 'created_at' | 'updated_at'> = {
    store_id: storeId,
    status: 'active',
    expires_at: expiresAt.toISOString(),
    plan_name: 'free_trial',
    is_trial: true,
    payment_ref: undefined,
    payment_method: undefined,
  };

  try {
    const { data, error } = await supabase!
      .from('subscriptions')
      .insert(subscription)
      .select()
      .single();

    if (error) throw error;

    // Update store tier
    await supabase!
      .from('stores')
      .update({ tier: plan.tier })
      .eq('id', storeId);

    return data as StoreSubscription;
  } catch (err) {
    console.error('Error creating trial subscription:', err);
    return null;
  }
};

/**
 * Get subscription for a store
 */
export const getStoreSubscription = async (storeId: string): Promise<StoreSubscription | null> => {
  if (!isSupabaseEnabled) return null;

  try {
    const { data, error } = await supabase!
      .from('subscriptions')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;
    return data as StoreSubscription;
  } catch {
    return null;
  }
};

/**
 * Get the effective tier for a store based on their subscription status
 * This is the SINGLE SOURCE OF TRUTH for determining what tier a store belongs to
 * 
 * Returns:
 * - 'TRIAL': Store is in free 7-day trial (no tier yet, full feature access)
 * - 'BASIC': Store has active BASIC subscription
 * - 'PREMIUM': Store has active PREMIUM subscription  
 * - 'EXPIRED': Subscription expired
 * - 'NONE': No subscription at all
 */
export const getEffectiveTier = async (storeId: string): Promise<{
  tier: 'TRIAL' | 'BASIC' | 'PREMIUM' | 'EXPIRED' | 'NONE';
  isTrialActive: boolean;
  trialDaysLeft: number;
  subscriptionStatus: SubscriptionStatus | null;
  subscription: StoreSubscription | null;
  hasFullAccess: boolean; // Trial & Premium get full access
  canAccessPremiumFeatures: boolean;
}> => {
  // First, check subscription table for active subscription
  const subscription = await getStoreSubscription(storeId);

  // If there's a subscription, check if it's still active
  if (subscription) {
    const now = new Date();
    const expiresAt = new Date(subscription.expires_at);
    
    // Check status field and expiration
    if (subscription.status !== 'active' || now > expiresAt) {
      return {
        tier: 'EXPIRED',
        isTrialActive: false,
        trialDaysLeft: 0,
        subscriptionStatus: subscription.status as SubscriptionStatus,
        subscription,
        hasFullAccess: false,
        canAccessPremiumFeatures: false,
      };
    }

    // If it's a trial, return TRIAL tier
    if (subscription.is_trial) {
      const daysLeft = calculateDaysRemaining(subscription.expires_at);
      return {
        tier: 'TRIAL',
        isTrialActive: true,
        trialDaysLeft: daysLeft,
        subscriptionStatus: 'TRIAL',
        subscription,
        hasFullAccess: true,
        canAccessPremiumFeatures: true,
      };
    }

    // Map plan_name to tier
    // Note: free_trial should NOT be mapped here - is_trial flag handles it above
    const tierMap: { [key: string]: 'BASIC' | 'PREMIUM' } = {
      'basic': 'BASIC',
      'premium': 'PREMIUM',
    };
    const planTier = tierMap[subscription.plan_name.toLowerCase()] || 'BASIC';

    return {
      tier: planTier,
      isTrialActive: false,
      trialDaysLeft: 0,
      subscriptionStatus: 'ACTIVE',
      subscription,
      hasFullAccess: planTier === 'PREMIUM',
      canAccessPremiumFeatures: planTier === 'PREMIUM',
    };
  }

  // Check if SuperAdmin manually set a tier on the store (manual override)
  if (isSupabaseEnabled && supabase) {
    try {
      const { data: store } = await supabase
        .from('stores')
        .select('tier')
        .eq('id', storeId)
        .single();
      
      if (store && store.tier && (store.tier === 'BASIC' || store.tier === 'PREMIUM')) {
        return {
          tier: store.tier,
          isTrialActive: false,
          trialDaysLeft: 0,
          subscriptionStatus: 'ACTIVE',
          subscription: null,
          hasFullAccess: true, // Manual tier grants full access
          canAccessPremiumFeatures: store.tier === 'PREMIUM',
        };
      }
    } catch (err) {
      console.error('Error checking store tier:', err);
    }
  }
  
  // No subscription at all
  return {
    tier: 'NONE',
    isTrialActive: false,
    trialDaysLeft: 0,
    subscriptionStatus: null,
    subscription: null,
    hasFullAccess: false,
    canAccessPremiumFeatures: false,
  };
};

/**
 * Check and update subscription status
 */
export const checkSubscriptionStatus = async (storeId: string): Promise<SubscriptionStatus> => {
  const subscription = await getStoreSubscription(storeId);
  if (!subscription) return 'EXPIRED';

  const now = new Date();
  const expiresAt = new Date(subscription.expires_at);

  // Check subscription status - if expired or cancelled, return EXPIRED
  if (subscription.status === 'expired' || subscription.status === 'cancelled' || now > expiresAt) {
    return 'EXPIRED';
  }

  // Active but check if in trial
  if (subscription.status === 'active') {
    if (subscription.is_trial) {
      return 'TRIAL';
    }
    return 'ACTIVE';
  }

  // Default to expired if unknown status
  return 'EXPIRED';
};

/**
 * Update subscription status
 */
export const updateSubscriptionStatus = async (
  subscriptionId: string,
  status: SubscriptionStatus
): Promise<boolean> => {
  if (!isSupabaseEnabled) return false;

  try {
    const { error } = await supabase!
      .from('subscriptions')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', subscriptionId);

    return !error;
  } catch {
    return false;
  }
};

/**
 * Activate subscription after payment
 */
export const activateSubscription = async (
  subscriptionId: string,
  planName: string,
  billingCycle: string = 'monthly'
): Promise<boolean> => {
  if (!isSupabaseEnabled) return false;

  const now = new Date();
  let expiresAt: Date;

  // Calculate expiration based on billing cycle
  switch (billingCycle.toUpperCase()) {
    case 'MONTHLY':
      expiresAt = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      break;
    case 'QUARTERLY':
      expiresAt = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
      break;
    case 'YEARLY':
      expiresAt = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      break;
    default:
      expiresAt = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }

  try {
    const { error } = await supabase!
      .from('subscriptions')
      .update({
        status: 'active',
        is_trial: false,
        plan_name: planName,
        expires_at: expiresAt.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', subscriptionId);

    return !error;
  } catch {
    return false;
  }
};

/**
 * Set tier for a store via admin - creates/updates subscription as PAID
 * This records the payment as admin-manual and counts toward revenue
 */
export const undoAdminTierUpgrade = async (storeId: string): Promise<{ success: boolean; message: string }> => {
  if (!isSupabaseEnabled) return { success: false, message: 'Supabase not enabled' };

  try {
    // Get the subscription to check if it was originally a trial
    const { data: subscription, error: subError } = await supabase!
      .from('subscriptions')
      .select('*')
      .eq('store_id', storeId)
      .single();

    if (subError || !subscription) {
      return { success: false, message: 'Subscription not found' };
    }

    const wasTrialBefore = subscription.is_trial;

    // Delete the admin manual payment record
    const { error: paymentError } = await supabase!
      .from('payment_history')
      .delete()
      .eq('store_id', storeId)
      .eq('payment_method', 'ADMIN_MANUAL')
      .order('created_at', { ascending: false })
      .limit(1);

    if (paymentError) {
      console.error('Error deleting payment:', paymentError);
    }

    // Restore subscription to original state
    let subscriptionUpdate: any = {
      updated_at: new Date().toISOString(),
    };

    if (wasTrialBefore) {
      // Restore to trial state
      const now = new Date();
      const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      subscriptionUpdate = {
        ...subscriptionUpdate,
        status: 'active',
        is_trial: true,
        plan_name: 'free_trial',
        expires_at: trialEnd.toISOString(),
        payment_method: null,
        payment_ref: null,
        last_payment_date: null,
      };
    } else {
      // Just cancel it
      subscriptionUpdate.status = 'cancelled';
    }

    const { error: updateError } = await supabase!
      .from('subscriptions')
      .update(subscriptionUpdate)
      .eq('id', subscription.id);

    if (updateError) {
      return { success: false, message: 'Failed to restore subscription' };
    }

    // Revert store tier to BASIC
    const { error: storeError } = await supabase!
      .from('stores')
      .update({
        tier: 'BASIC',
        updated_at: new Date().toISOString(),
      })
      .eq('id', storeId);

    if (storeError) {
      console.error('Error reverting store tier:', storeError);
      return { success: false, message: 'Failed to revert store tier' };
    }

    const message = wasTrialBefore 
      ? 'Tier upgrade undone - restored to free trial'
      : 'Tier upgrade undone - subscription cancelled';

    return { success: true, message };
  } catch (err) {
    console.error('Error in undoAdminTierUpgrade:', err);
    return { success: false, message: 'Error undoing tier upgrade' };
  }
};

export const setStoreTierAdmin = async (
  storeId: string,
  tier: 'BASIC' | 'PREMIUM',
  durationMonths: number = 12
): Promise<{ success: boolean; subscription?: StoreSubscription }> => {
  if (!isSupabaseEnabled) return { success: false };

  try {
    const now = new Date();
    const expiresAt = new Date(now.getFullYear(), now.getMonth() + durationMonths, now.getDate());

    // Map tier to plan_name and price
    const planMap: { [key: string]: { name: string; price: number } } = {
      'BASIC': { name: 'basic', price: 0 }, // Basic is free
      'PREMIUM': { name: 'premium', price: 2999 }, // Premium is 2999 KES
    };
    const planConfig = planMap[tier] || planMap['BASIC'];
    const planName = planConfig.name;
    const amount = planConfig.price;

    // Check if subscription already exists
    const { data: existingSub } = await supabase!
      .from('subscriptions')
      .select('*')
      .eq('store_id', storeId)
      .single();

    if (existingSub) {
      // Update existing subscription
      const { data, error } = await supabase!
        .from('subscriptions')
        .update({
          status: 'active',
          is_trial: false,
          plan_name: planName,
          expires_at: expiresAt.toISOString(),
          payment_method: 'ADMIN_MANUAL',
          payment_ref: `admin-tier-${tier}-${now.getTime()}`,
          last_payment_date: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', existingSub.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating subscription:', error);
        return { success: false };
      }

      // Record payment in payment_history
      if (amount > 0) {
        const { error: paymentError } = await supabase!
          .from('payment_history')
          .insert({
            store_id: storeId,
            amount: amount,
            currency: 'KES',
            payment_method: 'ADMIN_MANUAL',
            status: 'COMPLETED',
            plan_id: tier,
            notes: `Admin manual tier upgrade to ${tier} for ${durationMonths} months`,
          });

        if (paymentError) {
          console.error('Error recording admin payment:', paymentError);
          // Don't fail the subscription update if payment record fails
        }
      }

      return { success: true, subscription: data as StoreSubscription };
    } else {
      // Create new subscription
      const { data, error } = await supabase!
        .from('subscriptions')
        .insert({
          store_id: storeId,
          status: 'active',
          is_trial: false,
          plan_name: planName,
          expires_at: expiresAt.toISOString(),
          payment_method: 'ADMIN_MANUAL',
          payment_ref: `admin-tier-${tier}-${now.getTime()}`,
          last_payment_date: now.toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating subscription:', error);
        return { success: false };
      }

      // Record payment in payment_history
      if (amount > 0) {
        const { error: paymentError } = await supabase!
          .from('payment_history')
          .insert({
            store_id: storeId,
            amount: amount,
            currency: 'KES',
            payment_method: 'ADMIN_MANUAL',
            status: 'COMPLETED',
            plan_id: tier,
            notes: `Admin manual tier upgrade to ${tier} for ${durationMonths} months`,
          });

        if (paymentError) {
          console.error('Error recording admin payment:', paymentError);
          // Don't fail the subscription creation if payment record fails
        }
      }

      return { success: true, subscription: data as StoreSubscription };
    }
  } catch (err) {
    console.error('Error in setStoreTierAdmin:', err);
    return { success: false };
  }
};

// ============================================================================
// SMS REMINDERS (Africa's Talking API)
// ============================================================================

const SMS_CONFIG = {
  apiKey: import.meta.env.VITE_AT_API_KEY || '',
  username: import.meta.env.VITE_AT_USERNAME || 'sandbox',
  senderId: import.meta.env.VITE_AT_SENDER_ID || 'DUKABOOK',
};

/**
 * Send SMS via Africa's Talking
 */
export const sendSMS = async (phoneNumber: string, message: string): Promise<boolean> => {
  if (!SMS_CONFIG.apiKey) {
    console.log('SMS (simulated):', phoneNumber, message);
    return true; // Simulate success in dev
  }

  try {
    const response = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'apiKey': SMS_CONFIG.apiKey,
      },
      body: new URLSearchParams({
        username: SMS_CONFIG.username,
        to: `+${phoneNumber}`,
        message: message,
        from: SMS_CONFIG.senderId,
      }),
    });

    const data = await response.json();
    return data.SMSMessageData?.Recipients?.[0]?.status === 'Success';
  } catch (err) {
    console.error('SMS send error:', err);
    return false;
  }
};

/**
 * Send payment reminder SMS
 */
export const sendPaymentReminder = async (
  store: StoreProfile,
  subscription: StoreSubscription,
  reminderType: PaymentReminder['reminder_type']
): Promise<boolean> => {
  const phone = store.phone || store.email; // Fallback
  if (!phone) return false;

  const daysLeft = calculateDaysRemaining(subscription.expires_at);

  let message = '';
  let amount = 0; // Could fetch from plan_name mapping if needed

  switch (reminderType) {
    case 'TRIAL_ENDING':
      message = `Hi ${store.name}! Your DukaBook FREE trial ends in ${daysLeft} days. Upgrade to Premium for just KES ${amount}/month to keep all features. Pay via M-Pesa to 174379. Reply UPGRADE for help.`;
      break;
    case 'PAYMENT_DUE':
      message = `Reminder: Your DukaBook subscription is due in ${daysLeft} days. Pay via M-Pesa to 174379 Acc: ${store.access_code}. Keep your business running smoothly!`;
      break;
    case 'OVERDUE':
      message = `URGENT: Your DukaBook subscription is overdue! Please pay now to avoid service interruption. M-Pesa: 174379 Acc: ${store.access_code}.`;
      break;
    case 'FINAL_WARNING':
      message = `FINAL WARNING: DukaBook will be suspended if payment is not received. M-Pesa: 174379 Acc: ${store.access_code}. Pay now to continue!`;
      break;
    case 'SUSPENDED':
      message = `Your DukaBook account has been suspended due to non-payment. Pay via M-Pesa 174379 Acc: ${store.access_code} to reactivate immediately.`;
      break;
  }

  const sent = await sendSMS(phone, message);

  // Log the reminder
  if (isSupabaseEnabled) {
    await supabase!.from('payment_reminders').insert({
      store_id: store.id,
      subscription_id: subscription.id,
      reminder_type: reminderType,
      days_before_due: daysLeft > 0 ? daysLeft : undefined,
      days_overdue: daysLeft < 0 ? Math.abs(daysLeft) : undefined,
      sent_at: sent ? new Date().toISOString() : null,
      sms_sent: sent,
      email_sent: false,
      phone_number: phone,
      message,
    });
  }

  return sent;
};

// ============================================================================
// BILLING DASHBOARD & ANALYTICS
// ============================================================================

/**
 * Get billing dashboard statistics
 */
export const getBillingDashboardStats = async (): Promise<BillingDashboardStats | null> => {
  if (!isSupabaseEnabled) return null;

  try {
    // Get all subscriptions
    const { data: subscriptions } = await supabase!
      .from('subscriptions')
      .select('*, stores(*)');

    // Get all payments
    const { data: payments } = await supabase!
      .from('subscription_payments')
      .select('*')
      .eq('status', 'COMPLETED');

    const subs = (subscriptions || []) as (StoreSubscription & { stores: StoreProfile })[];
    const paidPayments = (payments || []) as SubscriptionPayment[];

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Calculate stats
    const totalRevenue = paidPayments.reduce((sum, p) => sum + p.amount, 0);
    const monthlyPayments = paidPayments.filter(p => new Date(p.paid_at!) >= monthStart);
    const monthlyRecurring = monthlyPayments.reduce((sum, p) => sum + p.amount, 0);

    const activeSubs = subs.filter(s => s.status === 'active');
    const trialSubs = subs.filter(s => s.is_trial && s.status === 'active');
    const expiredSubs = subs.filter(s => s.status === 'expired' || s.status === 'cancelled');

    const expiringSoon = subs.filter(s => {
      const expiresAt = new Date(s.expires_at);
      return s.status === 'active' && expiresAt <= sevenDaysFromNow && expiresAt > now;
    });

    const recentlyExpired = subs.filter(s => {
      const expiresAt = new Date(s.expires_at);
      return expiresAt >= sevenDaysAgo && expiresAt < now;
    });

    // Pending payments
    const { data: pendingPayments } = await supabase!
      .from('subscription_payments')
      .select('*')
      .eq('status', 'PENDING');

    const pending = pendingPayments || [];
    const pendingAmount = pending.reduce((sum, p) => sum + p.amount, 0);

    // Calculate churn rate (expired in last 30 days / total at start of period)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const expiredLast30Days = subs.filter(s => 
      s.status === 'expired' && s.updated_at && new Date(s.updated_at) >= thirtyDaysAgo
    ).length;
    const churnRate = subs.length > 0 ? (expiredLast30Days / subs.length) * 100 : 0;

    // Trial to paid conversion
    const convertedTrials = subs.filter(s => 
      !s.is_trial && s.created_at && new Date(s.created_at) >= thirtyDaysAgo
    ).length;
    const totalTrials = trialSubs.length + convertedTrials;
    const conversionRate = totalTrials > 0 ? (convertedTrials / totalTrials) * 100 : 0;

    return {
      total_revenue: totalRevenue,
      monthly_recurring_revenue: monthlyRecurring,
      active_subscriptions: activeSubs.length,
      trial_subscriptions: trialSubs.length,
      expired_subscriptions: expiredSubs.length,
      pending_payments: pending.length,
      overdue_payments: subs.filter(s => s.status === 'expired').length,
      churn_rate: Math.round(churnRate * 10) / 10,
      conversion_rate: Math.round(conversionRate * 10) / 10,
      avg_revenue_per_store: activeSubs.length > 0 ? totalRevenue / activeSubs.length : 0,
      expiring_soon: expiringSoon,
      recently_expired: recentlyExpired,
      pending_amount: pendingAmount,
    };
  } catch (err) {
    console.error('Error getting billing stats:', err);
    return null;
  }
};

/**
 * Get all subscriptions with store info
 */
export const getAllSubscriptions = async (): Promise<(StoreSubscription & { store: StoreProfile })[]> => {
  if (!isSupabaseEnabled) return [];

  try {
    const { data } = await supabase!
      .from('subscriptions')
      .select('*, stores(*)')
      .order('created_at', { ascending: false });

    return (data || []).map((s: any) => ({
      ...s,
      store: s.stores,
    }));
  } catch {
    return [];
  }
};

/**
 * Get payment history for a store
 */
export const getPaymentHistory = async (storeId: string): Promise<SubscriptionPayment[]> => {
  if (!isSupabaseEnabled) return [];

  try {
    const { data } = await supabase!
      .from('subscription_payments')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    return (data || []) as SubscriptionPayment[];
  } catch {
    return [];
  }
};

/**
 * Process expired subscriptions and send reminders
 * Should be run as a cron job daily
 */
export const processSubscriptionReminders = async (): Promise<{
  reminded: number;
  suspended: number;
}> => {
  if (!isSupabaseEnabled) return { reminded: 0, suspended: 0 };

  let reminded = 0;
  let suspended = 0;

  try {
    const { data: subscriptions } = await supabase!
      .from('subscriptions')
      .select('*, stores(*)')
      .eq('status', 'active');

    const now = new Date();

    for (const sub of subscriptions || []) {
      const store = sub.stores as StoreProfile;
      const daysLeft = calculateDaysRemaining(sub.expires_at);

      // Trial ending in 3 days
      if (sub.is_trial && daysLeft === 3) {
        await sendPaymentReminder(store, sub, 'TRIAL_ENDING');
        reminded++;
      }
      // Payment due in 7 days
      else if (!sub.is_trial && daysLeft === 7) {
        await sendPaymentReminder(store, sub, 'PAYMENT_DUE');
        reminded++;
      }
      // Payment due in 3 days
      else if (!sub.is_trial && daysLeft === 3) {
        await sendPaymentReminder(store, sub, 'PAYMENT_DUE');
        reminded++;
      }
      // Overdue (in grace period)
      else if (daysLeft < 0 && daysLeft >= -GRACE_PERIOD_DAYS) {
        if (daysLeft === -1) {
          await sendPaymentReminder(store, sub, 'OVERDUE');
          reminded++;
        } else if (daysLeft === -(GRACE_PERIOD_DAYS - 1)) {
          await sendPaymentReminder(store, sub, 'FINAL_WARNING');
          reminded++;
        }
      }
      // Past grace period - expire
      else if (daysLeft < -GRACE_PERIOD_DAYS && sub.status !== 'expired') {
        await updateSubscriptionStatus(sub.id, 'expired');
        
        // Also update store to suspended
        await supabase!
          .from('stores')
          .update({ is_suspended: true, suspension_reason: 'Subscription expired' })
          .eq('id', store.id);
        
        suspended++;
      }
    }
  } catch (err) {
    console.error('Error processing reminders:', err);
  }

  return { reminded, suspended };
};

// ============================================================================
// SUBSCRIPTION PLANS MANAGEMENT
// ============================================================================

/**
 * Get all subscription plans (async version for components)
 */
export const getSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  return getCurrentPlans();
};

/**
 * Update a subscription plan
 */
export const updateSubscriptionPlan = async (plan: SubscriptionPlan): Promise<boolean> => {
  try {
    // Get current plans
    const currentPlans = await getSubscriptionPlans();
    
    // Find and update the plan
    const updatedPlans = currentPlans.map(p => p.id === plan.id ? plan : p);
    
    // Save to localStorage (in production, save to Supabase)
    localStorage.setItem('dukabook_subscription_plans', JSON.stringify(updatedPlans));
    
    // If Supabase is available, also save there
    if (supabase) {
      // Upsert the plan to database
      const { error } = await supabase
        .from('subscription_plans')
        .upsert({
          id: plan.id,
          name: plan.name,
          tier: plan.tier,
          billing_cycle: plan.billing_cycle,
          price_kes: plan.price_kes,
          features: plan.features,
          max_staff: plan.max_staff,
          max_products: plan.max_products,
          is_popular: plan.is_popular || false,
          description: plan.description || '',
          updated_at: new Date().toISOString(),
        });
      
      if (error) {
        console.error('Error saving plan to Supabase:', error);
      }
    }
    
    return true;
  } catch (err) {
    console.error('Error updating subscription plan:', err);
    return false;
  }
};

// ============================================================================
// PAYMENT CONFIGURATION
// ============================================================================

const DEFAULT_PAYMENT_CONFIG: PaymentConfig = {
  id: 'default',
  mpesa_paybill: '247247',
  mpesa_till: '123456',
  mpesa_consumer_key: '',
  mpesa_consumer_secret: '',
  mpesa_passkey: '',
  callback_url: 'https://api.dukabook.co.ke/mpesa/callback',
  stk_enabled: true,
  paybill_enabled: true,
  till_enabled: true,
  sms_api_key: '',
  sms_username: 'sandbox',
  sms_sender_id: 'DUKABOOK',
  sms_enabled: true,
  trial_reminder_days: 3,
  payment_reminder_days: 7,
  grace_period_days: 3,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * Get payment configuration
 */
export const getPaymentConfig = async (): Promise<PaymentConfig> => {
  // Try localStorage first
  const savedConfig = localStorage.getItem('dukabook_payment_config');
  if (savedConfig) {
    try {
      return JSON.parse(savedConfig);
    } catch {
      // Fall back to default
    }
  }
  
  // Try Supabase if available
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('payment_config')
        .select('*')
        .single();
      
      if (!error && data) {
        return data as PaymentConfig;
      }
    } catch {
      // Fall back to default
    }
  }
  
  return DEFAULT_PAYMENT_CONFIG;
};

/**
 * Update payment configuration
 */
export const updatePaymentConfig = async (config: PaymentConfig): Promise<boolean> => {
  try {
    config.updated_at = new Date().toISOString();
    
    // Save to localStorage
    localStorage.setItem('dukabook_payment_config', JSON.stringify(config));
    
    // If Supabase is available, also save there
    if (supabase) {
      const { error } = await supabase
        .from('payment_config')
        .upsert(config);
      
      if (error) {
        console.error('Error saving config to Supabase:', error);
      }
    }
    
    return true;
  } catch (err) {
    console.error('Error updating payment config:', err);
    return false;
  }
};

// ============================================================================
// MARKETING CONFIGURATION (SuperAdmin Controlled)
// ============================================================================

const DEFAULT_MARKETING_CONFIG: MarketingConfig = {
  id: 'default',
  trial_discount_percent: 20,
  trial_discount_enabled: true,
  trial_ending_message: 'Your trial ends in {days} days. Upgrade now to keep all features!',
  trial_urgency_message: '⏰ Only {days} days left in your trial!',
  trial_ending_banner: '🎯 Lock in your special rate before your trial expires!',
  upgrade_cta_text: 'Upgrade to Premium',
  discount_cta_text: 'Claim {percent}% Discount',
  
  // FOMO & Urgency
  fomo_message: '🔥 Limited time: Get Premium at 20% off this week only!',
  upgrade_benefits_headline: 'Unlock Your Full Business Potential',
  missing_out_message: 'Basic users miss out on profit tracking, debt management, and GPS location features that grow your business 3x faster.',
  
  // CTA Texts
  cta_button_text: 'Upgrade Now',
  cta_secondary_text: 'View Premium Features',
  cta_dismiss_text: 'Maybe Later',
  
  show_social_proof: true,
  businesses_count: 2500,
  weekly_upgrades_count: 20,
  avg_savings_amount: 15000,
  annual_savings_months: 2,
  
  // Simple feature benefits list
  feature_benefits_list: [
    '📊 Real-time profit tracking',
    '📍 GPS sales location map',
    '💳 Debt management (Madeni)',
    '👥 Unlimited staff accounts',
    '📈 Advanced analytics & reports',
    '🛡️ Priority customer support',
  ],
  
  feature_benefits: [
    { feature_id: 'profit', benefit_text: 'Save up to KES 15,000/month', hook_text: 'See exactly where your money goes' },
    { feature_id: 'gps', benefit_text: 'Find your best-selling locations', hook_text: 'Track where your best customers are' },
    { feature_id: 'madeni', benefit_text: 'Recover up to 40% more debts', hook_text: 'Never forget who owes you' },
    { feature_id: 'reports', benefit_text: 'Make smarter business decisions', hook_text: 'Know your business inside out' },
  ],
  testimonials: [
    {
      name: 'Jane M.',
      business: 'Cosmetics Shop',
      location: 'Nairobi',
      quote: 'Premium profit tracking helped me find where I was losing money. Now I save KES 20,000/month!',
      avatar: '👩🏾‍💼',
      rating: 5,
    },
    {
      name: 'Peter K.',
      business: 'Hardware Store',
      location: 'Mombasa',
      quote: 'The Madeni feature recovered KES 45,000 in forgotten debts. Paid for itself 10x!',
      avatar: '👨🏾‍🔧',
      rating: 5,
    },
    {
      name: 'Grace W.',
      business: 'Boutique',
      location: 'Kisumu',
      quote: 'GPS tracking showed me my best customers come from the market area. I moved there and doubled sales!',
      avatar: '👩🏾‍🦱',
      rating: 5,
    },
  ],
  success_stories: [
    { name: 'Jane M.', business: 'Cosmetics Shop, Nairobi', quote: 'Premium saved me KES 20,000/month!' },
    { name: 'Peter K.', business: 'Hardware Store, Mombasa', quote: 'Madeni recovered KES 45,000 in forgotten debts!' },
    { name: 'Grace W.', business: 'Boutique, Kisumu', quote: 'GPS tracking helped me double my sales!' },
  ],
  show_success_story_after_minutes: 2,
  show_floating_badge: true,
  show_trial_banner: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * Get marketing configuration
 */
export const getMarketingConfig = async (): Promise<MarketingConfig> => {
  const savedConfig = localStorage.getItem('dukabook_marketing_config');
  if (savedConfig) {
    try {
      return JSON.parse(savedConfig);
    } catch {
      // Fall back to default
    }
  }
  
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('marketing_config')
        .select('*')
        .single();
      
      if (!error && data) {
        return data as MarketingConfig;
      }
    } catch {
      // Fall back to default
    }
  }
  
  return DEFAULT_MARKETING_CONFIG;
};

/**
 * Update marketing configuration
 */
export const updateMarketingConfig = async (config: MarketingConfig): Promise<boolean> => {
  try {
    config.updated_at = new Date().toISOString();
    
    localStorage.setItem('dukabook_marketing_config', JSON.stringify(config));
    
    if (supabase) {
      const { error } = await supabase
        .from('marketing_config')
        .upsert(config);
      
      if (error) {
        console.error('Error saving marketing config to Supabase:', error);
      }
    }
    
    return true;
  } catch (err) {
    console.error('Error updating marketing config:', err);
    return false;
  }
};

export default {
  SUBSCRIPTION_PLANS,
  TRIAL_DURATION_DAYS,
  GRACE_PERIOD_DAYS,
  createTrialSubscription,
  getStoreSubscription,
  checkSubscriptionStatus,
  activateSubscription,
  setStoreTierAdmin,
  undoAdminTierUpgrade,
  sendPaymentReminder,
  getBillingDashboardStats,
  getAllSubscriptions,
  getPaymentHistory,
  processSubscriptionReminders,
  getSubscriptionPlans,
  updateSubscriptionPlan,
  getPaymentConfig,
  updatePaymentConfig,
  getMarketingConfig,
  updateMarketingConfig,
};
