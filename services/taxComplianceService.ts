import { supabase } from './supabaseService';
import type { TaxComplianceRecord, TaxExemptionRule, TaxPaymentSchedule, KraComplianceStatus } from '../types';

// Create a tax compliance record
export async function createTaxComplianceRecord(storeId: string, data: {
  taxPeriodStart: string;
  taxPeriodEnd: string;
  periodType: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  grossSales: number;
  exemptSales: number;
  taxableRate?: number;
  preparedBy?: string;
  notes?: string;
}): Promise<TaxComplianceRecord | null> {
  try {
    const taxableRate = data.taxableRate || 0.16; // Default 16% VAT
    const taxableSales = data.grossSales - data.exemptSales;
    const taxAmount = taxableSales * taxableRate;

    const { data: record, error } = await supabase
      .from('tax_compliance_records')
      .insert({
        store_id: storeId,
        tax_period_start: data.taxPeriodStart,
        tax_period_end: data.taxPeriodEnd,
        period_type: data.periodType,
        gross_sales: data.grossSales,
        exempt_sales: data.exemptSales,
        taxable_sales: taxableSales,
        tax_rate: taxableRate * 100,
        tax_amount: taxAmount,
        ideal_filing_status: 'DRAFT',
        kra_status: 'PENDING',
        prepared_by: data.preparedBy,
        notes: data.notes
      })
      .select()
      .single();

    if (error) throw error;
    return (record || null) as TaxComplianceRecord | null;
  } catch (err) {
    console.error('Error creating tax compliance record:', err);
    throw err;
  }
}

// Get tax compliance records for a store
export async function getTaxComplianceRecords(storeId: string, months: number = 12): Promise<TaxComplianceRecord[]> {
  try {
    const { data, error } = await supabase
      .from('tax_compliance_records')
      .select('*')
      .eq('store_id', storeId)
      .gte('tax_period_start', new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('tax_period_end', { ascending: false });

    if (error) throw error;
    return (data || []) as TaxComplianceRecord[];
  } catch (err) {
    console.error('Error fetching tax compliance records:', err);
    throw err;
  }
}

// Get records pending iDEAL filing
export async function getRecordsPendingIdealFiling(storeId: string): Promise<TaxComplianceRecord[]> {
  try {
    const { data, error } = await supabase
      .from('tax_compliance_records')
      .select('*')
      .eq('store_id', storeId)
      .in('ideal_filing_status', ['DRAFT', 'READY'])
      .order('tax_period_end', { ascending: true });

    if (error) throw error;
    return (data || []) as TaxComplianceRecord[];
  } catch (err) {
    console.error('Error fetching records pending iDEAL filing:', err);
    throw err;
  }
}

// Get records with KRA issues
export async function getKraIssueRecords(storeId: string): Promise<TaxComplianceRecord[]> {
  try {
    const { data, error } = await supabase
      .from('tax_compliance_records')
      .select('*')
      .eq('store_id', storeId)
      .eq('kra_status', 'ISSUE')
      .order('tax_period_end', { ascending: true });

    if (error) throw error;
    return (data || []) as TaxComplianceRecord[];
  } catch (err) {
    console.error('Error fetching KRA issue records:', err);
    throw err;
  }
}

// Update tax record filing status
export async function updateTaxRecordFilingStatus(recordId: string, data: {
  idealFilingStatus?: 'DRAFT' | 'READY' | 'FILED' | 'CONFIRMED';
  kraStatus?: 'PENDING' | 'SUBMITTED' | 'VERIFIED' | 'ISSUE';
  kraReferenceNumber?: string;
  kraIssueNotes?: string;
  approvedBy?: string;
  notes?: string;
}): Promise<TaxComplianceRecord | null> {
  try {
    const { data: record, error } = await supabase
      .from('tax_compliance_records')
      .update({
        ...(data.idealFilingStatus && { ideal_filing_status: data.idealFilingStatus }),
        ...(data.kraStatus && { kra_status: data.kraStatus }),
        ...(data.kraReferenceNumber && { kra_reference: data.kraReferenceNumber }),
        ...(data.kraIssueNotes && { kra_issue_notes: data.kraIssueNotes }),
        ...(data.approvedBy && { approved_by: data.approvedBy }),
        ...(data.notes && { notes: data.notes })
      })
      .eq('id', recordId)
      .select()
      .single();

    if (error) throw error;
    return (record || null) as TaxComplianceRecord | null;
  } catch (err) {
    console.error('Error updating tax record filing status:', err);
    throw err;
  }
}

// Get tax exemption rules
export async function getTaxExemptionRules(storeId: string): Promise<TaxExemptionRule[]> {
  try {
    const { data, error } = await supabase
      .from('tax_exemption_rules')
      .select('*')
      .eq('store_id', storeId)
      .order('category_name', { ascending: true });

    if (error) throw error;
    return (data || []) as TaxExemptionRule[];
  } catch (err) {
    console.error('Error fetching tax exemption rules:', err);
    throw err;
  }
}

// Check if item qualifies for tax exemption
export async function isItemTaxExempt(storeId: string, itemCategory: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('tax_exemption_rules')
      .select('is_exempt')
      .eq('store_id', storeId)
      .ilike('category_name', `%${itemCategory}%`)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return (data?.is_exempt || false);
  } catch (err) {
    console.error('Error checking tax exemption:', err);
    return false;
  }
}

// Get tax payment schedule
export async function getTaxPaymentSchedule(storeId: string): Promise<TaxPaymentSchedule[]> {
  try {
    const { data, error } = await supabase
      .from('tax_payment_schedule')
      .select('*')
      .eq('store_id', storeId)
      .order('payment_due_date', { ascending: true });

    if (error) throw error;
    return (data || []) as TaxPaymentSchedule[];
  } catch (err) {
    console.error('Error fetching tax payment schedule:', err);
    throw err;
  }
}

// Get overdue tax payments
export async function getOverdueTaxPayments(storeId: string): Promise<TaxPaymentSchedule[]> {
  try {
    const { data, error } = await supabase
      .from('tax_payment_schedule')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_overdue', true)
      .eq('is_paid', false)
      .order('payment_due_date', { ascending: true });

    if (error) throw error;
    return (data || []) as TaxPaymentSchedule[];
  } catch (err) {
    console.error('Error fetching overdue tax payments:', err);
    throw err;
  }
}

// Record tax payment
export async function recordTaxPayment(scheduleId: string, data: {
  amountPaid: number;
  paymentMethod: 'BANK_TRANSFER' | 'MPESA';
  paymentReference?: string;
}): Promise<TaxPaymentSchedule | null> {
  try {
    const { data: schedule, error } = await supabase
      .from('tax_payment_schedule')
      .update({
        amount_paid: data.amountPaid,
        is_paid: true,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: data.paymentMethod,
        payment_reference: data.paymentReference,
        is_overdue: false
      })
      .eq('id', scheduleId)
      .select()
      .single();

    if (error) throw error;
    return (schedule || null) as TaxPaymentSchedule | null;
  } catch (err) {
    console.error('Error recording tax payment:', err);
    throw err;
  }
}

// Get KRA compliance status
export async function getKraComplianceStatus(storeId: string): Promise<KraComplianceStatus | null> {
  try {
    const { data, error } = await supabase
      .from('kra_compliance_status')
      .select('*')
      .eq('store_id', storeId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return (data || null) as KraComplianceStatus | null;
  } catch (err) {
    console.error('Error fetching KRA compliance status:', err);
    throw err;
  }
}

// Calculate tax liability for a period
export async function calculateTaxLiability(storeId: string, periodStart: string, periodEnd: string): Promise<{ taxableAmount: number; taxAmount: number; estimatedTax: number }> {
  try {
    // Get all sales in period
    const { data: sales } = await supabase
      .from('sales_records')
      .select('total_amount')
      .eq('store_id', storeId)
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd);

    const totalSales = (sales || []).reduce((sum, s) => sum + s.total_amount, 0);
    
    // Assume 20% of sales are tax-exempt (conservative)
    const taxableAmount = totalSales * 0.8;
    const taxAmount = taxableAmount * 0.16; // 16% VAT

    return {
      taxableAmount,
      taxAmount,
      estimatedTax: taxAmount
    };
  } catch (err) {
    console.error('Error calculating tax liability:', err);
    throw err;
  }
}

// Generate KRA report
export async function generateKraReport(storeId: string, periodStart: string, periodEnd: string) {
  try {
    const liability = await calculateTaxLiability(storeId, periodStart, periodEnd);
    
    const { data: record } = await supabase
      .from('tax_compliance_records')
      .select('*')
      .eq('store_id', storeId)
      .gte('tax_period_start', periodStart)
      .lte('tax_period_end', periodEnd)
      .single();

    return {
      storeId,
      period: { start: periodStart, end: periodEnd },
      reportDate: new Date().toISOString().split('T')[0],
      grossSales: record?.gross_sales || 0,
      taxableAmount: liability.taxableAmount,
      taxRate: '16%',
      taxAmount: liability.taxAmount,
      idealStatus: record?.ideal_filing_status || 'DRAFT',
      kraStatus: record?.kra_status || 'PENDING'
    };
  } catch (err) {
    console.error('Error generating KRA report:', err);
    throw err;
  }
}

// Send tax reminder SMS
export async function sendTaxReminderAlert(phoneNumber: string, daysUntilDue: number, amountDue: number): Promise<boolean> {
  try {
    let message = '';
    if (daysUntilDue <= 0) {
      message = `🚨 TAX OVERDUE: Your KES ${amountDue.toFixed(2)} tax payment is overdue! Submit to KRA immediately. -DukaBook`;
    } else if (daysUntilDue <= 7) {
      message = `⏰ TAX DUE SOON: Your KES ${amountDue.toFixed(2)} tax payment is due in ${daysUntilDue} days. Prepare now! -DukaBook`;
    } else {
      message = `📢 TAX ALERT: Your next tax payment of KES ${amountDue.toFixed(2)} is due on the scheduled date. -DukaBook`;
    }

    // TODO: Integrate with SMS service
    console.log(`SMS to ${phoneNumber}: ${message}`);
    
    return true;
  } catch (err) {
    console.error('Error sending tax reminder:', err);
    throw err;
  }
}
