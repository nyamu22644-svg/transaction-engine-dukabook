/**
 * Vercel Cron Function: Afternoon Subscription Reminder
 * Runs daily at 3 PM UTC (6 PM Kenya time)
 * Sends second batch of reminders to stores that prefer afternoon notifications
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';

// Initialize Firebase Admin (server-side)
const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

let adminApp: admin.app.App | null = null;

const initializeFirebaseAdmin = () => {
  if (!adminApp && firebaseAdminConfig.projectId && firebaseAdminConfig.clientEmail) {
    try {
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(firebaseAdminConfig as any),
        projectId: firebaseAdminConfig.projectId,
      });
      console.log('✅ Firebase Admin initialized');
    } catch (error) {
      console.error('❌ Firebase Admin init error:', error);
    }
  }
  return adminApp;
};

// Initialize Supabase
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

// Send FCM message
const sendFCMNotification = async (token: string, payload: any) => {
  try {
    const app = initializeFirebaseAdmin();
    if (!app) throw new Error('Firebase not initialized');

    const messaging = admin.messaging(app);

    const message = {
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.icon || 'https://dukabook.com/logo.png',
      },
      data: {
        notificationType: payload.type,
        url: '/',
      },
      token: token,
    };

    const result = await messaging.send(message as any);
    console.log(`✅ FCM sent to ${token.substring(0, 20)}...: ${result}`);
    return result;
  } catch (error: any) {
    console.error(`❌ FCM send error: ${error.message}`);
    throw error;
  }
};

// Main handler
export default async (req: VercelRequest, res: VercelResponse) => {
  // Security check
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cronSecret = req.headers['authorization'];
  if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🕐 [AFTERNOON] Starting afternoon reminder cron job...');

    // Get reminder settings
    const { data: settings } = await supabase
      .from('reminder_settings')
      .select('*')
      .single();

    if (!settings) {
      console.log('⚠️ No reminder settings found, using defaults');
    }

    const afternoonHour = settings?.afternoon_cron_hour || 15; // 3 PM UTC
    const enableTrialReminders = settings?.enable_trial_reminders !== false;
    const enablePaymentReminders = settings?.enable_payment_reminders !== false;
    const enableOverdueReminders = settings?.enable_overdue_reminders !== false;
    const trialDaysBefore = settings?.trial_days_before || 3;
    const paymentDaysBefore7 = settings?.payment_days_before_7 || 7;
    const paymentDaysBefore3 = settings?.payment_days_before_3 || 3;

    console.log(`⚙️ Afternoon settings: hour=${afternoonHour}, trial=${enableTrialReminders}, payment=${enablePaymentReminders}`);

    // Get all active subscriptions with FCM tokens
    const { data: subscriptions, error: subError } = await supabase
      .from('store_subscriptions')
      .select(`
        id,
        store_id,
        expires_at,
        status,
        stores!inner(id, store_name, fcm_token, notifications_enabled)
      `)
      .eq('stores.notifications_enabled', true)
      .not('stores.fcm_token', 'is', null);

    if (subError) {
      console.error('❌ Error fetching subscriptions:', subError);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('ℹ️ No active subscriptions with FCM tokens found');
      return res.status(200).json({ 
        message: 'No subscriptions to remind',
        processed: 0,
        sent: 0
      });
    }

    console.log(`📊 Processing ${subscriptions.length} subscriptions for afternoon reminders`);

    let remindersCount = 0;
    const now = new Date();
    const failedTokens: string[] = [];

    // Process each subscription
    for (const sub of subscriptions) {
      const expiresAt = new Date(sub.expires_at);
      const daysUntilExpiry = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const storeId = sub.store_id;
      const storeName = sub.stores?.store_name || `Store ${storeId}`;
      const token = sub.stores?.fcm_token;

      if (!token) continue;

      try {
        // TRIAL ENDING REMINDER
        if (
          enableTrialReminders &&
          sub.status === 'TRIAL' &&
          daysUntilExpiry >= 0 &&
          daysUntilExpiry <= trialDaysBefore
        ) {
          const daysText = daysUntilExpiry === 0 ? 'today' : `in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}`;
          await sendFCMNotification(token, {
            title: '⏰ Trial Expiring Soon',
            body: `${storeName}'s trial ends ${daysText}. Upgrade now to keep your store active!`,
            type: 'trial_ending',
            icon: 'https://dukabook.com/icons/trial.png',
          });
          remindersCount++;
        }

        // PAYMENT DUE REMINDER (First threshold)
        if (
          enablePaymentReminders &&
          sub.status === 'ACTIVE' &&
          daysUntilExpiry >= 0 &&
          daysUntilExpiry <= paymentDaysBefore7
        ) {
          const daysText = daysUntilExpiry === 0 ? 'today' : `in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}`;
          await sendFCMNotification(token, {
            title: '💳 Payment Due Soon',
            body: `${storeName}'s subscription renews ${daysText}. Ensure payment is made.`,
            type: 'payment_due',
            icon: 'https://dukabook.com/icons/payment.png',
          });
          remindersCount++;
        }

        // PAYMENT DUE REMINDER (Second threshold)
        if (
          enablePaymentReminders &&
          sub.status === 'ACTIVE' &&
          daysUntilExpiry >= 0 &&
          daysUntilExpiry <= paymentDaysBefore3 &&
          daysUntilExpiry > 0 // Don't double-send on same day
        ) {
          const daysText = `in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}`;
          await sendFCMNotification(token, {
            title: '⚠️ Payment Due Very Soon',
            body: `${storeName}'s subscription renews ${daysText}. Pay now to avoid suspension!`,
            type: 'payment_due_urgent',
            icon: 'https://dukabook.com/icons/urgent.png',
          });
          remindersCount++;
        }

        // PAYMENT OVERDUE REMINDER
        if (
          enableOverdueReminders &&
          (sub.status === 'OVERDUE' || sub.status === 'SUSPENDED') &&
          daysUntilExpiry < 0
        ) {
          const daysOverdue = Math.abs(daysUntilExpiry);
          await sendFCMNotification(token, {
            title: '🚨 Payment Overdue',
            body: `${storeName} is overdue by ${daysOverdue} day${daysOverdue > 1 ? 's' : ''}. Your store may be suspended!`,
            type: 'overdue',
            icon: 'https://dukabook.com/icons/overdue.png',
          });
          remindersCount++;
        }
      } catch (error: any) {
        console.error(`❌ Failed to send reminder to ${storeName}:`, error.message);
        failedTokens.push(token);
      }
    }

    // Log results
    console.log(`✅ Afternoon reminder cron completed: ${remindersCount} reminders sent`);
    if (failedTokens.length > 0) {
      console.warn(`⚠️ Failed tokens: ${failedTokens.length}`);
    }

    return res.status(200).json({
      message: 'Afternoon reminders sent successfully',
      processed: subscriptions.length,
      sent: remindersCount,
      failed: failedTokens.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Cron job error:', error);
    return res.status(500).json({
      error: 'Cron job failed',
      message: error.message,
    });
  }
};
