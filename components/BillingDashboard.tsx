import React, { useEffect, useState } from 'react';
import { 
  X, RefreshCw, DollarSign, TrendingUp, Users, Crown, Clock,
  AlertTriangle, CheckCircle, XCircle, CreditCard, Phone, Send,
  Calendar, Ban, PlayCircle, Receipt, ChevronRight, Zap, Percent,
  ArrowUpRight, ArrowDownRight, Bell, MessageSquare, Settings, Package, Edit3, Save,
  Map, Shield, BarChart3, FileText, Smartphone, Wallet, Globe, Trash2, Plus
} from 'lucide-react';
import {
  getBillingDashboardStats,
  getAllSubscriptions,
  getSubscriptionPlans,
  updateSubscriptionPlan,
  sendPaymentReminder,
  processSubscriptionReminders,
  getPaymentConfig,
  updatePaymentConfig,
  getMarketingConfig,
  updateMarketingConfig,
  calculateDaysRemaining,
} from '../services/billingService';
import { getSubscriptionFeatures, createSubscriptionFeature, updateSubscriptionFeature, deleteSubscriptionFeature } from '../services/featureService';
import { StoreSubscription, StoreProfile, SubscriptionPlan, BillingDashboardStats, PaymentConfig, MarketingConfig, SubscriptionFeature } from '../types';

interface BillingDashboardProps {
  onClose: () => void;
}

export const BillingDashboard: React.FC<BillingDashboardProps> = ({ onClose }) => {
  const [stats, setStats] = useState<BillingDashboardStats | null>(null);
  const [subscriptions, setSubscriptions] = useState<(StoreSubscription & { store: StoreProfile })[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [features, setFeatures] = useState<SubscriptionFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'subscriptions' | 'expiring' | 'plans' | 'settings' | 'marketing' | 'features'>('overview');
  const [processingReminders, setProcessingReminders] = useState(false);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  
  // Plan editing state
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [editPlanName, setEditPlanName] = useState('');
  const [editPlanPrice, setEditPlanPrice] = useState(0);
  const [editPlanStaff, setEditPlanStaff] = useState(0);
  const [editPlanProducts, setEditPlanProducts] = useState(0);
  const [editPlanFeatures, setEditPlanFeatures] = useState<string[]>([]);
  const [editPlanPopular, setEditPlanPopular] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);

  // Feature editing state
  const [editingFeature, setEditingFeature] = useState<SubscriptionFeature | null>(null);
  const [newFeature, setNewFeature] = useState({ name: '', description: '', is_premium: false });
  const [addingFeature, setAddingFeature] = useState(false);
  const [savingFeature, setSavingFeature] = useState(false);

  // Payment config
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [editingPaymentConfig, setEditingPaymentConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // Marketing config
  const [marketingConfig, setMarketingConfig] = useState<MarketingConfig | null>(null);
  const [editingMarketingConfig, setEditingMarketingConfig] = useState(false);
  const [savingMarketingConfig, setSavingMarketingConfig] = useState(false);
  const [newSuccessStory, setNewSuccessStory] = useState({ name: '', business: '', quote: '' });

  const loadData = async () => {
    setLoading(true);
    const [statsData, subsData, plansData, featuresData, configData, marketingData] = await Promise.all([
      getBillingDashboardStats(),
      getAllSubscriptions(),
      getSubscriptionPlans(),
      getSubscriptionFeatures(),
      getPaymentConfig(),
      getMarketingConfig(),
    ]);
    setStats(statsData);
    setSubscriptions(subsData);
    setPlans(plansData);
    setFeatures(featuresData);
    setPaymentConfig(configData);
    setMarketingConfig(marketingData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleProcessReminders = async () => {
    if (!confirm('This will send SMS reminders to all stores with expiring/overdue subscriptions. Continue?')) return;
    setProcessingReminders(true);
    const result = await processSubscriptionReminders();
    alert(`Reminders sent: ${result.reminded}, Stores suspended: ${result.suspended}`);
    setProcessingReminders(false);
    loadData();
  };

  const handleSendReminder = async (sub: StoreSubscription & { store: StoreProfile }) => {
    setSendingReminder(sub.id);
    const daysLeft = calculateDaysRemaining(sub.expires_at);
    
    let reminderType: 'TRIAL_ENDING' | 'PAYMENT_DUE' | 'OVERDUE' | 'SUSPENDED' = 'PAYMENT_DUE';
    if (sub.is_trial) reminderType = 'TRIAL_ENDING';
    else if (daysLeft < 0) reminderType = 'OVERDUE';
    else if (sub.status === 'expired') reminderType = 'SUSPENDED';

    const success = await sendPaymentReminder(sub.store, sub, reminderType);
    alert(success ? 'Reminder sent!' : 'Failed to send reminder');
    setSendingReminder(null);
  };

  // Open plan editor
  const handleEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setEditPlanName(plan.name);
    setEditPlanPrice(plan.price_kes);
    setEditPlanStaff(plan.max_staff);
    setEditPlanProducts(plan.max_products);
    setEditPlanFeatures(plan.features || []);
    setEditPlanPopular(plan.is_popular || false);
  };

  // Save plan changes
  const handleSavePlan = async () => {
    if (!editingPlan) return;
    
    setSavingPlan(true);
    const updatedPlan: SubscriptionPlan = {
      ...editingPlan,
      name: editPlanName,
      price_kes: editPlanPrice,
      max_staff: editPlanStaff,
      max_products: editPlanProducts,
      features: editPlanFeatures,
      is_popular: editPlanPopular,
    };

    const success = await updateSubscriptionPlan(updatedPlan);
    if (success) {
      alert('Plan updated successfully!');
      setEditingPlan(null);
      loadData();
    } else {
      alert('Failed to update plan. Please try again.');
    }
    setSavingPlan(false);
  };

  // Save payment config
  const handleSavePaymentConfig = async () => {
    if (!paymentConfig) return;
    
    setSavingConfig(true);
    const success = await updatePaymentConfig(paymentConfig);
    if (success) {
      alert('Payment settings saved!');
      setEditingPaymentConfig(false);
    } else {
      alert('Failed to save settings.');
    }
    setSavingConfig(false);
  };

  // Save marketing config
  const handleSaveMarketingConfig = async () => {
    if (!marketingConfig) return;
    
    setSavingMarketingConfig(true);
    const success = await updateMarketingConfig(marketingConfig);
    if (success) {
      alert('Marketing messages saved! Changes will reflect for store owners.');
      setEditingMarketingConfig(false);
    } else {
      alert('Failed to save marketing settings.');
    }
    setSavingMarketingConfig(false);
  };

  // Add success story
  const handleAddSuccessStory = () => {
    if (!marketingConfig) return;
    if (!newSuccessStory.name.trim() || !newSuccessStory.business.trim() || !newSuccessStory.quote.trim()) {
      alert('Please fill all fields for the success story.');
      return;
    }
    
    setMarketingConfig({
      ...marketingConfig,
      success_stories: [...(marketingConfig.success_stories || []), newSuccessStory]
    });
    setNewSuccessStory({ name: '', business: '', quote: '' });
  };

  // Remove success story
  const handleRemoveSuccessStory = (index: number) => {
    if (!marketingConfig) return;
    const stories = [...(marketingConfig.success_stories || [])];
    stories.splice(index, 1);
    setMarketingConfig({ ...marketingConfig, success_stories: stories });
  };

  // Toggle feature in plan editor
  const toggleFeature = (feature: string) => {
    if (editPlanFeatures.includes(feature)) {
      setEditPlanFeatures(editPlanFeatures.filter(f => f !== feature));
    } else {
      setEditPlanFeatures([...editPlanFeatures, feature]);
    }
  };

  const formatCurrency = (amount: number) => `KES ${amount.toLocaleString()}`;
  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-KE', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'TRIAL': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'EXPIRED': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'SUSPENDED': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getDaysUntilExpiry = (endDate: string): number => {
    return calculateDaysRemaining(endDate);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-slate-900 rounded-2xl p-8 text-center">
          <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading Billing Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                <CreditCard className="w-8 h-8 text-green-500" />
                Billing & Subscriptions
              </h1>
              <p className="text-slate-400 mt-1">Manage plans, pricing, and payment settings</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleProcessReminders}
                disabled={processingReminders}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium flex items-center gap-2 transition disabled:opacity-50"
              >
                {processingReminders ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Bell className="w-4 h-4" />
                )}
                Send Reminders
              </button>
              <button 
                onClick={loadData}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button 
                onClick={onClose}
                className="p-2 bg-red-600/20 hover:bg-red-600/30 rounded-lg text-red-400 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Key Metrics */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
              <MetricCard icon={DollarSign} label="Total Revenue" value={formatCurrency(stats.total_revenue)} color="green" />
              <MetricCard icon={TrendingUp} label="Monthly Revenue" value={formatCurrency(stats.monthly_recurring_revenue)} color="blue" />
              <MetricCard icon={CheckCircle} label="Active" value={stats.active_subscriptions} color="emerald" />
              <MetricCard icon={Zap} label="On Trial" value={stats.trial_subscriptions} color="purple" />
              <MetricCard icon={AlertTriangle} label="Expiring Soon" value={stats.expiring_soon.length} color="yellow" subtitle="7 days" />
              <MetricCard icon={XCircle} label="Expired" value={stats.expired_subscriptions} color="red" />
            </div>
          )}

          {/* Secondary Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-xs uppercase">Conversion Rate</span>
                  <Percent className="w-4 h-4 text-green-500" />
                </div>
                <div className="text-2xl font-bold text-green-400">{stats.conversion_rate}%</div>
                <div className="text-xs text-slate-500">Trial → Paid</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-xs uppercase">Churn Rate</span>
                  <ArrowDownRight className="w-4 h-4 text-red-500" />
                </div>
                <div className="text-2xl font-bold text-red-400">{stats.churn_rate}%</div>
                <div className="text-xs text-slate-500">Last 30 days</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-xs uppercase">Pending Payments</span>
                  <Clock className="w-4 h-4 text-yellow-500" />
                </div>
                <div className="text-2xl font-bold text-yellow-400">{stats.pending_payments}</div>
                <div className="text-xs text-slate-500">{formatCurrency(stats.pending_amount)}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-xs uppercase">Avg Revenue/Store</span>
                  <ArrowUpRight className="w-4 h-4 text-blue-500" />
                </div>
                <div className="text-2xl font-bold text-blue-400">{formatCurrency(Math.round(stats.avg_revenue_per_store))}</div>
                <div className="text-xs text-slate-500">Lifetime</div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {[
              { id: 'overview', label: 'Overview', icon: DollarSign },
              { id: 'subscriptions', label: 'All Subscriptions', icon: Users },
              { id: 'expiring', label: 'Expiring/Overdue', icon: AlertTriangle },
              { id: 'plans', label: 'Pricing Plans', icon: Crown },
              { id: 'settings', label: 'Payment Settings', icon: Settings },
              { id: 'marketing', label: 'Marketing Messages', icon: Zap },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-green-600 text-white' 
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.id === 'expiring' && stats && (stats.expiring_soon.length + stats.recently_expired.length) > 0 && (
                  <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                    {stats.expiring_soon.length + stats.recently_expired.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            {activeTab === 'overview' && stats && (
              <div className="space-y-6">
                {/* Expiring Soon Alert */}
                {stats.expiring_soon.length > 0 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                    <h3 className="text-yellow-400 font-bold flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-5 h-5" />
                      {stats.expiring_soon.length} Subscriptions Expiring This Week
                    </h3>
                    <div className="space-y-2">
                      {stats.expiring_soon.slice(0, 5).map((sub: any) => (
                        <div key={sub.id} className="flex items-center justify-between bg-slate-800/50 p-3 rounded-lg">
                          <div>
                            <span className="text-white font-medium">{sub.stores?.name || 'Unknown'}</span>
                            <span className="text-slate-400 text-sm ml-2">
                              expires {formatDate(sub.current_period_end)}
                            </span>
                          </div>
                          <span className="text-yellow-400 font-bold">
                            {getDaysUntilExpiry(sub.current_period_end)} days
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recently Expired */}
                {stats.recently_expired.length > 0 && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                    <h3 className="text-red-400 font-bold flex items-center gap-2 mb-3">
                      <XCircle className="w-5 h-5" />
                      {stats.recently_expired.length} Recently Expired (Last 7 Days)
                    </h3>
                    <div className="space-y-2">
                      {stats.recently_expired.slice(0, 5).map((sub: any) => (
                        <div key={sub.id} className="flex items-center justify-between bg-slate-800/50 p-3 rounded-lg">
                          <div>
                            <span className="text-white font-medium">{sub.stores?.name || 'Unknown'}</span>
                            <span className="text-slate-400 text-sm ml-2">
                              expired {formatDate(sub.current_period_end)}
                            </span>
                          </div>
                          <span className="text-red-400 font-bold">
                            {Math.abs(getDaysUntilExpiry(sub.current_period_end))} days ago
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Stats */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-slate-800 rounded-xl p-4">
                    <h4 className="font-medium text-white mb-4 flex items-center gap-2">
                      <Receipt className="w-5 h-5 text-green-500" />
                      Subscription Distribution
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-slate-300">Active</span>
                        </div>
                        <span className="font-bold text-white">{stats.active_subscriptions}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                          <span className="text-slate-300">Trial</span>
                        </div>
                        <span className="font-bold text-white">{stats.trial_subscriptions}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span className="text-slate-300">Expired/Suspended</span>
                        </div>
                        <span className="font-bold text-white">{stats.expired_subscriptions}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-800 rounded-xl p-4">
                    <h4 className="font-medium text-white mb-4 flex items-center gap-2">
                      <Phone className="w-5 h-5 text-green-500" />
                      Payment Methods Active
                    </h4>
                    <div className="space-y-2">
                      {paymentConfig && (
                        <>
                          <div className="flex items-center justify-between py-2 border-b border-slate-700">
                            <span className="text-slate-400">Paybill</span>
                            <span className="font-mono text-white bg-slate-700 px-2 py-1 rounded">{paymentConfig.mpesa_paybill}</span>
                          </div>
                          <div className="flex items-center justify-between py-2 border-b border-slate-700">
                            <span className="text-slate-400">Till Number</span>
                            <span className="font-mono text-white bg-slate-700 px-2 py-1 rounded">{paymentConfig.mpesa_till}</span>
                          </div>
                          <div className="flex items-center justify-between py-2">
                            <span className="text-slate-400">STK Push</span>
                            <span className={`text-xs px-2 py-1 rounded ${paymentConfig.stk_enabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                              {paymentConfig.stk_enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'subscriptions' && (
              <div>
                <h3 className="text-lg font-bold text-white mb-4">All Subscriptions ({subscriptions.length})</h3>
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {subscriptions.map(sub => {
                    const daysLeft = getDaysUntilExpiry(sub.expires_at);
                    
                    return (
                      <div key={sub.id} className="bg-slate-800 p-4 rounded-xl flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-white">{sub.store?.name || 'Unknown Store'}</span>
                            {sub.store?.tier === 'PREMIUM' && <Crown className="w-4 h-4 text-amber-500" />}
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(sub.status)}`}>
                              {sub.status}
                            </span>
                          </div>
                          <div className="text-sm text-slate-400">
                            {sub.plan_name}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {sub.is_trial ? 'Trial ends' : 'Renews'}: {formatDate(sub.expires_at)}
                            {daysLeft > 0 && <span className="text-slate-400"> ({daysLeft} days)</span>}
                            {daysLeft <= 0 && <span className="text-red-400"> (Overdue {Math.abs(daysLeft)} days)</span>}
                          </div>
                        </div>
                        
                        <div className="text-right flex-shrink-0">
                          <div className="font-bold text-green-400">{formatCurrency(0)}</div>
                          <div className="text-xs text-slate-500">/{sub.plan_name}</div>
                        </div>

                        <button
                          onClick={() => handleSendReminder(sub)}
                          disabled={sendingReminder === sub.id}
                          className="p-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded-lg transition disabled:opacity-50"
                          title="Send Payment Reminder"
                        >
                          {sendingReminder === sub.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <MessageSquare className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                  {subscriptions.length === 0 && (
                    <p className="text-center text-slate-400 py-8">No subscriptions yet</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'expiring' && (
              <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  Expiring & Overdue Subscriptions
                </h3>
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {subscriptions
                    .filter(s => getDaysUntilExpiry(s.expires_at) <= 7 || s.status === 'expired' || s.status === 'cancelled')
                    .sort((a, b) => getDaysUntilExpiry(a.expires_at) - getDaysUntilExpiry(b.expires_at))
                    .map(sub => {
                      const daysLeft = getDaysUntilExpiry(sub.expires_at);
                      const plan = plans.find(p => p.name.includes(sub.plan_name));
                      
                      return (
                        <div key={sub.id} className={`p-4 rounded-xl flex items-center gap-4 ${
                          daysLeft < 0 ? 'bg-red-500/10 border border-red-500/30' :
                          daysLeft <= 3 ? 'bg-orange-500/10 border border-orange-500/30' :
                          'bg-yellow-500/10 border border-yellow-500/30'
                        }`}>
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                            daysLeft < 0 ? 'bg-red-500 text-white' :
                            daysLeft <= 3 ? 'bg-orange-500 text-white' :
                            'bg-yellow-500 text-black'
                          }`}>
                            {daysLeft < 0 ? Math.abs(daysLeft) : daysLeft}
                          </div>
                          
                          <div className="flex-1">
                            <div className="font-medium text-white">{sub.store?.name}</div>
                            <div className="text-sm text-slate-400">
                              {sub.store?.phone || sub.store?.email || 'No contact'}
                            </div>
                            <div className="text-xs text-slate-500">
                              {daysLeft < 0 ? `Overdue since ${formatDate(sub.expires_at)}` : `Expires ${formatDate(sub.expires_at)}`}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-bold text-white">{formatCurrency(plan?.price_kes || 0)}</div>
                            <div className={`text-xs ${daysLeft < 0 ? 'text-red-400' : 'text-yellow-400'}`}>
                              {daysLeft < 0 ? 'OVERDUE' : `${daysLeft} days left`}
                            </div>
                          </div>

                          <button
                            onClick={() => handleSendReminder(sub)}
                            disabled={sendingReminder === sub.id}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium flex items-center gap-2 transition disabled:opacity-50"
                          >
                            {sendingReminder === sub.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Send className="w-4 h-4" />
                                Remind
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  {subscriptions.filter(s => getDaysUntilExpiry(s.expires_at) <= 7 || s.status === 'expired').length === 0 && (
                    <div className="text-center py-8">
                      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                      <p className="text-green-400 font-medium">All Clear!</p>
                      <p className="text-slate-500 text-sm">No expiring or overdue subscriptions</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'plans' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Crown className="w-5 h-5 text-amber-500" />
                      Subscription Plans
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">Click "Edit" to modify pricing, limits, and features</p>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {plans.map(plan => (
                    <div key={plan.id} className={`relative bg-slate-800 rounded-xl p-5 border ${
                      plan.is_popular ? 'border-amber-500' : 'border-slate-700'
                    }`}>
                      {plan.is_popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-full">
                          POPULAR
                        </div>
                      )}
                      
                      <div className="text-center mb-4">
                        <h4 className="font-bold text-white text-lg">{plan.name}</h4>
                        <div className="text-3xl font-bold text-green-400 mt-2">
                          KES {plan.price_kes.toLocaleString()}
                        </div>
                        <div className="text-sm text-slate-400">/{plan.billing_cycle.toLowerCase()}</div>
                      </div>
                      
                      {/* Limits */}
                      <div className="bg-slate-700/50 rounded-lg p-3 mb-3 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400 flex items-center gap-1">
                            <Users className="w-3 h-3" /> Staff
                          </span>
                          <span className="text-white font-bold">{plan.max_staff}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400 flex items-center gap-1">
                            <Package className="w-3 h-3" /> Products
                          </span>
                          <span className="text-white font-bold">{plan.max_products}</span>
                        </div>
                      </div>
                      
                      {/* Features preview */}
                      <ul className="space-y-1.5 mb-4">
                        {plan.features.slice(0, 4).map((feature, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                            <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />
                            <span className="line-clamp-1">{feature}</span>
                          </li>
                        ))}
                        {plan.features.length > 4 && (
                          <li className="text-xs text-slate-500">+{plan.features.length - 4} more features</li>
                        )}
                      </ul>
                      
                      {/* Edit Button */}
                      <button 
                        onClick={() => handleEditPlan(plan)}
                        className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition"
                      >
                        <Edit3 className="w-4 h-4" />
                        Edit Plan
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'settings' && paymentConfig && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Settings className="w-5 h-5 text-blue-500" />
                    Payment Configuration
                  </h3>
                  <button
                    onClick={() => editingPaymentConfig ? handleSavePaymentConfig() : setEditingPaymentConfig(true)}
                    disabled={savingConfig}
                    className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition ${
                      editingPaymentConfig 
                        ? 'bg-green-600 hover:bg-green-500 text-white'
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                    }`}
                  >
                    {savingConfig ? <RefreshCw className="w-4 h-4 animate-spin" /> : editingPaymentConfig ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                    {savingConfig ? 'Saving...' : editingPaymentConfig ? 'Save Changes' : 'Edit Settings'}
                  </button>
                </div>
                
                {/* M-Pesa Settings */}
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                  <h4 className="font-medium text-white mb-4 flex items-center gap-2">
                    <Phone className="w-5 h-5 text-green-500" />
                    M-Pesa Configuration
                  </h4>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Paybill Number</label>
                      <input
                        type="text"
                        value={paymentConfig.mpesa_paybill}
                        onChange={(e) => setPaymentConfig({...paymentConfig, mpesa_paybill: e.target.value})}
                        disabled={!editingPaymentConfig}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white font-mono text-xl disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Till Number</label>
                      <input
                        type="text"
                        value={paymentConfig.mpesa_till}
                        onChange={(e) => setPaymentConfig({...paymentConfig, mpesa_till: e.target.value})}
                        disabled={!editingPaymentConfig}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white font-mono text-xl disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Consumer Key (Daraja API)</label>
                      <input
                        type="password"
                        value={paymentConfig.mpesa_consumer_key || ''}
                        onChange={(e) => setPaymentConfig({...paymentConfig, mpesa_consumer_key: e.target.value})}
                        disabled={!editingPaymentConfig}
                        placeholder="••••••••••••"
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Consumer Secret</label>
                      <input
                        type="password"
                        value={paymentConfig.mpesa_consumer_secret || ''}
                        onChange={(e) => setPaymentConfig({...paymentConfig, mpesa_consumer_secret: e.target.value})}
                        disabled={!editingPaymentConfig}
                        placeholder="••••••••••••"
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Passkey</label>
                      <input
                        type="password"
                        value={paymentConfig.mpesa_passkey || ''}
                        onChange={(e) => setPaymentConfig({...paymentConfig, mpesa_passkey: e.target.value})}
                        disabled={!editingPaymentConfig}
                        placeholder="••••••••••••"
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Callback URL</label>
                      <input
                        type="url"
                        value={paymentConfig.callback_url || ''}
                        onChange={(e) => setPaymentConfig({...paymentConfig, callback_url: e.target.value})}
                        disabled={!editingPaymentConfig}
                        placeholder="https://api.dukabook.co.ke/mpesa/callback"
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                  
                  {/* Payment Method Toggles */}
                  <div className="mt-6 grid md:grid-cols-3 gap-4">
                    <label className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition ${
                      paymentConfig.stk_enabled ? 'bg-green-500/10 border-green-500/30' : 'bg-slate-700/50 border-slate-600'
                    } ${!editingPaymentConfig && 'cursor-not-allowed opacity-50'}`}>
                      <input
                        type="checkbox"
                        checked={paymentConfig.stk_enabled}
                        onChange={(e) => setPaymentConfig({...paymentConfig, stk_enabled: e.target.checked})}
                        disabled={!editingPaymentConfig}
                        className="w-5 h-5 rounded"
                      />
                      <div>
                        <p className="text-white font-medium">STK Push</p>
                        <p className="text-xs text-slate-400">Instant payment prompts</p>
                      </div>
                    </label>
                    
                    <label className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition ${
                      paymentConfig.paybill_enabled ? 'bg-green-500/10 border-green-500/30' : 'bg-slate-700/50 border-slate-600'
                    } ${!editingPaymentConfig && 'cursor-not-allowed opacity-50'}`}>
                      <input
                        type="checkbox"
                        checked={paymentConfig.paybill_enabled}
                        onChange={(e) => setPaymentConfig({...paymentConfig, paybill_enabled: e.target.checked})}
                        disabled={!editingPaymentConfig}
                        className="w-5 h-5 rounded"
                      />
                      <div>
                        <p className="text-white font-medium">Paybill</p>
                        <p className="text-xs text-slate-400">Manual Paybill payments</p>
                      </div>
                    </label>
                    
                    <label className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition ${
                      paymentConfig.till_enabled ? 'bg-green-500/10 border-green-500/30' : 'bg-slate-700/50 border-slate-600'
                    } ${!editingPaymentConfig && 'cursor-not-allowed opacity-50'}`}>
                      <input
                        type="checkbox"
                        checked={paymentConfig.till_enabled}
                        onChange={(e) => setPaymentConfig({...paymentConfig, till_enabled: e.target.checked})}
                        disabled={!editingPaymentConfig}
                        className="w-5 h-5 rounded"
                      />
                      <div>
                        <p className="text-white font-medium">Till Number</p>
                        <p className="text-xs text-slate-400">Buy Goods payments</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* SMS Settings */}
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                  <h4 className="font-medium text-white mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-500" />
                    SMS Reminders (Africa's Talking)
                  </h4>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">API Key</label>
                      <input
                        type="password"
                        value={paymentConfig.sms_api_key || ''}
                        onChange={(e) => setPaymentConfig({...paymentConfig, sms_api_key: e.target.value})}
                        disabled={!editingPaymentConfig}
                        placeholder="••••••••••••"
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Username</label>
                      <input
                        type="text"
                        value={paymentConfig.sms_username || ''}
                        onChange={(e) => setPaymentConfig({...paymentConfig, sms_username: e.target.value})}
                        disabled={!editingPaymentConfig}
                        placeholder="sandbox"
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Sender ID</label>
                      <input
                        type="text"
                        value={paymentConfig.sms_sender_id || ''}
                        onChange={(e) => setPaymentConfig({...paymentConfig, sms_sender_id: e.target.value})}
                        disabled={!editingPaymentConfig}
                        placeholder="DUKABOOK"
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                    
                    <label className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition ${
                      paymentConfig.sms_enabled ? 'bg-green-500/10 border-green-500/30' : 'bg-slate-700/50 border-slate-600'
                    } ${!editingPaymentConfig && 'cursor-not-allowed opacity-50'}`}>
                      <input
                        type="checkbox"
                        checked={paymentConfig.sms_enabled}
                        onChange={(e) => setPaymentConfig({...paymentConfig, sms_enabled: e.target.checked})}
                        disabled={!editingPaymentConfig}
                        className="w-5 h-5 rounded"
                      />
                      <div>
                        <p className="text-white font-medium">Enable SMS Reminders</p>
                        <p className="text-xs text-slate-400">Send payment reminders via SMS</p>
                      </div>
                    </label>
                  </div>
                  
                  {/* Reminder Timing */}
                  <div className="mt-6">
                    <h5 className="text-sm text-slate-400 mb-3">Reminder Schedule</h5>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Trial Ending (days before)</label>
                        <input
                          type="number"
                          value={paymentConfig.trial_reminder_days || 3}
                          onChange={(e) => setPaymentConfig({...paymentConfig, trial_reminder_days: parseInt(e.target.value)})}
                          disabled={!editingPaymentConfig}
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Payment Due (days before)</label>
                        <input
                          type="number"
                          value={paymentConfig.payment_reminder_days || 7}
                          onChange={(e) => setPaymentConfig({...paymentConfig, payment_reminder_days: parseInt(e.target.value)})}
                          disabled={!editingPaymentConfig}
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Grace Period (days after)</label>
                        <input
                          type="number"
                          value={paymentConfig.grace_period_days || 3}
                          onChange={(e) => setPaymentConfig({...paymentConfig, grace_period_days: parseInt(e.target.value)})}
                          disabled={!editingPaymentConfig}
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white disabled:opacity-50"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Marketing Messages Tab */}
            {activeTab === 'marketing' && marketingConfig && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-500" />
                    Marketing Messages Configuration
                  </h3>
                  <button
                    onClick={() => editingMarketingConfig ? handleSaveMarketingConfig() : setEditingMarketingConfig(true)}
                    disabled={savingMarketingConfig}
                    className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition ${
                      editingMarketingConfig 
                        ? 'bg-green-600 hover:bg-green-500 text-white'
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                    }`}
                  >
                    {savingMarketingConfig ? <RefreshCw className="w-4 h-4 animate-spin" /> : editingMarketingConfig ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                    {savingMarketingConfig ? 'Saving...' : editingMarketingConfig ? 'Save Changes' : 'Edit Messages'}
                  </button>
                </div>

                <p className="text-slate-400 text-sm">
                  Customize all marketing messages shown to store owners. These messages encourage free/basic users to upgrade to premium plans.
                </p>
                
                {/* Trial Messages */}
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                  <h4 className="font-medium text-white mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-yellow-500" />
                    Trial Period Messages
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Trial Urgency Message</label>
                      <textarea
                        value={marketingConfig.trial_urgency_message}
                        onChange={(e) => setMarketingConfig({...marketingConfig, trial_urgency_message: e.target.value})}
                        disabled={!editingMarketingConfig}
                        placeholder="Your trial ends in {days} days! Upgrade now to keep all features."
                        rows={2}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                      />
                      <p className="text-xs text-slate-500 mt-1">Use {'{days}'} for dynamic countdown</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Trial Ending Banner</label>
                      <textarea
                        value={marketingConfig.trial_ending_banner}
                        onChange={(e) => setMarketingConfig({...marketingConfig, trial_ending_banner: e.target.value})}
                        disabled={!editingMarketingConfig}
                        placeholder="⏰ Trial expires soon! Lock in your special rate before it's too late."
                        rows={2}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Discount & Pricing */}
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                  <h4 className="font-medium text-white mb-4 flex items-center gap-2">
                    <Percent className="w-5 h-5 text-green-500" />
                    Discount & Pricing
                  </h4>
                  
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Discount Percentage (%)</label>
                      <input
                        type="number"
                        value={marketingConfig.trial_discount_percent}
                        onChange={(e) => setMarketingConfig({...marketingConfig, trial_discount_percent: parseInt(e.target.value) || 0})}
                        disabled={!editingMarketingConfig}
                        min={0}
                        max={100}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white disabled:opacity-50"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Annual Savings (months free)</label>
                      <input
                        type="number"
                        value={marketingConfig.annual_savings_months}
                        onChange={(e) => setMarketingConfig({...marketingConfig, annual_savings_months: parseInt(e.target.value) || 0})}
                        disabled={!editingMarketingConfig}
                        min={0}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white disabled:opacity-50"
                      />
                      <p className="text-xs text-slate-500 mt-1">e.g., "Save 2 months"</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Social Proof Count</label>
                      <input
                        type="number"
                        value={marketingConfig.businesses_count}
                        onChange={(e) => setMarketingConfig({...marketingConfig, businesses_count: parseInt(e.target.value) || 0})}
                        disabled={!editingMarketingConfig}
                        min={0}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white disabled:opacity-50"
                      />
                      <p className="text-xs text-slate-500 mt-1">"Join X+ businesses"</p>
                    </div>
                  </div>
                </div>

                {/* FOMO Messages */}
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                  <h4 className="font-medium text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-red-500" />
                    FOMO & Scarcity Messages
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">FOMO Message (Limited Time)</label>
                      <textarea
                        value={marketingConfig.fomo_message}
                        onChange={(e) => setMarketingConfig({...marketingConfig, fomo_message: e.target.value})}
                        disabled={!editingMarketingConfig}
                        placeholder="🔥 Limited time offer! 50% off Premium for new subscribers."
                        rows={2}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Upgrade Benefits Headline</label>
                      <input
                        type="text"
                        value={marketingConfig.upgrade_benefits_headline}
                        onChange={(e) => setMarketingConfig({...marketingConfig, upgrade_benefits_headline: e.target.value})}
                        disabled={!editingMarketingConfig}
                        placeholder="Unlock Your Full Business Potential"
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white disabled:opacity-50"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">What You're Missing Message</label>
                      <textarea
                        value={marketingConfig.missing_out_message}
                        onChange={(e) => setMarketingConfig({...marketingConfig, missing_out_message: e.target.value})}
                        disabled={!editingMarketingConfig}
                        placeholder="Basic users miss out on profit tracking, debt management, and GPS location features that grow your business 3x faster."
                        rows={2}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* CTA Buttons */}
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                  <h4 className="font-medium text-white mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-500" />
                    Call-to-Action Buttons
                  </h4>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Primary CTA Button Text</label>
                      <input
                        type="text"
                        value={marketingConfig.cta_button_text}
                        onChange={(e) => setMarketingConfig({...marketingConfig, cta_button_text: e.target.value})}
                        disabled={!editingMarketingConfig}
                        placeholder="Upgrade Now"
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white disabled:opacity-50"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Secondary CTA Text</label>
                      <input
                        type="text"
                        value={marketingConfig.cta_secondary_text}
                        onChange={(e) => setMarketingConfig({...marketingConfig, cta_secondary_text: e.target.value})}
                        disabled={!editingMarketingConfig}
                        placeholder="View Premium Features"
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white disabled:opacity-50"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm text-slate-400 mb-2">Dismissal Text (for closing nudges)</label>
                      <input
                        type="text"
                        value={marketingConfig.cta_dismiss_text}
                        onChange={(e) => setMarketingConfig({...marketingConfig, cta_dismiss_text: e.target.value})}
                        disabled={!editingMarketingConfig}
                        placeholder="Maybe Later"
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>

                {/* Feature Benefits */}
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                  <h4 className="font-medium text-white mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    Premium Feature Benefits
                  </h4>
                  
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Feature Benefits (one per line)</label>
                    <textarea
                      value={(marketingConfig.feature_benefits_list || []).join('\n')}
                      onChange={(e) => setMarketingConfig({
                        ...marketingConfig, 
                        feature_benefits_list: e.target.value.split('\n').filter(f => f.trim())
                      })}
                      disabled={!editingMarketingConfig}
                      placeholder="📊 Real-time profit tracking&#10;📍 GPS sales location map&#10;💳 Debt management (Madeni)&#10;👥 Unlimited staff accounts&#10;📈 Advanced analytics"
                      rows={6}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white disabled:opacity-50 disabled:cursor-not-allowed resize-none font-mono text-sm"
                    />
                    <p className="text-xs text-slate-500 mt-1">Add emojis for visual appeal. One benefit per line.</p>
                  </div>
                </div>

                {/* Success Stories */}
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                  <h4 className="font-medium text-white mb-4 flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-500" />
                    Success Stories (Social Proof)
                  </h4>
                  
                  {/* Existing Stories */}
                  {(marketingConfig.success_stories || []).length > 0 && (
                    <div className="space-y-3 mb-4">
                      {(marketingConfig.success_stories || []).map((story, index) => (
                        <div key={index} className="bg-slate-700/50 rounded-lg p-4 flex items-start gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-white font-medium">{story.name}</span>
                              <span className="text-slate-400 text-sm">- {story.business}</span>
                            </div>
                            <p className="text-slate-300 text-sm italic">"{story.quote}"</p>
                          </div>
                          {editingMarketingConfig && (
                            <button
                              onClick={() => handleRemoveSuccessStory(index)}
                              className="p-1 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Add New Story */}
                  {editingMarketingConfig && (
                    <div className="bg-slate-700/30 rounded-lg p-4 space-y-3">
                      <p className="text-sm text-slate-400 font-medium">Add New Success Story</p>
                      <div className="grid md:grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={newSuccessStory.name}
                          onChange={(e) => setNewSuccessStory({...newSuccessStory, name: e.target.value})}
                          placeholder="Customer Name (e.g., Mary W.)"
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                        />
                        <input
                          type="text"
                          value={newSuccessStory.business}
                          onChange={(e) => setNewSuccessStory({...newSuccessStory, business: e.target.value})}
                          placeholder="Business Type (e.g., Grocery Store)"
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                        />
                      </div>
                      <textarea
                        value={newSuccessStory.quote}
                        onChange={(e) => setNewSuccessStory({...newSuccessStory, quote: e.target.value})}
                        placeholder="Their testimonial quote..."
                        rows={2}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm resize-none"
                      />
                      <button
                        onClick={handleAddSuccessStory}
                        className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition"
                      >
                        + Add Story
                      </button>
                    </div>
                  )}
                </div>

                {/* Preview Info */}
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Bell className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-amber-400 font-medium">Preview Tip</p>
                      <p className="text-slate-300 text-sm mt-1">
                        After saving, open a store owner account with a trial or basic plan to see these messages in action. 
                        Changes apply immediately to all nudges, banners, and upgrade prompts.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Plan Edit Modal */}
      {editingPlan && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 p-6 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-500" />
                Edit Plan: {editingPlan.name}
              </h3>
              <button onClick={() => setEditingPlan(null)} className="p-2 hover:bg-slate-800 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Plan Name</label>
                  <input
                    type="text"
                    value={editPlanName}
                    onChange={(e) => setEditPlanName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Price (KES)</label>
                  <input
                    type="number"
                    value={editPlanPrice}
                    onChange={(e) => setEditPlanPrice(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white"
                  />
                </div>
              </div>
              
              {/* Limits */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    <Users className="w-4 h-4 inline mr-1" /> Max Staff Members
                  </label>
                  <input
                    type="number"
                    value={editPlanStaff}
                    onChange={(e) => setEditPlanStaff(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    <Package className="w-4 h-4 inline mr-1" /> Max Products
                  </label>
                  <input
                    type="number"
                    value={editPlanProducts}
                    onChange={(e) => setEditPlanProducts(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white"
                  />
                </div>
              </div>
              
              {/* Popular Toggle */}
              <label className="flex items-center gap-3 p-4 bg-slate-800 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={editPlanPopular}
                  onChange={(e) => setEditPlanPopular(e.target.checked)}
                  className="w-5 h-5 rounded"
                />
                <div>
                  <p className="text-white font-medium">Mark as Popular</p>
                  <p className="text-xs text-slate-400">Shows "POPULAR" badge on this plan</p>
                </div>
              </label>
              
              {/* Features */}
              <div>
                <label className="block text-sm text-slate-400 mb-3">Included Features</label>
                <div className="grid grid-cols-2 gap-2">
                  {features.map(feature => (
                    <label
                      key={feature.id}
                      className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition ${
                        editPlanFeatures.includes(feature.name)
                          ? 'bg-green-500/20 border border-green-500/30'
                          : 'bg-slate-800 border border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={editPlanFeatures.includes(feature.name)}
                        onChange={() => toggleFeature(feature.name)}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm text-white">{feature.name}</span>
                      {feature.is_premium && <Crown className="w-3 h-3 text-amber-500" />}
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Custom Features */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">Custom Features (one per line)</label>
                <textarea
                  value={editPlanFeatures.filter(f => !features.find(af => af.name === f)).join('\n')}
                  onChange={(e) => {
                    const standardFeatures = editPlanFeatures.filter(f => features.find(af => af.name === f));
                    const customFeatures = e.target.value.split('\n').filter(f => f.trim());
                    setEditPlanFeatures([...standardFeatures, ...customFeatures]);
                  }}
                  placeholder="Add custom features here..."
                  rows={3}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white resize-none"
                />
              </div>
            </div>
            
            <div className="sticky bottom-0 bg-slate-900 p-6 border-t border-slate-800 flex gap-3">
              <button
                onClick={() => setEditingPlan(null)}
                className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePlan}
                disabled={savingPlan}
                className="flex-1 py-3 px-4 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {savingPlan ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {savingPlan ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Metric Card Component
const MetricCard: React.FC<{
  icon: any;
  label: string;
  value: string | number;
  color: string;
  subtitle?: string;
}> = ({ icon: Icon, label, value, color, subtitle }) => {
  const colorClasses: Record<string, string> = {
    green: 'text-green-500 bg-green-500/10',
    blue: 'text-blue-500 bg-blue-500/10',
    yellow: 'text-yellow-500 bg-yellow-500/10',
    amber: 'text-amber-500 bg-amber-500/10',
    emerald: 'text-emerald-500 bg-emerald-500/10',
    purple: 'text-purple-500 bg-purple-500/10',
    red: 'text-red-500 bg-red-500/10',
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-2`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-xs text-slate-400 uppercase tracking-wider">{label}</div>
      <div className="text-xl font-bold text-white mt-1">{value}</div>
      {subtitle && <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>}
    </div>
  );
};

export default BillingDashboard;
