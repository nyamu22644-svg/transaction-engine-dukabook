import React, { useState, useEffect } from 'react';
import { SalesEntryForm } from './components/SalesEntryForm';
import { EmployerDashboard } from './components/EmployerDashboard';
import { ReceiptVerification } from './components/ReceiptVerification';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { StoreLogin } from './components/StoreLogin';
import CallbackPage from './pages/CallbackPage';
import { LayoutDashboard, Store, WifiOff, LogOut, Lock, RotateCw } from 'lucide-react';
import { UserRole, StoreProfile } from './types';
import { getStoreById } from './services/supabaseService';
import { THEME_COLORS, DEFAULT_THEME } from './constants';

const App: React.FC = () => {
  const [currentRole, setCurrentRole] = useState<UserRole>('STAFF');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isDemoMode, setIsDemoMode] = useState(false);
  
  // Routing State
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [activeStore, setActiveStore] = useState<StoreProfile | null>(null);
  const [isLoadingStore, setIsLoadingStore] = useState(true);
  const [isPaymentCallback, setIsPaymentCallback] = useState(false);

  // Security State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  useEffect(() => {
    const init = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      
      // 0. Check for Payment Callback
      const callbackParam = searchParams.get('status_code') || searchParams.get('reference');
      if (callbackParam) {
        setIsPaymentCallback(true);
        setIsLoadingStore(false);
        return;
      }

      // 1. Check for Super Admin Mode
      const adminParam = searchParams.get('admin');
      if (adminParam === 'dukaAdmin') {
        setIsAdminMode(true);
        setIsLoadingStore(false);
        return;
      }

      // 2. Check for Verification Link
      const verifyParam = searchParams.get('verify');
      if (verifyParam) {
        setVerificationId(verifyParam);
        setIsLoadingStore(false);
        return;
      }

      // 3. Check for Magic Link Store ID
      const storeIdParam = searchParams.get('store_id');
      if (storeIdParam) {
        const store = await getStoreById(storeIdParam);
        if (store) {
          setActiveStore(store);
          localStorage.setItem('dukabook_active_store_v1', JSON.stringify(store));
          // Clean URL
          window.history.replaceState({}, '', window.location.pathname);
          setIsLoadingStore(false);
          return;
        }
      }

      // 4. Check LocalStorage for previous session
      const savedStore = localStorage.getItem('dukabook_active_store_v1');
      if (savedStore) {
        try {
          setActiveStore(JSON.parse(savedStore));
        } catch (e) {
          console.error('Failed to parse saved store:', e);
        }
      }
      
      setIsLoadingStore(false);
    };

    init();

    // Connectivity Listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogin = (store: StoreProfile, isDemo: boolean = false) => {
    setActiveStore(store);
    setIsDemoMode(isDemo);
    if (!isDemo) {
      localStorage.setItem('dukabook_active_store_v1', JSON.stringify(store));
    }
  };

  const handleLogout = () => {
    setActiveStore(null);
    setCurrentRole('STAFF');
    setIsDemoMode(false);
    localStorage.removeItem('dukabook_active_store_v1');
  };

  const handleRefreshStore = async () => {
    if (!activeStore) return;
    try {
      const updatedStore = await getStoreById(activeStore.id);
      if (updatedStore) {
        setActiveStore(updatedStore);
        if (!isDemoMode) {
          localStorage.setItem('dukabook_active_store_v1', JSON.stringify(updatedStore));
        }
      }
    } catch (err) {
      console.error('Failed to refresh store:', err);
    }
  };

  const initiateOwnerSwitch = () => {
    if (currentRole === 'ADMIN') return;
    setPinInput('');
    setPinError(false);
    setShowAuthModal(true);
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In demo mode, accept "duka" as PIN
    const validPin = isDemoMode ? 'duka' : activeStore?.owner_pin;
    if (pinInput === validPin) {
      setCurrentRole('ADMIN');
      setShowAuthModal(false);
      setPinInput('');
    } else {
      setPinError(true);
      setPinInput('');
    }
  };

  // --- ROUTING RENDER LOGIC ---
  console.log('Render state:', { isLoadingStore, isPaymentCallback, verificationId, isAdminMode, activeStore: activeStore?.name });

  if (isLoadingStore) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Store className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-slate-600 font-medium">Loading DukaBook...</p>
        </div>
      </div>
    );
  }

  if (verificationId) {
    return <ReceiptVerification saleId={verificationId} />;
  }

  if (isAdminMode) {
    return <SuperAdminDashboard />;
  }

  if (!activeStore) {
    return <StoreLogin onLogin={handleLogin} />;
  }

  // --- THEME ---
  const theme = THEME_COLORS[activeStore.theme_color || 'blue'] || DEFAULT_THEME;

  // --- MAIN APP ---
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans relative">
      
      {/* PIN AUTH MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[60] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-xs animate-in zoom-in-95 duration-200">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Lock className="w-6 h-6 text-slate-600" />
              </div>
              <h3 className="font-bold text-lg text-slate-800">Owner Access</h3>
              <p className="text-slate-500 text-sm">
                {isDemoMode ? 'Demo PIN: type "duka"' : 'Enter secret PIN to continue'}
              </p>
            </div>
            <form onSubmit={handlePinSubmit}>
              <input
                type={isDemoMode ? "text" : "password"}
                inputMode={isDemoMode ? "text" : "numeric"}
                pattern={isDemoMode ? undefined : "[0-9]*"}
                maxLength={isDemoMode ? 10 : 4}
                autoFocus
                className={`w-full text-center text-3xl tracking-[0.5em] font-bold py-3 border rounded-lg focus:outline-none focus:ring-2 ${pinError ? 'border-red-300 ring-red-200 text-red-600' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100 text-slate-800'}`}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.toLowerCase())}
                placeholder={isDemoMode ? "duka" : ""}
              />
              {pinError && <p className="text-red-500 text-xs text-center mt-2 font-medium">Incorrect PIN. Try again.</p>}
              <div className="grid grid-cols-2 gap-3 mt-6">
                <button type="button" onClick={() => setShowAuthModal(false)} className="py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg">Cancel</button>
                <button type="submit" className="py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800">Unlock</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* App Bar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-900">
            <img
              src="/logo.png"
              alt="DukaBook logo"
              className="w-10 h-10 rounded-xl bg-white shadow-sm ring-1 ring-slate-200 object-contain p-1"
            />
            <span className="font-bold text-xl tracking-tight hidden xs:block">DukaBook</span>
            <span className="text-sm text-slate-500 border-l border-slate-300 pl-2 ml-1 truncate max-w-[120px]">
              {activeStore.name}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setCurrentRole('STAFF')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  currentRole === 'STAFF' 
                    ? `bg-white ${theme.text} shadow-sm` 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                Staff
              </button>
              <button
                onClick={initiateOwnerSwitch}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  currentRole === 'ADMIN' 
                    ? `bg-white ${theme.text} shadow-sm` 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Owner
              </button>
            </div>

            <button 
              onClick={handleRefreshStore}
              className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
              title="Refresh store data"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {!isOnline && (
        <div className="bg-red-500 text-white text-xs font-semibold py-2 px-4 text-center flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" />
          You are offline. Data cannot be synced to the Owner.
        </div>
      )}

      {isDemoMode && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold py-2 px-4 text-center flex items-center justify-center gap-2">
          🎮 DEMO MODE — Explore freely! Your data won't be saved.
          <button 
            onClick={handleLogout}
            className="ml-2 px-3 py-1 bg-white/20 rounded-full hover:bg-white/30 transition-colors font-bold"
          >
            Exit Demo
          </button>
        </div>
      )}

      {isPaymentCallback ? (
        <CallbackPage />
      ) : (
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-xl mx-auto space-y-6">
            {currentRole === 'STAFF' ? (
              <SalesEntryForm store={activeStore} isDemoMode={isDemoMode} onExitDemo={handleLogout} />
            ) : (
              <EmployerDashboard store={activeStore} isDemoMode={isDemoMode} onExitDemo={handleLogout} />
            )}
          </div>
        </main>
      )}

      <footer className="py-6 text-center text-slate-400 text-xs space-y-1">
        <p>&copy; {new Date().getFullYear()} DukaBook Kenya.</p>
        <p className="text-slate-500">Powered by <span className="font-semibold text-blue-600">Edgait Solutions</span></p>
      </footer>
    </div>
  );
};

export default App;