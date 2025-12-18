import React, { useEffect, useState } from 'react';
import { Download, DollarSign, Calendar, CheckCircle, XCircle, Clock, AlertCircle, X } from 'lucide-react';
import { getStorePaymentHistory } from '../services/billingService';

interface StorePaymentHistoryProps {
  storeId: string;
  storeName?: string;
  onClose?: () => void;
}

interface PaymentRecord {
  id: string;
  amount: number;
  plan_name: string;
  payment_method: string;
  payment_ref: string;
  status: 'completed' | 'failed' | 'pending' | 'refunded';
  paid_at: string;
  description: string;
}

export const StorePaymentHistory: React.FC<StorePaymentHistoryProps> = ({ storeId, storeName, onClose }) => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPayments = async () => {
      setLoading(true);
      const data = await getStorePaymentHistory(storeId);
      setPayments(data || []);
      setLoading(false);
    };
    loadPayments();
  }, [storeId]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'refunded':
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      refunded: 'bg-orange-100 text-orange-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const downloadReceipt = (payment: PaymentRecord) => {
    const receiptText = `
PAYMENT RECEIPT
===============================
Receipt Number: ${payment.id}
Payment Reference: ${payment.payment_ref}
Date: ${formatDate(payment.paid_at)}

Plan: ${payment.plan_name}
Amount: ${formatCurrency(payment.amount)}
Payment Method: ${payment.payment_method}
Status: ${payment.status}

Description: ${payment.description || 'N/A'}

Thank you for your payment!
    `.trim();

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(receiptText));
    element.setAttribute('download', `receipt_${payment.payment_ref}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      {onClose && (
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            Payment History {storeName && `- ${storeName}`}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Loading payment history...</div>
        </div>
      ) : payments.length === 0 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <DollarSign className="w-12 h-12 text-blue-400 mx-auto mb-3" />
          <p className="text-gray-600">No payments yet. Upgrade your plan to start tracking payments.</p>
        </div>
      ) : (
        <>
          {/* Summary Card */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Paid</p>
                <p className="text-3xl font-bold text-green-700">
                  {formatCurrency(
                    payments
                      .filter(p => p.status === 'completed')
                      .reduce((sum, p) => sum + p.amount, 0)
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-1">{payments.length} transactions</p>
              </div>
              <DollarSign className="w-16 h-16 text-green-200" />
            </div>
          </div>

          {/* Payments Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Plan</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Amount</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Method</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-900">{formatDate(payment.paid_at)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="font-medium text-gray-900 capitalize">
                          {payment.plan_name?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {payment.payment_method}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(payment.status)}
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(payment.status)} capitalize`}>
                            {payment.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => downloadReceipt(payment)}
                          className="inline-flex items-center space-x-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          <span className="text-xs font-medium">Receipt</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Help Text */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              <strong>💡 Tip:</strong> Download receipts for your records. Contact support if you have questions about any payment.
            </p>
          </div>
        </>
      )}
    </div>
  );
};
