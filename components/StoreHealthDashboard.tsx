import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle, XCircle, 
  DollarSign, Users, Store, Activity, Clock, AlertOctagon,
  Crown, BarChart3, PieChart, RefreshCw, X, MapPin, Package,
  Calendar, Zap, Ban, PlayCircle, Eye
} from 'lucide-react';
import { 
  fetchPlatformAnalytics, 
  PlatformAnalytics, 
  StoreHealthData,
  suspendStore,
  activateStore 
} from '../services/supabaseService';
import { BreakingBulkAudit } from './BreakingBulkAudit';

interface StoreHealthDashboardProps {
  onClose: () => void;
}

export const StoreHealthDashboard: React.FC<StoreHealthDashboardProps> = ({ onClose }) => {
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'top' | 'inactive' | 'segments' | 'bulk'>('overview');
  const [selectedStore, setSelectedStore] = useState<StoreHealthData | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadAnalytics = async () => {
    setLoading(true);
    const data = await fetchPlatformAnalytics();
    setAnalytics(data);
    setLoading(false);
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const handleSuspend = async (storeId: string, storeName: string) => {
    if (!confirm(`Are you sure you want to SUSPEND "${storeName}"? They won't be able to access the system.`)) return;
    setActionLoading(storeId);
    const success = await suspendStore(storeId, 'Suspended by SuperAdmin');
    if (success) {
      alert('Store suspended successfully');
      loadAnalytics();
    } else {
      alert('Failed to suspend store');
    }
    setActionLoading(null);
  };

  const handleActivate = async (storeId: string) => {
    setActionLoading(storeId);
    const success = await activateStore(storeId);
    if (success) {
      alert('Store activated successfully');
      loadAnalytics();
    } else {
      alert('Failed to activate store');
    }
    setActionLoading(null);
  };

  const formatCurrency = (amount: number) => `KES ${amount.toLocaleString()}`;
  const formatDate = (date: Date | null) => date ? new Date(date).toLocaleDateString('en-KE') : 'Never';

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-slate-900 rounded-2xl p-8 text-center">
          <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading Platform Analytics...</p>
          <p className="text-slate-400 text-sm mt-2">Analyzing all stores</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-slate-900 rounded-2xl p-8 text-center max-w-md">
          <AlertOctagon className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-white text-lg">Failed to load analytics</p>
          <p className="text-slate-400 text-sm mt-2">Check your connection and try again</p>
          <button onClick={onClose} className="mt-4 px-6 py-2 bg-slate-700 text-white rounded-lg">Close</button>
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
                <Activity className="w-8 h-8 text-blue-500" />
                Platform Health Dashboard
              </h1>
              <p className="text-slate-400 mt-1">Real-time analytics across all DukaBook stores</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={loadAnalytics}
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
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            <MetricCard 
              icon={Store} 
              label="Total Stores" 
              value={analytics.totalStores} 
              color="blue"
            />
            <MetricCard 
              icon={CheckCircle} 
              label="Active" 
              value={analytics.activeStores} 
              color="green"
              subtitle={`${Math.round((analytics.activeStores / analytics.totalStores) * 100)}%`}
            />
            <MetricCard 
              icon={AlertTriangle} 
              label="Inactive" 
              value={analytics.inactiveStores} 
              color="yellow"
              subtitle="7+ days"
            />
            <MetricCard 
              icon={Crown} 
              label="Premium" 
              value={analytics.premiumStores} 
              color="amber"
            />
            <MetricCard 
              icon={DollarSign} 
              label="Today Revenue" 
              value={formatCurrency(analytics.todayRevenue)} 
              color="emerald"
              subtitle={`${analytics.todayTransactions} sales`}
            />
            <MetricCard 
              icon={TrendingUp} 
              label="This Month" 
              value={formatCurrency(analytics.thisMonthRevenue)} 
              color="purple"
            />
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Total Platform Revenue</div>
              <div className="text-2xl font-bold text-white">{formatCurrency(analytics.totalRevenue)}</div>
              <div className="text-slate-500 text-xs mt-1">{analytics.totalTransactions.toLocaleString()} transactions</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Avg Revenue/Store</div>
              <div className="text-2xl font-bold text-blue-400">{formatCurrency(Math.round(analytics.avgRevenuePerStore))}</div>
              <div className="text-slate-500 text-xs mt-1">Lifetime average</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Total Debt Exposure</div>
              <div className="text-2xl font-bold text-red-400">{formatCurrency(analytics.totalDebtExposure)}</div>
              <div className="text-slate-500 text-xs mt-1">Unpaid madeni</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Basic Stores</div>
              <div className="text-2xl font-bold text-slate-400">{analytics.basicStores}</div>
              <div className="text-slate-500 text-xs mt-1">Upgrade potential</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {[
              { id: 'overview', label: 'Overview', icon: PieChart },
              { id: 'top', label: 'Top Performers', icon: TrendingUp },
              { id: 'inactive', label: 'Inactive Stores', icon: AlertTriangle },
              { id: 'segments', label: 'By Business Type', icon: BarChart3 },
              { id: 'bulk', label: 'Breaking Bulk', icon: Package },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.id === 'inactive' && analytics.inactiveStores > 0 && (
                  <span className="bg-yellow-500 text-black text-xs px-1.5 py-0.5 rounded-full font-bold">
                    {analytics.inactiveStores}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-blue-500" />
                  Business Type Distribution
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-slate-400 mb-3">Stores by Type</h4>
                    <div className="space-y-2">
                      {Object.entries(analytics.storesByBusinessType).map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between bg-slate-800 p-3 rounded-lg">
                          <span className="text-white font-medium">{type}</span>
                          <span className="text-slate-400">{count} stores</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-400 mb-3">Revenue by Type (This Month)</h4>
                    <div className="space-y-2">
                      {Object.entries(analytics.revenueByBusinessType)
                        .sort((a, b) => b[1] - a[1])
                        .map(([type, revenue]) => (
                        <div key={type} className="flex items-center justify-between bg-slate-800 p-3 rounded-lg">
                          <span className="text-white font-medium">{type}</span>
                          <span className="text-green-400 font-bold">{formatCurrency(revenue)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'top' && (
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  Top 10 Performing Stores (This Month)
                </h3>
                <div className="space-y-3">
                  {analytics.topStores.map((store, index) => (
                    <StoreRow 
                      key={store.store.id} 
                      store={store} 
                      rank={index + 1}
                      formatCurrency={formatCurrency}
                      formatDate={formatDate}
                      onView={() => setSelectedStore(store)}
                      onSuspend={() => handleSuspend(store.store.id, store.store.name)}
                      onActivate={() => handleActivate(store.store.id)}
                      actionLoading={actionLoading}
                    />
                  ))}
                  {analytics.topStores.length === 0 && (
                    <p className="text-slate-400 text-center py-8">No sales data yet</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'inactive' && (
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  Inactive Stores (No sales in 7+ days)
                </h3>
                <div className="space-y-3">
                  {analytics.inactiveStoresList.map((store) => (
                    <StoreRow 
                      key={store.store.id} 
                      store={store} 
                      showInactiveDays
                      formatCurrency={formatCurrency}
                      formatDate={formatDate}
                      onView={() => setSelectedStore(store)}
                      onSuspend={() => handleSuspend(store.store.id, store.store.name)}
                      onActivate={() => handleActivate(store.store.id)}
                      actionLoading={actionLoading}
                    />
                  ))}
                  {analytics.inactiveStoresList.length === 0 && (
                    <div className="text-center py-8">
                      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                      <p className="text-green-400 font-medium">All stores are active!</p>
                      <p className="text-slate-500 text-sm">Everyone has made sales within the last 7 days</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'segments' && (
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-purple-500" />
                  Store Segments Analysis
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Premium vs Basic */}
                  <div className="bg-slate-800 rounded-xl p-4">
                    <h4 className="font-medium text-white mb-3">Subscription Tiers</h4>
                    <div className="flex gap-4">
                      <div className="flex-1 text-center p-4 bg-amber-500/20 rounded-lg border border-amber-500/30">
                        <Crown className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-amber-400">{analytics.premiumStores}</div>
                        <div className="text-xs text-amber-300">Premium</div>
                      </div>
                      <div className="flex-1 text-center p-4 bg-slate-700 rounded-lg border border-slate-600">
                        <Store className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-slate-300">{analytics.basicStores}</div>
                        <div className="text-xs text-slate-400">Basic</div>
                      </div>
                    </div>
                    <div className="mt-3 text-center text-xs text-slate-500">
                      {Math.round((analytics.premiumStores / analytics.totalStores) * 100)}% conversion to Premium
                    </div>
                  </div>

                  {/* Activity Status */}
                  <div className="bg-slate-800 rounded-xl p-4">
                    <h4 className="font-medium text-white mb-3">Activity Status</h4>
                    <div className="flex gap-4">
                      <div className="flex-1 text-center p-4 bg-green-500/20 rounded-lg border border-green-500/30">
                        <Zap className="w-8 h-8 text-green-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-green-400">{analytics.activeStores}</div>
                        <div className="text-xs text-green-300">Active</div>
                      </div>
                      <div className="flex-1 text-center p-4 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
                        <Clock className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-yellow-400">{analytics.inactiveStores}</div>
                        <div className="text-xs text-yellow-300">Inactive</div>
                      </div>
                    </div>
                    <div className="mt-3 text-center text-xs text-slate-500">
                      {Math.round((analytics.activeStores / analytics.totalStores) * 100)}% stores active this week
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'bulk' && (
              <div>
                <BreakingBulkAudit 
                  store_id={analytics.totalStores > 0 ? 'platform' : ''}
                  bulkItems={[]}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Store Detail Modal */}
      {selectedStore && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-60 p-4">
          <div className="bg-slate-900 rounded-2xl p-6 max-w-lg w-full border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                {selectedStore.store.name}
                {selectedStore.store.tier === 'PREMIUM' && <Crown className="w-5 h-5 text-amber-500" />}
              </h3>
              <button onClick={() => setSelectedStore(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Location</span>
                <span className="text-white">{selectedStore.store.location || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Business Type</span>
                <span className="text-white">{selectedStore.store.business_type}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Total Sales</span>
                <span className="text-white">{selectedStore.totalSales.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Total Revenue</span>
                <span className="text-green-400 font-bold">{formatCurrency(selectedStore.totalRevenue)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">This Month</span>
                <span className="text-blue-400">{formatCurrency(selectedStore.thisMonthRevenue)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Today</span>
                <span className="text-white">{formatCurrency(selectedStore.todayRevenue)} ({selectedStore.todaySales} sales)</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Outstanding Debt</span>
                <span className="text-red-400">{formatCurrency(selectedStore.totalDebt)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Last Sale</span>
                <span className={selectedStore.daysSinceLastSale > 7 ? 'text-yellow-400' : 'text-white'}>
                  {formatDate(selectedStore.lastSaleDate)} ({selectedStore.daysSinceLastSale} days ago)
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Staff</span>
                <span className="text-white">{selectedStore.activeStaffCount} active</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Inventory</span>
                <span className="text-white">{selectedStore.inventoryCount} items ({selectedStore.lowStockCount} low stock)</span>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setSelectedStore(null)}
                className="flex-1 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
              >
                Close
              </button>
              <a 
                href={`/?store_id=${selectedStore.store.id}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition text-center"
              >
                Launch Store
              </a>
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
    blue: 'text-blue-500 bg-blue-500/10',
    green: 'text-green-500 bg-green-500/10',
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

// Store Row Component
const StoreRow: React.FC<{
  store: StoreHealthData;
  rank?: number;
  showInactiveDays?: boolean;
  formatCurrency: (n: number) => string;
  formatDate: (d: Date | null) => string;
  onView: () => void;
  onSuspend: () => void;
  onActivate: () => void;
  actionLoading: string | null;
}> = ({ store, rank, showInactiveDays, formatCurrency, formatDate, onView, onSuspend, onActivate, actionLoading }) => {
  const isLoading = actionLoading === store.store.id;

  return (
    <div className="flex items-center gap-4 bg-slate-800 p-4 rounded-xl hover:bg-slate-750 transition">
      {rank && (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
          rank === 1 ? 'bg-amber-500 text-black' :
          rank === 2 ? 'bg-slate-300 text-black' :
          rank === 3 ? 'bg-amber-700 text-white' :
          'bg-slate-700 text-slate-300'
        }`}>
          {rank}
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white truncate">{store.store.name}</span>
          {store.store.tier === 'PREMIUM' && <Crown className="w-4 h-4 text-amber-500 flex-shrink-0" />}
          <span className="text-xs text-slate-500 bg-slate-700 px-2 py-0.5 rounded flex-shrink-0">
            {store.store.business_type}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {store.store.location || 'N/A'}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" /> {store.activeStaffCount} staff
          </span>
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <div className="text-green-400 font-bold">{formatCurrency(store.thisMonthRevenue)}</div>
        <div className="text-xs text-slate-500">{store.totalSales} total sales</div>
      </div>

      {showInactiveDays && (
        <div className="text-center flex-shrink-0 px-3">
          <div className={`text-lg font-bold ${
            store.daysSinceLastSale > 30 ? 'text-red-400' : 
            store.daysSinceLastSale > 14 ? 'text-orange-400' : 'text-yellow-400'
          }`}>
            {store.daysSinceLastSale}
          </div>
          <div className="text-xs text-slate-500">days</div>
        </div>
      )}

      <div className="flex items-center gap-2 flex-shrink-0">
        <button 
          onClick={onView}
          className="p-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition"
          title="View Details"
        >
          <Eye className="w-4 h-4" />
        </button>
        {store.isActive ? (
          <button 
            onClick={onSuspend}
            disabled={isLoading}
            className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition disabled:opacity-50"
            title="Suspend Store"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
          </button>
        ) : (
          <button 
            onClick={onActivate}
            disabled={isLoading}
            className="p-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg transition disabled:opacity-50"
            title="Activate Store"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
};

export default StoreHealthDashboard;
