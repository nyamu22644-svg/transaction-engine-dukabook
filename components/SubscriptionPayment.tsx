/**
 * Subscription Payment Component for Store Owners
 * Popular Kenya Payment Methods: M-Pesa, Airtel Money, Till Number, Paybill
 */

import React, { useState, useEffect } from 'react';
import {
  X, CreditCard, Smartphone, CheckCircle, Clock, AlertTriangle,
  Crown, Zap, Shield, Users, Package, Phone, ChevronRight,
  RefreshCw, Copy, Star, Calendar, ArrowRight, Lock
} from 'lucide-react';
import { StoreProfile, StoreSubscription, SubscriptionPlan, PaymentConfig } from '../types';
import {
  getStoreSubscription,
  getSubscriptionPlans,
  getPaymentConfig,
} from '../services/billingService';
import {
  initiateSTKPush,
  checkPaymentStatus,
  isValidKenyanPhone,
  formatPhoneForMpesa,
  MPESA_CONFIG,
} from '../services/mpesaService';

interface SubscriptionPaymentProps {
  store: StoreProfile;
  onClose: () => void;
  onSuccess?: () => void;
}

type PaymentMethod = 'INTASEND' | 'MPESA_STK';

interface PaymentMethodOption {
  id: PaymentMethod;
  name: string;
  description: string;
  icon: string;
  popular?: boolean;
  instructions?: string[];
  comingSoon?: boolean;
}

const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    id: 'INTASEND',
    name: 'M-Pesa',
    description: 'Pay with your phone',
    icon: '📱',
    popular: true,
    instructions: [
      'Enter your phone number',
      'Click "Pay Now"',
      'Complete payment',
      'Done!'
    ]
  },
];

// M-Pesa payment details are now fetched dynamically from SuperAdmin settings

export const SubscriptionPayment: React.FC<SubscriptionPaymentProps> = ({ 
  store, 
  onClose,
  onSuccess 
}) => {
  const [subscription, setSubscription] = useState<StoreSubscription | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>('premium-monthly');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('MPESA_STK');
  const [phoneNumber, setPhoneNumber] = useState(store.phone || '');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);
  const [step, setStep] = useState<'plan' | 'method' | 'payment' | 'success'>('plan');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [sub, plansData, configData] = await Promise.all([
      getStoreSubscription(store.id),
      getSubscriptionPlans(),
      getPaymentConfig(),
    ]);
    setSubscription(sub);
    setPlans(plansData);
    setPaymentConfig(configData);
    if (sub?.plan_id) {
      setSelectedPlan(sub.plan_id);
    }
    setLoading(false);
  };

  const getDaysRemaining = (): number => {
    if (!subscription) return 0;
    const endDate = new Date(subscription.current_period_end);
    const now = new Date();
    return Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const getStatusInfo = () => {
    if (!subscription) {
      return { status: 'none', label: 'No Subscription', color: 'gray' };
    }
    
    const days = getDaysRemaining();
    
    if (subscription.status === 'SUSPENDED') {
      return { status: 'suspended', label: 'Suspended', color: 'red' };
    }
    if (subscription.is_trial) {
      return { status: 'trial', label: `Trial (${days} days left)`, color: 'blue' };
    }
    if (subscription.status === 'ACTIVE' && days > 7) {
      return { status: 'active', label: `Active (${days} days)`, color: 'green' };
    }
    if (subscription.status === 'ACTIVE' && days <= 7) {
      return { status: 'expiring', label: `Expiring in ${days} days`, color: 'yellow' };
    }
    return { status: 'expired', label: 'Expired', color: 'red' };
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMpesaPayment = async () => {
    const selectedPlanData = plans.find(p => p.id === selectedPlan);
    if (!selectedPlanData) return;

    // Validate phone number
    if (!isValidKenyanPhone(phoneNumber)) {
      alert('Please enter a valid Safaricom phone number (e.g., 0712345678)');
      return;
    }

    const formattedPhone = formatPhoneForMpesa(phoneNumber);

    setProcessing(true);
    setPaymentStatus('pending');

    try {
      const result = await initiateSTKPush({
        phone: formattedPhone,
        amount: selectedPlanData.price_kes,
        storeId: store.id,
        planId: selectedPlan,
        accountReference: `DUKA-${store.access_code}`,
      });

      if (result.success && result.checkoutRequestId) {
        setCheckoutRequestId(result.checkoutRequestId);
        // Poll for payment status
        pollPaymentStatus(result.checkoutRequestId);
      } else {
        setPaymentStatus('failed');
        alert(result.error || 'Payment initiation failed. Please try again.');
      }
    } catch (error) {
      setPaymentStatus('failed');
      alert('Payment failed. Please try manual Paybill payment.');
    } finally {
      setProcessing(false);
    }
  };

  const handleIntaSendPayment = async () => {
    const selectedPlanData = plans.find(p => p.id === selectedPlan);
    if (!selectedPlanData) return;

    // Validate phone number
    const phone = phoneNumber.startsWith('0') ? phoneNumber : '0' + phoneNumber;
    if (!/^0[1-9]\d{8}$/.test(phone)) {
      alert('Please enter a valid phone number');
      return;
    }

    setProcessing(true);
    setPaymentStatus('pending');

    try {
      // Import and use the IntaSend service
      const { createSubscription } = await import('../services/intasendSubscriptionService');
      
      const response = await createSubscription({
        email: store.email || 'user@dukabook.app',
        phone_number: phone,
        plan: {
          name: selectedPlanData.name,
          amount: selectedPlanData.price_kes,
          interval: selectedPlanData.billing_cycle === 'MONTHLY' ? 'monthly' : 'yearly',
          currency: 'KES',
          description: selectedPlanData.features.join(', '),
        },
      });

      if (response && response.checkout_url) {
        // Store payment info before redirecting
        localStorage.setItem('intasend_pending_order', JSON.stringify({
          store_id: store.id,
          plan_id: selectedPlan,
          amount: selectedPlanData.price_kes,
          phone,
          email: store.email,
          subscription_id: response.subscription_id,
          timestamp: new Date().toISOString(),
        }));
        
        // Redirect to IntaSend checkout
        window.location.href = response.checkout_url;
      } else if (response && response.subscription_id) {
        // If no checkout_url but subscription created, activate immediately
        setPaymentStatus('success');
        setStep('success');
        setProcessing(false);
        const stores = JSON.parse(localStorage.getItem('dukabook_stores') || '[]');
        const storeIndex = stores.findIndex((s: any) => s.id === store.id);
        if (storeIndex >= 0) {
          stores[storeIndex].tier = selectedPlanData.tier;
          localStorage.setItem('dukabook_stores', JSON.stringify(stores));
        }
        onSuccess?.();
      } else {
        throw new Error('Invalid response from payment service');
      }
      
    } catch (error: any) {
      console.error('Payment error:', error);
      setPaymentStatus('failed');
      setProcessing(false);
      const errorMsg = error.message || error.toString();
      alert(`Payment failed: ${errorMsg}. Please try again.`);
    }
  };

  const pollPaymentStatus = async (requestId: string) => {
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds timeout

    const checkStatus = async () => {
      attempts++;
      const result = await checkPaymentStatus(requestId);

      if (result.status === 'COMPLETED') {
        setPaymentStatus('success');
        setStep('success');
        onSuccess?.();
        return;
      }

      if (result.status === 'FAILED' || result.status === 'CANCELLED' || attempts >= maxAttempts) {
        setPaymentStatus('failed');
        return;
      }

      // Continue polling
      setTimeout(checkStatus, 1000);
    };

    checkStatus();
  };

  const plan = plans.find(p => p.id === selectedPlan);
  const method = PAYMENT_METHODS.find(m => m.id === selectedMethod);
  const statusInfo = getStatusInfo();

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-slate-900 rounded-2xl p-8 text-center">
          <RefreshCw className="w-10 h-10 text-green-500 animate-spin mx-auto mb-4" />
          <p className="text-white">Loading subscription...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                {step === 'success' ? '✓ All Set!' : 'Upgrade Your Plan'}
              </h1>
            </div>
            <button 
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Current Status Banner */}
          {subscription && step !== 'success' && (
            <div className={`mb-6 p-4 rounded-xl border ${
              statusInfo.color === 'green' ? 'bg-green-500/10 border-green-500/30' :
              statusInfo.color === 'blue' ? 'bg-blue-500/10 border-blue-500/30' :
              statusInfo.color === 'yellow' ? 'bg-yellow-500/10 border-yellow-500/30' :
              'bg-red-500/10 border-red-500/30'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {statusInfo.color === 'green' && <CheckCircle className="w-5 h-5 text-green-500" />}
                  {statusInfo.color === 'blue' && <Zap className="w-5 h-5 text-blue-500" />}
                  {statusInfo.color === 'yellow' && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
                  {statusInfo.color === 'red' && <AlertTriangle className="w-5 h-5 text-red-500" />}
                  <div>
                    <span className={`font-medium ${
                      statusInfo.color === 'green' ? 'text-green-400' :
                      statusInfo.color === 'blue' ? 'text-blue-400' :
                      statusInfo.color === 'yellow' ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {statusInfo.label}
                    </span>
                    <span className="text-slate-400 ml-2">
                      • {plans.find(p => p.id === subscription.plan_id)?.name || 'Unknown Plan'}
                    </span>
                  </div>
                </div>
                <div className="text-sm text-slate-400">
                  Expires: {new Date(subscription.current_period_end).toLocaleDateString('en-KE')}
                </div>
              </div>
            </div>
          )}

          {/* Step Progress */}
          {step !== 'success' && (
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
              {['plan', 'method', 'payment'].map((s, i) => (
                <React.Fragment key={s}>
                  <button
                    onClick={() => {
                      if ((s === 'plan') || (s === 'method' && step !== 'plan') || (s === 'payment' && step === 'payment')) {
                        setStep(s as any);
                      }
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                      step === s 
                        ? 'bg-green-600 text-white' 
                        : step === 'payment' && s !== 'payment' ? 'bg-slate-700 text-slate-300'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm">
                      {i + 1}
                    </span>
                    {s === 'plan' && 'Plan'}
                    {s === 'method' && 'Method'}
                    {s === 'payment' && 'Pay'}
                  </button>
                  {i < 2 && <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Step 1: Choose Plan */}
          {step === 'plan' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white mb-4">Choose a Plan</h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                {plans.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlan(p.id)}
                    className={`relative text-left p-5 rounded-xl border-2 transition-all ${
                      selectedPlan === p.id
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    {p.is_popular && (
                      <div className="absolute -top-3 right-4 bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                        <Star className="w-3 h-3" /> POPULAR
                      </div>
                    )}
                    
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-white text-lg">{p.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          {p.tier === 'PREMIUM' && <Crown className="w-4 h-4 text-amber-500" />}
                          <span className="text-slate-400 text-sm">{p.tier}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-400">
                          KES {p.price_kes.toLocaleString()}
                        </div>
                        <div className="text-sm text-slate-400">
                          /{p.billing_cycle === 'MONTHLY' ? 'month' : 'year'}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Users className="w-4 h-4 text-blue-400" />
                        Up to {p.max_staff} staff members
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Package className="w-4 h-4 text-purple-400" />
                        Up to {p.max_products} products
                      </div>
                    </div>

                    <ul className="space-y-1.5">
                      {p.features.slice(0, 4).map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    {p.billing_cycle === 'YEARLY' && (
                      <div className="mt-3 bg-green-500/20 text-green-400 text-xs font-medium px-3 py-1.5 rounded-lg inline-block">
                        💰 Save 2 months!
                      </div>
                    )}

                    {selectedPlan === p.id && (
                      <div className="absolute top-4 left-4">
                        <CheckCircle className="w-6 h-6 text-green-500" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setStep('method')}
                className="w-full mt-6 bg-green-600 hover:bg-green-500 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition"
              >
                Continue to Payment
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Step 2: Payment Method */}
          {step === 'method' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white mb-4">How to Pay</h2>
              
              <div className="space-y-3">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => !m.comingSoon && setSelectedMethod(m.id)}
                    disabled={m.comingSoon}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                      m.comingSoon
                        ? 'border-slate-600 bg-slate-900 opacity-60 cursor-not-allowed'
                        : selectedMethod === m.id
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <span className="text-3xl">{m.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{m.name}</span>
                        {m.popular && !m.comingSoon && (
                          <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full">
                            Popular
                          </span>
                        )}
                        {m.comingSoon && (
                          <span className="bg-slate-600/50 text-slate-300 text-xs px-2 py-0.5 rounded-full">
                            Coming Soon
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-400">{m.description}</p>
                    </div>
                    {selectedMethod === m.id && !m.comingSoon && (
                      <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep('plan')}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 px-6 rounded-xl transition"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep('payment')}
                  className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition"
                >
                  Continue
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Complete Payment */}
          {step === 'payment' && plan && method && (
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                <h3 className="font-bold text-white mb-4">Order Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">{plan.name}</span>
                    <span className="text-white font-medium">KES {plan.price_kes.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Payment Method</span>
                    <span className="text-slate-300">{method.name}</span>
                  </div>
                  <div className="border-t border-slate-700 pt-3 flex justify-between">
                    <span className="font-bold text-white">Total</span>
                    <span className="font-bold text-green-400 text-xl">KES {plan.price_kes.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* IntaSend Payment */}
              {selectedMethod === 'INTASEND' && (
                <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                      <Smartphone className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">Mobile Payment</h3>
                      <p className="text-sm text-slate-400">Enter your phone number</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Phone Number</label>
                      <div className="flex gap-2">
                        <div className="bg-slate-700 rounded-lg px-4 py-3 text-slate-300 font-mono">
                          +254
                        </div>
                        <input
                          type="tel"
                          value={phoneNumber.replace(/^254/, '').replace(/^0/, '')}
                          onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                          placeholder="712 345 678"
                          className="flex-1 bg-slate-700 rounded-lg px-4 py-3 text-white font-mono placeholder:text-slate-500"
                          maxLength={9}
                        />
                      </div>
                    </div>

                    {paymentStatus === 'pending' && (
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex items-center gap-3">
                        <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
                        <div>
                          <p className="text-blue-400 font-medium">Activating your plan...</p>
                          <p className="text-sm text-slate-400">Please wait</p>
                        </div>
                      </div>
                    )}

                    {paymentStatus === 'failed' && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                        <p className="text-red-400 font-medium">Something went wrong</p>
                        <p className="text-sm text-slate-400">Please try again</p>
                      </div>
                    )}

                    <button
                      onClick={handleIntaSendPayment}
                      disabled={processing || !phoneNumber}
                      className="w-full bg-green-600 hover:bg-green-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition"
                    >
                      {processing ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          Activating...
                        </>
                      ) : (
                        <>
                          <Smartphone className="w-5 h-5" />
                          Pay KES {plan.price_kes.toLocaleString()}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => setStep('method')}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-xl transition"
              >
                ← Back to Payment Methods
              </button>
            </div>
          )}

          {/* Success Step */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center min-h-[400px] py-12">
              <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Done!</h2>
              <p className="text-slate-400 mb-8 text-center">
                Your plan is now active. Enjoy all the features!
              </p>

              <button
                onClick={onClose}
                className="bg-green-600 hover:bg-green-500 text-white font-bold py-4 px-12 rounded-xl transition text-lg"
              >
                Continue
              </button>
            </div>
          )}

          {copied && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg">
              ✓ Copied to clipboard!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPayment;
