import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, TrendingUp, AlertCircle, CheckCircle2, Lock, Unlock, Download, Eye } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { StoreProfile } from '../types';
import { BlindClose } from './BlindClose';

interface ReconciliationData {
  date: string;
  cashTotal: number;
  mpesaTotal: number;
  madeniTotal: number;
  cardTotal: number;
  grandTotal: number;
  transactions: {
    cash: number;
    mpesa: number;
    madeni: number;
    card: number;
  };
}

interface DailyReconciliationProps {
  store: StoreProfile;
}

/**
 * Daily Reconciliation Report
 * Shows breakdown of sales by payment method for end-of-day reconciliation
 */
export const DailyReconciliation: React.FC<DailyReconciliationProps> = ({ store }) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<ReconciliationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch reconciliation data for selected date
  useEffect(() => {
    const fetchReconciliation = async () => {
      if (!selectedDate) return;

      setLoading(true);
      setError('');

      try {
        const startDate = `${selectedDate}T00:00:00`;
        const endDate = `${selectedDate}T23:59:59`;

        const { data: transactions, error: txError } = await supabase
          .from('sales_records')
          .select('id, total_amount, payment_mode, created_at')
          .eq('store_id', store.id)
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .order('created_at', { ascending: true });

        if (txError) throw txError;

        // Calculate totals by payment method
        const reconciliation: ReconciliationData = {
          date: selectedDate,
          cashTotal: 0,
          mpesaTotal: 0,
          madeniTotal: 0,
          cardTotal: 0,
          grandTotal: 0,
          transactions: {
            cash: 0,
            mpesa: 0,
            madeni: 0,
            card: 0,
          },
        };

        if (transactions && transactions.length > 0) {
          transactions.forEach((tx) => {
            const method = tx.payment_mode?.toUpperCase();
            const amount = tx.total_amount || 0;

            switch (method) {
              case 'CASH':
                reconciliation.cashTotal += amount;
                reconciliation.transactions.cash += 1;
                break;
              case 'MPESA':
                reconciliation.mpesaTotal += amount;
                reconciliation.transactions.mpesa += 1;
                break;
              case 'MADENI':
                reconciliation.madeniTotal += amount;
                reconciliation.transactions.madeni += 1;
                break;
              case 'CARD':
                reconciliation.cardTotal += amount;
                reconciliation.transactions.card += 1;
                break;
            }
          });
        }

        reconciliation.grandTotal = 
          reconciliation.cashTotal + 
          reconciliation.mpesaTotal + 
          reconciliation.cardTotal;
        // Note: Madeni NOT included in grand total (it's credit, not paid)

        setData(reconciliation);
      } catch (err) {
        console.error('Error fetching reconciliation:', err);
        setError('Failed to load reconciliation data');
      } finally {
        setLoading(false);
      }
    };

    fetchReconciliation();
  }, [selectedDate, store.id]);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-KE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Daily Reconciliation</h1>
        <p className="text-gray-600 mt-1">End-of-day payment breakdown by method</p>
      </div>

      {/* Date Selector */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <Calendar className="w-5 h-5 text-gray-500" />
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-gray-600">{formatDate(selectedDate)}</span>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      )}

      {/* Reconciliation Cards */}
      {data && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* CASH Card */}
          <div className="bg-white rounded-lg shadow-sm border-l-4 border-green-500 p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-700">💵 Cash</h3>
              <span className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full font-bold">
                {data.transactions.cash} sales
              </span>
            </div>
            <p className="text-3xl font-bold text-green-600">{formatCurrency(data.cashTotal)}</p>
            <p className="text-xs text-gray-500 mt-2">Should match drawer count</p>
          </div>

          {/* M-PESA Card */}
          <div className="bg-white rounded-lg shadow-sm border-l-4 border-orange-500 p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-700">📱 M-Pesa</h3>
              <span className="text-xs bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-bold">
                {data.transactions.mpesa} sales
              </span>
            </div>
            <p className="text-3xl font-bold text-orange-600">{formatCurrency(data.mpesaTotal)}</p>
            <p className="text-xs text-gray-500 mt-2">Verify in owner's M-Pesa app</p>
          </div>

          {/* CARD Card */}
          <div className="bg-white rounded-lg shadow-sm border-l-4 border-blue-500 p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-700">💳 Card</h3>
              <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-bold">
                {data.transactions.card} sales
              </span>
            </div>
            <p className="text-3xl font-bold text-blue-600">{formatCurrency(data.cardTotal)}</p>
            <p className="text-xs text-gray-500 mt-2">Processed automatically</p>
          </div>

          {/* MADENI Card */}
          <div className="bg-white rounded-lg shadow-sm border-l-4 border-purple-500 p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-700">📒 Madeni</h3>
              <span className="text-xs bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-bold">
                {data.transactions.madeni} sales
              </span>
            </div>
            <p className="text-3xl font-bold text-purple-600">{formatCurrency(data.madeniTotal)}</p>
            <p className="text-xs text-gray-500 mt-2">Outstanding credit</p>
          </div>
        </div>
      )}

      {/* Grand Total & Summary */}
      {data && !loading && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg shadow-lg p-8">
          <div className="grid grid-cols-2 gap-8">
            {/* Cash Expected vs M-Pesa */}
            <div>
              <h3 className="text-sm font-semibold text-blue-100 mb-3">Expected in Drawer</h3>
              <p className="text-4xl font-bold text-green-300 mb-2">{formatCurrency(data.cashTotal)}</p>
              <p className="text-xs text-blue-100">Count physical cash and reconcile</p>
            </div>

            {/* Bank/Online Payments */}
            <div>
              <h3 className="text-sm font-semibold text-blue-100 mb-3">Expected in Bank</h3>
              <p className="text-4xl font-bold text-orange-300 mb-2">{formatCurrency(data.mpesaTotal + data.cardTotal)}</p>
              <p className="text-xs text-blue-100">M-Pesa + Card payments</p>
            </div>

            {/* Grand Total */}
            <div className="col-span-2 border-t border-blue-400 pt-6 mt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-100 mb-2">Total Cash + Card (excluding credit)</p>
                  <p className="text-5xl font-bold">{formatCurrency(data.grandTotal)}</p>
                </div>
                <div className="text-right">
                  {data.madeniTotal > 0 && (
                    <div className="mb-4">
                      <p className="text-sm text-purple-200">Outstanding Credit</p>
                      <p className="text-3xl font-bold text-purple-300">{formatCurrency(data.madeniTotal)}</p>
                    </div>
                  )}
                  <CheckCircle2 className="w-12 h-12 text-green-300 mx-auto" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {data && !loading && data.grandTotal === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-600 text-lg">No sales recorded for this date</p>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-3">
        <h4 className="font-bold text-blue-900 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          End-of-Day Reconciliation Steps
        </h4>
        <ol className="text-sm text-blue-900 space-y-2 ml-7 list-decimal">
          <li><strong>Cash:</strong> Count physical cash in drawer, compare to "Expected in Drawer" above</li>
          <li><strong>M-Pesa:</strong> Ask owner to check their M-Pesa app → Confirm amount matches</li>
          <li><strong>Card:</strong> Should process automatically (no action needed)</li>
          <li><strong>Madeni:</strong> Follow up with customers who owe - see Debtors list</li>
          <li>If differences found, review individual sales in Sales History</li>
        </ol>
      </div>
    </div>
  );
};

export default DailyReconciliation;
