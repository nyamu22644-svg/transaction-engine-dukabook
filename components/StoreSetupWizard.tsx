import React, { useState, useEffect } from 'react';
import { StoreProfile, BusinessType, AuthUser } from '../types';
import { signUp, generateUniqueAccessCode } from '../services/authService';
import { createNewStore, linkOwnerToStore } from '../services/supabaseService';
import { createTrialSubscription } from '../services/billingService';
import { 
  ArrowRight, ArrowLeft, Loader2, MapPin, Store, User, Lock, 
  CheckCircle2, Navigation, AlertCircle, Copy, Eye, EyeOff,
  Building, Smartphone, Mail
} from 'lucide-react';

interface StoreSetupWizardProps {
  onComplete: (store: StoreProfile) => void;
  onBack: () => void;
}

type Step = 'account' | 'store' | 'location' | 'security' | 'complete';

interface GeoState {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  loading: boolean;
  error: string | null;
}

export const StoreSetupWizard: React.FC<StoreSetupWizardProps> = ({ onComplete, onBack }) => {
  const [step, setStep] = useState<Step>('account');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Account Step
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Store Step
  const [storeName, setStoreName] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('GENERAL');
  const [location, setLocation] = useState('');

  // Location Step
  const [geoState, setGeoState] = useState<GeoState>({
    lat: null, lng: null, accuracy: null, loading: false, error: null
  });
  const [manualCoords, setManualCoords] = useState('');
  const [useManual, setUseManual] = useState(false);

  // Security Step
  const [ownerPin, setOwnerPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  // Created store
  const [createdStore, setCreatedStore] = useState<StoreProfile | null>(null);
  // If signup finds existing user without a store, store that user here to confirm creation
  const [pendingExistingUser, setPendingExistingUser] = useState<AuthUser | null>(null);
  const [confirmingLink, setConfirmingLink] = useState(false);

  const steps: Step[] = ['account', 'store', 'location', 'security', 'complete'];
  const currentIndex = steps.indexOf(step);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setGeoState(prev => ({ ...prev, error: 'Geolocation not supported by your browser' }));
      return;
    }

    setGeoState(prev => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoState({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          loading: false,
          error: null
        });
        setUseManual(false);
      },
      (err) => {
        let msg = 'Unable to detect location.';
        if (err.code === err.PERMISSION_DENIED) msg = 'Location permission denied. Please enable it or enter manually.';
        else if (err.code === err.POSITION_UNAVAILABLE) msg = 'GPS unavailable. Turn on location or enter manually.';
        else if (err.code === err.TIMEOUT) msg = 'Location request timed out. Try again or enter manually.';
        
        setGeoState(prev => ({ ...prev, loading: false, error: msg }));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const parseManualCoords = (): { lat: number; lng: number } | null => {
    // Accept formats: "-1.2345, 36.7890" or "-1.2345,36.7890" or "-1.2345 36.7890"
    const cleaned = manualCoords.trim().replace(/\s+/g, ' ');
    const match = cleaned.match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }
    return null;
  };

  const validateAccount = (): boolean => {
    if (!email || !password || !fullName) {
      setError('Please fill in all required fields.');
      return false;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }
    return true;
  };

  const validateStore = (): boolean => {
    if (!storeName) {
      setError('Please enter your store name.');
      return false;
    }
    if (!location) {
      setError('Please enter your store location/address.');
      return false;
    }
    return true;
  };

  const validateLocation = (): boolean => {
    if (useManual) {
      const coords = parseManualCoords();
      if (!coords) {
        setError('Invalid coordinates. Use format: -1.2345, 36.7890');
        return false;
      }
    } else if (!geoState.lat || !geoState.lng) {
      setError('Please detect your location or enter coordinates manually.');
      return false;
    }
    return true;
  };

  const validateSecurity = (): boolean => {
    if (!ownerPin || ownerPin.length < 4) {
      setError('PIN must be at least 4 digits.');
      return false;
    }
    if (ownerPin !== confirmPin) {
      setError('PINs do not match.');
      return false;
    }
    return true;
  };

  const handleNext = async () => {
    setError('');

    if (step === 'account' && validateAccount()) {
      setStep('store');
    } else if (step === 'store' && validateStore()) {
      setStep('location');
    } else if (step === 'location' && validateLocation()) {
      setStep('security');
    } else if (step === 'security' && validateSecurity()) {
      await handleCreateStore();
    }
  };

  const handleBack = () => {
    setError('');
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex]);
    } else {
      onBack();
    }
  };

  const handleCreateStore = async () => {
    setLoading(true);
    setError('');

    try {
      const coords = useManual ? parseManualCoords() : { lat: geoState.lat, lng: geoState.lng };
      
      const result = await signUp({
        email: email.trim(),
        password,
        full_name: fullName,
        phone: phone || undefined,
        storeName,
        businessType,
      });

      // If the email belongs to an existing user with no linked store, the service
      // will return an object with `needsStoreCreation` true and `user` populated.
      if ((result as any)?.needsStoreCreation) {
        setPendingExistingUser((result as any).user as AuthUser);
        setLoading(false);
        return;
      }

      if (!result?.store) {
        setError('Failed to create account. Email may already be registered. Try logging in instead.');
        setLoading(false);
        return;
      }

      // Store location info in localStorage for now (could update store in DB)
      const storeWithLocation = {
        ...result.store,
        location,
        owner_pin: ownerPin,
        // Store coordinates separately if needed
      };
      
      setCreatedStore(storeWithLocation);
      setStep('complete');
    } catch (err) {
      // Show specific error message from signup service
      const errorMsg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(errorMsg);
      console.error('Signup error:', err);
    } finally {
      setLoading(false);
    }
  };

    // Create and link a new store for an existing authenticated user (owner)
    const createAndLinkStoreForExistingUser = async () => {
      if (!pendingExistingUser) return;
      setConfirmingLink(true);
      setError('');

      try {
        const accessCode = await generateUniqueAccessCode();
        const newStore = await createNewStore({
          owner_id: pendingExistingUser.id,
          name: storeName || `${pendingExistingUser.full_name}'s Store`,
          business_type: businessType,
          access_code: accessCode,
          owner_pin: ownerPin || '1234',
          location,
          currency: 'KES'
        });

        if (!newStore) throw new Error('Failed to create store');

        // Ensure user record is updated and trial created
        await linkOwnerToStore(newStore.id, pendingExistingUser.email);
        await createTrialSubscription(newStore.id);

        setCreatedStore({ ...newStore, owner_pin: ownerPin });
        setPendingExistingUser(null);
        setStep('complete');
      } catch (e: any) {
        console.error('Failed to create and link store:', e);
        setError('Failed to create store for existing account. Try again or contact support.');
      } finally {
        setConfirmingLink(false);
      }
    };

  const copyAccessCode = () => {
    if (createdStore?.access_code) {
      navigator.clipboard.writeText(createdStore.access_code);
    }
  };

  const openGoogleMapsHelp = () => {
    window.open('https://support.google.com/maps/answer/18539', '_blank');
  };

  const getCoordinatesDisplay = (): string => {
    if (useManual) {
      const coords = parseManualCoords();
      return coords ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` : 'Invalid';
    }
    if (geoState.lat && geoState.lng) {
      return `${geoState.lat.toFixed(6)}, ${geoState.lng.toFixed(6)}`;
    }
    return 'Not set';
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-blue-900/30 rounded-full blur-[120px]"></div>
        <div className="absolute top-[50%] -right-[10%] w-[50%] h-[50%] bg-indigo-900/20 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-lg bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl relative z-10">
        {/* If the email exists in Supabase but has no linked store, offer to create and link one */}
        {pendingExistingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
            <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-800 p-6">
              <h3 className="text-lg font-bold text-white mb-2">Existing Account Detected</h3>
              <p className="text-slate-400 mb-4">An account with <strong>{pendingExistingUser.email}</strong> already exists but isn't linked to a store. Would you like to create and link this new store to that account?</p>
              <div className="flex gap-3">
                <button onClick={createAndLinkStoreForExistingUser} disabled={confirmingLink} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg">
                  {confirmingLink ? 'Creating...' : 'Create & Link Store'}
                </button>
                <button onClick={() => setPendingExistingUser(null)} disabled={confirmingLink} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-lg">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Progress Bar */}
        {step !== 'complete' && (
          <div className="mb-6">
            <div className="flex justify-between text-xs text-slate-400 mb-2 font-semibold">
              <span className={currentIndex >= 0 ? 'text-blue-400' : ''}>Account</span>
              <span className={currentIndex >= 1 ? 'text-blue-400' : ''}>Store</span>
              <span className={currentIndex >= 2 ? 'text-blue-400' : ''}>Location</span>
              <span className={currentIndex >= 3 ? 'text-blue-400' : ''}>Security</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / 4) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* STEP: Account */}
        {step === 'account' && (
          <div className="space-y-5">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <User className="w-7 h-7 text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Create Your Account</h2>
              <p className="text-slate-400 text-sm mt-1">Enter your details to get started</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-blue-400 uppercase tracking-wider">Full Name *</label>
                <input
                  type="text"
                  className="mt-1 w-full px-4 py-3 bg-slate-900/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-bold text-blue-400 uppercase tracking-wider">Email *</label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="email"
                    className="w-full pl-11 pr-4 py-3 bg-slate-900/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-blue-400 uppercase tracking-wider">Phone (Optional)</label>
                <div className="relative mt-1">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="tel"
                    className="w-full pl-11 pr-4 py-3 bg-slate-900/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0712 345 678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-blue-400 uppercase tracking-wider">Password *</label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="w-full pl-11 pr-11 py-3 bg-slate-900/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-blue-400 uppercase tracking-wider">Confirm Password *</label>
                <input
                  type="password"
                  className="mt-1 w-full px-4 py-3 bg-slate-900/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP: Store */}
        {step === 'store' && (
          <div className="space-y-5">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Store className="w-7 h-7 text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Store Details</h2>
              <p className="text-slate-400 text-sm mt-1">Tell us about your business</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-blue-400 uppercase tracking-wider">Store Name *</label>
                <div className="relative mt-1">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    className="w-full pl-11 pr-4 py-3 bg-slate-900/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Simba Hardware"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-blue-400 uppercase tracking-wider">Business Type *</label>
                <select
                  className="mt-1 w-full px-4 py-3 bg-slate-900/60 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value as BusinessType)}
                >
                  <option value="GENERAL">General Shop</option>
                  <option value="HARDWARE">Hardware Store</option>
                  <option value="WHOLESALER">Wholesaler</option>
                  <option value="BOUTIQUE">Boutique / Retail</option>
                  <option value="PHARMACY">Pharmacy</option>
                  <option value="WINES">Wines / Liquor</option>
                  <option value="SALON">Salon / Beauty</option>
                  <option value="CHEMIST">Chemist</option>
                  <option value="COSMETICS">Cosmetics</option>
                  <option value="BROKERAGE">Brokerage / Agent</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-bold text-blue-400 uppercase tracking-wider">Location / Address *</label>
                <div className="relative mt-1">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    className="w-full pl-11 pr-4 py-3 bg-slate-900/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Mombasa Road, Nairobi"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1 ml-1">Physical address where your store is located</p>
              </div>
            </div>
          </div>
        )}

        {/* STEP: Location (GPS) */}
        {step === 'location' && (
          <div className="space-y-5">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Navigation className="w-7 h-7 text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Store Coordinates</h2>
              <p className="text-slate-400 text-sm mt-1">For sales verification & delivery</p>
            </div>

            {/* Auto-detect */}
            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-white">Auto-Detect Location</span>
                <button
                  onClick={detectLocation}
                  disabled={geoState.loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg flex items-center gap-2 disabled:opacity-50"
                >
                  {geoState.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                  {geoState.loading ? 'Detecting...' : 'Detect Now'}
                </button>
              </div>

              {geoState.lat && geoState.lng && !useManual && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-green-300 font-semibold text-sm">Location Detected!</p>
                    <p className="text-green-400/80 text-xs font-mono mt-1">
                      {geoState.lat.toFixed(6)}, {geoState.lng.toFixed(6)}
                    </p>
                    <p className="text-slate-500 text-xs mt-1">Accuracy: ~{Math.round(geoState.accuracy || 0)}m</p>
                  </div>
                </div>
              )}

              {geoState.error && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-amber-300 text-sm">{geoState.error}</p>
                </div>
              )}
            </div>

            {/* Manual entry */}
            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <input
                  type="checkbox"
                  id="useManual"
                  checked={useManual}
                  onChange={(e) => setUseManual(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
                />
                <label htmlFor="useManual" className="text-sm font-bold text-white">Enter Coordinates Manually</label>
              </div>

              {useManual && (
                <div className="space-y-3">
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder="-1.2921, 36.8219"
                    value={manualCoords}
                    onChange={(e) => setManualCoords(e.target.value)}
                  />
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <p className="text-xs text-slate-400 font-semibold mb-2">📍 How to get coordinates:</p>
                    <ol className="text-xs text-slate-500 space-y-1 list-decimal list-inside">
                      <li>Open Google Maps on your phone</li>
                      <li>Long-press on your store's exact location</li>
                      <li>Tap the coordinates at the top to copy</li>
                      <li>Paste them here (format: lat, lng)</li>
                    </ol>
                    <button
                      type="button"
                      onClick={openGoogleMapsHelp}
                      className="mt-2 text-xs text-blue-400 hover:underline"
                    >
                      View detailed guide →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP: Security */}
        {step === 'security' && (
          <div className="space-y-5">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Lock className="w-7 h-7 text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Owner PIN</h2>
              <p className="text-slate-400 text-sm mt-1">Secure access to owner dashboard</p>
            </div>

            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 mb-4">
              <p className="text-sm text-slate-300 mb-2">
                <strong>Why set a PIN?</strong>
              </p>
              <p className="text-xs text-slate-500">
                Your PIN protects the owner dashboard where you can view reports, manage inventory, 
                and access sensitive business data. Staff cannot access these without your PIN.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-blue-400 uppercase tracking-wider">Create 4-Digit PIN *</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  className="mt-1 w-full px-4 py-4 bg-slate-900/60 border border-slate-700 rounded-xl text-white text-center text-2xl tracking-[0.5em] font-mono placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••"
                  value={ownerPin}
                  onChange={(e) => setOwnerPin(e.target.value.replace(/\D/g, ''))}
                />
              </div>

              <div>
                <label className="text-sm font-bold text-blue-400 uppercase tracking-wider">Confirm PIN *</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  className="mt-1 w-full px-4 py-4 bg-slate-900/60 border border-slate-700 rounded-xl text-white text-center text-2xl tracking-[0.5em] font-mono placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP: Complete */}
        {step === 'complete' && createdStore && (
          <div className="text-center py-6">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">You're All Set! 🎉</h2>
            <p className="text-slate-400 mb-6">Your store has been created successfully</p>

            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 text-left space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-slate-400 text-sm">Store Name</span>
                <span className="text-white font-semibold">{createdStore.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Access Code</span>
                <div className="flex items-center gap-2">
                  <span className="text-blue-400 font-mono font-bold">{createdStore.access_code}</span>
                  <button onClick={copyAccessCode} className="text-slate-500 hover:text-white">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 text-sm">Location</span>
                <span className="text-white">{location}</span>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
              <p className="text-blue-300 text-sm">
                <strong>Share the Access Code</strong> with your staff so they can log sales. 
                Only you have the Owner PIN for dashboard access.
              </p>
            </div>

            <button
              onClick={() => onComplete(createdStore)}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
            >
              Enter Dashboard
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Error */}
        {error && step !== 'complete' && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Navigation Buttons */}
        {step !== 'complete' && (
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleBack}
              className="flex-1 py-3 border border-slate-700 text-slate-300 font-bold rounded-xl hover:bg-slate-800 flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={handleNext}
              disabled={loading}
              className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {step === 'security' ? 'Create Store' : 'Continue'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
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
