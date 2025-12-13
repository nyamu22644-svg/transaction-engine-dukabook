import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  BarChart3,
  Search,
  RefreshCw,
  Loader2,
  Info,
} from 'lucide-react';
import { InventoryItem, InventoryBatch } from '../types';
import {
  getBreakoutItemsForParent,
  calculateAuditVariance,
} from '../services/inventoryService';

interface BreakingBulkAuditProps {
  store_id: string;
  bulkItems?: InventoryItem[];
}

interface AuditResult {
  bulkItemId: string;
  bulkItemName: string;
  totalSystemUnits: number;
  expectedUnits: number;
  variance: number;
  riskLevel: 'SAFE' | 'WARNING' | 'CRITICAL';
  message: string;
  breakoutItems: InventoryItem[];
}

/**
 * BREAKING BULK AUDIT COMPONENT
 * 
 * Shows inventory audit for breaking bulk items:
 * - Physical empty (0 stock) vs System units remaining
 * - Flags discrepancies indicating theft or over-pouring
 * 
 * Example:
 * - Bottle #1: Physical = Empty (0), System = 3 Tots remaining -> CRITICAL
 * - Sack #2: Physical = Full (1), System = 90 Bags -> SAFE
 */
export const BreakingBulkAudit: React.FC<BreakingBulkAuditProps> = ({
  store_id,
  bulkItems,
}) => {
  const [results, setResults] = useState<AuditResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRisk, setFilterRisk] = useState<'ALL' | 'SAFE' | 'WARNING' | 'CRITICAL'>('ALL');

  useEffect(() => {
    if (bulkItems && bulkItems.length > 0) {
      runAudit();
    }
  }, [bulkItems]);

  const runAudit = async () => {
    if (!bulkItems || bulkItems.length === 0) return;

    setLoading(true);
    const auditResults: AuditResult[] = [];

    for (const item of bulkItems) {
      if (!item.is_bulk_parent) continue;

      // Get all breakout items for this bulk item
      const breakoutItems = await getBreakoutItemsForParent(item.id);

      // Assume physical count is item.current_stock (0 = empty bottle, 1 = full sack, etc.)
      const physicalCount = item.current_stock;

      // Calculate variance
      const variance = await calculateAuditVariance(item.id, physicalCount);

      if (variance) {
        auditResults.push({
          bulkItemId: item.id,
          bulkItemName: item.item_name,
          totalSystemUnits: variance.totalSystemUnits,
          expectedUnits: variance.expectedUnits,
          variance: variance.variance,
          riskLevel: variance.riskLevel,
          message: variance.message,
          breakoutItems,
        });
      }
    }

    setResults(auditResults.sort((a, b) => {
      const riskOrder = { CRITICAL: 0, WARNING: 1, SAFE: 2 };
      return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
    }));
    setLoading(false);
  };

  const filteredResults = results.filter((r) => {
    const matchesSearch =
      r.bulkItemName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = filterRisk === 'ALL' || r.riskLevel === filterRisk;
    return matchesSearch && matchesRisk;
  });

  const stats = {
    total: results.length,
    safe: results.filter((r) => r.riskLevel === 'SAFE').length,
    warning: results.filter((r) => r.riskLevel === 'WARNING').length,
    critical: results.filter((r) => r.riskLevel === 'CRITICAL').length,
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'CRITICAL':
        return 'bg-red-50 border-red-200';
      case 'WARNING':
        return 'bg-yellow-50 border-yellow-200';
      case 'SAFE':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'CRITICAL':
        return <AlertOctagon className="w-5 h-5 text-red-600" />;
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'SAFE':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      default:
        return <Info className="w-5 h-5 text-gray-600" />;
    }
  };

  const getRiskTextColor = (risk: string) => {
    switch (risk) {
      case 'CRITICAL':
        return 'text-red-900';
      case 'WARNING':
        return 'text-yellow-900';
      case 'SAFE':
        return 'text-green-900';
      default:
        return 'text-gray-900';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-lg">
        <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
          <BarChart3 className="w-6 h-6" />
          Breaking Bulk Audit
        </h2>
        <p className="text-blue-100">
          Track inventory discrepancies and detect theft or over-pouring
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 font-medium">Total Items</p>
          <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-700 font-medium">Safe</p>
          <p className="text-3xl font-bold text-green-900">{stats.safe}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-700 font-medium">Warning</p>
          <p className="text-3xl font-bold text-yellow-900">{stats.warning}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700 font-medium">Critical</p>
          <p className="text-3xl font-bold text-red-900">{stats.critical}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          {['ALL', 'SAFE', 'WARNING', 'CRITICAL'].map((risk) => (
            <button
              key={risk}
              onClick={() => setFilterRisk(risk as any)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterRisk === risk
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {risk}
            </button>
          ))}
        </div>
        <button
          onClick={runAudit}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Auditing...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Refresh Audit
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      )}

      {!loading && filteredResults.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Info className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-700 font-medium">No breaking bulk items found</p>
          <p className="text-gray-500 text-sm mt-1">
            Configure bulk items first to see audit results
          </p>
        </div>
      )}

      {!loading && filteredResults.length > 0 && (
        <div className="space-y-4">
          {filteredResults.map((result) => (
            <div
              key={result.bulkItemId}
              className={`border-2 rounded-lg p-6 ${getRiskColor(result.riskLevel)}`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {getRiskIcon(result.riskLevel)}
                  <div>
                    <h3 className={`text-lg font-bold ${getRiskTextColor(result.riskLevel)}`}>
                      {result.bulkItemName}
                    </h3>
                    <p className={`text-sm ${getRiskTextColor(result.riskLevel)}`}>
                      {result.message}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full font-semibold text-xs ${
                    result.riskLevel === 'CRITICAL'
                      ? 'bg-red-600 text-white'
                      : result.riskLevel === 'WARNING'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-green-600 text-white'
                  }`}
                >
                  {result.riskLevel}
                </span>
              </div>

              {/* Variance Details */}
              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                    Expected Units
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {result.expectedUnits}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                    System Units
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {result.totalSystemUnits}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                    Variance
                  </p>
                  <p
                    className={`text-2xl font-bold mt-1 ${
                      result.variance === 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {result.variance > 0 ? '-' : '+'}{result.variance}
                  </p>
                </div>
              </div>

              {/* Breakout Items Summary */}
              {result.breakoutItems.length > 0 && (
                <div className="bg-white bg-opacity-60 rounded p-4 text-sm">
                  <p className="font-semibold text-gray-700 mb-2">Breakout Units:</p>
                  <ul className="space-y-1 text-gray-700">
                    {result.breakoutItems.map((item) => (
                      <li key={item.id}>
                        • {item.item_name}: <span className="font-medium">{item.current_stock}</span> units
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
