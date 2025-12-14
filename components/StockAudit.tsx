import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  BarChart3,
  DollarSign,
  TrendingDown,
  Users,
  Calendar,
  Save,
  X,
} from 'lucide-react';
import { InventoryItem, Agent, ShrinkageDebt } from '../types';
import { getBreakoutItemsForParent, calculateAuditVariance } from '../services/inventoryService';
import { recordShrinkageDebt, getShrinkageDebts } from '../services/shrinkageService';
import { fetchAgents } from '../services/supabaseService';

interface StockAuditProps {
  store_id: string;
  collected_by?: string; // Employee conducting audit
}

interface AuditItem {
  itemId: string;
  itemName: string;
  systemStock: number;
  physicalCount: number;
  variance: number;
  unitPrice: number;
  debtAmount: number;
  responsible_agent?: Agent;
  status: 'PENDING' | 'FLAGGED' | 'RESOLVED';
}

/**
 * STOCK AUDIT COMPONENT WITH SHRINKAGE DEBT TRACKING
 * 
 * Solves: KES 3 Billion Kenyan Retail Shrinkage Crisis
 * 
 * Workflow:
 * 1. System records: "10 Bags of Cement"
 * 2. Employee counts: "8 Bags"
 * 3. Missing: 2 Bags -> Flag as Shrinkage Debt
 * 4. Link to responsible employee
 * 5. Deduct from next salary
 * 
 * Feature helps prevent theft and over-pouring in retail stores
 */
export const StockAudit: React.FC<StockAuditProps> = ({
  store_id,
  collected_by = 'System',
}) => {
  const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [shrinkageDebts, setShrinkageDebts] = useState<ShrinkageDebt[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [store_id]);

  const loadData = async () => {
    setLoading(true);
    // Load agents (employees)
    const agentsList = await fetchAgents(store_id);
    setAgents(agentsList);

    // Load existing shrinkage debts
    const debts = await getShrinkageDebts(store_id);
    setShrinkageDebts(debts);

    setLoading(false);
  };

  const handlePhysicalCount = (itemId: string, physicalCount: number) => {
    setAuditItems((prev) =>
      prev.map((item) => {
        if (item.itemId === itemId) {
          const variance = item.systemStock - physicalCount;
          const debtAmount = variance > 0 ? variance * item.unitPrice : 0;
          return {
            ...item,
            physicalCount,
            variance,
            debtAmount,
            status: variance > 0 ? 'FLAGGED' : 'PENDING',
          };
        }
        return item;
      })
    );
  };

  const flagShrinkageDebt = async (
    auditItem: AuditItem,
    agentId: string
  ) => {
    if (auditItem.variance <= 0) {
      alert('No shrinkage to flag');
      return;
    }

    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return;

    const debt: Omit<ShrinkageDebt, 'id' | 'created_at'> = {
      store_id,
      agent_id: agentId,
      agent_name: agent.name,
      item_id: auditItem.itemId,
      item_name: auditItem.itemName,
      quantity_missing: auditItem.variance,
      unit_price: auditItem.unitPrice,
      total_debt_amount: auditItem.debtAmount,
      audit_id: `AUDIT_${Date.now()}`,
      audit_date: new Date().toISOString(),
      status: 'PENDING',
      notes: `Physical count variance detected during stock audit by ${collected_by}`,
    };

    const debtId = await recordShrinkageDebt(debt);
    if (debtId) {
      alert(`✅ Shrinkage debt recorded: KES ${auditItem.debtAmount} against ${agent.name}`);
      setAuditItems((prev) =>
        prev.map((item) =>
          item.itemId === auditItem.itemId
            ? { ...item, status: 'RESOLVED', responsible_agent: agent }
            : item
        )
      );
      await loadData();
    } else {
      alert('Failed to record shrinkage debt');
    }
  };

  const totalVariance = auditItems.reduce(
    (sum, item) => sum + Math.max(item.variance, 0),
    0
  );
  const totalShrinkageLoss = auditItems.reduce(
    (sum, item) => sum + item.debtAmount,
    0
  );

  const flaggedItems = auditItems.filter((item) => item.status === 'FLAGGED');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-2xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-red-900 flex items-center gap-3">
              <AlertOctagon className="w-8 h-8 text-red-600" />
              Stock Audit (Shrinkage Debt Tracking)
            </h2>
            <p className="text-red-700 mt-2 text-sm">
              Comparing system inventory vs physical count. Missing items are flagged as Shrinkage Debt against responsible employees.
            </p>
            <p className="text-red-600 mt-1 text-xs font-mono">
              KES 3 Billion annual loss in Kenyan retail due to theft & errors
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      {auditItems.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
            <div className="text-slate-400 text-xs uppercase">Total Items Audited</div>
            <div className="text-2xl font-bold text-white mt-2">{auditItems.length}</div>
          </div>
          <div className="bg-red-900 border border-red-700 rounded-xl p-4">
            <div className="text-red-300 text-xs uppercase flex items-center gap-2">
              <TrendingDown className="w-4 h-4" /> Variance Items
            </div>
            <div className="text-2xl font-bold text-red-100 mt-2">{flaggedItems.length}</div>
          </div>
          <div className="bg-orange-900 border border-orange-700 rounded-xl p-4">
            <div className="text-orange-300 text-xs uppercase">Total Units Missing</div>
            <div className="text-2xl font-bold text-orange-100 mt-2">{totalVariance}</div>
          </div>
          <div className="bg-red-950 border border-red-800 rounded-xl p-4">
            <div className="text-red-300 text-xs uppercase flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Total Shrinkage Loss
            </div>
            <div className="text-2xl font-bold text-red-100 mt-2">KES {totalShrinkageLoss.toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Flagged Debts List */}
      {flaggedItems.length > 0 && (
        <div className="bg-slate-900 border border-red-700/50 rounded-xl p-6">
          <h3 className="text-lg font-bold text-red-300 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Flagged for Shrinkage Debt ({flaggedItems.length})
          </h3>
          <div className="space-y-3">
            {flaggedItems.map((item) => (
              <div
                key={item.itemId}
                className="bg-slate-800 border border-slate-700 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-bold text-white">{item.itemName}</h4>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-slate-400">
                      <div>System: <span className="text-white font-bold">{item.systemStock}</span> units</div>
                      <div>Physical: <span className="text-white font-bold">{item.physicalCount}</span> units</div>
                      <div>Missing: <span className="text-red-400 font-bold">{item.variance}</span></div>
                      <div>Loss: <span className="text-red-400 font-bold">KES {item.debtAmount}</span></div>
                    </div>
                  </div>

                  {!item.responsible_agent && (
                    <button
                      onClick={() => setExpandedItem(expandedItem === item.itemId ? null : item.itemId)}
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg"
                    >
                      {expandedItem === item.itemId ? 'Hide' : 'Flag Debt'}
                    </button>
                  )}
                </div>

                {/* Expand to select responsible agent */}
                {expandedItem === item.itemId && !item.responsible_agent && (
                  <div className="mt-4 p-3 bg-slate-700 rounded-lg space-y-3">
                    <div>
                      <label className="text-sm text-slate-300 block mb-2">
                        Select Responsible Employee:
                      </label>
                      <select
                        onChange={(e) => setSelectedAgent(e.target.value)}
                        defaultValue=""
                        className="w-full px-3 py-2 bg-slate-600 text-white rounded-lg text-sm"
                      >
                        <option value="">-- Choose employee --</option>
                        {agents.map((agent) => (
                          <option key={agent.id} value={agent.id}>
                            {agent.name} (Total Sales: KES {agent.total_sales_value.toLocaleString()})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (!selectedAgent) {
                            alert('Please select an employee');
                            return;
                          }
                          setShowConfirm(item.itemId);
                        }}
                        className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
                      >
                        Confirm Debt
                      </button>
                      <button
                        onClick={() => {
                          setExpandedItem(null);
                          setSelectedAgent(null);
                        }}
                        className="px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm"
                      >
                        Cancel
                      </button>
                    </div>

                    {/* Confirmation */}
                    {showConfirm === item.itemId && selectedAgent && (
                      <div className="mt-3 p-3 bg-red-950 border border-red-800 rounded-lg text-sm">
                        <p className="text-red-200 font-bold">Confirm:</p>
                        <p className="text-red-300 mt-1">
                          Record KES {item.debtAmount} shrinkage debt against{' '}
                          <span className="font-bold">
                            {agents.find((a) => a.id === selectedAgent)?.name}
                          </span>
                          ?
                        </p>
                        <p className="text-red-400 text-xs mt-2">
                          This amount will be deducted from their next salary settlement.
                        </p>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={async () => {
                              await flagShrinkageDebt(item, selectedAgent);
                              setShowConfirm(null);
                              setSelectedAgent(null);
                              setExpandedItem(null);
                            }}
                            className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold"
                          >
                            Yes, Record Debt
                          </button>
                          <button
                            onClick={() => setShowConfirm(null)}
                            className="px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm"
                          >
                            No, Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {item.responsible_agent && (
                  <div className="mt-3 p-2 bg-green-900/30 border border-green-700 rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-green-300 text-sm">
                      ✅ Debt recorded against <strong>{item.responsible_agent.name}</strong>
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing Shrinkage Debts */}
      {shrinkageDebts.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-yellow-400 mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            All Shrinkage Debts ({shrinkageDebts.length})
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {shrinkageDebts.map((debt) => (
              <div
                key={debt.id}
                className="flex items-center justify-between bg-slate-800 p-3 rounded-lg border border-slate-700"
              >
                <div className="flex-1">
                  <div className="text-sm">
                    <span className="font-bold text-white">{debt.agent_name}</span>
                    <span className="text-slate-400"> — </span>
                    <span className="text-slate-300">{debt.item_name}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {debt.quantity_missing} units × KES {debt.unit_price} = KES {debt.total_debt_amount}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold ${
                      debt.status === 'PENDING'
                        ? 'bg-yellow-900 text-yellow-200'
                        : debt.status === 'ACKNOWLEDGED'
                          ? 'bg-orange-900 text-orange-200'
                          : 'bg-green-900 text-green-200'
                    }`}
                  >
                    {debt.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && auditItems.length === 0 && shrinkageDebts.length === 0 && (
        <div className="text-center py-12 bg-slate-800 border border-slate-700 rounded-lg">
          <AlertTriangle className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">
            No stock audits recorded yet. Add inventory items to begin auditing.
          </p>
        </div>
      )}
    </div>
  );
};

export default StockAudit;
