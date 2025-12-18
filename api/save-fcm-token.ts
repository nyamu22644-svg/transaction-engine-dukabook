/**
 * Vercel API: Save FCM Token
 * POST /api/save-fcm-token
 * Saves Firebase Cloud Messaging token to database
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

export default async (req: VercelRequest, res: VercelResponse) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token, storeId } = req.body;

    // Validate input
    if (!token || !storeId) {
      return res.status(400).json({ error: 'Missing token or storeId' });
    }

    if (typeof token !== 'string' || typeof storeId !== 'string') {
      return res.status(400).json({ error: 'Invalid token or storeId format' });
    }

    // Save FCM token to database
    const { data, error } = await supabase
      .from('stores')
      .update({
        fcm_token: token,
        notifications_enabled: true,
        fcm_token_updated_at: new Date().toISOString(),
      })
      .eq('id', storeId)
      .select();

    if (error) {
      console.error('❌ Database error:', error);
      return res.status(500).json({ error: 'Failed to save token' });
    }

    if (!data || data.length === 0) {
      console.warn(`⚠️ Store ${storeId} not found`);
      return res.status(404).json({ error: 'Store not found' });
    }

    console.log(`✅ FCM token saved for store: ${storeId}`);

    return res.status(200).json({
      message: 'FCM token saved successfully',
      storeId: storeId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error),
    });
  }
};
