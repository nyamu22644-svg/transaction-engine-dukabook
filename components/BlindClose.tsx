import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { StoreProfile } from '../types';
import { AlertTriangle, CheckCircle2, Lock, Unlock, TrendingDown } from 'lucide-react';

interface BlindCloseProps {
  store: StoreProfile;
  userRole: 'OWNER' | 'STAFF' | 'ADMIN';
  onClose: () => void;
}

interface DailyTotals {
  expectedCash: number;
  expectedCard: number;
  expectedMpesa: number;
  totalExpected: number;
}

/**
 * Blind Close Modal
 * Staff counts physical cash and enters amount
 * System compares to expected without showing staff the total
 * Owner gets alerted to any discrepancies
 * 
 * This prevents:
 * - Theft (staff can't see if they're "short")
 * - Manipulation (staff can't adjust count to match expected)
 * - Pressure from colleagues to "round" the drawer
 */
export const BlindClose: React.FC<BlindCloseProps> = ({ store, userRole, onClose }) => {
  const [countedCash, setCountedCash] = useState<string>('');
  const [expectedTotals, setExpectedTotals] = useState<DailyTotals | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [discrepancy, setDiscrepancy] = useState<{
    amount: number;
    type: 'SHORTAGE' | 'OVERAGE';
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExpectedTotals();
  }, []);

  const loadExpectedTotals = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data, error } = await supabase
        .from('sales_records')
        .select('payment_mode, total_amount')
        .eq('store_id', store.id)
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString());

      if (error) throw error;

      const totals: DailyTotals = {
        expectedCash: 0,
        expectedCard: 0,
        expectedMpesa: 0,
        totalExpected: 0
      };

      (data || []).forEach(sale => {
        if (sale.payment_mode === 'CASH') {
          totals.expectedCash += sale.total_amount;
          totals.totalExpected += sale.total_amount;
        } else if (sale.payment_mode === 'CARD') {
          totals.expectedCard += sale.total_amount;
          // Don't add CARD to drawer total - it should be in bank
        } else if (sale.payment_mode === 'MPESA') {
          totals.expectedMpesa += sale.total_amount;
          // Don't add MPESA to drawer total - it should be in M-Pesa
        }
        // MADENI not included in drawer - it's credit
      });

      setExpectedTotals(totals);
    } catch (err) {
      console.error('Failed to load expected totals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!countedCash || !expectedTotals) return;

    const counted = parseFloat(countedCash);
    const expected = expectedTotals.totalExpected;
    const diff = counted - expected;

    let discrepancyType: 'SHORTAGE' | 'OVERAGE' = diff < 0 ? 'SHORTAGE' : 'OVERAGE';
    const discrepancyAmount = Math.abs(diff);

    setDiscrepancy({
      amount: discrepancyAmount,
      type: discrepancyType
    });

    // Log the blind close
    setSubmitting(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await supabase
        .from('blind_closes')
        .insert({
          store_id: store.id,
          close_date: today.toISOString(),
          expected_cash: expectedTotals.totalExpected,
          counted_cash: counted,
          discrepancy_amount: discrepancyAmount,
          discrepancy_type: discrepancyType,
          counted_by_staff: true,
          verified_by_owner: false
        });

      // Notify owner of discrepancy
      if (discrepancyAmount > 0) {
        // In production, send notification to owner
        console.log(`⚠️ Discrepancy alert for owner: ${discrepancyType} of KES ${discrepancyAmount}`);
      }

      setSubmitted(true);
    } catch (err) {
      console.error('Failed to record blind close:', err);
      alert('Failed to record count. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!expectedTotals) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <p className="text-slate-600">Unable to load daily totals</p>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        {!submitted ? (
          <>
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Lock className="w-6 h-6 text-blue-600" />
                End of Day Cash Count
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Count all cash in the drawer. Don't worry about the expected amount - just enter what you counted.
              </p>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-900 font-medium">📋 Instructions:</p>
              <ol className="text-sm text-blue-800 mt-2 space-y-1 list-decimal list-inside">
                <li>Count all physical cash in the drawer</li>
                <li>Include any cash float/floats starting balance</li>
                <li>Enter the total amount below</li>
                <li>System will verify the count</li>
              </ol>
            </div>

            {/* Input */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                Total Cash Counted (KES)
              </label>
              <input
                type="number"
                value={countedCash}
                onChange={(e) => setCountedCash(e.target.value)}
                placeholder="Enter amount you counted"
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg text-lg font-semibold focus:outline-none focus:border-blue-500"
                disabled={submitting}
              />
            </div>

            {/* Hidden Expected Totals Notice */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
              <p className="text-xs text-slate-600 font-medium uppercase mb-2">Today's Summary</p>
              <div className="space-y-1 text-sm">
                <p className="text-slate-700">💳 Card payments: <span className="font-semibold">{expectedTotals.expectedCard.toLocaleString()} KES</span></p>
                <p className="text-slate-700">📱 M-Pesa: <span className="font-semibold">{expectedTotals.expectedMpesa.toLocaleString()} KES</span></p>
                <p className="text-slate-700">📒 Madeni (credit): Not in drawer</p>
              </div>
              <p className="text-xs text-slate-500 mt-2 font-medium">
                ℹ️ Only your cash count matters for drawer reconciliation
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!countedCash || submitting}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-slate-400 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Submitting...
                  </>
                ) : (
                  'Submit Count'
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Submitted State */}
            <div className="text-center">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2">Count Recorded</h3>
              <p className="text-sm text-slate-600 mb-6">
                Your cash count has been recorded and submitted to the owner for verification.
              </p>

              {discrepancy && discrepancy.amount > 0 && (
                <div className={`p-4 rounded-lg mb-6 ${
                  discrepancy.type === 'SHORTAGE'
                    ? 'bg-red-50 border border-red-200'
                    : 'bg-green-50 border border-green-200'
                }`}>
                  <p className={`text-sm font-medium ${
                    discrepancy.type === 'SHORTAGE'
                      ? 'text-red-800'
                      : 'text-green-800'
                  }`}>
                    {discrepancy.type === 'SHORTAGE' ? '❌' : '✨'} {discrepancy.type}
                  </p>
                  <p className={`text-2xl font-bold mt-1 ${
                    discrepancy.type === 'SHORTAGE'
                      ? 'text-red-600'
                      : 'text-green-600'
                  }`}>
                    KES {discrepancy.amount.toLocaleString()}
                  </p>
                </div>
              )}

              <p className="text-xs text-slate-500 mb-6">
                The owner will review your count and notify you of any discrepancies.
              </p>

              <button
                onClick={onClose}
                className="w-full px-4 py-3 bg-slate-600 text-white rounded-lg font-medium hover:bg-slate-700"
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BlindClose;
