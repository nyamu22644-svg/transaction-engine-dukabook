import React, { useState } from 'react';
import { getStoreByAccessCode, getStoreById, fetchAllStores } from '../services/supabaseService';
import { StoreProfile } from '../types';
import { Lock, ArrowRight, Loader2, ShieldCheck, Mail, KeyRound, Play, MapPin, BookOpen, Smartphone } from 'lucide-react';
import { logIn, AuthUser } from '../services/authService';
import { StoreSetupWizard } from './StoreSetupWizard';
import { createNewStore, linkOwnerToStore } from '../services/supabaseService';
import { createTrialSubscription } from '../services/billingService';
import { DEMO_STORE } from '../demoData';

// SUPER ADMIN ACCESS REMOVED FROM PRODUCTION APP
// Access Super Admin via: Supabase Dashboard or separate admin deployment

interface StoreLoginProps {
  onLogin: (store: StoreProfile, isDemo?: boolean) => void;
}

export const StoreLogin: React.FC<StoreLoginProps> = ({ onLogin }) => {
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'code' | 'login' | 'signup' | 'landing'>('landing');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingUser, setPendingUser] = useState<AuthUser | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [newBusinessType, setNewBusinessType] = useState('GENERAL');
  const [newLocation, setNewLocation] = useState('');
  const [creating, setCreating] = useState(false);

  // Demo mode handler
  const handleDemoMode = () => {
    (async () => {
      try {
        const stores = await fetchAllStores();
        const demo = stores.find(s => (s as any).is_demo);
        if (demo) {
          onLogin(demo as StoreProfile, true);
        } else {
          onLogin(DEMO_STORE, true);
        }
      } catch (e) {
        console.error('Failed to fetch demo store:', e);
        onLogin(DEMO_STORE, true);
      }
    })();
  };

  // If signup mode, show the wizard instead
  if (mode === 'signup') {
    return (
      <StoreSetupWizard 
        onComplete={(store) => onLogin(store, false)} 
        onBack={() => setMode('landing')} 
      />
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (mode === 'code' && !code) return;
    if (mode === 'login' && (!email || !password)) return;

    setLoading(true);
    try {
      if (mode === 'code') {
        const store = await getStoreByAccessCode(code);
        if (store) onLogin(store);
        else setError('Invalid Access Code. Please check with your manager.');
      } else if (mode === 'login') {
        const user = await logIn(email.trim(), password);
        if (!user) {
          setError('Invalid email or password. Please try again.');
        } else if (!user.store_id) {
          // Offer to create and link a store for this logged-in owner
          setPendingUser(user as AuthUser);
          setNewStoreName(`${user.full_name}'s Store`);
          setShowCreateModal(true);
        } else {
          const store = await getStoreById(user.store_id);
          if (store) onLogin(store);
          else setError('Store not found. Contact support.');
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      if (err?.message?.includes('Email not confirmed')) {
        setError('Please confirm your email first. Check your inbox.');
      } else {
        setError('System error. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-blue-900/30 rounded-full blur-[120px]"></div>
        <div className="absolute top-[50%] -right-[10%] w-[50%] h-[50%] bg-indigo-900/20 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center mb-5">
          <div className="w-36 h-36 rounded-full overflow-hidden flex items-center justify-center shadow-2xl ring-4 ring-blue-500/30 mb-4" style={{ filter: 'drop-shadow(0 0 25px rgba(59,130,246,0.5))' }}>
            <img
              src="/logo.png"
              alt="DukaBook logo"
              className="w-[500px] h-auto"
              style={{ 
                objectFit: 'cover',
                objectPosition: 'center 18%',
                transform: 'scale(1.3)'
              }}
            />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight" style={{ textShadow: '0 0 30px rgba(59,130,246,0.5)' }}>DUKABOOK</h1>
          <p className="text-blue-400 text-sm mt-1 font-semibold tracking-widest">BUSINESS MANAGEMENT</p>
        </div>

        {/* LANDING MODE - Show "See How It Works" prominently */}
        {mode === 'landing' && (
          <div className="space-y-4">
            {/* Primary CTA - Demo Button */}
            <button
              onClick={handleDemoMode}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-900/40 flex items-center justify-center gap-3 transition-all active:scale-[0.98] text-lg"
            >
              <Play className="w-6 h-6" fill="currentColor" />
              See How It Works
            </button>
            
            <p className="text-center text-slate-500 text-xs">No registration required • Explore with demo data</p>

            {/* Divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-slate-700"></div>
              <span className="text-slate-500 text-xs font-medium">OR</span>
              <div className="flex-1 h-px bg-slate-700"></div>
            </div>

            {/* Secondary buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMode('code')}
                className="py-3 px-4 border-2 border-slate-700 text-slate-300 font-bold rounded-xl hover:border-slate-600 hover:bg-slate-800/50 transition-all text-sm"
              >
                Staff Login
              </button>
              <button
                onClick={() => setMode('login')}
                className="py-3 px-4 border-2 border-slate-700 text-slate-300 font-bold rounded-xl hover:border-slate-600 hover:bg-slate-800/50 transition-all text-sm"
              >
                Owner Login
              </button>
            </div>

            <button
              onClick={() => setMode('signup')}
              className="w-full py-3 border-2 border-blue-500/50 text-blue-400 font-bold rounded-xl hover:bg-blue-500/10 transition-all mt-2"
            >
              Register New Store
            </button>

            {/* Marketing Hooks */}
            <div className="mt-6 space-y-3">
              <div className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                <MapPin className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-white text-sm font-semibold">Track Employee GPS</p>
                  <p className="text-slate-500 text-xs">Know where every sale happens</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                <BookOpen className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-white text-sm font-semibold">Protect Your Madeni</p>
                  <p className="text-slate-500 text-xs">Debt records safe in the cloud</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                <Smartphone className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-white text-sm font-semibold">Check Sales From Anywhere</p>
                  <p className="text-slate-500 text-xs">No need to drive to the shop</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LOGIN MODES */}
        {(mode === 'code' || mode === 'login') && (
          <>
            <div className="flex gap-2 mb-5 text-sm font-bold">
              <button type="button" onClick={() => setMode('code')} className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all ${mode==='code' ? 'border-blue-500 bg-blue-500/20 text-white' : 'border-slate-700 text-slate-300 hover:border-slate-600'}`}>Access Code</button>
              <button type="button" onClick={() => setMode('login')} className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all ${mode==='login' ? 'border-blue-500 bg-blue-500/20 text-white' : 'border-slate-700 text-slate-300 hover:border-slate-600'}`}>Email Login</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === 'code' && (
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase text-blue-400 tracking-wider ml-1">Store Access Code</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors duration-300" />
                    </div>
                    <input
                      type="text"
                      autoFocus
                      className="block w-full pl-12 pr-4 py-4 bg-slate-900/60 border border-slate-700/50 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all font-mono text-xl tracking-[0.25em] uppercase text-center shadow-inner"
                      placeholder="CODE"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                    />
                  </div>
                </div>
              )}

              {mode === 'login' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold uppercase text-blue-400 tracking-wider ml-1">Email</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors duration-300" />
                  </div>
                  <input
                    type="email"
                    autoFocus
                    className="block w-full pl-12 pr-4 py-3 bg-slate-900/60 border border-slate-700/50 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold uppercase text-blue-400 tracking-wider ml-1">Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors duration-300" />
                  </div>
                  <input
                    type="password"
                    className="block w-full pl-12 pr-4 py-3 bg-slate-900/60 border border-slate-700/50 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2">
               <ShieldCheck className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
               <p className="text-sm text-red-200 font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/40 transform transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group mt-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {mode === 'code' ? 'Enter Dashboard' : 'Log In'}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>

          {/* Back to landing */}
          <button
            type="button"
            onClick={() => setMode('landing')}
            className="w-full text-slate-500 hover:text-slate-300 text-sm mt-4 transition-colors"
          >
            ← Back to Home
          </button>
        </form>
          </>
        )}

        {/* Create & Link Store Modal for logged-in users without a store */}
        {showCreateModal && pendingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
            <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-800 p-6">
              <h3 className="text-lg font-bold text-white mb-2">No Store Linked</h3>
              <p className="text-slate-400 mb-4">Your account ({pendingUser.email}) has no store linked. Create and link a new store now?</p>

              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Store Name</label>
                  <input value={newStoreName} onChange={e => setNewStoreName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Business Type</label>
                  <select value={newBusinessType} onChange={e => setNewBusinessType(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white">
                    <option value="GENERAL">General Shop</option>
                    <option value="HARDWARE">Hardware Store</option>
                    <option value="WHOLESALER">Wholesaler</option>
                    <option value="BOUTIQUE">Boutique / Retail</option>
                    <option value="PHARMACY">Pharmacy</option>
                    <option value="CHEMIST">Chemist</option>
                    <option value="COSMETICS">Cosmetics</option>
                    <option value="WINES">Wines / Liquor</option>
                    <option value="SALON">Salon / Beauty</option>
                    <option value="BROKERAGE">Brokerage / Agent</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Location (optional)</label>
                  <input value={newLocation} onChange={e => setNewLocation(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white" />
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={async () => {
                  setCreating(true);
                  setError('');
                  try {
                    const store = await createNewStore({
                      owner_id: pendingUser.id,
                      name: newStoreName,
                      business_type: newBusinessType as any,
                      access_code: `ACC${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
                      owner_pin: '1234',
                      location: newLocation,
                      currency: 'KES'
                    });

                    if (!store) throw new Error('Failed to create store');

                    await linkOwnerToStore(store.id, pendingUser.email);
                    await createTrialSubscription(store.id);

                    setShowCreateModal(false);
                    setPendingUser(null);
                    onLogin(store);
                  } catch (e) {
                    console.error('Create/link error:', e);
                    setError('Failed to create and link store. Try again or contact support.');
                  } finally {
                    setCreating(false);
                  }
                }} disabled={creating} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg">{creating ? 'Creating...' : 'Create & Link Store'}</button>
                <button onClick={() => { setShowCreateModal(false); setPendingUser(null); }} disabled={creating} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-lg">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="absolute bottom-5 text-center w-full z-10">
        <p className="text-xs text-white/50 font-medium">
          Powered by <span className="text-blue-400 font-bold">Edgait Solutions</span> • v2.4
        </p>
      </div>
    </div>
  );
};
