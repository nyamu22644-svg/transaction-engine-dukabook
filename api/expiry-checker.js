/**
 * api/expiry-checker.js
 * Serverless function that runs nightly to check for expiring batches and send notifications
 * Configure in vercel.json with cron: "0 2 * * *" (2 AM UTC daily)
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

module.exports = async (req, res) => {
  console.log('⏰ Expiry checker triggered at', new Date().toISOString());

  // Only allow GET requests (Vercel Cron triggers via GET)
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET for cron.' });
  }

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const SMS_API_KEY = process.env.SMS_API_KEY || '';
  const SMS_PROVIDER = process.env.SMS_PROVIDER || 'twilio';
  const EXPIRY_DAYS = parseInt(process.env.EXPIRY_ALERT_DAYS || '30');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ 
      error: 'Missing Supabase config: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY' 
    });
  }

  try {
    // Query batches expiring within EXPIRY_DAYS
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + EXPIRY_DAYS);
    const nowISO = new Date().toISOString();
    const thresholdISO = thresholdDate.toISOString();

    console.log(`Scanning for batches expiring between ${nowISO} and ${thresholdISO}`);

    // Call Supabase REST API to get expiring batches
    const batchesResponse = await fetch(`${SUPABASE_URL}/rest/v1/inventory_batches`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        select: '*',
        filter: `and(gte(expiry_date,${nowISO}),lte(expiry_date,${thresholdISO}))`,
      }),
    });

    if (!batchesResponse.ok) {
      console.error('Supabase batch query failed:', batchesResponse.status);
      return res.status(500).json({ error: 'Failed to query batches' });
    }

    const batches = await batchesResponse.json();
    console.log(`Found ${batches.length} expiring batches`);

    if (!batches || batches.length === 0) {
      return res.status(200).json({ ok: true, scanned: 0, notifications_sent: 0 });
    }

    // For each batch, check if notification was already sent
    let notificationsSent = 0;
    for (const batch of batches) {
      // Check if we already notified about this batch
      const notifResponse = await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
        },
      });

      if (notifResponse.ok) {
        const existing = await notifResponse.json();
        const alreadyNotified = existing.some(
          n => n.batch_id === batch.id && n.notification_type === 'expiry_warning'
        );

        if (alreadyNotified) {
          console.log(`⏭️ Batch ${batch.id} already notified, skipping`);
          continue;
        }
      }

      // Get store owner info for SMS
      const storeResponse = await fetch(`${SUPABASE_URL}/rest/v1/stores?id=eq.${batch.store_id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
        },
      });

      const stores = storeResponse.ok ? await storeResponse.json() : [];
      const store = stores[0];

      // Get item name
      const itemResponse = await fetch(`${SUPABASE_URL}/rest/v1/inventory_items?id=eq.${batch.inventory_item_id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
        },
      });

      const items = itemResponse.ok ? await itemResponse.json() : [];
      const item = items[0];

      // Build message
      const daysLeft = Math.ceil((new Date(batch.expiry_date) - new Date()) / (1000*60*60*24));
      const message = `⚠️ EXPIRY ALERT: ${batch.current_stock} units of "${item?.item_name || 'unknown'}" (Batch: ${batch.batch_number || 'N/A'}) expire in ${daysLeft} days. Take action now!`;

      // Send SMS if enabled
      if (SMS_API_KEY && store?.phone) {
        await sendSMS(store.phone, message, SMS_PROVIDER, SMS_API_KEY);
      }

      // Record notification in DB
      await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          store_id: batch.store_id,
          batch_id: batch.id,
          inventory_item_id: batch.inventory_item_id,
          notification_type: 'expiry_warning',
          payload: { message, days_left: daysLeft, batch_number: batch.batch_number },
          sent: true,
          sent_at: new Date().toISOString(),
        }),
      });

      notificationsSent++;
      console.log(`✅ Notification sent for batch ${batch.id}`);
    }

    return res.status(200).json({ 
      ok: true, 
      scanned: batches.length, 
      notifications_sent: notificationsSent 
    });

  } catch (err) {
    console.error('Expiry checker error:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
};

/**
 * Send SMS via Twilio or Africa's Talking
 */
async function sendSMS(phoneNumber, message, provider, apiKey) {
  try {
    // Normalize phone number to +254 format for African numbers
    let formattedPhone = phoneNumber;
    if (provider === 'africas-talking' || provider === 'twilio') {
      if (!phoneNumber.startsWith('+')) {
        // Convert 0712... to +254712...
        if (phoneNumber.startsWith('0')) {
          formattedPhone = '+254' + phoneNumber.slice(1);
        } else if (!phoneNumber.startsWith('+254')) {
          formattedPhone = '+254' + phoneNumber;
        }
      }
    }

    if (provider === 'twilio') {
      // Twilio implementation
      const accountSid = process.env.TWILIO_ACCOUNT_SID || '';
      const authToken = process.env.TWILIO_AUTH_TOKEN || '';
      const fromPhone = process.env.TWILIO_PHONE || '';
      
      if (!accountSid || !authToken || !fromPhone) {
        console.warn('⚠️ Twilio credentials missing. SMS not sent.');
        return;
      }

      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: fromPhone,
          To: formattedPhone,
          Body: message,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Twilio SMS failed:', error);
      } else {
        console.log(`✅ SMS sent via Twilio to ${formattedPhone}`);
      }

    } else if (provider === 'africas-talking') {
      // Africa's Talking implementation
      const username = process.env.AT_USERNAME || 'sandbox';
      const apiKeyAT = process.env.AT_API_KEY || apiKey;
      
      if (!apiKeyAT) {
        console.warn('⚠️ Africa\'s Talking API key missing. SMS not sent.');
        return;
      }

      const response = await fetch('https://api.sandbox.africastalking.com/version1/messaging', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKeyAT}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: new URLSearchParams({
          username: username,
          to: formattedPhone,
          message: message,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Africa\'s Talking SMS failed:', error);
      } else {
        console.log(`✅ SMS sent via Africa's Talking to ${formattedPhone}`);
      }

    } else if (provider === 'whatsapp') {
      // WhatsApp via Twilio (requires Twilio WhatsApp Business account)
      const accountSid = process.env.TWILIO_ACCOUNT_SID || '';
      const authToken = process.env.TWILIO_AUTH_TOKEN || '';
      const fromWhatsApp = process.env.TWILIO_WHATSAPP_FROM || '';
      
      if (!accountSid || !authToken || !fromWhatsApp) {
        console.warn('⚠️ Twilio WhatsApp credentials missing.');
        return;
      }

      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: fromWhatsApp,
          To: `whatsapp:${formattedPhone}`,
          Body: message,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Twilio WhatsApp failed:', error);
      } else {
        console.log(`✅ WhatsApp message sent via Twilio to ${formattedPhone}`);
      }
    } else {
      console.log(`📱 [${provider.toUpperCase()}] SMS to ${formattedPhone}: ${message}`);
    }
  } catch (err) {
    console.error('SMS/WhatsApp send error:', err);
  }
}
