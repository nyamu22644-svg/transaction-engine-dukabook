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
    const plans = getCurrentPlans();
    const plan = plans.find(p => p.id === subscription.plan_id);
    const planTier = plan?.tier || 'BASIC';

    // Check trial
    if (subscription.is_trial && subscription.trial_end) {
      const trialEnd = new Date(subscription.trial_end);
      const trialDaysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      
      if (now < trialEnd) {
        return {
          tier: 'TRIAL',
          isTrialActive: true,
          trialDaysLeft,
          hasFullAccess: true,
          canAccessPremiumFeatures: true,
        };
      }
    }

    // Check if active
    const periodEnd = new Date(subscription.current_period_end);
    if (now > periodEnd) {
      return {
        tier: 'EXPIRED',
        isTrialActive: false,
        trialDaysLeft: 0,
        hasFullAccess: false,
        canAccessPremiumFeatures: false,
      };
    }

    return {
      tier: planTier,
      isTrialActive: false,
      trialDaysLeft: 0,
      hasFullAccess: planTier === 'PREMIUM',
      canAccessPremiumFeatures: planTier === 'PREMIUM',
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
  const trialEnd = new Date(now.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);

  const subscription: Omit<StoreSubscription, 'id' | 'created_at' | 'updated_at'> = {
    store_id: storeId,
    plan_id: planId,
    status: 'TRIAL',
    billing_cycle: plan.billing_cycle,
    current_period_start: now.toISOString(),
    current_period_end: trialEnd.toISOString(),
    trial_start: now.toISOString(),
    trial_end: trialEnd.toISOString(),
    is_trial: true,
    auto_renew: true,
    next_billing_date: trialEnd.toISOString(),
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
 * - 'EXPIRED': Subscription expired, in grace period
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
  // First, check subscription table for active trial — trials should take precedence
  const subscription = await getStoreSubscription(storeId);

  // If there's a trial subscription active, return TRIAL regardless of store.tier default
  if (subscription && subscription.is_trial && subscription.trial_end) {
    try {
      const now = new Date();
      const trialEnd = new Date(subscription.trial_end);
      if (now < trialEnd) {
        return {
          tier: 'TRIAL',
          isTrialActive: true,
          trialDaysLeft: Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))),
          subscriptionStatus: 'TRIAL',
          subscription,
          hasFullAccess: true,
          canAccessPremiumFeatures: true,
        };
      }
    } catch (e) {
      console.error('Error evaluating trial subscription:', e);
    }
  }

  // Next: Check if SuperAdmin manually set a tier on the store (manual override)
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
          subscriptionStatus: subscription ? 'ACTIVE' : null,
          subscription: subscription || null,
          hasFullAccess: true, // Manual tier grants full access
          canAccessPremiumFeatures: store.tier === 'PREMIUM',
        };
      }
    } catch (err) {
      console.error('Error checking store tier:', err);
    }
  }
  
  // No subscription at all
  if (!subscription) {
    return {
      tier: 'NONE',
      isTrialActive: false,
      trialDaysLeft: 0,
      subscriptionStatus: null,
      subscription: null,
      hasFullAccess: false,
      canAccessPremiumFeatures: false,
    };
  }

  const now = new Date();
  const plans = getCurrentPlans();
  const plan = plans.find(p => p.id === subscription.plan_id);
  const planTier = plan?.tier || 'BASIC';

  // Check if in trial
  if (subscription.is_trial && subscription.trial_end) {
    const trialEnd = new Date(subscription.trial_end);
    const trialDaysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    
    if (now < trialEnd) {
      return {
        tier: 'TRIAL',
        isTrialActive: true,
        trialDaysLeft,
        subscriptionStatus: 'TRIAL',
        subscription,
        hasFullAccess: true, // Trial users get full access to try everything
        canAccessPremiumFeatures: true,
      };
    }
  }

  // Check subscription status
  const periodEnd = new Date(subscription.current_period_end);
  
  if (subscription.status === 'SUSPENDED' || subscription.status === 'CANCELLED') {
    return {
      tier: 'EXPIRED',
      isTrialActive: false,
      trialDaysLeft: 0,
      subscriptionStatus: subscription.status,
      subscription,
      hasFullAccess: false,
      canAccessPremiumFeatures: false,
    };
  }

  if (now > periodEnd) {
    // Check grace period
    const graceEnd = subscription.grace_period_end ? new Date(subscription.grace_period_end) : null;
    if (!graceEnd || now > graceEnd) {
      return {
        tier: 'EXPIRED',
        isTrialActive: false,
        trialDaysLeft: 0,
        subscriptionStatus: 'EXPIRED',
        subscription,
        hasFullAccess: false,
        canAccessPremiumFeatures: false,
      };
    }
  }

  // Active subscription
  return {
    tier: planTier,
    isTrialActive: false,
    trialDaysLeft: 0,
    subscriptionStatus: subscription.status,
    subscription,
    hasFullAccess: planTier === 'PREMIUM',
    canAccessPremiumFeatures: planTier === 'PREMIUM',
  };
};

/**
 * Check and update subscription status
 */
export const checkSubscriptionStatus = async (storeId: string): Promise<SubscriptionStatus> => {
  const subscription = await getStoreSubscription(storeId);
  if (!subscription) return 'EXPIRED';

  const now = new Date();
  const periodEnd = new Date(subscription.current_period_end);
  const graceEnd = subscription.grace_period_end ? new Date(subscription.grace_period_end) : null;

  // Check if still in trial
  if (subscription.is_trial && subscription.trial_end) {
    const trialEnd = new Date(subscription.trial_end);
    if (now < trialEnd) return 'TRIAL';
  }

  // Check if active
  if (now < periodEnd) return 'ACTIVE';

  // Check grace period
  if (graceEnd && now < graceEnd) return 'EXPIRED'; // Still in grace, but technically expired

  // Past grace period - suspend
  if (subscription.status !== 'SUSPENDED') {
    await updateSubscriptionStatus(subscription.id, 'SUSPENDED');
  }

  return 'SUSPENDED';
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
  billingCycle: BillingCycle
): Promise<boolean> => {
  if (!isSupabaseEnabled) return false;

  const now = new Date();
  let periodEnd: Date;

  switch (billingCycle) {
    case 'MONTHLY':
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      break;
    case 'QUARTERLY':
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
      break;
    case 'YEARLY':
      periodEnd = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      break;
  }

  const graceEnd = new Date(periodEnd.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

  try {
    const { error } = await supabase!
      .from('subscriptions')
      .update({
        status: 'ACTIVE',
        is_trial: false,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        next_billing_date: periodEnd.toISOString(),
        grace_period_end: graceEnd.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', subscriptionId);

    return !error;
  } catch {
    return false;
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

  const plans = getCurrentPlans();
  const plan = plans.find(p => p.id === subscription.plan_id);
  const amount = plan?.price_kes || 0;
  const daysLeft = Math.ceil(
    (new Date(subscription.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  let message = '';

  switch (reminderType) {
    case 'TRIAL_ENDING':
      message = `Hi ${store.name}! Your DukaBook FREE trial ends in ${daysLeft} days. Upgrade to Premium for just KES ${amount}/month to keep all features. Pay via M-Pesa to 174379. Reply UPGRADE for help.`;
      break;
    case 'PAYMENT_DUE':
      message = `Reminder: Your DukaBook subscription (KES ${amount}) is due in ${daysLeft} days. Pay via M-Pesa to 174379 Acc: ${store.access_code}. Keep your business running smoothly!`;
      break;
    case 'OVERDUE':
      message = `URGENT: Your DukaBook subscription is overdue! Pay KES ${amount} now to avoid service interruption. M-Pesa: 174379 Acc: ${store.access_code}. Grace period: ${GRACE_PERIOD_DAYS} days.`;
      break;
    case 'FINAL_WARNING':
      message = `FINAL WARNING: DukaBook will be suspended tomorrow if payment of KES ${amount} is not received. M-Pesa: 174379 Acc: ${store.access_code}. Pay now to continue!`;
      break;
    case 'SUSPENDED':
      message = `Your DukaBook account has been suspended due to non-payment. Pay KES ${amount} via M-Pesa 174379 Acc: ${store.access_code} to reactivate immediately.`;
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

    const activeSubs = subs.filter(s => s.status === 'ACTIVE');
    const trialSubs = subs.filter(s => s.status === 'TRIAL');
    const expiredSubs = subs.filter(s => s.status === 'EXPIRED' || s.status === 'SUSPENDED');

    const expiringSoon = subs.filter(s => {
      const endDate = new Date(s.current_period_end);
      return s.status === 'ACTIVE' && endDate <= sevenDaysFromNow && endDate > now;
    });

    const recentlyExpired = subs.filter(s => {
      const endDate = new Date(s.current_period_end);
      return endDate >= sevenDaysAgo && endDate < now;
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
      s.status === 'EXPIRED' && s.updated_at && new Date(s.updated_at) >= thirtyDaysAgo
    ).length;
    const churnRate = subs.length > 0 ? (expiredLast30Days / subs.length) * 100 : 0;

    // Trial to paid conversion
    const convertedTrials = subs.filter(s => 
      !s.is_trial && s.trial_end && new Date(s.trial_end) >= thirtyDaysAgo
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
      overdue_payments: subs.filter(s => s.status === 'EXPIRED').length,
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
      .in('status', ['TRIAL', 'ACTIVE', 'EXPIRED']);

    const now = new Date();

    for (const sub of subscriptions || []) {
      const store = sub.stores as StoreProfile;
      const endDate = new Date(sub.current_period_end);
      const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

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
      // Past grace period - suspend
      else if (daysLeft < -GRACE_PERIOD_DAYS && sub.status !== 'SUSPENDED') {
        await updateSubscriptionStatus(sub.id, 'SUSPENDED');
        await sendPaymentReminder(store, sub, 'SUSPENDED');
        
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
