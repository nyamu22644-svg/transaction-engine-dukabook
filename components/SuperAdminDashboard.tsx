import React, { useEffect, useState } from 'react';
import { StoreProfile, BusinessType, SubscriptionTier, StoreSubscription } from '../types';
import { createNewStore, fetchAllStores, linkOwnerToStore, updateStore } from '../services/supabaseService';
import { getAllSubscriptions, createTrialSubscription } from '../services/billingService';
import { Plus, Copy, Building, MapPin, Key, ExternalLink, Lock, Crown, X, LayoutGrid, Mail, UserPlus, Edit3, Save, Activity, BarChart3, CreditCard, Clock, Sparkles, AlertTriangle, Wallet } from 'lucide-react';
import { StoreHealthDashboard } from './StoreHealthDashboard';
import { BillingDashboard } from './BillingDashboard';
import { C2BPaymentsManager } from './C2BPaymentsManager';
import IntaSendPaymentHistory from './IntaSendPaymentHistory';

// Type for store with subscription info
interface StoreWithSubscription extends StoreProfile {
  subscription?: StoreSubscription;
  effectiveTier?: 'TRIAL' | 'BASIC' | 'PREMIUM' | 'EXPIRED' | 'NONE';
  trialDaysLeft?: number;
}

export const SuperAdminDashboard: React.FC = () => {
  const BUSINESS_TYPES: BusinessType[] = [
    'GENERAL','HARDWARE','WHOLESALER','BOUTIQUE','PHARMACY','WINES','SALON','CHEMIST','COSMETICS','BROKERAGE','OTHER'
  ];
  const [stores, setStores] = useState<StoreWithSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [theme, setTheme] = useState('blue');
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('1234');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('HARDWARE');
  // New stores start with 7-day trial, no tier selection needed
  
  // Link Owner Modal State
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkStoreId, setLinkStoreId] = useState('');
  const [linkEmail, setLinkEmail] = useState('');
  const [linking, setLinking] = useState(false);

  // Edit Store Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editStore, setEditStore] = useState<StoreProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editPin, setEditPin] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editTheme, setEditTheme] = useState('blue');
  const [editBusinessType, setEditBusinessType] = useState<BusinessType>('HARDWARE');
  const [saving, setSaving] = useState(false);

  // Tier Management Modal State (SuperAdmin Only)
  const [showTierModal, setShowTierModal] = useState(false);
  const [tierStoreId, setTierStoreId] = useState('');
  const [tierStoreName, setTierStoreName] = useState('');
  const [newTier, setNewTier] = useState<'BASIC' | 'PREMIUM'>('BASIC');
  const [tierUpdating, setTierUpdating] = useState(false);

  // Health Dashboard State
  const [showHealthDashboard, setShowHealthDashboard] = useState(false);
  
  // Billing Dashboard State
  const [showBillingDashboard, setShowBillingDashboard] = useState(false);
  
  // C2B Payments Manager State
  const [showC2BManager, setShowC2BManager] = useState(false);

  const loadStores = async () => {
    const [storesData, subscriptionsData] = await Promise.all([
      fetchAllStores(),
      getAllSubscriptions()
    ]);
    
    // Merge subscription data with stores
    const storesWithSubs: StoreWithSubscription[] = storesData.map(store => {
      const sub = subscriptionsData.find(s => s.store_id === store.id);
      let effectiveTier: 'TRIAL' | 'BASIC' | 'PREMIUM' | 'EXPIRED' | 'NONE' = 'NONE';
      let trialDaysLeft = 0;
      
      // Priority 1: Check if SuperAdmin manually set a tier
      if (store.tier && (store.tier === 'BASIC' || store.tier === 'PREMIUM')) {
        effectiveTier = store.tier as 'BASIC' | 'PREMIUM';
      } 
      // Priority 2: Check subscription status
      else if (sub) {
        const now = new Date();
        const periodEnd = new Date(sub.current_period_end);
        
        if (sub.is_trial && sub.trial_end) {
          const trialEnd = new Date(sub.trial_end);
          if (now < trialEnd) {
            effectiveTier = 'TRIAL';
            trialDaysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
          } else {
            effectiveTier = 'EXPIRED';
          }
        } else if (sub.status === 'ACTIVE' && now < periodEnd) {
          // Check plan tier
          effectiveTier = sub.plan_id.includes('premium') ? 'PREMIUM' : 'BASIC';
        } else if (sub.status === 'SUSPENDED' || sub.status === 'CANCELLED') {
          effectiveTier = 'EXPIRED';
        } else {
          effectiveTier = 'EXPIRED';
        }
      }
      
      return {
        ...store,
        subscription: sub,
        effectiveTier,
        trialDaysLeft,
      };
    });
    
    setStores(storesWithSubs);
    setLoading(false);
  };

  useEffect(() => {
    loadStores();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code || !pin) return;

    // Create store without tier - tier comes from subscription
    const newStore = await createNewStore({
      name,
      location,
      theme_color: theme,
      access_code: code.toUpperCase(),
      owner_pin: pin,
      business_type: businessType,
      currency: 'KES'
    });

    // Create 7-day trial subscription for new store
    if (newStore) {
      await createTrialSubscription(newStore.id);
      
      // If owner email provided, link the user to the store
      if (ownerEmail) {
        await linkOwnerToStore(newStore.id, ownerEmail.trim().toLowerCase());
      }
    }

    // Reset and Reload
    setName('');
    setLocation('');
    setCode('');
    setPin('1234');
    setOwnerEmail('');
    setShowModal(false);
    loadStores();
  };

  const handleLinkOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkStoreId || !linkEmail) return;
    
    setLinking(true);
    try {
      const success = await linkOwnerToStore(linkStoreId, linkEmail.trim().toLowerCase());
      if (success) {
        alert('Owner linked successfully!');
        setShowLinkModal(false);
        setLinkEmail('');
        setLinkStoreId('');
      } else {
        alert('Failed to link owner. Make sure the email is registered.');
      }
    } catch (err) {
      alert('Error linking owner.');
    } finally {
      setLinking(false);
    }
  };

  const openLinkModal = (storeId: string) => {
    setLinkStoreId(storeId);
    setLinkEmail('');
    setShowLinkModal(true);
  };

  const openEditModal = (store: StoreProfile) => {
    setEditStore(store);
    setEditName(store.name);
    setEditLocation(store.location || '');
    setEditCode(store.access_code);
    setEditPin(store.owner_pin);
    setEditEmail(store.email || '');
    setEditPhone(store.phone || '');
    setEditTheme(store.theme_color || 'blue');
    setEditBusinessType(store.business_type);
    setShowEditModal(true);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStore) return;
    
    setSaving(true);
    try {
      const success = await updateStore(editStore.id, {
        name: editName,
        location: editLocation,
        access_code: editCode.toUpperCase(),
        owner_pin: editPin,
        email: editEmail || undefined,
        phone: editPhone || undefined,
        theme_color: editTheme,
        business_type: editBusinessType,
      });
      
      if (success) {
        // Also link owner if email provided
        if (editEmail) {
          await linkOwnerToStore(editStore.id, editEmail.trim().toLowerCase());
        }
        alert('Store updated successfully!');
        setShowEditModal(false);
        loadStores();
      } else {
        alert('Failed to update store.');
      }
    } catch (err) {
      alert('Error updating store.');
    } finally {
      setSaving(false);
    }
  };

  const copyLink = (id: string) => {
    const link = `${window.location.origin}/?store_id=${id}`;
    navigator.clipboard.writeText(link);
    alert('Magic Link copied to clipboard!');
  };

  const handleUpdateTier = async () => {
    if (!tierStoreId) return;
    setTierUpdating(true);
    try {
      const success = await updateStore(tierStoreId, {
        tier: newTier,
      });
      
      if (success) {
        alert(`Store tier updated to ${newTier} successfully!`);
        setShowTierModal(false);
        loadStores();
      } else {
        alert('Failed to update tier.');
      }
    } catch (err) {
      alert('Error updating tier.');
    } finally {
      setTierUpdating(false);
    }
  };

  const openTierModal = (storeId: string, storeName: string, currentTier: string) => {
    setTierStoreId(storeId);
    setTierStoreName(storeName);
    setNewTier(currentTier === 'PREMIUM' ? 'PREMIUM' : 'BASIC');
    setShowTierModal(true);
  };

  if (loading) return <div className="p-10 text-center text-white">Loading Admin Panel...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-4">
            <img
              src="/logo.png"
              alt="DukaBook logo"
              className="w-14 h-14 rounded-xl bg-white/10 ring-2 ring-white/10 object-contain p-1"
            />
            <div>
              <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">DukaBook Super Admin</h1>
              <p className="text-slate-400 flex items-center gap-2 text-sm">
                <LayoutGrid className="w-4 h-4" />
                Developer Control Center
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button 
              onClick={() => setShowHealthDashboard(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-emerald-900/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              <Activity className="w-5 h-5" />
              Health Dashboard
            </button>
            <button 
              onClick={() => setShowBillingDashboard(true)}
              className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-green-900/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              <CreditCard className="w-5 h-5" />
              Billing & Payments
            </button>
            <button 
              onClick={() => setShowC2BManager(true)}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-amber-900/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              <Wallet className="w-5 h-5" />
              C2B Payments
            </button>
            <button 
              onClick={() => setShowModal(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-blue-900/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-5 h-5" />
              Onboard New Duka
            </button>
            <button
              onClick={() => {
                if (!window.confirm('Reset demo subscriptions for unregistered demo stores? This will remove local demo trials.') ) return;
                try {
                  const saved = localStorage.getItem('dukabook_subscriptions');
                  if (!saved) {
                    alert('No demo subscriptions found in localStorage.');
                    return;
                  }
                  const subs = JSON.parse(saved || '[]');
                  // Keep subscriptions that belong to registered stores (owner_id present)
                  const registeredStoreIds = new Set(stores.filter(s => s.owner_id).map(s => s.id));
                  const filtered = subs.filter((s: any) => registeredStoreIds.has(s.store_id));
                  localStorage.setItem('dukabook_subscriptions', JSON.stringify(filtered));
                  alert('Demo subscriptions reset for unregistered stores.');
                  // Reload stores to refresh trial counts
                  loadStores();
                } catch (e) {
                  console.error('Failed to reset demo subscriptions:', e);
                  alert('Failed to reset demo subscriptions. See console for details.');
                }
              }}
              className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-black/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              Reset Demo
            </button>
          </div>
        </header>

        {/* STATS OVERVIEW */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
           <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
              <div className="text-slate-400 text-xs uppercase tracking-wider font-bold mb-1">Total Clients</div>
              <div className="text-3xl font-bold text-white">{stores.length}</div>
           </div>
           <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
              <div className="text-slate-400 text-xs uppercase tracking-wider font-bold mb-1">Premium Users</div>
              <div className="text-3xl font-bold text-amber-500">{stores.filter(s => s.effectiveTier === 'PREMIUM').length}</div>
           </div>
           <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
              <div className="text-slate-400 text-xs uppercase tracking-wider font-bold mb-1">Active Trials</div>
              <div className="text-3xl font-bold text-blue-500">{stores.filter(s => s.effectiveTier === 'TRIAL').length}</div>
           </div>
        </div>

        {/* CLIENT LIST */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stores.map(store => (
            <div key={store.id} className="bg-slate-900 p-6 rounded-xl border border-slate-800 hover:border-slate-700 transition group relative overflow-hidden">
              {store.effectiveTier === 'PREMIUM' && (
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition">
                  <Crown className="w-24 h-24 rotate-12" />
                </div>
              )}
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-white flex items-center gap-2">
                      {store.name}
                      {store.effectiveTier === 'PREMIUM' && <Crown className="w-4 h-4 text-amber-500" fill="currentColor" />}
                      {store.effectiveTier === 'TRIAL' && <Sparkles className="w-4 h-4 text-blue-400" />}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded inline-block border border-slate-700">
                        {store.business_type}
                      </span>
                      {store.effectiveTier === 'TRIAL' && store.trialDaysLeft !== undefined && (
                        <span className="text-xs text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded inline-block border border-blue-500/30">
                          {store.trialDaysLeft}d trial
                        </span>
                      )}
                      {store.effectiveTier === 'EXPIRED' && (
                        <span className="text-xs text-red-400 bg-red-900/30 px-2 py-0.5 rounded inline-block border border-red-500/30">
                          Expired
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${
                    store.effectiveTier === 'PREMIUM' ? 'bg-amber-500' : 
                    store.effectiveTier === 'TRIAL' ? 'bg-blue-500' :
                    store.effectiveTier === 'EXPIRED' ? 'bg-red-500' :
                    'bg-slate-600'
                  }`}></div>
                </div>

                <div className="space-y-2 text-sm text-slate-400 mb-6">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-600" />
                    {store.location}
                  </div>
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-slate-600" />
                    Code: <span className="font-mono text-slate-300 bg-slate-800 px-1 rounded">{store.access_code}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-slate-600" />
                    PIN: <span className="font-mono text-slate-300 bg-slate-800 px-1 rounded">{store.owner_pin}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 border-t border-slate-800 pt-4">
                   <button 
                     onClick={() => openEditModal(store)}
                     className="flex items-center justify-center gap-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 py-2 px-3 rounded-lg text-xs font-bold transition"
                     title="Edit Store"
                   >
                     <Edit3 className="w-3 h-3" />
                   </button>
                   <button 
                     onClick={() => openTierModal(store.id, store.name, store.tier || 'BASIC')}
                     className="flex items-center justify-center gap-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 py-2 px-3 rounded-lg text-xs font-bold transition"
                     title="Set Tier (SuperAdmin)"
                   >
                     <Crown className="w-3 h-3" />
                   </button>
                   <button 
                     onClick={() => openLinkModal(store.id)}
                     className="flex items-center justify-center gap-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 py-2 px-3 rounded-lg text-xs font-bold transition"
                     title="Link Owner Email"
                   >
                     <UserPlus className="w-3 h-3" />
                   </button>
                   <button 
                     onClick={() => copyLink(store.id)}
                     className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg text-xs font-bold transition"
                   >
                     <Copy className="w-3 h-3" />
                     Copy Link
                   </button>
                   <a 
                     href={`/?store_id=${store.id}`}
                     target="_blank"
                     rel="noreferrer"
                     className="flex-1 flex items-center justify-center gap-2 border border-slate-700 hover:bg-slate-800 text-slate-400 py-2 rounded-lg text-xs font-bold transition"
                   >
                     <ExternalLink className="w-3 h-3" />
                     Launch
                   </a>
                   <button
                     onClick={async () => {
                       try {
                         // Unset demo flag on any other stores
                         const others = stores.filter(s => s.is_demo && s.id !== store.id);
                         for (const o of others) {
                           await updateStore(o.id, { is_demo: false });
                         }
                         // Set demo on this store
                         await updateStore(store.id, { is_demo: true });
                         alert(`${store.name} is now the demo store.`);
                         loadStores();
                       } catch (e) {
                         console.error('Failed to set demo store:', e);
                         alert('Failed to set demo store. See console for details.');
                       }
                     }}
                     className={`px-3 py-2 rounded-lg text-xs font-bold transition ${store.is_demo ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                   >
                     {store.is_demo ? 'Demo' : 'Set Demo'}
                   </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CREATE MODAL */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-800 relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
              <button 
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white transition"
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className="p-8">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Building className="w-6 h-6 text-blue-500" />
                    Register New Duka
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">Configure the store profile and access credentials.</p>
                </div>

                <form onSubmit={handleCreate} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Duka Name</label>
                      <input 
                        type="text" required 
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition"
                        placeholder="e.g. Simba Hardware"
                        value={name} onChange={e => setName(e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Location</label>
                      <input 
                        type="text" required 
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none transition"
                        placeholder="e.g. Nairobi CBD"
                        value={location} onChange={e => setLocation(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Access Code</label>
                      <input 
                        type="text" required 
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none transition uppercase font-mono"
                        placeholder="SIMBA01"
                        value={code} onChange={e => setCode(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Owner PIN</label>
                      <input 
                        type="text" required 
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none transition font-mono"
                        placeholder="1234"
                        value={pin} onChange={e => setPin(e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">
                        Owner Email <span className="text-slate-600">(optional - link to existing user)</span>
                      </label>
                      <input 
                        type="email"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none transition"
                        placeholder="owner@example.com"
                        value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Business Type</label>
                        <select 
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none transition text-sm"
                          value={businessType} onChange={e => setBusinessType(e.target.value as BusinessType)}
                        >
                          {BUSINESS_TYPES.map(bt => (
                            <option key={bt} value={bt}>{bt === 'GENERAL' ? 'General Shop' : bt.charAt(0) + bt.slice(1).toLowerCase()}</option>
                          ))}
                        </select>
                     </div>
                     <div>
                       <label className="block text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Theme Color</label>
                        <select 
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none transition text-sm"
                          value={theme} onChange={e => setTheme(e.target.value)}
                        >
                          <option value="blue">Blue</option>
                          <option value="orange">Orange</option>
                          <option value="green">Green</option>
                          <option value="red">Red</option>
                          <option value="purple">Purple</option>
                        </select>
                     </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider text-slate-500 font-bold mb-2">Subscription</label>
                    <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-900/20">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                          <Clock className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <p className="text-white font-semibold">7-Day Free Trial</p>
                          <p className="text-xs text-slate-400">New stores automatically start with a trial. Full premium features included.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl mt-4 transition shadow-lg shadow-blue-900/20 active:scale-[0.98]">
                    Create Client Profile
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* LINK OWNER MODAL */}
        {showLinkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-800 relative animate-in zoom-in-95 duration-200">
              <button 
                onClick={() => setShowLinkModal(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white transition"
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className="p-8">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-green-500" />
                    Link Owner to Store
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">Enter the owner's registered email to link their account.</p>
                </div>

                <form onSubmit={handleLinkOwner} className="space-y-5">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Owner Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                      <input 
                        type="email" 
                        required 
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 pl-11 text-white focus:border-green-500 focus:outline-none transition"
                        placeholder="owner@example.com"
                        value={linkEmail} 
                        onChange={e => setLinkEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={linking}
                    className="w-full bg-green-600 hover:bg-green-500 disabled:bg-slate-700 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-green-900/20 active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {linking ? 'Linking...' : 'Link Owner Account'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* EDIT STORE MODAL */}
        {showEditModal && editStore && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-800 relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
              <button 
                onClick={() => { setShowEditModal(false); setEditStore(null); }}
                className="absolute top-4 right-4 text-slate-500 hover:text-white transition z-10"
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className="p-8">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Edit3 className="w-6 h-6 text-blue-500" />
                    Edit Store
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">Update store information and link owner email.</p>
                </div>

                <form onSubmit={handleEditSave} className="space-y-5">
                  {/* Store Name */}
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Store Name</label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                      <input 
                        type="text" 
                        required 
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 pl-11 text-white focus:border-blue-500 focus:outline-none transition"
                        placeholder="Store name"
                        value={editName} 
                        onChange={e => setEditName(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Location</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                      <input 
                        type="text" 
                        required 
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 pl-11 text-white focus:border-blue-500 focus:outline-none transition"
                        placeholder="City, Area"
                        value={editLocation} 
                        onChange={e => setEditLocation(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Access Code & PIN */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Access Code</label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                        <input 
                          type="text" 
                          required 
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 pl-11 text-white uppercase font-mono focus:border-blue-500 focus:outline-none transition"
                          placeholder="CODE"
                          value={editCode} 
                          onChange={e => setEditCode(e.target.value.toUpperCase())}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Owner PIN</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                        <input 
                          type="text" 
                          required 
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 pl-11 text-white font-mono focus:border-blue-500 focus:outline-none transition"
                          placeholder="1234"
                          value={editPin} 
                          onChange={e => setEditPin(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Owner Email */}
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Owner Email (Account Link)</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                      <input 
                        type="email" 
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 pl-11 text-white focus:border-blue-500 focus:outline-none transition"
                        placeholder="owner@example.com (optional)"
                        value={editEmail} 
                        onChange={e => setEditEmail(e.target.value)}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">If provided, this user will be linked as the store owner.</p>
                  </div>

                  {/* Business Type */}
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Business Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {BUSINESS_TYPES.map(bt => (
                        <button
                          key={bt}
                          type="button"
                          onClick={() => setEditBusinessType(bt)}
                          className={`p-2 rounded-lg border text-xs font-bold transition-all ${editBusinessType === bt ? 'bg-blue-600/20 border-blue-500/50 text-blue-400' : 'border-slate-800 text-slate-500 hover:bg-slate-900'}`}
                        >
                          {bt === 'GENERAL' ? 'General' : bt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Subscription Info */}
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Subscription</label>
                    <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/50">
                      <p className="text-sm text-slate-400">Manage subscriptions and billing through the <span className="text-blue-400 font-semibold">Billing Dashboard</span>.</p>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={saving}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-bold py-3.5 rounded-xl mt-4 transition shadow-lg shadow-blue-900/20 active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* TIER MANAGEMENT MODAL (SuperAdmin Only) */}
        {showTierModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-800 relative animate-in zoom-in-95 duration-200">
              <button 
                onClick={() => setShowTierModal(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white transition z-10"
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className="p-8">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Crown className="w-6 h-6 text-purple-500" />
                    Tier Management
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">Set subscription tier for: <span className="font-bold text-white">{tierStoreName}</span></p>
                </div>

                <div className="space-y-4">
                  {/* BASIC Tier */}
                  <button
                    onClick={() => setNewTier('BASIC')}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      newTier === 'BASIC' 
                        ? 'bg-slate-800/50 border-blue-500 ring-2 ring-blue-500/20' 
                        : 'bg-slate-800/20 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="font-bold text-lg text-white">BASIC</div>
                    <div className="text-xs text-slate-400 mt-1">Standard features, limited users</div>
                  </button>

                  {/* PREMIUM Tier */}
                  <button
                    onClick={() => setNewTier('PREMIUM')}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      newTier === 'PREMIUM' 
                        ? 'bg-amber-900/30 border-amber-500 ring-2 ring-amber-500/20' 
                        : 'bg-slate-800/20 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="font-bold text-lg text-amber-400 flex items-center gap-2">
                      <Crown className="w-4 h-4" fill="currentColor" />
                      PREMIUM
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Full features, unlimited users, priority support</div>
                  </button>
                </div>

                <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700 text-xs text-slate-300">
                  <p><strong>⚠️ Note:</strong> This will override any existing subscription. Use carefully!</p>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setShowTierModal(false)}
                    className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateTier}
                    disabled={tierUpdating}
                    className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 text-white rounded-lg font-bold transition flex items-center justify-center gap-2"
                  >
                    {tierUpdating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Updating...
                      </>
                    ) : (
                      <>
                        <Crown className="w-4 h-4" />
                        Set to {newTier}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STORE HEALTH DASHBOARD */}
        {showHealthDashboard && (
          <StoreHealthDashboard onClose={() => setShowHealthDashboard(false)} />
        )}

        {/* BILLING DASHBOARD */}
        {showBillingDashboard && (
          <BillingDashboard onClose={() => setShowBillingDashboard(false)} />
        )}

        {/* C2B PAYMENTS MANAGER */}
        {showC2BManager && (
          <C2BPaymentsManager onClose={() => setShowC2BManager(false)} />
        )}

        {/* IntaSend Payment History */}
        <IntaSendPaymentHistory />
        {/* FOOTER */}
        <footer className="mt-12 pt-8 border-t border-slate-800 text-center text-slate-500 text-xs space-y-1">
          <p>&copy; {new Date().getFullYear()} DukaBook Super Admin</p>
          <p>Powered by <span className="font-semibold text-blue-500">Edgait Solutions</span></p>
        </footer>
      </div>
    </div>
  );
};
