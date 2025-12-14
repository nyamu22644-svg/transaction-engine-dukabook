import { supabase } from './supabaseService';
import type { DebtCollection, DebtReminderLog, CustomerCreditCeiling, DebtCollectionsDashboard } from '../types';

// Record a debt for a customer
export async function recordDebt(storeId: string, data: {
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  originalAmount: number;
  dueDate?: string;
  notes?: string;
}): Promise<DebtCollection | null> {
  try {
    const { data: debt, error } = await supabase
      .from('debt_collections')
      .insert({
        store_id: storeId,
        customer_id: data.customerId,
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        original_amount: data.originalAmount,
        remaining_amount: data.originalAmount,
        due_date: data.dueDate,
        status: 'ACTIVE',
        notes: data.notes
      })
      .select()
      .single();

    if (error) throw error;
    return (debt || null) as DebtCollection | null;
  } catch (err) {
    console.error('Error recording debt:', err);
    throw err;
  }
}

// Get all active debts for a store
export async function getActiveDebts(storeId: string): Promise<DebtCollection[]> {
  try {
    const { data, error } = await supabase
      .from('debt_collections')
      .select('*')
      .eq('store_id', storeId)
      .in('status', ['ACTIVE', 'OVERDUE', 'SUSPENDED'])
      .order('days_overdue', { ascending: false });

    if (error) throw error;
    return (data || []) as DebtCollection[];
  } catch (err) {
    console.error('Error fetching active debts:', err);
    throw err;
  }
}

// Get overdue debts
export async function getOverdueDebts(storeId: string, daysOverdue: number = 0): Promise<DebtCollection[]> {
  try {
    const { data, error } = await supabase
      .from('debt_collections')
      .select('*')
      .eq('store_id', storeId)
      .eq('status', 'OVERDUE')
      .gte('days_overdue', daysOverdue)
      .order('days_overdue', { ascending: false });

    if (error) throw error;
    return (data || []) as DebtCollection[];
  } catch (err) {
    console.error('Error fetching overdue debts:', err);
    throw err;
  }
}

// Get debts by aging bucket
export async function getDebtsByAging(storeId: string, agingBucket: string): Promise<DebtCollection[]> {
  try {
    const { data, error } = await supabase
      .from('debt_collections')
      .select('*')
      .eq('store_id', storeId)
      .eq('aging_bucket', agingBucket)
      .order('remaining_amount', { ascending: false });

    if (error) throw error;
    return (data || []) as DebtCollection[];
  } catch (err) {
    console.error('Error fetching debts by aging:', err);
    throw err;
  }
}

// Get debts exceeding credit ceiling
export async function getDebtsCeilingBreach(storeId: string): Promise<DebtCollection[]> {
  try {
    const { data, error } = await supabase
      .from('debt_collections')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_credit_ceiling_breach', true)
      .order('remaining_amount', { ascending: false });

    if (error) throw error;
    return (data || []) as DebtCollection[];
  } catch (err) {
    console.error('Error fetching ceiling breach debts:', err);
    throw err;
  }
}

// Get debt collections dashboard stats
export async function getDebtDashboard(storeId: string): Promise<DebtCollectionsDashboard | null> {
  try {
    const { data, error } = await supabase
      .from('debt_collections_dashboard')
      .select('*')
      .eq('store_id', storeId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return (data || null) as DebtCollectionsDashboard | null;
  } catch (err) {
    console.error('Error fetching debt dashboard:', err);
    throw err;
  }
}

// Update debt status
export async function updateDebtStatus(debtId: string, status: 'ACTIVE' | 'OVERDUE' | 'SUSPENDED' | 'PARTIALLY_PAID' | 'COLLECTED' | 'WRITTEN_OFF', paymentAmount?: number): Promise<DebtCollection | null> {
  try {
    const { data: existing } = await supabase
      .from('debt_collections')
      .select('remaining_amount, status')
      .eq('id', debtId)
      .single();

    if (!existing) throw new Error('Debt not found');

    const remainingAfterPayment = paymentAmount ? existing.remaining_amount - paymentAmount : existing.remaining_amount;
    const newStatus = remainingAfterPayment > 0 ? 'PARTIALLY_PAID' : 'COLLECTED';

    const { data: debt, error } = await supabase
      .from('debt_collections')
      .update({
        status: status || newStatus,
        ...(paymentAmount && { remaining_amount: Math.max(0, remainingAfterPayment) })
      })
      .eq('id', debtId)
      .select()
      .single();

    if (error) throw error;
    return (debt || null) as DebtCollection | null;
  } catch (err) {
    console.error('Error updating debt status:', err);
    throw err;
  }
}

// Log a debt reminder
export async function logDebtReminder(storeId: string, debtId: string, data: {
  customerName: string;
  customerPhone?: string;
  remainingAmount: number;
  daysOverdue: number;
  reminderType: 'DUE_IN_7' | 'OVERDUE_7' | 'OVERDUE_14' | 'OVERDUE_30' | 'CRITICAL';
  messageSent?: string;
  smsSent?: boolean;
  smsStatus?: 'PENDING' | 'SENT' | 'FAILED';
  smsError?: string;
}): Promise<DebtReminderLog | null> {
  try {
    const { data: log, error } = await supabase
      .from('debt_reminder_logs')
      .insert({
        store_id: storeId,
        debt_id: debtId,
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        remaining_amount: data.remainingAmount,
        days_overdue: data.daysOverdue,
        reminder_type: data.reminderType,
        message_sent: data.messageSent,
        sms_sent: data.smsSent || false,
        sms_status: data.smsStatus || 'PENDING',
        sms_error: data.smsError
      })
      .select()
      .single();

    if (error) throw error;

    // Update debt reminder tracking
    await supabase
      .from('debt_collections')
      .update({
        last_reminder_date: new Date().toISOString().split('T')[0],
        reminder_count: 1,
        next_reminder_date: getNextReminderDate(data.daysOverdue)
      })
      .eq('id', debtId);

    return (log || null) as DebtReminderLog | null;
  } catch (err) {
    console.error('Error logging debt reminder:', err);
    throw err;
  }
}

// Get reminder history for a debt
export async function getDebtReminderHistory(debtId: string): Promise<DebtReminderLog[]> {
  try {
    const { data, error } = await supabase
      .from('debt_reminder_logs')
      .select('*')
      .eq('debt_id', debtId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as DebtReminderLog[];
  } catch (err) {
    console.error('Error fetching reminder history:', err);
    throw err;
  }
}

// Set customer credit ceiling
export async function setCustomerCreditCeiling(storeId: string, customerId: string, creditLimit: number, blockOnBreach: boolean = true): Promise<CustomerCreditCeiling | null> {
  try {
    const { data: ceiling, error } = await supabase
      .from('customer_credit_ceilings')
      .upsert({
        store_id: storeId,
        customer_id: customerId,
        credit_limit: creditLimit,
        available_credit: creditLimit,
        block_sales_on_ceiling_breach: blockOnBreach
      })
      .select()
      .single();

    if (error) throw error;
    return (ceiling || null) as CustomerCreditCeiling | null;
  } catch (err) {
    console.error('Error setting credit ceiling:', err);
    throw err;
  }
}

// Check if customer can make a sale (credit ceiling)
export async function canCustomerMakeSale(customerId: string, saleAmount: number): Promise<{ allowed: boolean; reason?: string; availableCredit?: number }> {
  try {
    const { data: ceiling } = await supabase
      .from('customer_credit_ceilings')
      .select('*')
      .eq('customer_id', customerId)
      .single();

    if (!ceiling) {
      return { allowed: true }; // No ceiling set
    }

    const availableCredit = ceiling.credit_limit - ceiling.current_debt;

    if (saleAmount > availableCredit && ceiling.block_sales_on_ceiling_breach) {
      return {
        allowed: false,
        reason: `Credit ceiling exceeded. Available: KES ${availableCredit.toFixed(2)}, Requested: KES ${saleAmount.toFixed(2)}`,
        availableCredit
      };
    }

    return { allowed: true, availableCredit };
  } catch (err) {
    console.error('Error checking customer credit:', err);
    return { allowed: true }; // Allow on error
  }
}

// Get function to calculate next reminder date
function getNextReminderDate(daysOverdue: number): string {
  let daysToAdd = 7;
  if (daysOverdue >= 30) daysToAdd = 0; // Final warning, no next reminder
  else if (daysOverdue >= 14) daysToAdd = 14;
  else if (daysOverdue >= 7) daysToAdd = 7;

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + daysToAdd);
  return nextDate.toISOString().split('T')[0];
}

// Send SMS debt reminder
export async function sendDebtReminder(customerId: string, customerName: string, customerPhone: string, remainingAmount: number, daysOverdue: number): Promise<boolean> {
  try {
    let message = '';
    if (daysOverdue < 7) {
      message = `Hi ${customerName}, your payment of KES ${remainingAmount.toFixed(2)} is due in a few days. Please settle to avoid late fees. -DukaBook`;
    } else if (daysOverdue < 30) {
      message = `Hi ${customerName}, your outstanding debt of KES ${remainingAmount.toFixed(2)} is now ${daysOverdue} days overdue. Please settle immediately. -DukaBook`;
    } else {
      message = `🚨 URGENT: ${customerName}, your debt of KES ${remainingAmount.toFixed(2)} is ${daysOverdue} days overdue. Your credit account has been suspended. Please settle immediately. -DukaBook`;
    }

    // TODO: Integrate with SMS service
    console.log(`SMS to ${customerPhone}: ${message}`);
    
    return true;
  } catch (err) {
    console.error('Error sending debt reminder:', err);
    throw err;
  }
}
