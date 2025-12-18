import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { StoreProfile } from '../types';
import { 
  AlertCircle, MessageCircle, CheckCircle2, Trash2, TrendingUp, 
  DollarSign, Calendar, Phone, User, Edit3, X, Check, ChevronDown,
  ChevronUp, Activity, Filter, Search, Download, Plus
} from 'lucide-react';

interface Debtor {
  id: string;
  customer_name: string;
  customer_phone: string;
  total_debt: number;
  last_sale_date: string;
  created_at: string;
  status: 'ACTIVE' | 'SETTLED' | 'PARTIAL';
}

interface PaymentRecord {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  notes?: string;
}

interface AuditEntry {
  id: string;
  action_type: string;
  change_description: string;
  created_at: string;
  actor_name: string;
}

interface DebtorDashboardProps {
  store: StoreProfile;
  userRole: 'OWNER' | 'STAFF' | 'ADMIN';
  employeeId?: string;
}

export const DebtorDashboard: React.FC<DebtorDashboardProps> = ({ 
  store, 
  userRole,
  employeeId 
}) => {
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [filteredDebtors, setFilteredDebtors] = useState<Debtor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDebtor, setSelectedDebtor] = useState<Debtor | null>(null);
  const [auditHistory, setAuditHistory] = useState<AuditEntry[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showForgiveModal, setShowForgiveModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'MPESA' | 'CARD'>('CASH');
  const [forgiveAmount, setForgiveAmount] = useState<string>('');
  const [forgiveReason, setForgiveReason] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'debt' | 'date' | 'name'>('debt');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'SETTLED'>('ACTIVE');

  // Load debtors
  useEffect(() => {
    const loadDebtors = async () => {
      try {
        const { data, error } = await supabase
          .from('debtors')
          .select('*')
          .eq('store_id', store.id)
          .order('total_debt', { ascending: false });

        if (error) throw error;
        setDebtors(data || []);
        filterAndSortDebtors(data || []);
      } catch (err) {
        console.error('Failed to load debtors:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDebtors();
  }, [store.id]);

  // Load audit history for selected debtor
  useEffect(() => {
    if (!selectedDebtor) return;

    const loadAuditHistory = async () => {
      try {
        const { data, error } = await supabase
          .from('audit_logs')
          .select('id, action_type, change_description, created_at, actor_name')
          .eq('store_id', store.id)
          .eq('affected_customer_id', selectedDebtor.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;
        setAuditHistory(data || []);
      } catch (err) {
        console.error('Failed to load audit history:', err);
      }
    };

    loadAuditHistory();
  }, [selectedDebtor, store.id]);

  const filterAndSortDebtors = (data: Debtor[]) => {
    let filtered = data;

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(d =>
        d.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.customer_phone.includes(searchTerm)
      );
    }

    // Apply status filter
    if (filterStatus !== 'ALL') {
      filtered = filtered.filter(d => d.status === filterStatus);
    }

    // Apply sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'debt':
          return b.total_debt - a.total_debt;
        case 'date':
          return new Date(b.last_sale_date).getTime() - new Date(a.last_sale_date).getTime();
        case 'name':
          return a.customer_name.localeCompare(b.customer_name);
        default:
          return 0;
      }
    });

    setFilteredDebtors(filtered);
  };

  // Re-filter when search/sort/filter changes
  useEffect(() => {
    filterAndSortDebtors(debtors);
  }, [searchTerm, sortBy, filterStatus, debtors]);

  const handleAcceptPayment = async () => {
    if (!selectedDebtor || !paymentAmount || isNaN(parseFloat(paymentAmount))) {
      alert('Please enter a valid amount');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (amount <= 0 || amount > selectedDebtor.total_debt) {
      alert('Payment amount must be between 0 and ' + selectedDebtor.total_debt);
      return;
    }

    try {
      // Update debtor record
      const newDebt = selectedDebtor.total_debt - amount;
      const { error: updateError } = await supabase
        .from('debtors')
        .update({
          total_debt: newDebt,
          status: newDebt === 0 ? 'SETTLED' : 'PARTIAL',
          last_sale_date: new Date().toISOString()
        })
        .eq('id', selectedDebtor.id);

      if (updateError) throw updateError;

      // Log to audit
      await supabase
        .from('audit_logs')
        .insert({
          store_id: store.id,
          action_type: 'PAYMENT_ACCEPTED',
          resource_type: 'DEBTOR',
          affected_customer_id: selectedDebtor.id,
          affected_customer_name: selectedDebtor.customer_name,
          affected_customer_phone: selectedDebtor.customer_phone,
          actor_name: 'Staff',
          actor_role: userRole,
          change_description: `Payment of KES ${amount} received from ${selectedDebtor.customer_name}. Balance: KES ${newDebt}`,
          new_value: { total_debt: newDebt, status: newDebt === 0 ? 'SETTLED' : 'PARTIAL' },
          metadata: { payment_method: paymentMethod }
        });

      // Update local state
      const updated = {
        ...selectedDebtor,
        total_debt: newDebt,
        status: newDebt === 0 ? 'SETTLED' : 'PARTIAL'
      } as Debtor;
      setSelectedDebtor(updated);
      const updatedList = debtors.map(d => d.id === selectedDebtor.id ? updated : d);
      setDebtors(updatedList);

      setPaymentAmount('');
      setShowPaymentModal(false);
      alert(`Payment accepted! Remaining debt: KES ${newDebt}`);
    } catch (err) {
      console.error('Failed to record payment:', err);
      alert('Failed to record payment');
    }
  };

  const handleForgiveDebt = async () => {
    if (!selectedDebtor || !forgiveReason.trim()) {
      alert('Please provide a reason for forgiving this debt');
      return;
    }

    if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
      alert('Only store owners can forgive debts');
      return;
    }

    try {
      const forgivenAmount = selectedDebtor.total_debt;

      // Update debtor
      const { error: updateError } = await supabase
        .from('debtors')
        .update({
          total_debt: 0,
          status: 'SETTLED'
        })
        .eq('id', selectedDebtor.id);

      if (updateError) throw updateError;

      // Log to audit
      await supabase
        .from('audit_logs')
        .insert({
          store_id: store.id,
          action_type: 'DEBT_FORGIVEN',
          resource_type: 'DEBTOR',
          affected_customer_id: selectedDebtor.id,
          affected_customer_name: selectedDebtor.customer_name,
          affected_customer_phone: selectedDebtor.customer_phone,
          actor_name: 'Owner',
          actor_role: userRole,
          change_description: `Debt of KES ${forgivenAmount} forgiven for ${selectedDebtor.customer_name}. Reason: ${forgiveReason}`,
          new_value: { total_debt: 0, status: 'SETTLED' },
          metadata: { reason: forgiveReason }
        });

      // Update local state
      const updated = {
        ...selectedDebtor,
        total_debt: 0,
        status: 'SETTLED'
      } as Debtor;
      setSelectedDebtor(updated);
      const updatedList = debtors.map(d => d.id === selectedDebtor.id ? updated : d);
      setDebtors(updatedList);

      setForgiveAmount('');
      setForgiveReason('');
      setShowForgiveModal(false);
      alert(`Debt of KES ${forgivenAmount} forgiven for ${selectedDebtor.customer_name}`);
    } catch (err) {
      console.error('Failed to forgive debt:', err);
      alert('Failed to forgive debt');
    }
  };

  const sendWhatsAppReminder = (debtor: Debtor) => {
    if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
      alert('Only store owners can send reminders');
      return;
    }

    const message = `Hi ${debtor.customer_name}, you have an outstanding balance of KES ${debtor.total_debt} from your recent purchases. Please settle when possible. Thank you!`;
    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${debtor.customer_phone}?text=${encoded}`;
    window.open(url, '_blank');

    // Log to audit
    supabase
      .from('audit_logs')
      .insert({
        store_id: store.id,
        action_type: 'PAYMENT_ACCEPTED',
        resource_type: 'DEBTOR',
        affected_customer_id: debtor.id,
        affected_customer_name: debtor.customer_name,
        affected_customer_phone: debtor.customer_phone,
        actor_name: 'Owner',
        actor_role: userRole,
        change_description: `WhatsApp reminder sent to ${debtor.customer_name}`,
        metadata: { action: 'WHATSAPP_REMINDER' }
      });
  };

  const totalDebt = debtors.reduce((sum, d) => sum + d.total_debt, 0);
  const activeCount = debtors.filter(d => d.status === 'ACTIVE').length;
  const settledCount = debtors.filter(d => d.status === 'SETTLED').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading debtors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-red-500" />
            Madeni Management (Credit Tracking)
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Track and manage customer debts. {debtors.length} customers, KES {totalDebt.toLocaleString()} outstanding
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 font-medium">Total Outstanding</p>
              <p className="text-2xl font-bold text-red-700">KES {totalDebt.toLocaleString()}</p>
            </div>
            <DollarSign className="w-8 h-8 text-red-400 opacity-50" />
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-600 font-medium">Active Debtors</p>
              <p className="text-2xl font-bold text-yellow-700">{activeCount}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-yellow-400 opacity-50" />
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Settled</p>
              <p className="text-2xl font-bold text-green-700">{settledCount}</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-green-400 opacity-50" />
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Name or phone"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="debt">Highest Debt</option>
              <option value="date">Latest Transaction</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All</option>
              <option value="ACTIVE">Active</option>
              <option value="SETTLED">Settled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">&nbsp;</label>
            <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Debtors List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Debtors Table */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            {filteredDebtors.length === 0 ? (
              <div className="p-8 text-center">
                <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600">No debtors matching your criteria</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Phone</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Last Sale</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredDebtors.map((debtor) => (
                      <tr
                        key={debtor.id}
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={() => setSelectedDebtor(debtor)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{
                              backgroundColor: debtor.status === 'SETTLED' ? '#10b981' : '#ef4444'
                            }}></div>
                            <span className="font-medium text-slate-900">{debtor.customer_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{debtor.customer_phone}</td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-semibold text-red-600">
                            KES {debtor.total_debt.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {new Date(debtor.last_sale_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDebtor(debtor);
                            }}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Debtor Detail Panel */}
        {selectedDebtor && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 h-fit sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">{selectedDebtor.customer_name}</h3>
              <button
                onClick={() => setSelectedDebtor(null)}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Debtor Info */}
            <div className="space-y-3 mb-6 pb-6 border-b border-slate-200">
              <div>
                <p className="text-xs text-slate-600 uppercase font-medium">Phone</p>
                <p className="text-sm font-medium text-slate-900">{selectedDebtor.customer_phone}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 uppercase font-medium">Outstanding Balance</p>
                <p className="text-2xl font-bold text-red-600">KES {selectedDebtor.total_debt.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 uppercase font-medium">Status</p>
                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                  selectedDebtor.status === 'SETTLED'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {selectedDebtor.status}
                </span>
              </div>
              <div>
                <p className="text-xs text-slate-600 uppercase font-medium">Last Transaction</p>
                <p className="text-sm text-slate-700">
                  {new Date(selectedDebtor.last_sale_date).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 mb-6">
              {selectedDebtor.total_debt > 0 && (
                <>
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Accept Payment
                  </button>
                  {userRole !== 'STAFF' && (
                    <>
                      <button
                        onClick={() => setShowForgiveModal(true)}
                        className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700"
                      >
                        Forgive Debt
                      </button>
                      <button
                        onClick={() => sendWhatsAppReminder(selectedDebtor)}
                        className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
                      >
                        <MessageCircle className="w-4 h-4" />
                        WhatsApp Reminder
                      </button>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Audit History */}
            {auditHistory.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Recent Activity
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {auditHistory.map((entry) => (
                    <div key={entry.id} className="text-xs bg-slate-50 p-2 rounded border border-slate-200">
                      <p className="font-medium text-slate-900">{entry.action_type.replace(/_/g, ' ')}</p>
                      <p className="text-slate-600 mt-1">{entry.change_description}</p>
                      <p className="text-slate-500 mt-1">
                        {entry.actor_name} · {new Date(entry.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedDebtor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              Record Payment - {selectedDebtor.customer_name}
            </h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Outstanding Balance</label>
                <p className="text-2xl font-bold text-red-600">KES {selectedDebtor.total_debt.toLocaleString()}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Payment Amount (KES)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  max={selectedDebtor.total_debt}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="CASH">Cash</option>
                  <option value="MPESA">M-Pesa</option>
                  <option value="CARD">Card</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAcceptPayment}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forgive Debt Modal */}
      {showForgiveModal && selectedDebtor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              Forgive Debt - {selectedDebtor.customer_name}
            </h3>

            <div className="space-y-4 mb-6">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm text-orange-800">
                  You are about to forgive <span className="font-bold">KES {selectedDebtor.total_debt.toLocaleString()}</span> from {selectedDebtor.customer_name}. This action is permanent and will be logged.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Reason for Forgiveness</label>
                <textarea
                  value={forgiveReason}
                  onChange={(e) => setForgiveReason(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g., Customer goodwill, long-time relationship, etc."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowForgiveModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleForgiveDebt}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700"
              >
                Forgive Debt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebtorDashboard;
