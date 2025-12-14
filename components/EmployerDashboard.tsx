
import React, { useEffect, useState } from 'react';
import { fetchInventory, fetchRecentSales, addNewInventoryItem, updateStockLevel, deleteSale, fetchDebtors, fetchAuditLogs, performCashReconciliation, fetchExpenses, bulkAddInventoryItems, fetchAgents, addStaffMember, deleteStaffMember } from '../services/supabaseService';
import { InventoryItem, SalesRecord, PaymentMode, StoreProfile, AuditLog, ExpenseRecord, Agent, EffectiveTier } from '../types';
import { TrendingUp, AlertTriangle, Map, Banknote, Smartphone, Clock, Plus, PackagePlus, RefreshCcw, BarChart3, CreditCard, Share2, Calendar, Filter, AlertCircle, RotateCcw, AlertOctagon, Crown, FileText, ClipboardCheck, Wallet, ChevronDown, ChevronUp, History, Send, Download, Info, TrendingDown, Lock, FileSpreadsheet, Package, ScanLine, Users, UserPlus, Trash2, X, Truck, Bell, Sparkles, Search } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DebtorsList } from './DebtorsList';
import { PremiumLock } from './ui/PremiumLock';
import { FundiLeaderboard } from './ui/FundiLeaderboard';
import { OfflineIndicator } from './ui/OfflineIndicator';
import { PlanInfoModal } from './PlanInfoModal';
import { DemoLockModal } from './DemoLockModal';
import { BulkImport } from './BulkImport';
import { CatalogBrowser } from './CatalogBrowser';
import { BarcodeScanner } from './BarcodeScanner';
import { SupplierManager } from './SupplierManager';
import { CustomerManager } from './CustomerManager';
import { SalesLocationMap } from './SalesLocationMap';
import { WarrantyLookup } from './WarrantyLookup';
import { WarrantyDashboard } from './WarrantyDashboard';
import { SubscriptionPayment } from './SubscriptionPayment';
import { 
  PremiumFloatingBadge, 
  TrialCountdownBanner, 
  SuccessStoryPopup,
  InlineFeatureTeaser 
} from './ui/PremiumNudge';
import { getStoreSubscription, getEffectiveTier } from '../services/billingService';
import { THEME_COLORS, DEFAULT_THEME, BUSINESS_CONFIG } from '../constants';
import { DEMO_INVENTORY, DEMO_SALES, DEMO_DEBTORS } from '../demoData';
import { searchCatalog } from '../data/itemTemplates';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface EmployerDashboardProps {
  store: StoreProfile;
  isDemoMode?: boolean;
  onExitDemo?: () => void;
}

export const EmployerDashboard: React.FC<EmployerDashboardProps> = ({ store, isDemoMode = false, onExitDemo }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [sales, setSales] = useState<SalesRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Demo Lock Modal State
  const [showDemoLockModal, setShowDemoLockModal] = useState(false);
  const [demoLockType, setDemoLockType] = useState<'save' | 'gps' | 'madeni' | 'report' | 'export'>('report');
  
  // UI State
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [newStockValue, setNewStockValue] = useState<string>("");
  const [showExpiringOnly, setShowExpiringOnly] = useState(false);
  const [showDebtorsList, setShowDebtorsList] = useState(false);
  const [debtCount, setDebtCount] = useState(0);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [reconcileCashInput, setReconcileCashInput] = useState('');
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showSubscriptionPayment, setShowSubscriptionPayment] = useState(false);
  
  // Inventory Import/Catalog States
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // Staff Management State
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffList, setStaffList] = useState<Agent[]>([]);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [addingStaff, setAddingStaff] = useState(false);

  // Supplier & Customer Management State
  const [showSupplierManager, setShowSupplierManager] = useState(false);
  const [showCustomerManager, setShowCustomerManager] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  // Map State
  const [showSalesMap, setShowSalesMap] = useState(false);

  // Warranty Management State
  const [showWarrantyLookup, setShowWarrantyLookup] = useState(false);
  const [showWarrantyDashboard, setShowWarrantyDashboard] = useState(false);

  // Premium Nudge State
  const [isTrialActive, setIsTrialActive] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);
  const [showSuccessStory, setShowSuccessStory] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [effectiveTier, setEffectiveTier] = useState<EffectiveTier>('NONE');
  const [hasFullAccess, setHasFullAccess] = useState(false);
  const [subscriptionLoaded, setSubscriptionLoaded] = useState(false);

  // New Item Form State
  const [newItemName, setNewItemName] = useState("");
  const [newItemBuyingPrice, setNewItemBuyingPrice] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemStock, setNewItemStock] = useState("");
  const [newItemThreshold, setNewItemThreshold] = useState("10");
  const [newItemExpiry, setNewItemExpiry] = useState("");

  // Get Dynamic Theme
  const theme = THEME_COLORS[store.theme_color || 'blue'] || DEFAULT_THEME;
  const bizConfig = BUSINESS_CONFIG[store.business_type || 'HARDWARE'];
  
  // Tier is now derived from subscription, not store.tier
  // TRIAL = full access but no tier yet
  // PREMIUM = full access with subscription
  // BASIC = limited access with subscription
  // NONE/EXPIRED = needs to subscribe
  const isPremium = effectiveTier === 'PREMIUM';
  const canAccessPremiumFeatures = hasFullAccess || effectiveTier === 'TRIAL' || effectiveTier === 'PREMIUM';

  const loadData = () => {
    // If this is an explicit demo session or the store is marked `is_demo`,
    // use the cloned demo dataset and avoid making backend writes.
    if (isDemoMode || (store as any).is_demo) {
      setEffectiveTier('PREMIUM');
      setHasFullAccess(true);
      setIsTrialActive(false);
      setTrialDaysLeft(0);

      // Use cloned demo data (kept in-memory only)
      setInventory(DEMO_INVENTORY.map(i => ({ ...i, id: i.id || `demo_${Math.random().toString(36).slice(2,8)}` })));
      setSales((DEMO_SALES as unknown as SalesRecord[]).map(s => ({ ...s, id: s.id || `demo_sale_${Math.random().toString(36).slice(2,8)}` })));
      setDebtCount(DEMO_DEBTORS.length);
      setExpenses([]);
      setAuditLogs([]);
      setStaffList([]);
      setLoading(false);
      return;
    }
    // Normal data load (for real stores)
    
    Promise.all([
      fetchInventory(store.id), 
      fetchRecentSales(store.id), 
      fetchDebtors(store.id),
      fetchExpenses(store.id),
      canAccessPremiumFeatures ? fetchAuditLogs(store.id) : Promise.resolve([]),
      fetchAgents(store.id)
    ])
      .then(([invData, salesData, debtData, expensesData, logsData, agentsData]) => {
        setInventory(invData);
        setSales(salesData);
        setDebtCount(debtData.length);
        setExpenses(expensesData);
        setAuditLogs(logsData);
        setStaffList(agentsData);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSubscriptionStatus();
  }, [store.id, isDemoMode]);

  // Periodically refresh subscription status (every 30 seconds)
  // This ensures staff/owner views pick up any manual tier changes made by superadmin
  useEffect(() => {
    const interval = setInterval(() => {
      loadSubscriptionStatus();
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [store.id, isDemoMode]);

  // Also refresh when the tab becomes visible (user switches back to the app)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadSubscriptionStatus();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [store.id, isDemoMode]);

  // For demo mode, update trial days left periodically (every hour) so the UI counts down
  

  // Load data after subscription status is determined
  useEffect(() => {
    if (subscriptionLoaded || isDemoMode) {
      loadData();
      
      // Show success story popup after 2 minutes if not premium
      if (effectiveTier !== 'PREMIUM') {
        const timer = setTimeout(() => {
          setShowSuccessStory(true);
        }, 120000); // 2 minutes
        return () => clearTimeout(timer);
      }
    }
  }, [subscriptionLoaded, store.id, isDemoMode]);

  const loadSubscriptionStatus = async () => {
    // If this store is marked as demo in the database, grant permanent premium access
    if ((store as any).is_demo) {
      setEffectiveTier('PREMIUM');
      setHasFullAccess(true);
      setIsTrialActive(false);
      setTrialDaysLeft(0);
      setSubscriptionLoaded(true);
      return;
    }
    
    // Use the new single source of truth for tier
    try {
      const tierInfo = await getEffectiveTier(store.id);
      setEffectiveTier(tierInfo.tier);
      setHasFullAccess(tierInfo.hasFullAccess);
      setIsTrialActive(tierInfo.isTrialActive);
      setTrialDaysLeft(tierInfo.trialDaysLeft);
    } catch (err) {
      console.error('Error loading subscription:', err);
      // Default to NONE but still allow data loading
      setEffectiveTier('NONE');
      setHasFullAccess(false);
    }
    setSubscriptionLoaded(true);
  };

  const handleRestock = async (itemId: string) => {
    if (!newStockValue) return;
    // In demo mode, update in-memory only
    if (isDemoMode || (store as any).is_demo) {
      setInventory(prev => prev.map(it => it.id === itemId ? { ...it, current_stock: (parseInt(newStockValue) || 0) } : it));
      setEditingStockId(null);
      setNewStockValue("");
      return;
    }

    await updateStockLevel(itemId, parseInt(newStockValue));
    setEditingStockId(null);
    setNewStockValue("");
    loadData(); 
  };

  // Staff Management Handlers
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) return;
    
    setAddingStaff(true);
    try {
        if (isDemoMode || (store as any).is_demo) {
        // Simulate add locally
        const fake: Agent = {
          id: `demo_agent_${Math.random().toString(36).slice(2,8)}`,
          store_id: store.id,
          name: newStaffName.trim(),
          phone: newStaffPhone || undefined,
          total_points: 0,
          total_sales_value: 0,
          is_active: true,
          last_active: new Date().toISOString(),
        } as Agent;
        setStaffList(prev => [...prev, fake]);
        setNewStaffName('');
        setNewStaffPhone('');
        return;
      }

      await addStaffMember(store.id, newStaffName, newStaffPhone || undefined);
      setNewStaffName('');
      setNewStaffPhone('');
      // Refresh staff list
      const agents = await fetchAgents(store.id);
      setStaffList(agents);
    } catch (err) {
      console.error('Failed to add staff:', err);
      alert('Failed to add staff member');
    } finally {
      setAddingStaff(false);
    }
  };

  const handleRemoveStaff = async (agentId: string, agentName: string) => {
    if (!window.confirm(`Remove ${agentName} from staff? Their points will be deleted.`)) return;
    
    try {
      if (isDemoMode || (store as any).is_demo) {
        setStaffList(prev => prev.filter(a => a.id !== agentId));
        return;
      }

      await deleteStaffMember(agentId);
      const agents = await fetchAgents(store.id);
      setStaffList(agents);
    } catch (err) {
      console.error('Failed to remove staff:', err);
      alert('Failed to remove staff member');
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const item = {
      id: `demo_item_${Math.random().toString(36).slice(2,8)}`,
      store_id: store.id,
      item_name: newItemName,
      unit_price: parseInt(newItemPrice) || 0,
      buying_price: parseInt(newItemBuyingPrice) || (parseInt(newItemPrice) || 0) * 0.7,
      current_stock: parseInt(newItemStock) || 0,
      low_stock_threshold: parseInt(newItemThreshold) || 10,
      expiry_date: newItemExpiry || undefined,
    } as InventoryItem;

    if (isDemoMode || (store as any).is_demo) {
      setInventory(prev => [item, ...prev]);
      setNewItemName("");
      setNewItemBuyingPrice("");
      setNewItemPrice("");
      setNewItemStock("");
      setNewItemExpiry("");
      setShowAddForm(false);
      return;
    }

    await addNewInventoryItem({
      store_id: store.id,
      item_name: newItemName,
      unit_price: parseInt(newItemPrice),
      buying_price: parseInt(newItemBuyingPrice) || parseInt(newItemPrice) * 0.7, // Default cost if empty
      current_stock: parseInt(newItemStock),
      low_stock_threshold: parseInt(newItemThreshold),
      expiry_date: newItemExpiry || undefined
    });
    setNewItemName("");
    setNewItemBuyingPrice("");
    setNewItemPrice("");
    setNewItemStock("");
    setNewItemExpiry("");
    setShowAddForm(false);
    loadData();
  };

  // Bulk Import Handler
  const handleBulkImport = async (items: Omit<InventoryItem, 'id'>[]) => {
    if (isDemoMode || (store as any).is_demo) {
      // Simulate adding items locally
      const mapped = items.map(i => ({ ...i, id: `demo_item_${Math.random().toString(36).slice(2,8)}` } as InventoryItem));
      setInventory(prev => [...mapped, ...prev]);
      return;
    }

    await bulkAddInventoryItems(items);
    loadData();
  };

  // Catalog Add Handler
  const handleCatalogAdd = async (items: Omit<InventoryItem, 'id'>[]) => {
    await bulkAddInventoryItems(items);
    loadData();
  };

  // Barcode Scan Handler
  const handleBarcodeScan = (barcode: string, item?: any) => {
    if (item) {
      // Item found in catalog - pre-fill add form
      setNewItemName(item.item_name);
      setNewItemPrice(item.unit_price.toString());
      setNewItemBuyingPrice(item.buying_price.toString());
      setNewItemStock(item.current_stock.toString());
      setNewItemThreshold(item.low_stock_threshold.toString());
      setShowScanner(false);
      setShowAddForm(true);
    } else {
      // Unknown barcode - open search in catalog
      setShowScanner(false);
      setShowCatalog(true);
    }
  };

  const handleReconcile = async (e: React.FormEvent) => {
    e.preventDefault();
    const actual = parseInt(reconcileCashInput);
    if (isNaN(actual)) return;
    
    // Calculate expected Cash for TODAY only
    const today = new Date().toDateString();
    
    // 1. Total Cash Sales
    const todayCashSales = sales
      .filter(s => s.payment_mode === PaymentMode.CASH && new Date(s.created_at || '').toDateString() === today)
      .reduce((sum, s) => sum + s.total_amount, 0);

    // 2. Total Cash Expenses (Assuming all expenses are cash for simplicity in this MVP)
    const todayExpenses = expenses
      .filter(e => new Date(e.created_at).toDateString() === today)
      .reduce((sum, e) => sum + e.amount, 0);

    const expectedCashInBox = todayCashSales - todayExpenses;

    await performCashReconciliation(store.id, actual, expectedCashInBox);
    
    // Show detailed breakdown in alert
    alert(
      `REGISTER REPORT\n` +
      `----------------\n` +
      `Sales (Cash): +${todayCashSales}\n` +
      `Expenses: -${todayExpenses}\n` +
      `----------------\n` +
      `Expected in Box: ${expectedCashInBox}\n` +
      `You Counted: ${actual}\n` +
      `Difference: ${actual - expectedCashInBox}`
    );
    
    setShowReconcileModal(false);
    setReconcileCashInput('');
    loadData();
  };

  const generateSupplierOrder = () => {
    const lowStockItems = inventory.filter(i => i.current_stock <= i.low_stock_threshold);
    if (lowStockItems.length === 0) {
      alert("Stock levels are healthy. No items need reordering.");
      return;
    }

    const orderList = lowStockItems.map(i => `- ${i.item_name} (Current: ${i.current_stock})`).join('\n');
    const message = `Hello, I need to place an order for ${store.name}:\n\n${orderList}\n\nPlease confirm availability.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleLowStockAlert = () => {
    if (!canAccessPremiumFeatures) {
      setShowPlanModal(true);
      return;
    }

    const lowStockItems = inventory.filter(i => i.current_stock <= i.low_stock_threshold);
    if (lowStockItems.length === 0) return;

    const message = `🚨 *LOW STOCK ALERT* - ${store.name}\n\n` + 
      lowStockItems.map(i => `• ${i.item_name}: ${i.current_stock} left`).join('\n') +
      `\n\nLogin to reorder immediately.`;
    
    // Simulate sending to owner
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleGeneratePDF = () => {
    // Block in demo mode
    if (isDemoMode) {
      setDemoLockType('export');
      setShowDemoLockModal(true);
      return;
    }
    
    if (!canAccessPremiumFeatures) {
       setShowPlanModal(true);
       return;
    }

    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString();

    // Header
    doc.setFontSize(22);
    doc.text(store.name, 14, 20);
    doc.setFontSize(12);
    doc.text(`Monthly Performance Report - ${dateStr}`, 14, 28);
    doc.text(`Location: ${store.location}`, 14, 34);
    
    // Summary Metrics
    const today = new Date().toDateString();
    const todaysSales = sales.filter(s => new Date(s.created_at || '').toDateString() === today);
    const todayExpenses = expenses.filter(e => new Date(e.created_at).toDateString() === today);
    
    const revenue = todaysSales.reduce((sum, s) => sum + s.total_amount, 0);
    const totalExp = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

    const profit = todaysSales.reduce((sum, s) => {
        const item = inventory.find(i => i.id === s.item_id);
        const cost = item ? item.buying_price * s.quantity : 0;
        return sum + (s.total_amount - cost);
    }, 0);

    // Financial Table
    autoTable(doc, {
      startY: 45,
      head: [['Metric', 'Amount (KES)']],
      body: [
        ['Total Sales Revenue', revenue.toLocaleString()],
        ['Total Expenses', totalExp.toLocaleString()],
        ['Gross Profit (Sales - Cost of Goods)', profit.toLocaleString()],
        ['Net Cash Flow (Sales - Expenses)', (revenue - totalExp).toLocaleString()]
      ],
      theme: 'striped',
      headStyles: { fillColor: [66, 66, 66] }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 15;

    // Expenses Table
    if (todayExpenses.length > 0) {
      doc.text("Today's Expenses", 14, finalY);
      const expData = todayExpenses.map(e => [
        new Date(e.created_at).toLocaleTimeString(),
        e.reason,
        e.description || '-',
        e.recorded_by,
        e.amount
      ]);
      
      autoTable(doc, {
        startY: finalY + 5,
        head: [['Time', 'Category', 'Note', 'By', 'Amount']],
        body: expData,
        theme: 'grid',
        headStyles: { fillColor: [200, 100, 100] }
      });
      finalY = (doc as any).lastAutoTable.finalY + 15;
    }

    // Sales Table
    doc.text("Recent Transactions", 14, finalY);
    const tableData = todaysSales.map(s => [
      new Date(s.created_at || '').toLocaleTimeString(),
      s.item_name,
      s.quantity,
      s.payment_mode,
      `KES ${s.total_amount}`
    ]);

    autoTable(doc, {
      startY: finalY + 5,
      head: [['Time', 'Item', 'Qty', 'Mode', 'Amount']],
      body: tableData,
    });

    doc.save(`${store.name.replace(/\s/g, '_')}_Report_${dateStr}.pdf`);
  };

  const handleUndoLastSale = async () => {
    if (sales.length === 0) return;
    const lastSale = sales[0];
    if (window.confirm(`Undo the last sale for ${lastSale.item_name}?`)) {
      setLoading(true);
      if (lastSale.id) {
        await deleteSale(lastSale.id);
        loadData();
      }
    }
  };

  const checkExpiryStatus = (dateStr?: string) => {
    if (!dateStr) return { isExpiring: false, label: '' };
    const today = new Date();
    const expiry = new Date(dateStr);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { isExpiring: true, label: 'Expired', color: 'text-red-600 bg-red-50 border-red-200' };
    if (diffDays <= 30) return { isExpiring: true, label: `${diffDays} days left`, color: 'text-amber-600 bg-amber-50 border-amber-200' };
    return { isExpiring: false, label: dateStr, color: 'text-slate-500' };
  };

  // --- ANALYTICS CALCULATIONS ---
  const today = new Date().toDateString();
  const todaysSales = sales.filter(s => new Date(s.created_at || '').toDateString() === today);
  const todaysExpenses = expenses.filter(e => new Date(e.created_at).toDateString() === today);

  const totalRevenueToday = todaysSales.reduce((sum, sale) => sum + sale.total_amount, 0);
  const totalExpensesToday = todaysExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Calculate Profit: Revenue - Cost of Goods Sold (COGS)
  const totalProfitToday = todaysSales.reduce((profit, sale) => {
    const item = inventory.find(i => i.id === sale.item_id);
    const cost = item ? (item.buying_price || 0) * sale.quantity : 0;
    return profit + (sale.total_amount - cost);
  }, 0);

  // Cash In Hand Calculation (Approximation for Display)
  // Total Cash Sales - Total Cash Expenses
  const cashSalesToday = todaysSales.filter(s => s.payment_mode === PaymentMode.CASH).reduce((sum, s) => sum + s.total_amount, 0);
  const cashInBoxEstimate = cashSalesToday - totalExpensesToday;

  const lowStockItems = inventory.filter(i => i.current_stock <= i.low_stock_threshold);
  const filteredInventory = showExpiringOnly 
    ? inventory.filter(i => checkExpiryStatus(i.expiry_date).isExpiring)
    : inventory;
  const expiringCount = inventory.filter(i => checkExpiryStatus(i.expiry_date).isExpiring).length;
  
  const cashSales = sales.filter(s => s.payment_mode === PaymentMode.CASH).reduce((sum, s) => sum + s.total_amount, 0);
  const mpesaSales = sales.filter(s => s.payment_mode === PaymentMode.MPESA).reduce((sum, s) => sum + s.total_amount, 0);
  const madeniSales = sales.filter(s => s.payment_mode === PaymentMode.MADENI).reduce((sum, s) => sum + s.total_amount, 0);

  const chartData = [
    { name: 'Cash', amount: cashSales, fill: '#16a34a' },
    { name: 'M-Pesa', amount: mpesaSales, fill: '#059669' },
    { name: 'Madeni', amount: madeniSales, fill: '#d97706' },
  ];

  if (loading) return <div className="p-8 text-center text-slate-500">Loading Store Data...</div>;

  // Helper to get display tier text
  const getTierDisplayText = () => {
    switch (effectiveTier) {
      case 'TRIAL': return 'FREE TRIAL';
      case 'BASIC': return 'BASIC PLAN';
      case 'PREMIUM': return 'PREMIUM';
      case 'EXPIRED': return 'EXPIRED';
      default: return 'NO PLAN';
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* PREMIUM NUDGE: Trial Countdown Banner - Show for trial users */}
      {effectiveTier === 'TRIAL' && trialDaysLeft > 0 && !bannerDismissed && (
        <TrialCountdownBanner
          daysLeft={trialDaysLeft}
          onUpgrade={() => setShowSubscriptionPayment(true)}
          onDismiss={() => setBannerDismissed(true)}
        />
      )}

      {/* PREMIUM NUDGE: Floating Badge (for non-premium users who need to upgrade) */}
      {effectiveTier !== 'PREMIUM' && (
        <PremiumFloatingBadge
          isTrialActive={isTrialActive}
          trialDaysLeft={trialDaysLeft}
          onUpgrade={() => setShowSubscriptionPayment(true)}
        />
      )}

      {/* PREMIUM NUDGE: Success Story Popup (shown after 2 min for non-premium) */}
      {showSuccessStory && effectiveTier !== 'PREMIUM' && (
        <SuccessStoryPopup
          onUpgrade={() => {
            setShowSuccessStory(false);
            setShowSubscriptionPayment(true);
          }}
          onDismiss={() => setShowSuccessStory(false)}
        />
      )}

      {showDebtorsList && (
        <DebtorsList 
          store={store} 
          onClose={() => {
            setShowDebtorsList(false);
            loadData();
          }} 
        />
      )}

      {showPlanModal && (
        <PlanInfoModal 
          currentTier={effectiveTier === 'PREMIUM' ? 'PREMIUM' : effectiveTier === 'BASIC' ? 'BASIC' : undefined} 
          onClose={() => setShowPlanModal(false)}
          onUpgrade={() => setShowSubscriptionPayment(true)}
        />
      )}

      {/* CASH RECONCILIATION MODAL */}
      {showReconcileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95">
              <h3 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Wallet className="w-6 h-6 text-blue-600" />
                Count Cash in Drawer
              </h3>
              <p className="text-sm text-slate-500 mb-6">Count the actual money you have. We will compare it with (Cash Sales - Expenses).</p>
              
              <div className="bg-slate-50 p-3 rounded-lg mb-4 text-sm space-y-1">
                 <div className="flex justify-between">
                   <span className="text-slate-500">Sales (Cash):</span>
                   <span className="font-bold text-green-600">+{cashSalesToday.toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-slate-500">Expenses:</span>
                   <span className="font-bold text-red-600">-{totalExpensesToday.toLocaleString()}</span>
                 </div>
                 <div className="border-t border-slate-200 pt-1 mt-1 flex justify-between font-bold">
                   <span>Expected:</span>
                   <span>{cashInBoxEstimate.toLocaleString()}</span>
                 </div>
              </div>

              <form onSubmit={handleReconcile}>
                <label className="block text-xs uppercase font-bold text-slate-500 mb-1">Cash you have (KES)</label>
                <input 
                  type="number" 
                  autoFocus
                  required
                  className="w-full text-2xl font-bold p-3 border rounded-lg mb-6 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="0.00"
                  value={reconcileCashInput}
                  onChange={e => setReconcileCashInput(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setShowReconcileModal(false)} className="py-3 bg-slate-100 font-bold text-slate-600 rounded-lg">Cancel</button>
                  <button type="submit" className="py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Check Difference</button>
                </div>
              </form>
           </div>
        </div>
      )}
      
      {/* Dashboard Header */}
      <div className={`p-6 rounded-xl text-white shadow-lg ${theme.bg}`}>
         <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                 <h2 className="text-2xl font-bold">{store.name}</h2>
                 <button 
                   onClick={() => effectiveTier === 'TRIAL' || effectiveTier === 'NONE' || effectiveTier === 'EXPIRED' ? setShowSubscriptionPayment(true) : setShowPlanModal(true)}
                   className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 transition cursor-pointer ${
                     effectiveTier === 'PREMIUM' 
                       ? 'bg-amber-400 text-amber-900 hover:bg-amber-300' 
                       : effectiveTier === 'TRIAL'
                         ? 'bg-green-400/30 text-white border border-green-300/50 hover:bg-green-400/40'
                         : 'bg-slate-200/20 text-white border border-white/30 hover:bg-white/20'
                   }`}
                 >
                   {effectiveTier === 'PREMIUM' ? <Crown className="w-3 h-3" fill="currentColor" /> : effectiveTier === 'TRIAL' ? <Sparkles className="w-3 h-3" /> : <Info className="w-3 h-3" />}
                   {getTierDisplayText()}
                   {effectiveTier === 'TRIAL' && <span className="ml-1">({trialDaysLeft}d left)</span>}
                 </button>
              </div>
              <button 
                onClick={() => setShowSalesMap(true)}
                className="flex items-center gap-1.5 opacity-90 mt-1 hover:opacity-100 hover:bg-white/10 px-2 py-1 rounded-lg transition -ml-2"
                title="View Sales Location Map"
              >
                <Map className="w-4 h-4" />
                <span className="text-sm font-medium">{store.location} • {bizConfig.label}</span>
              </button>
            </div>
            <div className="flex items-center gap-3">
              {!isDemoMode && (
                <button
                  onClick={() => setShowSubscriptionPayment(true)}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition"
                >
                  <CreditCard className="w-4 h-4" />
                  {effectiveTier === 'PREMIUM' ? 'Renew' : effectiveTier === 'TRIAL' ? 'Subscribe' : 'Upgrade'}
                </button>
              )}
              <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
         </div>
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* 1. REVENUE (Standard) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase">Revenue Today</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-slate-900">KES {totalRevenueToday.toLocaleString()}</p>
        </div>

        {/* 2. EXPENSES (New) */}
        <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <span className="text-xs font-semibold uppercase text-red-600">Expenses</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-red-600">- {totalExpensesToday.toLocaleString()}</p>
        </div>

        {/* 3. CASH RECONCILIATION (Premium/Trial) */}
        <button 
           onClick={canAccessPremiumFeatures ? () => setShowReconcileModal(true) : () => setShowSubscriptionPayment(true)}
           className={`p-4 rounded-xl border shadow-sm relative overflow-hidden text-left transition-all ${canAccessPremiumFeatures ? 'bg-white border-blue-200 hover:border-blue-400 group' : 'bg-slate-50 border-slate-200'}`}
        >
           {!canAccessPremiumFeatures && <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center text-center">
              <Crown className="w-5 h-5 text-amber-500 mb-1" />
              <span className="text-[10px] font-bold text-slate-500">Subscribe to Unlock</span>
           </div>}
           <div className="flex items-center gap-2 text-slate-500 mb-2">
            <ClipboardCheck className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold uppercase">Cash in Box</span>
          </div>
          <div className="flex items-baseline gap-1">
             <p className="text-xl md:text-2xl font-bold text-slate-900">{Math.max(0, cashInBoxEstimate).toLocaleString()}</p>
             <span className="text-xs text-slate-400 font-normal">Est.</span>
          </div>
          <p className="text-[10px] text-blue-600 mt-1 font-bold underline decoration-blue-200">Count Cash</p>
        </button>

        {/* 4. NET PROFIT (Premium/Trial) */}
        <div className={`p-4 rounded-xl border shadow-sm relative overflow-hidden ${canAccessPremiumFeatures ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200'}`}>
           {!canAccessPremiumFeatures && <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center text-center cursor-pointer" onClick={() => setShowSubscriptionPayment(true)}>
              <Crown className="w-5 h-5 text-amber-500 mb-1" />
              <span className="text-[10px] font-bold text-slate-500">Subscribe to Unlock</span>
           </div>}
           <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Banknote className="w-4 h-4 text-green-600" />
            <span className="text-xs font-semibold uppercase">True Profit</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-green-700">KES {totalProfitToday.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="md:col-span-2 bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-slate-500">
               <BarChart3 className={`w-4 h-4 ${theme.text}`} />
               <span className="text-xs font-semibold uppercase">Sales by Payment Mode</span>
            </div>
            {/* PDF Report Download Button */}
            <button 
              onClick={handleGeneratePDF}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${canAccessPremiumFeatures ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
            >
              {canAccessPremiumFeatures ? <Download className="w-3.5 h-3.5" /> : <Lock className="w-3 h-3" />}
              {canAccessPremiumFeatures ? 'Download Report' : 'Report Locked'}
            </button>
          </div>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} tickFormatter={(value) => `K${value}`} />
                <Tooltip 
                  cursor={{fill: 'transparent'}} 
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                  formatter={(value: number) => [`KES ${value.toLocaleString()}`, 'Amount']}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Premium Feature: Fundi Leaderboard */}
        <div className="md:col-span-1">
           {canAccessPremiumFeatures ? (
             <div className="space-y-3">
               <button
                 onClick={() => setShowStaffModal(true)}
                 className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 ${theme.bg} text-white rounded-lg font-semibold hover:opacity-90 transition`}
               >
                 <Users className="w-4 h-4" />
                 Manage {bizConfig.agentLabel}s
               </button>
               <FundiLeaderboard store={store} label={bizConfig.agentLabel} />
             </div>
           ) : (
             <PremiumLock 
               title={`${bizConfig.agentLabel} Loyalty`} 
               description={`Unlock leaderboards to track your top performing ${bizConfig.agentLabel}s automatically.`}
               onUpgrade={() => setShowSubscriptionPayment(true)}
               benefit="Increase team productivity by 30%"
             />
           )}
        </div>

        {/* Warranty Management - Electronics & Phone Repair Only */}
        {(store.business_type === 'Electronics' || store.business_type === 'Phone Repair') && (
          <div className="md:col-span-1">
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200 shadow-sm p-4 space-y-3">
              <h3 className="font-bold text-purple-900 flex items-center gap-2 border-b border-purple-200 pb-2">
                <Lock className="w-4 h-4" />
                Warranty Management
              </h3>
              <button
                onClick={() => setShowWarrantyLookup(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition"
              >
                <Search className="w-4 h-4" />
                Search Warranty
              </button>
              <button
                onClick={() => setShowWarrantyDashboard(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
              >
                <BarChart3 className="w-4 h-4" />
                Warranty Dashboard
              </button>
            </div>
          </div>
        )}

        {/* Business Management: Suppliers & Customers */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Users className={`w-4 h-4 ${theme.text}`} />
              Business Relationships
            </h3>
            <button
              onClick={() => setShowSupplierManager(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition"
            >
              <PackagePlus className="w-4 h-4" />
              Manage Suppliers & Debts
            </button>
            <button
              onClick={() => setShowCustomerManager(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition"
            >
              <Users className="w-4 h-4" />
              Customer Credit Limits
            </button>
          </div>
        </div>
      </div>

      {/* Inventory & Supplier Orders */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <PackagePlus className={`w-4 h-4 ${theme.text}`} />
            Inventory Manager
          </h3>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
             <button 
               onClick={() => setShowScanner(true)}
               className="flex-1 sm:flex-none text-xs flex items-center justify-center gap-1 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg transition"
               title="Scan Barcode"
             >
               <ScanLine className="w-3.5 h-3.5" />
               Scan
             </button>
             <button 
               onClick={() => setShowCatalog(true)}
               className="flex-1 sm:flex-none text-xs flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition"
               title="Browse Item Catalog"
             >
               <Package className="w-3.5 h-3.5" />
               Catalog
             </button>
             <button 
               onClick={() => setShowBulkImport(true)}
               className="flex-1 sm:flex-none text-xs flex items-center justify-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition"
               title="Import from CSV"
             >
               <FileSpreadsheet className="w-3.5 h-3.5" />
               Import
             </button>
             <button 
              onClick={() => setShowExpiringOnly(!showExpiringOnly)}
              className={`flex-1 sm:flex-none text-xs flex items-center justify-center gap-1 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg transition hover:bg-slate-50 ${showExpiringOnly ? 'bg-amber-50 border-amber-200 text-amber-700 font-semibold' : ''}`}
            >
              <Filter className="w-3.5 h-3.5" />
              {showExpiringOnly ? 'Expiring' : 'Filter'}
            </button>
            <button 
              onClick={() => setShowAddForm(!showAddForm)}
              className={`flex-1 sm:flex-none text-xs flex items-center justify-center gap-1 ${theme.bg} ${theme.hover} text-white px-3 py-1.5 rounded-lg transition`}
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          </div>
        </div>
        
        {/* Low Stock Banner for Premium */}
        {lowStockItems.length > 0 && (
          <div className="bg-red-50 p-2 flex items-center justify-between px-4 border-b border-red-100">
             <div className="flex items-center gap-2 text-red-700 text-xs font-bold">
               <AlertTriangle className="w-4 h-4" />
               {lowStockItems.length} items running low
             </div>
             <button 
               onClick={handleLowStockAlert}
               className={`text-xs px-2 py-1 rounded border flex items-center gap-1 ${canAccessPremiumFeatures ? 'bg-white border-red-200 text-red-600 hover:bg-red-50' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
             >
               {canAccessPremiumFeatures ? <Share2 className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
               Notify Owner
             </button>
          </div>
        )}

        {showAddForm && (
          <form onSubmit={handleAddItem} className={`p-4 ${theme.light} border-b ${theme.border} grid gap-3 animate-in slide-in-from-top-2`}>
            <div className="grid grid-cols-2 gap-3">
              <input 
                type="text" placeholder="Item Name" required 
                className="col-span-2 px-3 py-2 border rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={newItemName} onChange={e => setNewItemName(e.target.value)}
              />
              <div className="relative">
                <label className="text-[10px] absolute -top-1.5 left-2 bg-white px-1 text-slate-400 font-bold">Buying (Cost)</label>
                <input 
                  type="number" required 
                  className="w-full px-3 py-2 border rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  value={newItemBuyingPrice} onChange={e => setNewItemBuyingPrice(e.target.value)}
                />
              </div>
              <div className="relative">
                 <label className="text-[10px] absolute -top-1.5 left-2 bg-white px-1 text-slate-400 font-bold">Selling Price</label>
                <input 
                  type="number" required 
                  className="w-full px-3 py-2 border rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)}
                />
              </div>
              <input 
                type="number" placeholder="Initial Stock" required 
                className="px-3 py-2 border rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={newItemStock} onChange={e => setNewItemStock(e.target.value)}
              />
              <div className="">
                <input 
                  type="date"
                  className="w-full px-3 py-2 border rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  value={newItemExpiry} onChange={e => setNewItemExpiry(e.target.value)}
                />
              </div>
            </div>
            <button type="submit" className={`w-full ${theme.bg} ${theme.hover} text-white py-2 rounded-md text-sm font-semibold`}>
              Save New Product
            </button>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
              <tr>
                <th className="p-3">Item</th>
                <th className="p-3 text-center">{bizConfig.stockLabel}</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInventory.map((item) => {
                const expiryStatus = checkExpiryStatus(item.expiry_date);
                return (
                  <tr key={item.id} className={item.current_stock <= item.low_stock_threshold ? 'bg-red-50/50' : ''}>
                    <td className="p-3">
                      <div className="text-slate-900 font-medium">{item.item_name}</div>
                      <div className="text-xs text-slate-400">
                        Buy: {item.buying_price} • Sell: {item.unit_price}
                        {expiryStatus.isExpiring && <span className={`ml-2 px-1 rounded text-[10px] ${expiryStatus.color}`}>{expiryStatus.label}</span>}
                      </div>
                    </td>
                    <td className="p-3 text-center font-mono text-slate-700">
                      {editingStockId === item.id ? (
                        <input 
                          type="number" 
                          className={`w-16 text-center border ${theme.border} rounded text-slate-900`}
                          autoFocus
                          placeholder={item.current_stock.toString()}
                          value={newStockValue}
                          onChange={e => setNewStockValue(e.target.value)}
                        />
                      ) : (
                        <span className={item.current_stock <= item.low_stock_threshold ? 'text-red-600 font-bold' : ''}>{item.current_stock}</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {editingStockId === item.id ? (
                        <div className="flex justify-end gap-1">
                          <button onClick={() => handleRestock(item.id)} className="bg-green-600 text-white px-2 py-1 rounded text-xs">Save</button>
                          <button onClick={() => setEditingStockId(null)} className="bg-slate-300 text-slate-700 px-2 py-1 rounded text-xs">X</button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingStockId(item.id); setNewStockValue(item.current_stock.toString()); }} className={`${theme.text} hover:${theme.light} p-1.5 rounded border ${theme.border} flex items-center gap-1 ml-auto text-xs`}>
                          <RefreshCcw className="w-3 h-3" />
                          Restock
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* PREMIUM: STOCK AUDIT LOGS */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <button 
          onClick={() => canAccessPremiumFeatures ? setShowAuditLogs(!showAuditLogs) : setShowSubscriptionPayment(true)} 
          className="w-full p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center text-left"
        >
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <FileText className={`w-4 h-4 ${theme.text}`} />
            Stock History (Anti-Theft)
            {!canAccessPremiumFeatures && <Crown className="w-3 h-3 text-amber-500 ml-1" />}
          </h3>
          <div className="flex items-center gap-2 text-slate-400">
            {canAccessPremiumFeatures ? (showAuditLogs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />) : <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded text-slate-500 font-bold">LOCKED</span>}
          </div>
        </button>
        
        {canAccessPremiumFeatures && showAuditLogs && (
          <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100 bg-slate-50/50">
             {auditLogs.length === 0 ? (
               <div className="p-6 text-center text-slate-400 text-sm">No activity recorded yet.</div>
             ) : (
               auditLogs.map(log => (
                 <div key={log.id} className="p-3 text-sm flex gap-3">
                   <div className="min-w-[4px] bg-slate-300 rounded-full"></div>
                   <div className="flex-1">
                      <div className="flex justify-between">
                        <span className="font-bold text-slate-700 text-xs">{log.action_type}</span>
                        <span className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-600 mt-0.5">{log.description}</p>
                      <p className="text-[10px] text-slate-400 mt-1">By: {log.performed_by}</p>
                   </div>
                 </div>
               ))
             )}
          </div>
        )}
      </div>

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <BulkImport
          storeId={store.id}
          onImport={handleBulkImport}
          onClose={() => setShowBulkImport(false)}
        />
      )}

      {/* Catalog Browser Modal */}
      {showCatalog && (
        <CatalogBrowser
          storeId={store.id}
          existingBarcodes={inventory.map(i => i.barcode || '')}
          onAddItems={handleCatalogAdd}
          onClose={() => setShowCatalog(false)}
        />
      )}

      {/* Barcode Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Demo Lock Modal */}
      {showDemoLockModal && (
        <DemoLockModal
          isOpen={showDemoLockModal}
          onClose={() => setShowDemoLockModal(false)}
          onRegister={() => {
            setShowDemoLockModal(false);
            onExitDemo?.();
          }}
          hookType={demoLockType}
        />
      )}

      {/* Staff Management Modal */}
      {showStaffModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className={`p-4 border-b ${theme.bg} text-white rounded-t-xl flex items-center justify-between`}>
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Manage {bizConfig.agentLabel}s
              </h3>
              <button onClick={() => setShowStaffModal(false)} className="p-1 hover:bg-white/20 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add Staff Form */}
            <form onSubmit={handleAddStaff} className="p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={`${bizConfig.agentLabel} name`}
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
                <input
                  type="tel"
                  placeholder="Phone (optional)"
                  value={newStaffPhone}
                  onChange={(e) => setNewStaffPhone(e.target.value)}
                  className="w-32 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={addingStaff || !newStaffName.trim()}
                  className={`px-4 py-2 ${theme.bg} text-white rounded-lg font-medium flex items-center gap-1 disabled:opacity-50`}
                >
                  <UserPlus className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Staff List */}
            <div className="flex-1 overflow-y-auto">
              {staffList.filter(s => s.is_active !== false).length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No {bizConfig.agentLabel.toLowerCase()}s added yet</p>
                  <p className="text-xs mt-1">Add your staff above</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {staffList.filter(s => s.is_active !== false).map((staff) => (
                    <div key={staff.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <div className="font-semibold text-slate-800">{staff.name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-3">
                          {staff.phone && <span>📱 {staff.phone}</span>}
                          <span>⭐ {staff.total_points} pts</span>
                          <span>💰 KES {staff.total_sales_value.toLocaleString()}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveStaff(staff.id, staff.name)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                        title="Remove staff"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-100 bg-slate-50 rounded-b-xl">
              <p className="text-xs text-slate-500 text-center">
                Staff can select their name when making sales to earn points
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Manager Modal */}
      {showSupplierManager && (
        <SupplierManager 
          store={store}
          onClose={() => setShowSupplierManager(false)}
        />
      )}

      {/* Customer Manager Modal */}
      {showCustomerManager && (
        <CustomerManager 
          store={store}
          onClose={() => setShowCustomerManager(false)}
        />
      )}

      {/* Sales Location Map Modal */}
      {showSalesMap && (
        <SalesLocationMap 
          store={store}
          sales={sales}
          onClose={() => setShowSalesMap(false)}
        />
      )}

      {/* Warranty Lookup Modal */}
      {showWarrantyLookup && (
        <WarrantyLookup 
          store={store}
          onClose={() => setShowWarrantyLookup(false)}
        />
      )}

      {/* Warranty Dashboard Modal */}
      {showWarrantyDashboard && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="min-h-screen p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-white">Warranty Management</h2>
                <button 
                  onClick={() => setShowWarrantyDashboard(false)}
                  className="p-2 bg-red-600/20 hover:bg-red-600/30 rounded-lg text-red-400 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <WarrantyDashboard store={store} />
            </div>
          </div>
        </div>
      )}

      {/* Subscription Payment Modal */}
      {showSubscriptionPayment && (
        <SubscriptionPayment
          store={store}
          onClose={() => setShowSubscriptionPayment(false)}
          onSuccess={() => {
            setShowSubscriptionPayment(false);
            // Optionally reload store data to reflect new tier
          }}
        />
      )}

      {/* Offline Indicator - Fixed to bottom right */}
      <OfflineIndicator />
    </div>
  );
};
