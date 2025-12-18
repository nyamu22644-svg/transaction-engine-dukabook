import React, { useState, useEffect } from 'react';
import {
  Phone,
  Mail,
  Key,
  Eye,
  AlertCircle,
  Loader,
  MessageCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  lookupStoresByPhone,
  verifyStorePasskey,
  normalizePhoneNumber,
} from '../services/storeEntryService';
import { StoreProfile } from '../types';
import { DEMO_STORE } from '../demoData';
import { fetchAllStores, getStoreByUserEmail } from '../services/supabaseService';
import { CircuitBoardBackground } from './CircuitBoardBackground';
import { StoreSetupWizard } from './StoreSetupWizard';

interface StoreEntryFlowProps {
  onStoreSelected: (store: StoreProfile, isDemo?: boolean) => void;
}

export const StoreEntryFlow: React.FC<StoreEntryFlowProps> = ({
  onStoreSelected,
}) => {
  // Form state
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [passkey, setPasskey] = useState('');
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPasskey, setShowPasskey] = useState(false);
  const [noStoresFound, setNoStoresFound] = useState(false);
  const [showSignupWizard, setShowSignupWizard] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('dukabook_login_remember');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        const daysPassed = (Date.now() - data.timestamp) / (1000 * 60 * 60 * 24);
        if (daysPassed <= 100) {
          if (data.method === 'phone') {
            setPhoneNumber(data.phoneNumber);
            setLoginMethod('phone');
          } else {
            setEmail(data.email);
            setLoginMethod('email');
          }
          setRememberMe(true);
        } else {
          localStorage.removeItem('dukabook_login_remember');
        }
      } catch (e) {
        console.error('Failed to restore credentials:', e);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (passkey.length < 3) {
        setError('Please enter your store access code');
        setLoading(false);
        return;
      }

      let foundStores: any[] = [];

      if (loginMethod === 'phone') {
        const normalized = normalizePhoneNumber(phoneNumber);

        if (normalized.length < 9) {
          setError('Please enter a valid phone number');
          setLoading(false);
          return;
        }

        // Look up stores for this phone number
        foundStores = await lookupStoresByPhone(normalized);
      } else {
        // Email login - look up user by email and get their store
        if (!email.includes('@')) {
          setError('Please enter a valid email address');
          setLoading(false);
          return;
        }
        const trimmedEmail = email.trim().toLowerCase();
        const store = await getStoreByUserEmail(trimmedEmail);
        if (store) {
          foundStores = [{ store_id: store.id, store_name: store.name }];
        } else {
          foundStores = [];
        }
        // Debug: Log result
        console.log('Email user lookup debug:', { searchEmail: trimmedEmail, foundStores });
      }

      if (!foundStores || foundStores.length === 0) {
        setNoStoresFound(true);
        const loginType = loginMethod === 'phone' ? 'phone number' : 'email';
        const message = loginMethod === 'email' 
          ? `No store found for email "${email}". Please check that your email is correctly registered with your store.`
          : `No stores found for this ${loginType}. Create one to get started!`;
        setError(message);
        setLoading(false);
        return;
      }
      
      setNoStoresFound(false);

      // Try each store to find one with matching passkey
      let successStore = null;
      for (const store of foundStores) {
        const isValid = await verifyStorePasskey(store.store_id, passkey);
        if (isValid) {
          successStore = store;
          break;
        }
      }

      if (!successStore) {
        setError('Invalid store access code');
        setLoading(false);
        return;
      }

      // Fetch full store profile
      const stores = await fetchAllStores();
      const fullStore = stores.find((s) => s.id === successStore.store_id);

      if (fullStore) {
        if (rememberMe) {
          localStorage.setItem('dukabook_login_remember', JSON.stringify({
            phoneNumber,
            email,
            method: loginMethod,
            timestamp: Date.now(),
          }));
        } else {
          localStorage.removeItem('dukabook_login_remember');
        }
        onStoreSelected(fullStore);
      } else {
        setError('Could not load store information');
        setLoading(false);
      }
    } catch (err) {
      console.error('Entry error:', err);
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleDemo = () => {
    onStoreSelected(DEMO_STORE, true);
  };

  return (
    <CircuitBoardBackground>
      <div className="min-h-screen relative overflow-y-auto flex flex-col items-center justify-start pt-6 px-4 pb-[env(safe-area-inset-bottom)]">
        {/* Content Container */}
        <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
          
          {/* Logo: DB Emblem */}
          <div className="mb-8 relative flex items-center justify-center">
            {/* Outer Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full blur-2xl opacity-40 w-40 h-40 -inset-4"></div>
            
            {/* Logo Image - Circular Mask */}
            <div className="relative z-10 w-40 h-40 rounded-full overflow-hidden hover:scale-105 transition-transform">
              <img 
                src="/db-logo.png" 
                alt="DukaBook Logo" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Main Glassmorphism Card - Ultra Premium */}
          <div className="w-full bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden text-white">
            {/* Card Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-cyan-500/5 pointer-events-none"></div>
            
            {/* Content */}
            <div className="relative z-10">
              {/* Title with Glow */}
              <h1 className="text-3xl font-bold text-white text-center mb-2 drop-shadow-lg" style={{ textShadow: '0 0 30px rgba(0, 200, 255, 0.4)' }}>
                Welcome Back
              </h1>
              <p className="text-center text-white/60 text-sm mb-6">Access your store securely</p>

              {/* Login Method Tabs */}
              <div className="flex gap-2 mb-6 bg-slate-900/40 p-1 rounded-xl backdrop-blur-md border border-white/10 text-white">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMethod('phone');
                    setError('');
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-semibold transition-all ${
                    loginMethod === 'phone'
                      ? 'bg-cyan-500/30 text-cyan-100 border border-cyan-400/50'
                      : 'text-white/60 hover:text-white/80'
                  }`}
                >
                  <Phone className="w-4 h-4" />
                  <span className="hidden sm:inline">Phone</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginMethod('email');
                    setError('');
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-semibold transition-all ${
                    loginMethod === 'email'
                      ? 'bg-cyan-500/30 text-cyan-100 border border-cyan-400/50'
                      : 'text-white/60 hover:text-white/80'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  <span className="hidden sm:inline">Email</span>
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* Phone Number Input - Enhanced */}
                {loginMethod === 'phone' && (
                  <div className="relative group animate-in fade-in">
                    <Phone className="absolute left-4 top-4 w-5 h-5 text-cyan-400 pointer-events-none group-hover:text-cyan-300 transition-colors" />
                    <input
                      type="tel"
                      placeholder="Phone Number"
                      value={phoneNumber}
                      onChange={(e) => {
                        setPhoneNumber(e.target.value);
                        setError('');
                      }}
                      className="w-full pl-12 pr-4 py-3 bg-slate-900/40 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-cyan-400 focus:bg-slate-900/60 focus:shadow-lg transition-all backdrop-blur-md group-hover:bg-slate-900/60 group-hover:border-white/20"
                    />
                  </div>
                )}

                {/* Email Input - Enhanced */}
                {loginMethod === 'email' && (
                  <div className="relative group animate-in fade-in">
                    <Mail className="absolute left-4 top-4 w-5 h-5 text-cyan-400 pointer-events-none group-hover:text-cyan-300 transition-colors" />
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError('');
                      }}
                      className="w-full pl-12 pr-4 py-3 bg-white/8 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-cyan-400 focus:bg-white/12 focus:shadow-lg transition-all backdrop-blur-sm group-hover:bg-white/10 group-hover:border-white/30"
                    />
                  </div>
                )}

                {/* Store Access Code Input - Enhanced */}
                <div className="relative group">
                  <Key className="absolute left-4 top-4 w-5 h-5 text-cyan-400 pointer-events-none group-hover:text-cyan-300 transition-colors" />
                  <input
                    type={showPasskey ? 'text' : 'password'}
                    placeholder="Store Access Code"
                    value={passkey}
                    onChange={(e) => {
                      setPasskey(e.target.value);
                      setError('');
                    }}
                    className="w-full pl-12 pr-12 py-3 bg-slate-900/40 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-cyan-400 focus:bg-slate-900/60 focus:shadow-lg transition-all backdrop-blur-md group-hover:bg-slate-900/60 group-hover:border-white/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasskey(!showPasskey)}
                    className="absolute right-4 top-4 text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    {showPasskey ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-4.803m5.596-3.856a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Remember Me Checkbox */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-white/30 bg-slate-900/40 text-cyan-400 cursor-pointer"
                  />
                  <span className="text-sm text-white/70">Remember me for 100 days</span>
                </label>

                {/* Error Message - Enhanced */}
                {error && (
                  <div className="p-3 bg-red-500/20 border border-red-400/40 rounded-lg flex flex-col gap-2 backdrop-blur-sm">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-100">{error}</p>
                    </div>
                    {noStoresFound && loginMethod === 'email' && (
                      <div className="text-xs text-red-200/80 ml-7 border-t border-red-400/30 pt-2">
                        <p>💡 <strong>Tip:</strong> If your store doesn't have email configured, try logging in with your phone number instead.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Primary Button: Enter Store - Premium Style */}
                <button
                  type="submit"
                  disabled={loading || (loginMethod === 'phone' ? !phoneNumber : !email) || !passkey}
                  className="w-full mt-6 bg-gradient-to-r from-cyan-400 via-blue-500 to-blue-600 hover:from-cyan-300 hover:via-blue-400 hover:to-blue-500 disabled:from-gray-500 disabled:via-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:shadow-cyan-500/50 active:scale-95 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>Entering...</span>
                    </>
                  ) : (
                    <span>Enter Store</span>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Secondary Action: Demo Button - Premium Glassmorphism */}
          {noStoresFound ? (
            <>
              {/* Create Store Button - Primary CTA when no stores */}
              <button
                onClick={() => setShowSignupWizard(true)}
                className="w-full mt-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:shadow-amber-500/50 active:scale-95 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Create Your Store</span>
              </button>
              
              {/* Demo Button - Secondary */}
              <button
                onClick={handleDemo}
                className="w-full mt-3 bg-slate-900/40 hover:bg-slate-900/60 border border-white/10 hover:border-white/20 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-3 backdrop-blur-md hover:shadow-lg"
              >
                <Eye className="w-5 h-5 text-cyan-400" />
                <span>See How It Works (Demo)</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleDemo}
              className="w-full mt-6 bg-slate-900/40 hover:bg-slate-900/60 border border-white/10 hover:border-white/20 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-3 backdrop-blur-md hover:shadow-lg"
            >
              <Eye className="w-5 h-5 text-cyan-400" />
              <span>See How It Works (Demo)</span>
            </button>
          )}

          {/* Footer Actions - Premium Style */}
          <div className="text-center mt-8 space-y-3 pb-20 pb-[env(safe-area-inset-bottom)]">
            {/* Prominent Register Store CTA */}
            <button
              onClick={() => setShowSignupWizard(true)}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:shadow-blue-500/50 active:scale-95"
            >
              Don't have a store? Register Now
            </button>
            
            {/* Support Links */}
            <div className="flex justify-center gap-4 text-sm">
              <a
                href="https://wa.me/254722000000"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Contact Support
              </a>
            </div>
          </div>

          {/* StoreSetupWizard Modal */}
          {showSignupWizard && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
              <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <StoreSetupWizard
                  onComplete={(store) => {
                    setShowSignupWizard(false);
                    onStoreSelected(store, false);
                  }}
                  onBack={() => setShowSignupWizard(false)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </CircuitBoardBackground>
  );
};