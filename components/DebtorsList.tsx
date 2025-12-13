
import React, { useEffect, useState } from 'react';
import { fetchDebtors, settleDebt } from '../services/supabaseService';
import { SalesRecord, StoreProfile } from '../types';
import { User, Phone, Calendar, ArrowLeft, CheckCircle2, AlertTriangle, Loader2, MessageCircle, Send, Crown, Lock } from 'lucide-react';

interface DebtorsListProps {
  store: StoreProfile;
  onClose: () => void;
}

export const DebtorsList: React.FC<DebtorsListProps> = ({ store, onClose }) => {
  const [debtors, setDebtors] = useState<SalesRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [settlingId, setSettlingId] = useState<string | null>(null);

  const isPremium = store.tier === 'PREMIUM';

  const loadDebtors = () => {
    fetchDebtors(store.id)
      .then(setDebtors)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDebtors();
  }, [store.id]);

  const handleSettle = async (id: string | undefined) => {
    if (!id) return;
    if (window.confirm("Confirm payment received? This will mark the debt as settled.")) {
      setSettlingId(id);
      try {
        await settleDebt(id);
        alert("Debt marked as PAID successfully!");
        loadDebtors();
      } catch (e) {
        alert("Error updating record. Please try again.");
      } finally {
        setSettlingId(null);
      }
    }
  };

  const handleSendReminder = (debt: SalesRecord) => {
    if (!isPremium) {
      alert("Upgrade to Premium to unlock automated SMS/WhatsApp reminders.");
      return;
    }

    if (!debt.customer_phone) {
      alert("No phone number recorded for this customer.");
      return;
    }

    // Smart Message Construction
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7); // Assume 7 days terms
    
    const message = `Jambo ${debt.customer_name || 'Customer'}. 👋\n\n` +
      `Just a friendly reminder from ${store.name}. You have a balance of KES ${debt.total_amount.toLocaleString()} for ${debt.item_name}.\n\n` +
      `Please make payments to M-Pesa Till: ${store.owner_pin ? 'XXXXXX' : 'Ask Agent'}.\n\nThank you for your business!`;
    
    // Open WhatsApp
    const url = `https://wa.me/${debt.customer_phone.replace('+', '').replace(/\s/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const totalDebt = debtors.reduce((sum, d) => sum + d.total_amount, 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col animate-in slide-in-from-bottom-5 duration-300">
      {/* Header */}
      <div className="bg-red-600 text-white p-4 shadow-lg sticky top-0 z-10 flex items-center justify-between">
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="text-center">
          <h2 className="font-bold text-lg flex items-center gap-2 justify-center">
            Daftari la Madeni
            {isPremium && <Crown className="w-4 h-4 text-yellow-400" fill="currentColor" />}
          </h2>
          <p className="text-xs opacity-90 font-medium">Total Due: KES {totalDebt.toLocaleString()}</p>
        </div>
        <div className="w-10"></div> {/* Spacer */}
      </div>

      <div className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full">
        {!isPremium && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-4 flex items-start gap-3">
             <div className="bg-amber-100 p-2 rounded-full">
               <Lock className="w-4 h-4 text-amber-700" />
             </div>
             <div>
               <h4 className="text-sm font-bold text-amber-900">Unlock Auto-Reminders</h4>
               <p className="text-xs text-amber-700 mt-1">Stop chasing money manually. Premium lets you send polite WhatsApp/SMS reminders in one click.</p>
             </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <p>Loading debtors...</p>
          </div>
        ) : debtors.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-20 text-slate-400">
             <CheckCircle2 className="w-16 h-16 text-green-500 mb-4 opacity-20" />
             <h3 className="text-lg font-bold text-slate-600">No Debts Found</h3>
             <p className="text-sm">Everyone has paid! Great job.</p>
           </div>
        ) : (
          <div className="space-y-4">
            {debtors.map((debt) => (
              <div key={debt.id} className="bg-white rounded-xl shadow-sm border border-red-100 p-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-red-50 rounded-bl-full -mr-8 -mt-8 transition-colors group-hover:bg-red-100"></div>
                
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-start gap-3">
                      <div className="bg-red-100 p-2 rounded-full mt-1">
                        <User className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg">
                           {debt.customer_name || 'Unknown Customer'}
                        </h3>
                        <p className="text-xs text-slate-500 mb-1">Served by: {debt.collected_by}</p>
                        {debt.customer_phone ? (
                          <div className="flex items-center gap-1.5 text-blue-600 font-medium text-sm mt-0.5">
                            <Phone className="w-3.5 h-3.5 fill-current" />
                            {debt.customer_phone}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No phone recorded</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Amount</p>
                      <p className="text-xl font-extrabold text-red-600">KES {debt.total_amount.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600 mb-4 border border-slate-100">
                    <div className="flex justify-between mb-1">
                      <span>Item:</span>
                      <span className="font-medium text-slate-900">{debt.item_name} (x{debt.quantity})</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Date:</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {debt.created_at ? new Date(debt.created_at).toLocaleDateString() : 'Unknown'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => handleSendReminder(debt)}
                      className={`py-2.5 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition ${isPremium ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                    >
                      {isPremium ? <MessageCircle className="w-4 h-4" /> : <Lock className="w-3 h-3" />}
                      {isPremium ? 'Remind' : 'Auto-SMS'}
                    </button>
                    <button 
                      onClick={() => handleSettle(debt.id)}
                      disabled={settlingId === debt.id}
                      className="py-2.5 px-4 bg-slate-900 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition active:scale-95"
                    >
                      {settlingId === debt.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Mark Paid
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
