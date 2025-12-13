// supabase/functions/intasend-webhook/index.ts
// Supabase Edge Function to handle IntaSend payment notifications (webhook)
import { serve } from 'std/server';
import { saveIntaSendPayment } from './db.ts';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  try {
    const body = await req.json();
    // Save payment notification to DB for history and admin management
    await saveIntaSendPayment(body);
    return new Response('Webhook received', { status: 200 });
  } catch (err) {
    return new Response('Invalid payload', { status: 400 });
  }
});
