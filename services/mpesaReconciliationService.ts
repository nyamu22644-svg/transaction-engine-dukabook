import { supabase } from './supabaseService';
import type { MpesaTransaction, MpesaReconciliationLog, MpesaReconciliationStatus } from '../types';

// Record an M-Pesa transaction
export async function recordMpesaTransaction(storeId: string, data: {
  mpesaRef: string;
  phoneNumber: string;
  amount: number;
  transactionType: 'DEPOSIT' | 'WITHDRAWAL' | 'PAYMENT' | 'SUBSCRIPTION';
  mpesaTimestamp: string;
  notes?: string;
}): Promise<MpesaTransaction | null> {
  try {
    const { data: transaction, error } = await supabase
      .from('mpesa_transactions')
      .insert({
        store_id: storeId,
        mpesa_ref: data.mpesaRef,
        phone_number: data.phoneNumber,
        amount: data.amount,
        transaction_type: data.transactionType,
        mpesa_timestamp: data.mpesaTimestamp,
        notes: data.notes,
        is_reconciled: false
      })
      .select()
      .single();

    if (error) throw error;
    return (transaction || null) as MpesaTransaction | null;
  } catch (err) {
    console.error('Error recording M-Pesa transaction:', err);
    throw err;
  }
}

// Get unreconciled M-Pesa transactions
export async function getUnreconciledMpesaTransactions(storeId: string): Promise<MpesaTransaction[]> {
  try {
    const { data, error } = await supabase
      .from('mpesa_transactions')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_reconciled', false)
      .order('mpesa_timestamp', { ascending: false });

    if (error) throw error;
    return (data || []) as MpesaTransaction[];
  } catch (err) {
    console.error('Error fetching unreconciled M-Pesa transactions:', err);
    throw err;
  }
}

// Get M-Pesa transactions with variance
export async function getMpesaVarianceTransactions(storeId: string): Promise<MpesaTransaction[]> {
  try {
    const { data, error } = await supabase
      .from('mpesa_transactions')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_variance_flagged', true)
      .order('mpesa_timestamp', { ascending: false });

    if (error) throw error;
    return (data || []) as MpesaTransaction[];
  } catch (err) {
    console.error('Error fetching M-Pesa variance transactions:', err);
    throw err;
  }
}

// Reconcile M-Pesa transaction to sale
export async function reconcileMpesaToSale(mpesaTransactionId: string, saleId: string): Promise<MpesaTransaction | null> {
  try {
    const { data: mpesaTx } = await supabase
      .from('mpesa_transactions')
      .select('amount')
      .eq('id', mpesaTransactionId)
      .single();

    const { data: sale } = await supabase
      .from('sales_records')
      .select('total_amount')
      .eq('id', saleId)
      .single();

    const amountVariance = (mpesaTx?.amount || 0) - (sale?.total_amount || 0);
    const isVarianceFlagged = Math.abs(amountVariance) > 100; // Flag if >100 variance

    const { data: transaction, error } = await supabase
      .from('mpesa_transactions')
      .update({
        is_reconciled: true,
        reconciled_to_sale_id: saleId,
        matched_sale_amount: sale?.total_amount,
        amount_variance: amountVariance,
        is_variance_flagged: isVarianceFlagged
      })
      .eq('id', mpesaTransactionId)
      .select()
      .single();

    if (error) throw error;
    return (transaction || null) as MpesaTransaction | null;
  } catch (err) {
    console.error('Error reconciling M-Pesa to sale:', err);
    throw err;
  }
}

// Reconcile M-Pesa transaction to payment
export async function reconcileMpesaToPayment(mpesaTransactionId: string, paymentId: string): Promise<MpesaTransaction | null> {
  try {
    const { data: mpesaTx } = await supabase
      .from('mpesa_transactions')
      .select('amount')
      .eq('id', mpesaTransactionId)
      .single();

    const { data: payment } = await supabase
      .from('subscription_payments')
      .select('amount')
      .eq('id', paymentId)
      .single();

    const amountVariance = (mpesaTx?.amount || 0) - (payment?.amount || 0);

    const { data: transaction, error } = await supabase
      .from('mpesa_transactions')
      .update({
        is_reconciled: true,
        reconciled_to_payment_id: paymentId,
        matched_sale_amount: payment?.amount,
        amount_variance: amountVariance
      })
      .eq('id', mpesaTransactionId)
      .select()
      .single();

    if (error) throw error;
    return (transaction || null) as MpesaTransaction | null;
  } catch (err) {
    console.error('Error reconciling M-Pesa to payment:', err);
    throw err;
  }
}

// Get M-Pesa reconciliation status
export async function getMpesaReconciliationStatus(storeId: string): Promise<MpesaReconciliationStatus | null> {
  try {
    const { data, error } = await supabase
      .from('mpesa_reconciliation_status')
      .select('*')
      .eq('store_id', storeId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return (data || null) as MpesaReconciliationStatus | null;
  } catch (err) {
    console.error('Error fetching M-Pesa reconciliation status:', err);
    throw err;
  }
}

// Log reconciliation session
export async function logMpesaReconciliation(storeId: string, data: {
  periodStart: string;
  periodEnd: string;
  totalMpesaDeposits: number;
  totalMatchedSales: number;
  totalUnmatched: number;
  unmatchedCount: number;
  varianceCount: number;
  totalVarianceAmount: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'RECONCILED' | 'ISSUES_FOUND';
  reconciledBy?: string;
  notes?: string;
}): Promise<MpesaReconciliationLog | null> {
  try {
    const { data: log, error } = await supabase
      .from('mpesa_reconciliation_log')
      .insert({
        store_id: storeId,
        period_start: data.periodStart,
        period_end: data.periodEnd,
        reconciliation_date: new Date().toISOString(),
        total_mpesa_deposits: data.totalMpesaDeposits,
        total_matched_sales: data.totalMatchedSales,
        total_unmatched: data.totalUnmatched,
        unmatched_count: data.unmatchedCount,
        variance_count: data.varianceCount,
        total_variance_amount: data.totalVarianceAmount,
        status: data.status,
        reconciled_by: data.reconciledBy,
        notes: data.notes
      })
      .select()
      .single();

    if (error) throw error;
    return (log || null) as MpesaReconciliationLog | null;
  } catch (err) {
    console.error('Error logging M-Pesa reconciliation:', err);
    throw err;
  }
}

// Get reconciliation history
export async function getMpesaReconciliationHistory(storeId: string, months: number = 6): Promise<MpesaReconciliationLog[]> {
  try {
    const { data, error } = await supabase
      .from('mpesa_reconciliation_log')
      .select('*')
      .eq('store_id', storeId)
      .gte('period_start', new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('period_start', { ascending: false });

    if (error) throw error;
    return (data || []) as MpesaReconciliationLog[];
  } catch (err) {
    console.error('Error fetching reconciliation history:', err);
    throw err;
  }
}

// Calculate reconciliation variance
export async function calculateReconciliationVariance(storeId: string, periodStart: string, periodEnd: string) {
  try {
    const { data: transactions } = await supabase
      .from('mpesa_transactions')
      .select('amount, amount_variance, is_reconciled')
      .eq('store_id', storeId)
      .gte('mpesa_timestamp', periodStart)
      .lte('mpesa_timestamp', periodEnd);

    const txns = transactions || [];
    const totalDeposits = txns.reduce((sum, t) => sum + t.amount, 0);
    const totalVariance = txns.filter(t => t.is_reconciled).reduce((sum, t) => sum + (Math.abs(t.amount_variance || 0)), 0);
    const unreconciledCount = txns.filter(t => !t.is_reconciled).length;

    return {
      totalDeposits,
      totalVariance,
      variancePercent: totalDeposits > 0 ? (totalVariance / totalDeposits) * 100 : 0,
      unreconciledCount,
      reconciledCount: txns.filter(t => t.is_reconciled).length
    };
  } catch (err) {
    console.error('Error calculating reconciliation variance:', err);
    throw err;
  }
}

// Get average daily M-Pesa deposits
export async function getAverageDailyMpesaDeposits(storeId: string, days: number = 30): Promise<number> {
  try {
    const { data } = await supabase
      .from('mpesa_transactions')
      .select('amount')
      .eq('store_id', storeId)
      .eq('transaction_type', 'DEPOSIT')
      .gte('mpesa_timestamp', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

    const txns = data || [];
    const totalDeposits = txns.reduce((sum, t) => sum + t.amount, 0);
    return days > 0 ? totalDeposits / days : 0;
  } catch (err) {
    console.error('Error calculating average daily deposits:', err);
    throw err;
  }
}

// Send M-Pesa variance alert
export async function sendMpesaVarianceAlert(mpesaRef: string, expectedAmount: number, actualAmount: number, variance: number, phoneNumber: string): Promise<boolean> {
  try {
    const message = `⚠️ M-PESA VARIANCE: Reference ${mpesaRef}. Expected: KES ${expectedAmount.toFixed(2)}, Received: KES ${actualAmount.toFixed(2)}. Variance: KES ${variance.toFixed(2)}. Investigate. -DukaBook`;

    // TODO: Integrate with SMS service
    console.log(`SMS to ${phoneNumber}: ${message}`);
    
    return true;
  } catch (err) {
    console.error('Error sending M-Pesa variance alert:', err);
    throw err;
  }
}
