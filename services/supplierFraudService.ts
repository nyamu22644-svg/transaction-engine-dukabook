import { supabase } from './supabaseClient';
import type { SupplierFraudFlag, SupplierQualityScore, SupplierFraudSummary } from '../types';

// Flag a supplier fraud case
export async function flagSupplierFraud(storeId: string, data: {
  supplierId: string;
  fraudType: 'QUANTITY_MISMATCH' | 'PRICE_OVERCHARGE' | 'QUALITY_ISSUE' | 'DELIVERY_LATE' | 'INVOICE_MISMATCH';
  poId?: string;
  grnId?: string;
  invoiceId?: string;
  poQuantity?: number;
  grnQuantityReceived?: number;
  grnQuantityRejected?: number;
  poUnitPrice?: number;
  invoiceUnitPrice?: number;
  poExpectedDate?: string;
  grnActualDate?: string;
  rejectionReason?: string;
  qualityScore?: number;
}): Promise<SupplierFraudFlag | null> {
  try {
    const quantityVariance = (data.poQuantity || 0) - (data.grnQuantityReceived || 0);
    const quantityVariancePercent = data.poQuantity ? (quantityVariance / data.poQuantity) * 100 : 0;
    const priceVariance = (data.invoiceUnitPrice || 0) - (data.poUnitPrice || 0);
    const totalOvercharge = priceVariance * (data.grnQuantityReceived || 1);
    
    let daysLate = 0;
    if (data.poExpectedDate && data.grnActualDate) {
      const expected = new Date(data.poExpectedDate);
      const actual = new Date(data.grnActualDate);
      daysLate = Math.floor((actual.getTime() - expected.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Determine severity
    let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (data.fraudType === 'PRICE_OVERCHARGE' && totalOvercharge > 10000) severity = 'CRITICAL';
    else if (data.fraudType === 'QUANTITY_MISMATCH' && Math.abs(quantityVariancePercent) > 20) severity = 'HIGH';
    else if (data.fraudType === 'QUALITY_ISSUE' && (data.qualityScore || 10) < 5) severity = 'HIGH';
    else if (daysLate > 7) severity = 'MEDIUM';

    const { data: flag, error } = await supabase
      .from('supplier_fraud_flags')
      .insert({
        store_id: storeId,
        supplier_id: data.supplierId,
        purchase_order_id: data.poId,
        grn_id: data.grnId,
        supplier_invoice_id: data.invoiceId,
        fraud_type: data.fraudType,
        po_quantity: data.poQuantity || 0,
        grn_quantity_received: data.grnQuantityReceived || 0,
        grn_quantity_rejected: data.grnQuantityRejected || 0,
        quantity_variance: quantityVariance,
        variance_percent: quantityVariancePercent,
        po_unit_price: data.poUnitPrice || 0,
        invoice_unit_price: data.invoiceUnitPrice || 0,
        price_variance: priceVariance,
        total_overcharge: totalOvercharge,
        po_expected_date: data.poExpectedDate,
        grn_actual_date: data.grnActualDate,
        days_late: daysLate,
        rejection_reason: data.rejectionReason,
        quality_score: data.qualityScore || 10,
        severity: severity
      })
      .select()
      .single();

    if (error) throw error;
    return (flag || null) as SupplierFraudFlag | null;
  } catch (err) {
    console.error('Error flagging supplier fraud:', err);
    throw err;
  }
}

// Get active fraud flags for a supplier
export async function getSupplierFraudFlags(storeId: string, supplierId: string): Promise<SupplierFraudFlag[]> {
  try {
    const { data, error } = await supabase
      .from('supplier_fraud_flags')
      .select('*')
      .eq('store_id', storeId)
      .eq('supplier_id', supplierId)
      .eq('is_resolved', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as SupplierFraudFlag[];
  } catch (err) {
    console.error('Error fetching supplier fraud flags:', err);
    throw err;
  }
}

// Get high-severity fraud cases
export async function getHighSeverityFraudCases(storeId: string): Promise<SupplierFraudFlag[]> {
  try {
    const { data, error } = await supabase
      .from('supplier_fraud_flags')
      .select('*')
      .eq('store_id', storeId)
      .in('severity', ['HIGH', 'CRITICAL'])
      .eq('is_resolved', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as SupplierFraudFlag[];
  } catch (err) {
    console.error('Error fetching high severity fraud cases:', err);
    throw err;
  }
}

// Get supplier fraud summary
export async function getSupplierFraudSummary(storeId: string, supplierId: string): Promise<SupplierFraudSummary | null> {
  try {
    const { data, error } = await supabase
      .from('supplier_fraud_summary')
      .select('*')
      .eq('store_id', storeId)
      .eq('supplier_id', supplierId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return (data || null) as SupplierFraudSummary | null;
  } catch (err) {
    console.error('Error fetching supplier fraud summary:', err);
    throw err;
  }
}

// Get supplier quality score
export async function getSupplierQualityScore(storeId: string, supplierId: string): Promise<SupplierQualityScore | null> {
  try {
    const { data, error } = await supabase
      .from('supplier_quality_score')
      .select('*')
      .eq('store_id', storeId)
      .eq('supplier_id', supplierId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return (data || null) as SupplierQualityScore | null;
  } catch (err) {
    console.error('Error fetching supplier quality score:', err);
    throw err;
  }
}

// Update supplier quality score
export async function updateSupplierQualityScore(storeId: string, supplierId: string, data: {
  totalOrders?: number;
  onTimeDeliveries?: number;
  qualityAcceptedPercent?: number;
  priceAccuracyPercent?: number;
  overallScore?: number;
  isBlacklisted?: boolean;
  blacklistReason?: string;
}): Promise<SupplierQualityScore | null> {
  try {
    const { data: score, error } = await supabase
      .from('supplier_quality_score')
      .upsert({
        store_id: storeId,
        supplier_id: supplierId,
        ...(data.totalOrders !== undefined && { total_orders: data.totalOrders }),
        ...(data.onTimeDeliveries !== undefined && { on_time_deliveries: data.onTimeDeliveries }),
        ...(data.qualityAcceptedPercent !== undefined && { quality_accepted_percent: data.qualityAcceptedPercent }),
        ...(data.priceAccuracyPercent !== undefined && { price_accuracy_percent: data.priceAccuracyPercent }),
        ...(data.overallScore !== undefined && { overall_score: data.overallScore }),
        ...(data.isBlacklisted !== undefined && { is_blacklisted: data.isBlacklisted }),
        ...(data.blacklistReason !== undefined && { blacklist_reason: data.blacklistReason })
      })
      .select()
      .single();

    if (error) throw error;
    return (score || null) as SupplierQualityScore | null;
  } catch (err) {
    console.error('Error updating supplier quality score:', err);
    throw err;
  }
}

// Resolve a fraud flag
export async function resolveFraudFlag(flagId: string, resolutionNotes: string): Promise<SupplierFraudFlag | null> {
  try {
    const { data: flag, error } = await supabase
      .from('supplier_fraud_flags')
      .update({
        is_resolved: true,
        resolution_notes: resolutionNotes
      })
      .eq('id', flagId)
      .select()
      .single();

    if (error) throw error;
    return (flag || null) as SupplierFraudFlag | null;
  } catch (err) {
    console.error('Error resolving fraud flag:', err);
    throw err;
  }
}

// Get blacklisted suppliers
export async function getBlacklistedSuppliers(storeId: string): Promise<SupplierQualityScore[]> {
  try {
    const { data, error } = await supabase
      .from('supplier_quality_score')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_blacklisted', true);

    if (error) throw error;
    return (data || []) as SupplierQualityScore[];
  } catch (err) {
    console.error('Error fetching blacklisted suppliers:', err);
    throw err;
  }
}

// Get PO vs Invoice mismatch
export async function detectPOInvoiceMismatch(poId: string, invoiceId: string): Promise<{ mismatch: boolean; issues: string[] }> {
  try {
    const { data: po } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('id', poId)
      .single();

    const { data: invoice } = await supabase
      .from('supplier_invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    const issues: string[] = [];
    let mismatch = false;

    if (po && invoice) {
      if (po.total_amount !== invoice.total_amount) {
        issues.push(`Amount mismatch: PO KES ${po.total_amount}, Invoice KES ${invoice.total_amount}`);
        mismatch = true;
      }

      if (po.supplier_id !== invoice.supplier_id) {
        issues.push('Supplier mismatch');
        mismatch = true;
      }
    }

    return { mismatch, issues };
  } catch (err) {
    console.error('Error detecting PO invoice mismatch:', err);
    throw err;
  }
}

// Send fraud alert SMS
export async function sendSupplierFraudAlert(supplierId: string, fraudType: string, totalOvercharge: number, phoneNumber: string): Promise<boolean> {
  try {
    const message = `⚠️ FRAUD ALERT: Supplier fraud detected! Type: ${fraudType}. Total overcharge: KES ${totalOvercharge.toFixed(2)}. Review immediately. -DukaBook`;

    // TODO: Integrate with SMS service
    console.log(`SMS to ${phoneNumber}: ${message}`);
    
    return true;
  } catch (err) {
    console.error('Error sending fraud alert:', err);
    throw err;
  }
}
