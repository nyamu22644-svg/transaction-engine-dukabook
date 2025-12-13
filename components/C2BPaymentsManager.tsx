import React, { useEffect, useState } from 'react';
import { X, Link2, CheckCircle, AlertCircle, RefreshCw, Search, Phone, Calendar, CreditCard } from 'lucide-react';
import { supabase, isSupabaseEnabled } from '../services/supabaseClient';

interface C2BTransaction {
  id: string;
  trans_id: string;
  trans_type: string;
  trans_time: string;
  trans_amount: number;
  business_short_code: string;
  bill_ref_number: string;
  msisdn: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  store_id: string | null;
  status: 'VALIDATING' | 'COMPLETED' | 'PROCESSED' | 'UNMATCHED' | 'CREDITED';
  subscription_activated: boolean;
  plan_id: string | null;
  notes: string | null;
  created_at: string;
}

interface StoreOption {
  id: string;
  name: string;
  access_code: string;
}

interface C2BPaymentsManagerProps {
  onClose: () => void;
}

export const C2BPaymentsManager: React.FC<C2BPaymentsManagerProps> = ({ onClose }) => {
  const [transactions, setTransactions] = useState<C2BTransaction[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unmatched' | 'processed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Link modal state
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState<C2BTransaction | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('basic-monthly');
  const [linking, setLinking] = useState(false);

  const loadData = async () => {
    if (!isSupabaseEnabled || !supabase) return;
    
    setLoading(true);
    try {
      // Load C2B transactions
      const { data: txData } = await supabase
        .from('mpesa_c2b_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (txData) setTransactions(txData);

      // Load stores for linking
      const { data: storeData } = await supabase
        .from('stores')
        .select('id, name, access_code')
        .order('name');
      
      if (storeData) setStores(storeData);
    } catch (err) {
      console.error('Error loading C2B data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openLinkModal = (tx: C2BTransaction) => {
    setSelectedTx(tx);
    setSelectedStoreId('');
    setSelectedPlan(tx.trans_amount >= 1000 ? 'premium-monthly' : 'basic-monthly');
    setShowLinkModal(true);
  };

  const handleLink = async () => {
    if (!selectedTx || !selectedStoreId || !supabase) return;
    
    setLinking(true);
    try {
      // Call the database function to link payment
      const { data, error } = await supabase.rpc('link_c2b_payment_to_store', {
        p_trans_id: selectedTx.trans_id,
        p_store_id: selectedStoreId,
        p_plan_id: selectedPlan,
      });

      if (error) {
        alert(`Error: ${error.message}`);
      } else if (data?.success) {
        alert('Payment linked successfully! Subscription activated.');
        setShowLinkModal(false);
        loadData();
      } else {
        alert(`Failed: ${data?.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLinking(false);
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    // Filter by status
    if (filter === 'unmatched' && tx.status !== 'UNMATCHED' && tx.status !== 'CREDITED') return false;
    if (filter === 'processed' && tx.status !== 'PROCESSED') return false;
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const name = `${tx.first_name} ${tx.middle_name} ${tx.last_name}`.toLowerCase();
      const matchesName = name.includes(query);
      const matchesRef = tx.bill_ref_number?.toLowerCase().includes(query);
      const matchesReceipt = tx.trans_id.toLowerCase().includes(query);
      const matchesPhone = tx.msisdn?.includes(query);
      return matchesName || matchesRef || matchesReceipt || matchesPhone;
    }
    
    return true;
  });

  const formatDateTime = (timestamp: string) => {
    try {
      // M-Pesa format: YYYYMMDDHHmmss
      if (timestamp.length === 14) {
        const year = timestamp.slice(0, 4);
        const month = timestamp.slice(4, 6);
        const day = timestamp.slice(6, 8);
        const hour = timestamp.slice(8, 10);
        const min = timestamp.slice(10, 12);
        return `${day}/${month}/${year} ${hour}:${min}`;
      }
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PROCESSED': return 'text-green-400 bg-green-900/30 border-green-500/30';
      case 'UNMATCHED': return 'text-amber-400 bg-amber-900/30 border-amber-500/30';
      case 'CREDITED': return 'text-blue-400 bg-blue-900/30 border-blue-500/30';
      case 'COMPLETED': return 'text-slate-400 bg-slate-900/30 border-slate-500/30';
      default: return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  const getStoreName = (storeId: string | null) => {
    if (!storeId) return '—';
    const store = stores.find(s => s.id === storeId);
    return store ? store.name : storeId.slice(0, 8) + '...';
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-6xl my-8 shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-800">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <CreditCard className="w-6 h-6 text-green-500" />
              C2B Payments Manager
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Direct payments to Till 400200 • Link unmatched payments to stores
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-2 hover:bg-slate-800 rounded-lg transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-800 flex flex-wrap gap-4 items-center">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              All ({transactions.length})
            </button>
            <button
              onClick={() => setFilter('unmatched')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'unmatched' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Unmatched ({transactions.filter(t => t.status === 'UNMATCHED' || t.status === 'CREDITED').length})
            </button>
            <button
              onClick={() => setFilter('processed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'processed' ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Processed ({transactions.filter(t => t.status === 'PROCESSED').length})
            </button>
          </div>

          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by name, phone, receipt..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <button
            onClick={loadData}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 px-4 rounded-lg flex items-center gap-2 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
              Loading transactions...
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No C2B transactions found</p>
              <p className="text-sm mt-1">Payments to Till 400200 will appear here</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="p-4">Receipt</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Reference</th>
                  <th className="p-4">Store</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/30 transition">
                    <td className="p-4">
                      <span className="font-mono text-sm text-white">{tx.trans_id}</span>
                    </td>
                    <td className="p-4">
                      <div className="text-white text-sm">
                        {[tx.first_name, tx.middle_name, tx.last_name].filter(Boolean).join(' ') || '—'}
                      </div>
                      <div className="text-slate-500 text-xs flex items-center gap-1 mt-1">
                        <Phone className="w-3 h-3" />
                        {tx.msisdn || '—'}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-green-400 font-bold">KES {tx.trans_amount.toLocaleString()}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-slate-300 font-mono text-sm bg-slate-800 px-2 py-1 rounded">
                        {tx.bill_ref_number || '—'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-slate-300 text-sm">{getStoreName(tx.store_id)}</span>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded border ${getStatusColor(tx.status)}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-slate-400 text-sm flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDateTime(tx.trans_time || tx.created_at)}
                      </span>
                    </td>
                    <td className="p-4">
                      {(tx.status === 'UNMATCHED' || tx.status === 'CREDITED') && (
                        <button
                          onClick={() => openLinkModal(tx)}
                          className="bg-blue-600 hover:bg-blue-500 text-white text-xs py-2 px-3 rounded-lg flex items-center gap-1 transition"
                        >
                          <Link2 className="w-3 h-3" />
                          Link
                        </button>
                      )}
                      {tx.status === 'PROCESSED' && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Stats */}
        <div className="p-4 border-t border-slate-800 bg-slate-800/30 flex justify-between items-center text-sm">
          <div className="text-slate-400">
            Showing {filteredTransactions.length} of {transactions.length} transactions
          </div>
          <div className="flex gap-6 text-slate-400">
            <span>
              Total Processed: <span className="text-green-400 font-bold">
                KES {transactions.filter(t => t.status === 'PROCESSED').reduce((sum, t) => sum + t.trans_amount, 0).toLocaleString()}
              </span>
            </span>
            <span>
              Pending: <span className="text-amber-400 font-bold">
                KES {transactions.filter(t => t.status === 'UNMATCHED').reduce((sum, t) => sum + t.trans_amount, 0).toLocaleString()}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Link Payment Modal */}
      {showLinkModal && selectedTx && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Link2 className="w-5 h-5 text-blue-400" />
              Link Payment to Store
            </h3>

            <div className="bg-slate-800 rounded-lg p-4 mb-4">
              <div className="text-sm text-slate-400 mb-2">Payment Details</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-slate-500">Receipt:</div>
                <div className="text-white font-mono">{selectedTx.trans_id}</div>
                <div className="text-slate-500">Amount:</div>
                <div className="text-green-400 font-bold">KES {selectedTx.trans_amount.toLocaleString()}</div>
                <div className="text-slate-500">Customer:</div>
                <div className="text-white">{[selectedTx.first_name, selectedTx.last_name].filter(Boolean).join(' ')}</div>
                <div className="text-slate-500">Reference:</div>
                <div className="text-white font-mono">{selectedTx.bill_ref_number || '—'}</div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Select Store</label>
                <select
                  value={selectedStoreId}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Select a store --</option>
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>
                      {store.name} ({store.access_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Subscription Plan</label>
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="basic-monthly">Basic Monthly (KES 500)</option>
                  <option value="premium-monthly">Premium Monthly (KES 1,500)</option>
                  <option value="basic-yearly">Basic Yearly (KES 5,000)</option>
                  <option value="premium-yearly">Premium Yearly (KES 15,000)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowLinkModal(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleLink}
                disabled={!selectedStoreId || linking}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white py-3 rounded-lg flex items-center justify-center gap-2 transition"
              >
                {linking ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Linking...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Link & Activate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
