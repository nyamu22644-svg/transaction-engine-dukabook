import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Calendar, Lock, TrendingDown, Clock } from 'lucide-react';
import { getWarrantyStats, getStoreSerializedItems, markSealBroken, SerializedItem } from '../services/warrantyService';
import { StoreProfile } from '../types';

interface WarrantyStats {
  totalItems: number;
  validWarranty: number;
  expiredWarranty: number;
  expiringIn3Days: number;
  sealBroken: number;
}

interface WarrantyDashboardProps {
  store: StoreProfile;
}

export const WarrantyDashboard: React.FC<WarrantyDashboardProps> = ({ store }) => {
  const [stats, setStats] = useState<WarrantyStats | null>(null);
  const [items, setItems] = useState<SerializedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'expiring' | 'broken'>('overview');
  const [sealBreakingId, setSealBreakingId] = useState<string | null>(null);

  useEffect(() => {
    loadWarrantyData();
  }, [store.id]);

  const loadWarrantyData = async () => {
    setLoading(true);
    const [statsData, itemsData] = await Promise.all([
      getWarrantyStats(store.id),
      getStoreSerializedItems(store.id),
    ]);
    setStats(statsData);
    setItems(itemsData);
    setLoading(false);
  };

  const handleMarkSealBroken = async (itemId: string) => {
    setSealBreakingId(itemId);
    const success = await markSealBroken(itemId);
    if (success) {
      // Update local state
      setItems(items.map(item =>
        item.id === itemId ? { ...item, seal_broken: true } : item
      ));
      setStats(stats ? { ...stats, sealBroken: stats.sealBroken + 1, validWarranty: stats.validWarranty - 1 } : null);
    }
    setSealBreakingId(null);
  };

  if (loading) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <p className="text-slate-400 mt-4">Loading warranty data...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
        <p>No warranty data available</p>
      </div>
    );
  }

  const expiringItems = items.filter(item => {
    if (item.seal_broken) return false;
    const daysLeft = Math.ceil((new Date(item.warranty_expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysLeft >= 0 && daysLeft <= 3;
  });

  const brokenItems = items.filter(item => item.seal_broken);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border border-blue-700/30 rounded-lg p-4">
          <p className="text-blue-300 text-sm font-medium opacity-75">Total Items</p>
          <p className="text-3xl font-bold text-blue-100 mt-2">{stats.totalItems}</p>
        </div>

        <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 border border-green-700/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <p className="text-green-300 text-sm font-medium opacity-75">Valid</p>
          </div>
          <p className="text-3xl font-bold text-green-100 mt-2">{stats.validWarranty}</p>
          <p className="text-xs text-green-400 mt-1">{stats.totalItems > 0 ? Math.round((stats.validWarranty / stats.totalItems) * 100) : 0}% healthy</p>
        </div>

        <div className="bg-gradient-to-br from-amber-900/40 to-amber-800/20 border border-amber-700/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-amber-400" />
            <p className="text-amber-300 text-sm font-medium opacity-75">Expiring Soon</p>
          </div>
          <p className="text-3xl font-bold text-amber-100 mt-2">{stats.expiringIn3Days}</p>
          <p className="text-xs text-amber-400 mt-1">Within 3 days</p>
        </div>

        <div className="bg-gradient-to-br from-red-900/40 to-red-800/20 border border-red-700/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <p className="text-red-300 text-sm font-medium opacity-75">Expired</p>
          </div>
          <p className="text-3xl font-bold text-red-100 mt-2">{stats.expiredWarranty}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border border-purple-700/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Lock className="w-4 h-4 text-purple-400" />
            <p className="text-purple-300 text-sm font-medium opacity-75">Seal Broken</p>
          </div>
          <p className="text-3xl font-bold text-purple-100 mt-2">{stats.sealBroken}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700">
        <button
          onClick={() => setSelectedTab('overview')}
          className={`px-4 py-3 font-medium border-b-2 transition ${
            selectedTab === 'overview'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          Overview
        </button>
        {expiringItems.length > 0 && (
          <button
            onClick={() => setSelectedTab('expiring')}
            className={`px-4 py-3 font-medium border-b-2 transition flex items-center gap-2 ${
              selectedTab === 'expiring'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Expiring ({expiringItems.length})
          </button>
        )}
        {brokenItems.length > 0 && (
          <button
            onClick={() => setSelectedTab('broken')}
            className={`px-4 py-3 font-medium border-b-2 transition flex items-center gap-2 ${
              selectedTab === 'broken'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <Lock className="w-4 h-4" />
            Seal Broken ({brokenItems.length})
          </button>
        )}
      </div>

      {/* Tab Content */}
      {selectedTab === 'overview' && (
        <div className="space-y-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-blue-400" />
              Recent Items
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {items.slice(0, 10).map(item => {
                const daysLeft = Math.ceil((new Date(item.warranty_expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                const isExpired = daysLeft < 0;
                const isExpiringSoon = daysLeft >= 0 && daysLeft <= 3;

                return (
                  <div key={item.id} className="border border-slate-700 rounded-lg p-3 flex items-between justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-white">{item.item_name || 'Unknown Item'}</p>
                      <p className="text-xs text-slate-400 mt-1">{item.serial_number}</p>
                    </div>
                    <div className="text-right ml-4">
                      {item.seal_broken ? (
                        <div className="flex items-center gap-1 text-purple-400">
                          <Lock className="w-4 h-4" />
                          <span className="text-xs font-semibold">VOID</span>
                        </div>
                      ) : isExpired ? (
                        <div className="flex items-center gap-1 text-red-400">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-xs font-semibold">{Math.abs(daysLeft)}d ago</span>
                        </div>
                      ) : isExpiringSoon ? (
                        <div className="flex items-center gap-1 text-amber-400">
                          <Clock className="w-4 h-4" />
                          <span className="text-xs font-semibold">{daysLeft}d left</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-green-400">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-xs font-semibold">{daysLeft}d left</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'expiring' && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
          <h3 className="font-semibold text-amber-300 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Warranty Expiring in Next 3 Days
          </h3>
          {expiringItems.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No items expiring soon</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {expiringItems.map(item => {
                const daysLeft = Math.ceil((new Date(item.warranty_expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={item.id} className="border border-amber-700/30 bg-amber-900/20 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-amber-100">{item.item_name}</p>
                        <p className="text-xs text-amber-300/70 mt-1">{item.serial_number}</p>
                        <p className="text-xs text-amber-400 mt-2">
                          Expires: {new Date(item.warranty_expiry_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-amber-400">{daysLeft}</p>
                        <p className="text-xs text-amber-300">days left</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {selectedTab === 'broken' && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
          <h3 className="font-semibold text-purple-300 mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Warranty Seal Broken / Voided
          </h3>
          {brokenItems.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No items with broken seals</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {brokenItems.map(item => (
                <div key={item.id} className="border border-purple-700/30 bg-purple-900/20 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-purple-100">{item.item_name}</p>
                      <p className="text-xs text-purple-300/70 mt-1">{item.serial_number}</p>
                      <p className="text-xs text-purple-400 mt-2">
                        Would have expired: {new Date(item.warranty_expiry_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="bg-purple-600 text-white px-3 py-1 rounded text-xs font-bold">
                        VOIDED
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
