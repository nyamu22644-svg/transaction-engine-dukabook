import React from 'react';
import { Lock, Shield, MapPin, BookOpen, Sofa, ArrowRight, X, Sparkles } from 'lucide-react';

interface DemoLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: () => void;
  hookType?: 'save' | 'gps' | 'madeni' | 'report' | 'export';
}

export const DemoLockModal: React.FC<DemoLockModalProps> = ({ 
  isOpen, 
  onClose, 
  onRegister,
  hookType = 'save'
}) => {
  if (!isOpen) return null;

  const getHookContent = () => {
    switch (hookType) {
      case 'gps':
        return {
          icon: <MapPin className="w-8 h-8 text-blue-400" />,
          title: '📍 Track Your Employees',
          subtitle: 'Every sale shows GPS location. Know exactly where your staff are.',
          highlight: 'Catch lazy staff who claim they were "at the shop"',
          benefit: 'Start your 7-day FREE trial today!'
        };
      case 'madeni':
        return {
          icon: <BookOpen className="w-8 h-8 text-amber-400" />,
          title: '📒 Protect Your Madeni',
          subtitle: 'If your notebook gets lost or wet, all your debt records disappear.',
          highlight: 'Your Madeni is your bank. Keep it safe in the cloud.',
          benefit: 'Start your 7-day FREE trial today!'
        };
      case 'report':
        return {
          icon: <Sofa className="w-8 h-8 text-green-400" />,
          title: '🛋️ Check Sales From Your Bed',
          subtitle: "No need to drive to the shop just to check today's sales.",
          highlight: 'See your cash count, Mpesa total, and debts from anywhere',
          benefit: 'Start your 7-day FREE trial today!'
        };
      case 'export':
        return {
          icon: <Shield className="w-8 h-8 text-purple-400" />,
          title: '📊 Export Real Reports',
          subtitle: 'Download PDF reports, WhatsApp your supplier, share with accountant.',
          highlight: 'Professional business tools at your fingertips',
          benefit: 'Start your 7-day FREE trial today!'
        };
      default:
        return {
          icon: <Lock className="w-8 h-8 text-blue-400" />,
          title: '🎯 You Tried 1 Entry!',
          subtitle: "Now imagine tracking ALL your sales, employees & debts automatically.",
          highlight: 'Register now for unlimited entries with 7-day FREE trial!',
          benefit: 'No payment needed to start. Cancel anytime.'
        };
    }
  };

  const content = getHookContent();

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden">
        
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Decorative gradient */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-blue-600/20 to-transparent" />
        
        {/* Content */}
        <div className="relative p-6 pt-8">
          {/* Icon */}
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-4 ring-blue-500/20">
            {content.icon}
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white text-center mb-2">
            {content.title}
          </h2>
          
          {/* Subtitle */}
          <p className="text-slate-400 text-center mb-4">
            {content.subtitle}
          </p>

          {/* Highlight box */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-4">
            <p className="text-blue-300 text-sm font-medium text-center">
              {content.highlight}
            </p>
          </div>

          {/* Benefit */}
          <div className="flex items-center justify-center gap-2 text-slate-500 text-sm mb-6">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{content.benefit}</span>
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3">
            <button
              onClick={onRegister}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-green-900/30 transition-all active:scale-[0.98]"
            >
              Start 7-Day FREE Trial
              <ArrowRight className="w-5 h-5" />
            </button>
            
            <button
              onClick={onClose}
              className="w-full py-3 text-slate-400 hover:text-white font-medium transition"
            >
              Back to Demo
            </button>
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Shield className="w-3 h-3" />
              <span>7 Days Free</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Lock className="w-3 h-3" />
              <span>No Card Needed</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <MapPin className="w-3 h-3" />
              <span>Made in Kenya</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
