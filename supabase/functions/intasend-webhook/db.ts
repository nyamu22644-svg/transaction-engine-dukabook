import { createClient } from '@supabase/supabase-js';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

export async function saveIntaSendPayment(payment: any) {
  // Save payment notification to payments table
  const { data, error } = await supabase
    .from('intasend_payments')
    .insert([payment]);
  if (error) throw error;
  return data;
}
