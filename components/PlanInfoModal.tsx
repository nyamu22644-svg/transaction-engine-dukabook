
import React from 'react';
import { Check, X, Crown, Shield, Sparkles } from 'lucide-react';
import { EffectiveTier } from '../types';

interface PlanInfoModalProps {
  currentTier?: EffectiveTier; // Now supports TRIAL/BASIC/PREMIUM/NONE
  onClose: () => void;
  onUpgrade?: () => void;
}

export const PlanInfoModal: React.FC<PlanInfoModalProps> = ({ currentTier, onClose, onUpgrade }) => {
  const features = [
    // Core Features - BASIC
    { name: "Digital Sales Book (Daftari)", basic: true, premium: true },
    { name: "Track Stock Levels (Inventory)", basic: true, premium: true },
    { name: "GPS on Every Sale (Staff Location)", basic: true, premium: true },
    { name: "List of Debtors (Madeni Book)", basic: true, premium: true },
    
    // Premium Value Features
    { name: "See True Profit (Sales minus Cost)", basic: false, premium: true },
    { name: "SMS Debt Reminders (Auto-send to customers)", basic: false, premium: true },
    { name: "Audit Logs (See who changed stock)", basic: false, premium: true },
    { name: "Cash Reconciliation (Match cash vs sales)", basic: false, premium: true },
    { name: "PDF Reports (Show bank for loans)", basic: false, premium: true },
    { name: "Low Stock SMS (Get alert on your phone)", basic: false, premium: true },
    { name: "Staff Sales Ranking (Who sells most?)", basic: false, premium: true },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden relative animate-in zoom-in-95 my-4 max-h-[90vh] flex flex-col">
        {/* Fixed Header with Close Button */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 text-center relative shrink-0">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-slate-200 rounded-full hover:bg-slate-300 transition z-10">
            <X className="w-5 h-5 text-slate-700" />
          </button>
          <h2 className="text-2xl font-bold text-slate-900">Choose Your Plan</h2>
          <p className="text-slate-500 text-sm mt-1">Simple tools to manage your shop and stop theft.</p>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-sm text-left">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="bg-slate-100 text-slate-600 uppercase text-xs tracking-wider">
                <th className="p-4 font-bold border-b border-slate-200">Feature (What you get)</th>
                <th className={`p-4 font-bold text-center border-b border-slate-200 ${currentTier === 'BASIC' ? 'bg-blue-50 text-blue-700' : ''}`}>
                  Basic
                  {currentTier === 'BASIC' && <span className="block text-[10px] normal-case bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full mt-1 w-fit mx-auto">Current</span>}
                </th>
                <th className={`p-4 font-bold text-center border-b border-slate-200 ${currentTier === 'PREMIUM' ? 'bg-amber-50 text-amber-700' : ''}`}>
                  <div className="flex items-center justify-center gap-1">
                    <Crown className="w-4 h-4 text-amber-500" fill="currentColor" />
                    Premium
                  </div>
                  {currentTier === 'PREMIUM' && <span className="block text-[10px] normal-case bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full mt-1 w-fit mx-auto">Current</span>}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {features.map((feat, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition">
                  <td className="p-4 font-medium text-slate-700">{feat.name}</td>
                  <td className={`p-4 text-center ${currentTier === 'BASIC' ? 'bg-blue-50/30' : ''}`}>
                    {feat.basic ? <Check className="w-5 h-5 text-green-500 mx-auto" /> : <div className="w-1.5 h-1.5 bg-slate-300 rounded-full mx-auto"></div>}
                  </td>
                  <td className={`p-4 text-center ${currentTier === 'PREMIUM' ? 'bg-amber-50/30' : ''}`}>
                    {feat.premium ? <Check className="w-5 h-5 text-amber-500 mx-auto" /> : <X className="w-5 h-5 text-slate-300 mx-auto" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Fixed Footer - Show upgrade CTA for non-premium users */}
        {currentTier !== 'PREMIUM' && (
          <div className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 border-t border-amber-200 text-center shrink-0">
            {/* Trial User Message */}
            {(currentTier === 'TRIAL' || !currentTier) && (
              <div className="mb-4">
                <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium mb-2">
                  <Sparkles className="w-4 h-4" />
                  {currentTier === 'TRIAL' ? 'Free Trial Active' : 'Start Your Journey'}
                </div>
                <p className="text-sm text-slate-600 font-medium">
                  {currentTier === 'TRIAL' 
                    ? 'Subscribe now to keep all features when your trial ends!' 
                    : 'Start with a 7-day free trial - no payment required!'}
                </p>
              </div>
            )}
            
            {/* Basic User Message */}
            {currentTier === 'BASIC' && (
              <p className="text-sm text-slate-600 mb-4 font-medium">Want to see where your money is going?</p>
            )}
            
            <button 
              onClick={() => {
                if (onUpgrade) {
                  onUpgrade();
                  onClose();
                }
              }}
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-orange-200 hover:shadow-orange-300 transition-all active:scale-95 flex items-center gap-2 mx-auto"
            >
              <Crown className="w-5 h-5" />
              {currentTier === 'BASIC' ? 'Upgrade to Premium' : currentTier === 'TRIAL' ? 'Subscribe Now' : 'Start Free Trial'}
            </button>
            <p className="text-xs text-slate-500 mt-3">
              {currentTier === 'BASIC' 
                ? 'Pay via M-Pesa • Instant activation' 
                : 'No credit card required • Cancel anytime'}
            </p>
          </div>
        )}
        
        {/* Premium user - thank you message */}
        {currentTier === 'PREMIUM' && (
          <div className="p-6 bg-gradient-to-r from-amber-50 to-yellow-50 border-t border-amber-200 text-center shrink-0">
            <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium mb-2">
              <Crown className="w-4 h-4" fill="currentColor" />
              Premium Member
            </div>
            <p className="text-sm text-slate-600 font-medium">You have access to all premium features!</p>
          </div>
        )}
        
        {/* Close button at bottom for mobile */}
        <div className="p-4 border-t border-slate-200 shrink-0">
          <button 
            onClick={onClose} 
            className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
