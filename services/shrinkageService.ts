import { ShrinkageDebt } from '../types';
import { supabase, isSupabaseEnabled } from './supabaseClient';

/**
 * SHRINKAGE DEBT SERVICE
 * 
 * Tracks inventory loss attributed to employees (theft, over-pouring, etc.)
 * Solves the "KES 3 Billion Shrinkage Crisis" in Kenyan retail
 * 
 * When stock audit reveals missing items:
 * 1. Record shrinkage debt linked to employee
 * 2. Employee must acknowledge the debt
 * 3. Deduct from next salary or settlement
 */

export const recordShrinkageDebt = async (
  debt: Omit<ShrinkageDebt, 'id' | 'created_at'>
): Promise<string | null> => {
  if (!isSupabaseEnabled) return null;
  try {
    const { data, error } = await supabase!
      .from('shrinkage_debts')
      .insert(debt)
      .select('id')
      .single();

    if (!error && data) {
      // Update agent's total shrinkage debt
      const { data: agent } = await supabase!
        .from('agents')
        .select('total_shrinkage_debt')
        .eq('id', debt.agent_id)
        .single();

      if (agent) {
        await supabase!
          .from('agents')
          .update({
            total_shrinkage_debt:
              (agent.total_shrinkage_debt || 0) + debt.total_debt_amount,
          })
          .eq('id', debt.agent_id);
      }

      console.log(
        `✅ Shrinkage debt recorded: ${debt.agent_name} - ${debt.item_name} (KES ${debt.total_debt_amount})`
      );
      return data.id;
    }
    return null;
  } catch (err) {
    console.error('Error recording shrinkage debt:', err);
    return null;
  }
};

export const getShrinkageDebts = async (
  storeId: string,
  agentId?: string
): Promise<ShrinkageDebt[]> => {
  if (!isSupabaseEnabled) return [];
  try {
    let query = supabase!
      .from('shrinkage_debts')
      .select('*')
      .eq('store_id', storeId);
    if (agentId) query = query.eq('agent_id', agentId);
    const { data } = await query.order('audit_date', { ascending: false });
    return data || [];
  } catch (err) {
    console.error('Error fetching shrinkage debts:', err);
    return [];
  }
};

export const updateShrinkageDebtStatus = async (
  debtId: string,
  status: ShrinkageDebt['status'],
  notes?: string
): Promise<boolean> => {
  if (!isSupabaseEnabled) return false;
  try {
    const { error } = await supabase!
      .from('shrinkage_debts')
      .update({
        status,
        notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', debtId);

    if (!error && status === 'ACKNOWLEDGED') {
      // Update agent's acknowledged shrinkage debt
      const { data: debt } = await supabase!
        .from('shrinkage_debts')
        .select('*')
        .eq('id', debtId)
        .single();

      if (debt) {
        const { data: agent } = await supabase!
          .from('agents')
          .select('acknowledged_shrinkage_debt')
          .eq('id', debt.agent_id)
          .single();

        if (agent) {
          await supabase!
            .from('agents')
            .update({
              acknowledged_shrinkage_debt:
                (agent.acknowledged_shrinkage_debt || 0) +
                debt.total_debt_amount,
            })
            .eq('id', debt.agent_id);
        }
      }
    }

    return !error;
  } catch (err) {
    console.error('Error updating shrinkage debt status:', err);
    return false;
  }
};

export const getAgentShrinkageSummary = async (
  agentId: string
): Promise<{
  agent_id: string;
  agent_name: string;
  total_shrinkage_incidents: number;
  pending_incidents: number;
  acknowledged_incidents: number;
  total_shrinkage_amount: number;
  acknowledged_amount: number;
  resolved_amount: number;
  total_sales_value: number;
  shrinkage_to_sales_ratio: number;
} | null> => {
  if (!isSupabaseEnabled) return null;
  try {
    const { data } = await supabase!
      .from('agent_shrinkage_summary')
      .select('*')
      .eq('agent_id', agentId)
      .single();
    return data;
  } catch (err) {
    console.error('Error fetching agent shrinkage summary:', err);
    return null;
  }
};

export const resolveShrinkageDebt = async (
  debtId: string,
  resolvedAmount: number
): Promise<boolean> => {
  if (!isSupabaseEnabled) return false;
  try {
    const { error } = await supabase!
      .from('shrinkage_debts')
      .update({
        status: 'RESOLVED',
        notes: `Resolved: KES ${resolvedAmount} deducted from salary`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', debtId);

    if (!error) {
      // Optionally: create a deduction record in payroll system
      console.log(
        `✅ Shrinkage debt resolved: KES ${resolvedAmount} deducted`
      );
    }

    return !error;
  } catch (err) {
    console.error('Error resolving shrinkage debt:', err);
    return false;
  }
};

export const getStoreWideShrinkageStats = async (storeId: string) => {
  if (!isSupabaseEnabled) return null;
  try {
    const { data } = await supabase!
      .from('shrinkage_debts')
      .select('total_debt_amount, status')
      .eq('store_id', storeId);

    if (!data) return null;

    const stats = {
      totalShrinkageLoss: data.reduce(
        (sum, d) => sum + (d.total_debt_amount || 0),
        0
      ),
      pendingDebts: data
        .filter((d) => d.status === 'PENDING')
        .reduce((sum, d) => sum + (d.total_debt_amount || 0), 0),
      acknowledgedDebts: data
        .filter((d) => d.status === 'ACKNOWLEDGED')
        .reduce((sum, d) => sum + (d.total_debt_amount || 0), 0),
      resolvedDebts: data
        .filter((d) => d.status === 'RESOLVED')
        .reduce((sum, d) => sum + (d.total_debt_amount || 0), 0),
      incidentCount: data.length,
    };

    return stats;
  } catch (err) {
    console.error('Error fetching store shrinkage stats:', err);
    return null;
  }
};
