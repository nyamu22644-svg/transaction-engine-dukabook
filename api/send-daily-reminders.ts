/**
 * Vercel Cron Function: Daily Subscription Reminder
 * Runs every day at 8 AM UTC
 * Checks for due/expiring subscriptions and sends push notifications
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
      },
      data: {
        type: payload.type,
        storeId: payload.storeId,
        link: payload.link || '/',
      },
      token: token,
    };

    const response = await messaging.send(message as any);
    console.log(`✅ Notification sent to token: ${token.substring(0, 20)}...`);
    return response;
  } catch (error) {
    console.error('❌ FCM send error:', error);
    throw error;
  }
};

// Main cron handler
export default async (req: VercelRequest, res: VercelResponse) => {
  // Verify cron secret
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🔔 Starting daily reminder check...');

    const now = new Date();
    const results = {
      checked: 0,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Get all active subscriptions with FCM tokens
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select(`
        id,
        store_id,
        expires_at,
        is_trial,
        status,
        stores (
          id,
          name,
          email,
          fcm_token
        )
      `)
      .eq('status', 'active');

    if (subError) {
      console.error('❌ Error fetching subscriptions:', subError);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('📭 No active subscriptions found');
      return res.status(200).json({ message: 'No subscriptions to remind', ...results });
    }

    console.log(`📊 Found ${subscriptions.length} active subscriptions`);

    // Process each subscription
    for (const sub of subscriptions) {
      results.checked++;

      const store = sub.stores as any;
      if (!store?.fcm_token) {
        console.log(`⏭️  Store ${sub.store_id} has no FCM token`);
        continue;
      }

      const expiresAt = new Date(sub.expires_at);
      const daysLeft = Math.floor(
        (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      let shouldNotify = false;
      let reminderType = '';
      let title = '';
      let body = '';

      // Trial ending in 3 days
      if (sub.is_trial && daysLeft === 3) {
        shouldNotify = true;
        reminderType = 'TRIAL_ENDING';
        title = '⏰ Trial Ending Soon';
        body = `Your DukaBook trial ends in 3 days. Upgrade now to keep all features!`;
      }
      // Payment due in 7 days
      else if (!sub.is_trial && daysLeft === 7) {
        shouldNotify = true;
        reminderType = 'PAYMENT_DUE';
        title = '💰 Payment Due Soon';
        body = `Your subscription is due in 7 days. Renew now to avoid interruption.`;
      }
      // Payment due in 3 days
      else if (!sub.is_trial && daysLeft === 3) {
        shouldNotify = true;
        reminderType = 'PAYMENT_DUE';
        title = '⚠️ Payment Due in 3 Days';
        body = `Renew your subscription now to keep your store running.`;
      }
      // Payment overdue
      else if (daysLeft < 0) {
        shouldNotify = true;
        reminderType = 'OVERDUE';
        title = '🚨 Payment Overdue';
        body = `Your subscription is overdue. Renew immediately to restore access.`;
      }

      if (shouldNotify) {
        try {
          await sendFCMNotification(store.fcm_token, {
            title,
            body,
            type: reminderType,
            storeId: sub.store_id,
            link: `/?storeId=${sub.store_id}`,
          });

          // Record reminder in database
          await supabase.from('payment_reminders').insert({
            store_id: sub.store_id,
            reminder_type: reminderType,
            sent_at: new Date().toISOString(),
            status: 'sent',
          });

          results.sent++;
          console.log(`✅ Reminder sent to ${store.name} (${reminderType})`);
        } catch (error) {
          results.failed++;
          const errorMsg = error instanceof Error ? error.message : String(error);
          results.errors.push(`${sub.store_id}: ${errorMsg}`);
          console.error(`❌ Failed to send reminder for ${sub.store_id}:`, error);
        }
      }
    }

    console.log('✅ Daily reminder check completed');
    console.log(`📊 Results: Checked=${results.checked}, Sent=${results.sent}, Failed=${results.failed}`);

    return res.status(200).json({
      message: 'Daily reminder check completed',
      ...results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Cron job error:', error);
    return res.status(500).json({
      error: 'Cron job failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

// Configure as cron job
export const config = {
  maxDuration: 60,
};
