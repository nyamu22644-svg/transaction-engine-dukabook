import { supabase } from './supabaseService';
import type { CashRegisterAudit, CashFraudPattern } from '../types';

// Record a cash register reconciliation audit
export async function recordCashAudit(storeId: string, data: {
  registerDate: string;
  openingBalance: number;
  expectedClosing: number;
  actualClosing: number;
  reconciledBy?: string;
  notes?: string;
}): Promise<CashRegisterAudit | null> {
  try {
    const varianceAmount = data.actualClosing - data.expectedClosing;
    const variancePercent = (varianceAmount / data.expectedClosing) * 100;
    const isFraudSuspect = Math.abs(variancePercent) > 5;
    
    const fraudCategory = varianceAmount > 0 ? 'OVERAGE' : varianceAmount < 0 ? 'SHORTAGE' : 'NORMAL';
    const severity = Math.abs(variancePercent) > 15 ? 'HIGH' : Math.abs(variancePercent) > 10 ? 'MEDIUM' : 'LOW';

    const { data: audit, error } = await supabase
      .from('cash_register_audits')
      .insert({
        store_id: storeId,
        register_date: data.registerDate,
        opening_balance: data.openingBalance,
        expected_closing: data.expectedClosing,
        actual_closing: data.actualClosing,
        variance_amount: varianceAmount,
        variance_percentage: variancePercent,
        is_fraud_suspect: isFraudSuspect,
        fraud_category: fraudCategory,
        severity: severity,
        reconciled_by: data.reconciledBy,
        reconciled_at: new Date().toISOString(),
        notes: data.notes
      })
      .select()
      .single();

    if (error) throw error;
    return audit as CashRegisterAudit;
  } catch (err) {
    console.error('Error recording cash audit:', err);
    throw err;
  }
}

// Get all cash audits for a store
export async function getCashAudits(storeId: string, days: number = 30): Promise<CashRegisterAudit[]> {
  try {
    const { data, error } = await supabase
      .from('cash_register_audits')
      .select('*')
      .eq('store_id', storeId)
      .gte('register_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('register_date', { ascending: false });

    if (error) throw error;
    return (data || []) as CashRegisterAudit[];
  } catch (err) {
    console.error('Error fetching cash audits:', err);
    throw err;
  }
}

// Get fraud patterns for a store (10+ variances in 30 days = pattern)
export async function getCashFraudPatterns(storeId: string): Promise<CashFraudPattern | null> {
  try {
    const { data, error } = await supabase
      .from('cash_fraud_patterns')
      .select('*')
      .eq('store_id', storeId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
    return (data || null) as CashFraudPattern | null;
  } catch (err) {
    console.error('Error fetching fraud patterns:', err);
    throw err;
  }
}

// Get flagged audits (fraud suspects)
export async function getFlaggedCashAudits(storeId: string): Promise<CashRegisterAudit[]> {
  try {
    const { data, error } = await supabase
      .from('cash_register_audits')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_fraud_suspect', true)
      .order('register_date', { ascending: false });

    if (error) throw error;
    return (data || []) as CashRegisterAudit[];
  } catch (err) {
    console.error('Error fetching flagged cash audits:', err);
    throw err;
  }
}

// Get high-severity audits (>15% variance)
export async function getHighSeverityCashAudits(storeId: string): Promise<CashRegisterAudit[]> {
  try {
    const { data, error } = await supabase
      .from('cash_register_audits')
      .select('*')
      .eq('store_id', storeId)
      .in('severity', ['HIGH'])
      .order('register_date', { ascending: false });

    if (error) throw error;
    return (data || []) as CashRegisterAudit[];
  } catch (err) {
    console.error('Error fetching high severity audits:', err);
    throw err;
  }
}

// Get variance statistics
export async function getCashVarianceStats(storeId: string, days: number = 30) {
  try {
    const { data, error } = await supabase
      .from('cash_register_audits')
      .select('variance_amount, variance_percentage')
      .eq('store_id', storeId)
      .gte('register_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    if (error) throw error;

    const audits = data || [];
    if (audits.length === 0) {
      return { avgVariance: 0, maxVariance: 0, minVariance: 0, varianceCount: 0 };
    }

    return {
      avgVariance: audits.reduce((sum, a) => sum + a.variance_percentage, 0) / audits.length,
      maxVariance: Math.max(...audits.map(a => a.variance_percentage)),
      minVariance: Math.min(...audits.map(a => a.variance_percentage)),
      varianceCount: audits.length,
      totalVarianceAmount: audits.reduce((sum, a) => sum + a.variance_amount, 0)
    };
  } catch (err) {
    console.error('Error fetching variance stats:', err);
    throw err;
  }
}

// Send SMS alert for fraud suspect
export async function sendCashFraudAlert(storeId: string, auditId: string, phoneNumber: string): Promise<boolean> {
  try {
    const { data: audit } = await supabase
      .from('cash_register_audits')
      .select('*')
      .eq('id', auditId)
      .single();

    if (!audit) return false;

    const message = `⚠️ DukaBook Alert: Cash variance of ${audit.variance_percentage.toFixed(2)}% detected on ${audit.register_date}. Amount: KES ${Math.abs(audit.variance_amount).toFixed(2)}. Status: ${audit.fraud_category}. Please review.`;

    // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
    console.log(`SMS to ${phoneNumber}: ${message}`);
    
    return true;
  } catch (err) {
    console.error('Error sending fraud alert:', err);
    throw err;
  }
}
