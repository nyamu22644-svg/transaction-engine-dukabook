
import React, { useState, useEffect } from 'react';
import { MapPin, Loader2, Save, ShoppingCart, User, Smartphone, CreditCard, Banknote, Clock, CheckCircle2, Share2, Plus, RefreshCw, Copy, RotateCcw, MapPinOff, Settings, X, AlertOctagon, AlertTriangle, History, ArrowLeft, Calendar, Printer, TrendingDown, ArrowDownRight, ArrowUpRight, Package, ScanLine } from 'lucide-react';
import { fetchInventory, recordSale, deleteSale, fetchDebtors, fetchRecentSales, recordExpense, addNewInventoryItem, fetchAgents } from '../services/supabaseService';
import { createSerializedItem } from '../services/warrantyService';
import { deductBreakoutUnits } from '../services/inventoryService';
import { InventoryItem, PaymentMode, GeoLocationState, StoreProfile, SalesRecord, Agent } from '../types';
import { DebtorsList } from './DebtorsList';
import { DemoLockModal } from './DemoLockModal';
import { BarcodeScanner } from './BarcodeScanner';
import { OfflineIndicator } from './ui/OfflineIndicator';
import { THEME_COLORS, DEFAULT_THEME, BUSINESS_CONFIG } from '../constants';
import { DEMO_INVENTORY, DEMO_DEBTORS, DEMO_SALES } from '../demoData';
import { searchCatalog } from '../data/itemTemplates';

interface SalesEntryFormProps {
  store: StoreProfile;
  isDemoMode?: boolean;
  onExitDemo?: () => void;
}

interface ReceiptData {
  id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  date: Date;
  collected_by: string;
  payment_mode: string;
  mpesa_ref?: string;
  customer_name?: string;
  verificationLink: string;
}

export const SalesEntryForm: React.FC<SalesEntryFormProps> = ({ store, isDemoMode = false, onExitDemo }) => {
  // --- STATE MANAGEMENT ---
  const [entryMode, setEntryMode] = useState<'SALE' | 'EXPENSE'>('SALE');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  // Demo Lock Modal State
  const [showDemoLockModal, setShowDemoLockModal] = useState(false);
  const [demoLockType, setDemoLockType] = useState<'save' | 'gps' | 'madeni' | 'report' | 'export'>('save');
  
  // Demo Sales State (local only, not synced) - Start empty, user gets 1 free entry
  const [demoSales, setDemoSales] = useState<SalesRecord[]>([]);
  const [demoEntryUsed, setDemoEntryUsed] = useState(false);

  // Receipt State
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSaleData, setLastSaleData] = useState<ReceiptData | null>(null);

  // Form Fields - Sale
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [quantity, setQuantity] = useState<number | string>(1);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(PaymentMode.CASH);
  const [collectedBy, setCollectedBy] = useState<string>("");
  const [mpesaRef, setMpesaRef] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [itemImeiSerial, setItemImeiSerial] = useState<string>("");

  // Form Fields - Expense
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseReason, setExpenseReason] = useState("Transport");
  const [expenseDescription, setExpenseDescription] = useState("");

  // GPS State
  const [geoState, setGeoState] = useState<GeoLocationState>({
    lat: null,
    lng: null,
    accuracy: null,
    error: null,
    loading: true,
  });
  
  // Location Modal State
  const [showLocationModal, setShowLocationModal] = useState(false);
  
  // Debtors Modal State
  const [showDebtorsList, setShowDebtorsList] = useState(false);
  const [debtCount, setDebtCount] = useState(0);

  // History Modal State
  const [showHistory, setShowHistory] = useState(false);
  const [historySales, setHistorySales] = useState<SalesRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Staff Add Item State
  const [showAddItem, setShowAddItem] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanMode, setScanMode] = useState<'add' | 'sell'>('sell'); // 'sell' = scan to select item, 'add' = scan to add new item
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemStock, setNewItemStock] = useState('');
  const [newItemBarcode, setNewItemBarcode] = useState('');
  const [newItemBatchNumber, setNewItemBatchNumber] = useState('');
  const [newItemExpiry, setNewItemExpiry] = useState('');
  const [newItemImei, setNewItemImei] = useState('');
  const [newItemParentUnitQty, setNewItemParentUnitQty] = useState<number | string>('');
  const [addingItem, setAddingItem] = useState(false);
  const [itemAddedSuccess, setItemAddedSuccess] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<{type: 'found' | 'new' | null, message: string}>({type: null, message: ''});

  // Staff Points State
  const [staffPoints, setStaffPoints] = useState<{points: number, rank: number, total: number} | null>(null);
  const [allAgents, setAllAgents] = useState<Agent[]>([]);

  // Get Dynamic Theme
  const theme = THEME_COLORS[store.theme_color || 'blue'] || DEFAULT_THEME;
  // Get Business Config
  const bizConfig = BUSINESS_CONFIG[store.business_type || 'HARDWARE'];

  // --- EFFECTS ---
  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    // Initial fetch of debt count
    if (isDemoMode) {
      setDebtCount(DEMO_DEBTORS.length);
    } else {
      fetchDebtors(store.id).then(d => setDebtCount(d.length));
    }
    
    return () => clearInterval(timer);
  }, [store.id, isDemoMode]);

  // Load Inventory for this specific Store
  useEffect(() => {
    if (isDemoMode) {
      setInventory(DEMO_INVENTORY);
      setLoadingInventory(false);
    } else {
      fetchInventory(store.id)
        .then(setInventory)
        .catch((err) => console.error("Inventory load failed", err))
        .finally(() => setLoadingInventory(false));
      
      // Also load agents for points lookup
      fetchAgents(store.id).then(setAllAgents);
    }
  }, [store.id, isDemoMode]);

  // Update staff points when name changes
  useEffect(() => {
    if (!collectedBy || collectedBy.length < 2 || isDemoMode) {
      setStaffPoints(null);
      return;
    }
    
    const matchedAgent = allAgents.find(a => 
      a.name.toLowerCase() === collectedBy.toLowerCase()
    );
    
    if (matchedAgent) {
      const rank = allAgents.findIndex(a => a.id === matchedAgent.id) + 1;
      setStaffPoints({
        points: matchedAgent.total_points,
        rank: rank,
        total: allAgents.length
      });
    } else {
      setStaffPoints(null);
    }
  }, [collectedBy, allAgents, isDemoMode]);

  // Watch GPS Status
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoState(prev => ({ ...prev, loading: false, error: "Geolocation is not supported by your browser." }));
      return;
    }

    const startWatching = () => {
      return navigator.geolocation.watchPosition(
        (position) => {
          setGeoState({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            error: null,
            loading: false,
          });
          setShowLocationModal(false); // Close modal on success
        },
        (error) => {
          let errorMsg = "Unable to retrieve location.";
          if (error.code === error.PERMISSION_DENIED) errorMsg = "Permission denied. Tap to allow access.";
          else if (error.code === error.POSITION_UNAVAILABLE) errorMsg = "GPS is OFF. Tap here to turn on.";
          else if (error.code === error.TIMEOUT) errorMsg = "Location timed out. Tap to retry.";
          
          setGeoState(prev => ({ ...prev, loading: false, error: errorMsg }));
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
      );
    };

    const geoId = startWatching();
    return () => navigator.geolocation.clearWatch(geoId);
  }, []);

  // Trigger Modal on Error
  useEffect(() => {
    if (geoState.error) {
      setShowLocationModal(true);
    }
  }, [geoState.error]);

  const selectedItem = inventory.find(i => i.id === selectedItemId);
  const totalAmount = selectedItem ? selectedItem.unit_price * Number(quantity || 0) : 0;
  const profitAmount = selectedItem ? (selectedItem.unit_price - (selectedItem.buying_price || 0)) * Number(quantity || 0) : 0;
  const profitMargin = selectedItem && selectedItem.unit_price > 0 
    ? ((selectedItem.unit_price - (selectedItem.buying_price || 0)) / selectedItem.unit_price * 100) 
    : 0;

  // Check for expiring batches (FEFO - First Expire, First Out)
  const getExpiryWarning = () => {
    if (!selectedItem || !selectedItem.expiry_date) return null;
    
    const today = new Date();
    const expiryDate = new Date(selectedItem.expiry_date);
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return { status: 'expired', message: `⚠️ EXPIRED! This product expired ${Math.abs(daysUntilExpiry)} days ago. DO NOT SELL!`, color: 'bg-red-100 border-red-300 text-red-800' };
    } else if (daysUntilExpiry <= 7) {
      return { status: 'critical', message: `🚨 URGENT: ${daysUntilExpiry} days left! Sell this FIRST (FEFO). Put on offer!`, color: 'bg-red-50 border-red-200 text-red-700' };
    } else if (daysUntilExpiry <= 30) {
      return { status: 'warning', message: `⚠️ Expires in ${daysUntilExpiry} days. Prioritize selling this batch.`, color: 'bg-amber-50 border-amber-200 text-amber-700' };
    }
    return null;
  };
  const isGpsValid = geoState.lat !== null && geoState.lng !== null;

  const retryGps = () => {
    setGeoState(prev => ({ ...prev, loading: true, error: null }));
    // Determine strictness based on error type, but standard getCurrentPosition helps 'kick' the permission prompt
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoState({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          error: null,
          loading: false,
        });
        setShowLocationModal(false);
      },
      (error) => {
        let errorMsg = "Retry failed.";
        if (error.code === error.PERMISSION_DENIED) errorMsg = "Permission denied. Please allow location in settings.";
        else if (error.code === error.POSITION_UNAVAILABLE) errorMsg = "GPS is still OFF. Please turn it on.";
        setGeoState(prev => ({ ...prev, loading: false, error: errorMsg }));
        // Modal stays open because error is set again
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // In demo mode - only allow 1 entry to show how it works
    if (isDemoMode) {
      // If demo entry already used, show lock modal
      if (demoEntryUsed) {
        setDemoLockType('save');
        setShowDemoLockModal(true);
        return;
      }
      
      if (!selectedItemId) return;
      
      const demoSaleId = `demo-${Date.now()}`;
      const newDemoSale: SalesRecord = {
        id: demoSaleId,
        store_id: store.id,
        item_id: selectedItemId,
        item_name: selectedItem?.item_name || 'Unknown',
        quantity: Number(quantity),
        total_amount: totalAmount,
        payment_mode: paymentMode,
        mpesa_ref: paymentMode === PaymentMode.MPESA ? mpesaRef : undefined,
        customer_phone: paymentMode === PaymentMode.MADENI ? customerPhone : undefined,
        customer_name: customerName || undefined,
        collected_by: collectedBy || 'You (Demo)',
        gps_latitude: -1.2921,
        gps_longitude: 36.8219,
        gps_accuracy: 10,
        created_at: new Date().toISOString(),
      };
      
      setDemoSales(prev => [newDemoSale, ...prev]);
      setDemoEntryUsed(true); // Mark demo entry as used
      
      if (paymentMode === PaymentMode.MADENI) {
        setDebtCount(prev => prev + 1);
      }

      const verificationLink = `${window.location.origin}?verify=${demoSaleId}`;

      setLastSaleData({
        id: demoSaleId,
        item_name: selectedItem?.item_name || "Demo Item",
        quantity: Number(quantity),
        unit_price: selectedItem?.unit_price || 0,
        total_amount: totalAmount,
        date: new Date(),
        collected_by: collectedBy || 'You (Demo)',
        payment_mode: paymentMode,
        mpesa_ref: paymentMode === PaymentMode.MPESA ? mpesaRef : undefined,
        customer_name: customerName || undefined,
        verificationLink,
      });

      setShowReceipt(true);
      // Reset form
      setSelectedItemId("");
      setQuantity(1);
      setPaymentMode(PaymentMode.CASH);
      setCollectedBy("");
      setMpesaRef("");
      setCustomerPhone("");
      setCustomerName("");
      setItemImeiSerial("");
      return;
    }
    
    if (!isGpsValid) {
      setShowLocationModal(true);
      return;
    }
    if (!selectedItemId) return;

    setSubmitting(true);
    
    try {
      const saleId = await recordSale({
        store_id: store.id,
        item_id: selectedItemId,
        item_name: selectedItem?.item_name || 'Unknown Item',
        unit_price: selectedItem?.unit_price || 0,
        quantity: Number(quantity),
        total_amount: totalAmount,
        payment_mode: paymentMode,
        mpesa_ref: paymentMode === PaymentMode.MPESA ? mpesaRef : undefined,
        customer_phone: paymentMode === PaymentMode.MADENI ? customerPhone : undefined,
        customer_name: customerName || undefined, 
        collected_by: collectedBy || 'Self',
        agent_name: collectedBy || 'Self',
        gps_latitude: geoState.lat!,
        gps_longitude: geoState.lng!,
        gps_accuracy: geoState.accuracy || 0,
      });

      // Create warranty record if IMEI/Serial is provided (Electronics & Phone Repair)
      if (itemImeiSerial && (bizConfig.businessType === 'Electronics' || bizConfig.businessType === 'Phone Repair')) {
        const warrantyDays = selectedItem?.warranty_days || 365; // Default 1 year
        await createSerializedItem(
          store.id,
          saleId,
          selectedItem?.item_name || 'Unknown Item',
          itemImeiSerial,
          warrantyDays,
          customerPhone || undefined,
          customerName || undefined,
          `Sold by: ${collectedBy || 'Self'}`
        );
      }

      // BREAKING BULK: If this is a unit item (has parent_item_id), deduct from unit stock
      if (selectedItem?.parent_item_id) {
        const deductSuccess = await deductBreakoutUnits(
          selectedItemId,
          Number(quantity)
        );
        if (!deductSuccess) {
          console.warn('Warning: Failed to deduct breakout units, but sale was recorded');
        }
      }

      if (paymentMode === PaymentMode.MADENI) {
        setDebtCount(prev => prev + 1);
      }

      const verificationLink = `${window.location.origin}?verify=${saleId}`;

      setLastSaleData({
        id: saleId,
        item_name: selectedItem?.item_name || "Unknown Item",
        quantity: Number(quantity),
        unit_price: selectedItem?.unit_price || 0,
        total_amount: totalAmount,
        date: new Date(),
        collected_by: collectedBy || 'Self',
        payment_mode: paymentMode,
        mpesa_ref: paymentMode === PaymentMode.MPESA ? mpesaRef : undefined,
        customer_name: customerName || undefined,
        verificationLink,
      });

      setShowReceipt(true);
      fetchInventory(store.id).then(setInventory);
      // Refresh agents to update staff points
      fetchAgents(store.id).then(setAllAgents);
    } catch (error) {
      console.error(error);
      alert("Failed to save sale. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // In demo mode - expenses also count towards the 1 entry limit
    if (isDemoMode) {
      if (demoEntryUsed) {
        setDemoLockType('save');
        setShowDemoLockModal(true);
        return;
      }
      
      setSubmitting(true);
      setTimeout(() => {
        alert(`✅ Expense Recorded: KES ${expenseAmount} for ${expenseReason}\n\n(Demo - register for 7-day free trial to save unlimited entries)`);
        setExpenseAmount("");
        setExpenseDescription("");
        setExpenseReason("Transport");
        setSubmitting(false);
        setDemoEntryUsed(true); // Mark demo entry as used
      }, 500);
      return;
    }
    
    setSubmitting(true);
    try {
      // Map expenseReason to ExpenseCategory
      const categoryMap: Record<string, string> = {
        'Transport': 'TRANSPORT',
        'Food': 'FOOD',
        'Airtime': 'AIRTIME',
        'Utilities': 'UTILITIES',
        'Rent': 'RENT',
        'Supplies': 'SUPPLIES',
        'Maintenance': 'MAINTENANCE',
        'Other': 'OTHER'
      };
      await recordExpense({
        store_id: store.id,
        amount: parseInt(expenseAmount),
        reason: expenseReason,
        expense_category: (categoryMap[expenseReason] || 'OTHER') as any,
        description: expenseDescription,
        recorded_by: collectedBy || 'Staff'
      });
      alert(`Expense Recorded: KES ${expenseAmount} for ${expenseReason}`);
      // Reset form
      setExpenseAmount("");
      setExpenseDescription("");
      setExpenseReason("Transport");
    } catch (e) {
      alert("Error recording expense.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewSale = () => {
    setQuantity(1);
    setMpesaRef("");
    setCustomerPhone("");
    setCustomerName("");
    setItemImeiSerial("");
    setSelectedItemId("");
    setShowReceipt(false);
    setLastSaleData(null);
  };
  
  const handleUndoSale = async () => {
    if (!lastSaleData) return;
    if (window.confirm("Are you sure you want to void this transaction? Stock will be restored.")) {
       setSubmitting(true);
       await deleteSale(lastSaleData.id);
       if (lastSaleData.payment_mode === PaymentMode.MADENI) {
          setDebtCount(prev => Math.max(0, prev - 1));
       }
       setSubmitting(false);
       alert("Transaction Voided Successfully.");
       handleNewSale();
       fetchInventory(store.id).then(setInventory);
    }
  };

  const handleShareWhatsApp = () => {
    if (!lastSaleData) return;
    
    const text = `🧾 *${store.name}*\n` +
      `📦 *Item:* ${lastSaleData.item_name}\n` +
      `🔢 *Qty:* ${lastSaleData.quantity} x ${lastSaleData.unit_price}\n` +
      `💰 *TOTAL:* KES ${lastSaleData.total_amount.toLocaleString()}\n` +
      `👤 *${bizConfig.agentLabel}:* ${lastSaleData.collected_by}\n` +
      (lastSaleData.customer_name ? `🧍 *Customer:* ${lastSaleData.customer_name}\n` : '') +
      (lastSaleData.mpesa_ref ? `📱 *Ref:* ${lastSaleData.mpesa_ref}\n` : '') +
      `\n🔐 *Verify:* ${lastSaleData.verificationLink}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handlePrintReceipt = () => {
    if (!lastSaleData) return;

    const receiptContent = `
      <html>
        <head>
          <title>Receipt - ${store.name}</title>
          <style>
            body { font-family: 'Courier New', monospace; font-size: 12px; width: 280px; margin: 0 auto; padding: 10px; background: #fff; color: #000; }
            .header { text-align: center; margin-bottom: 15px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
            .store-name { font-size: 16px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
            .meta { font-size: 10px; color: #333; margin-bottom: 2px; }
            .item-row { display: flex; justify-content: space-between; margin-bottom: 5px; align-items: flex-start; }
            .item-name { flex: 1; margin-right: 10px; }
            .total-row { display: flex; justify-content: space-between; font-weight: bold; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 5px 0; margin: 10px 0; font-size: 14px; }
            .details { font-size: 10px; margin-bottom: 10px; }
            .footer { text-align: center; margin-top: 20px; font-size: 10px; }
            .qr { text-align: center; margin-top: 15px; }
            img { max-width: 80px; height: auto; }
            @media print {
              @page { margin: 0; }
              body { margin: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="store-name">${store.name}</div>
            <div class="meta">${store.location}</div>
            <div class="meta">${lastSaleData.date.toLocaleString()}</div>
            <div class="meta">Ref: #${lastSaleData.id.slice(0, 8).toUpperCase()}</div>
          </div>

          <div class="item-row">
            <span class="item-name">${lastSaleData.item_name}</span>
          </div>
          <div class="item-row">
            <span class="meta">${lastSaleData.quantity} x ${lastSaleData.unit_price}</span>
            <span style="font-weight: bold;">${lastSaleData.total_amount.toLocaleString()}</span>
          </div>

          <div class="total-row">
            <span>TOTAL</span>
            <span>KES ${lastSaleData.total_amount.toLocaleString()}</span>
          </div>

          <div class="details">
            <div><strong>Payment:</strong> ${lastSaleData.payment_mode}</div>
            ${lastSaleData.mpesa_ref ? `<div><strong>M-Pesa Ref:</strong> ${lastSaleData.mpesa_ref}</div>` : ''}
            ${bizConfig.showAgent ? `<div><strong>${bizConfig.agentLabel}:</strong> ${lastSaleData.collected_by}</div>` : ''}
            ${lastSaleData.customer_name ? `<div><strong>Customer:</strong> ${lastSaleData.customer_name}</div>` : ''}
          </div>

          <div class="qr">
             <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(lastSaleData.verificationLink)}" />
             <div style="font-size: 9px; margin-top: 5px;">Scan to Verify</div>
          </div>

          <div class="footer">
            Thank you for building with us!<br/>
            <strong>${store.name}</strong>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.write(receiptContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 800);
    }
  };

  const handleCopyLink = () => {
    if (!lastSaleData) return;
    navigator.clipboard.writeText(lastSaleData.verificationLink);
    alert("Verification Link Copied!");
  };

  const handleOpenHistory = async () => {
    setLoadingHistory(true);
    setShowHistory(true);
    try {
      if (isDemoMode) {
        // Use local demo sales
        setHistorySales(demoSales as SalesRecord[]);
      } else {
        const data = await fetchRecentSales(store.id);
        setHistorySales(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Staff Add Item Handler
  const handleStaffAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemPrice) return;

    if (isDemoMode) {
      setDemoLockType('save');
      setShowDemoLockModal(true);
      return;
    }

    setAddingItem(true);
    try {
      await addNewInventoryItem({
        store_id: store.id,
        item_name: newItemName,
        unit_price: parseInt(newItemPrice),
        buying_price: Math.round(parseInt(newItemPrice) * 0.7), // Estimate 30% margin
        current_stock: parseInt(newItemStock) || 0,
        low_stock_threshold: 10,
        barcode: newItemBarcode || undefined,
        batch_number: newItemBatchNumber || undefined,
        expiry_date: newItemExpiry || undefined,
        imei_serial: newItemImei || undefined,
        parent_unit_qty: newItemParentUnitQty ? parseInt(String(newItemParentUnitQty)) : undefined
      });

      // Reload inventory
      const updatedInventory = await fetchInventory(store.id);
      setInventory(updatedInventory);

      // Show success & reset
      setItemAddedSuccess(true);
      setNewItemName('');
      setNewItemPrice('');
      setNewItemStock('');
      setNewItemBarcode('');
      
      setTimeout(() => {
        setItemAddedSuccess(false);
        setShowAddItem(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to add item:', err);
      alert('Failed to add item');
    } finally {
      setAddingItem(false);
    }
  };

  // Handle barcode scan - SMART LOGIC:
  // 1. Check if barcode exists in THIS STORE's inventory → auto-select for sale
  // 2. If not found → open "Add New Item" form with barcode pre-filled
  const handleBarcodeScan = (barcode: string, catalogItem?: any) => {
    setShowScanner(false);
    
    // First: Check if barcode exists in store's current inventory
    const existingItem = inventory.find(item => item.barcode === barcode);
    
    if (existingItem) {
      // FOUND in store inventory! Auto-select this item for sale
      setSelectedItemId(existingItem.id);
      setScanFeedback({
        type: 'found',
        message: `✓ Found: ${existingItem.item_name} (Stock: ${existingItem.current_stock})`
      });
      // Clear feedback after 3 seconds
      setTimeout(() => setScanFeedback({type: null, message: ''}), 3000);
    } else {
      // NOT FOUND - Open Add Item form with barcode pre-filled
      setNewItemBarcode(barcode);
      
      // If catalog has a suggestion, pre-fill those values (optional helper)
      if (catalogItem) {
        setNewItemName(catalogItem.item_name);
        setNewItemPrice(catalogItem.unit_price.toString());
        setNewItemStock('0'); // Staff should enter actual stock they have
      } else {
        // Clear form for manual entry
        setNewItemName('');
        setNewItemPrice('');
        setNewItemStock('');
      }
      
      setScanFeedback({
        type: 'new',
        message: `New barcode: ${barcode} - Add this item to your store`
      });
      setShowAddItem(true);
    }
  };

  // --- VIEW: DEBTORS LIST ---
  if (showDebtorsList) {
    return <DebtorsList store={store} onClose={() => {
      setShowDebtorsList(false);
      fetchDebtors(store.id).then(d => setDebtCount(d.length));
    }} />;
  }

  // --- VIEW: HISTORY LIST ---
  if (showHistory) {
    const today = new Date().toDateString();
    const todaysSales = historySales.filter(s => new Date(s.created_at || '').toDateString() === today);
    const todayTotal = todaysSales.reduce((sum, s) => sum + s.total_amount, 0);

    return (
      <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col animate-in slide-in-from-right duration-300">
         <div className={`${theme.bg} text-white p-4 shadow-lg sticky top-0 z-10 flex items-center justify-between`}>
            <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-white/10 rounded-full transition">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="text-center">
              <h2 className="font-bold text-lg">Sales History</h2>
              <p className="text-xs opacity-80">Read-Only View</p>
            </div>
            <div className="w-10"></div>
         </div>
         
         <div className="flex-1 overflow-y-auto p-4 max-w-lg mx-auto w-full space-y-4">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 text-slate-500 mb-2">
                   <Calendar className="w-4 h-4" />
                   <span className="text-xs font-bold uppercase tracking-wider">Today's Sales</span>
                </div>
                <div className="text-3xl font-bold text-slate-900">KES {todayTotal.toLocaleString()}</div>
                <div className="text-xs text-slate-400 mt-1">{todaysSales.length} transactions today</div>
            </div>

            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider ml-1">Recent Transactions</h3>
            <div className="space-y-3 pb-8">
               {loadingHistory ? (
                   <div className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400"/></div>
               ) : historySales.length === 0 ? (
                   <div className="text-center py-10 text-slate-400">No recent sales found.</div>
               ) : (
                   historySales.map(sale => (
                       <div key={sale.id} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center">
                           <div className="flex-1">
                               <div className="font-bold text-slate-800">{sale.item_name}</div>
                               <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                                   <span className="flex items-center gap-1">
                                     <Clock className="w-3 h-3" />
                                     {new Date(sale.created_at || '').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                   </span>
                                   <span>•</span>
                                   <span className="flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      {sale.collected_by}
                                   </span>
                               </div>
                           </div>
                           <div className="text-right pl-3">
                               <div className="font-bold text-slate-900">KES {sale.total_amount.toLocaleString()}</div>
                               <div className={`text-[10px] px-2 py-0.5 rounded-full inline-block font-bold mt-1 ${
                                   sale.payment_mode === PaymentMode.MPESA ? 'bg-green-100 text-green-700' :
                                   sale.payment_mode === PaymentMode.MADENI ? 'bg-amber-100 text-amber-700' :
                                   'bg-slate-100 text-slate-600'
                               }`}>
                                   {sale.payment_mode}
                               </div>
                           </div>
                       </div>
                   ))
               )}
            </div>
         </div>
      </div>
    );
  }

  // --- VIEW: RECEIPT CARD ---
  if (showReceipt && lastSaleData) {
    return (
      <div className="w-full max-w-lg mx-auto bg-white shadow-2xl rounded-xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className={`p-6 text-white text-center ${theme.bg}`}>
          <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold">Sale Successful!</h2>
          <p className="opacity-90">{store.name}</p>
        </div>

        <div className="p-6">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 relative">
            <div className="text-center border-b border-dashed border-slate-300 pb-4 mb-4">
              <h3 className="text-lg font-bold text-slate-900 uppercase tracking-widest">{store.name}</h3>
              <p className="text-xs text-slate-500">{lastSaleData.date.toLocaleString()}</p>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Item</span>
                <span className="font-medium text-slate-900">{lastSaleData.item_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">{bizConfig.quantityLabel}</span>
                <span className="font-medium text-slate-900">{lastSaleData.quantity} @ {lastSaleData.unit_price}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Payment</span>
                <span className="font-medium text-slate-900">{lastSaleData.payment_mode}</span>
              </div>
              {bizConfig.showAgent && (
                <div className="flex justify-between">
                  <span className="text-slate-600">{bizConfig.agentLabel}</span>
                  <span className="font-medium text-slate-900">{lastSaleData.collected_by}</span>
                </div>
              )}
              <div className="flex justify-between pt-3 border-t border-slate-300">
                <span className="font-bold text-slate-900 text-lg">TOTAL</span>
                <span className="font-bold text-slate-900 text-lg">KES {lastSaleData.total_amount.toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-6 flex flex-col items-center justify-center pt-4 border-t border-dashed border-slate-300">
               <div className="bg-white p-2 rounded shadow-sm border border-slate-200 mb-2">
                 <img 
                   src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(lastSaleData.verificationLink)}" />`}
                   alt="Verification QR Code"
                   className="w-24 h-24"
                 />
               </div>
               <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Scan to Verify Genuine</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
             <button onClick={handlePrintReceipt} className="w-full py-2.5 px-4 bg-slate-800 text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-slate-700 transition-all active:scale-95 shadow-lg">
              <Printer className="w-5 h-5" />
              Print Receipt
            </button>
            <button onClick={handleShareWhatsApp} className="w-full py-3 px-4 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-100 transition-all active:scale-95">
              <Share2 className="w-5 h-5" />
              WhatsApp Receipt
            </button>
            <button onClick={handleCopyLink} className="w-full py-2.5 px-4 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-slate-50 transition-all">
              <Copy className="w-4 h-4" />
              Copy Verification Link
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleUndoSale} className="py-3 px-4 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all active:scale-95">
                <RotateCcw className="w-4 h-4" />
                Void
              </button>
              <button onClick={handleNewSale} className={`py-3 px-4 ${theme.bg} ${theme.hover} text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all active:scale-95`}>
                <Plus className="w-5 h-5" />
                New Sale
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW: FORM ---
  return (
    <div className="w-full max-w-lg mx-auto bg-white shadow-xl rounded-xl overflow-hidden border border-gray-100 relative">
      
      {showLocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm relative animate-in zoom-in-95 duration-200">
              <button 
                onClick={() => setShowLocationModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 bg-slate-100 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-col items-center text-center">
                <div className="bg-blue-50 p-4 rounded-full mb-4 animate-bounce">
                  <MapPin className="w-8 h-8 text-blue-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Let's Find Your Store</h3>
                <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                  We need to tag the location for this receipt. It helps keep your sales records perfect! Please turn on location to continue.
                </p>

                <div className="space-y-3 w-full">
                  <button 
                    onClick={retryGps}
                    className={`w-full py-3 ${theme.bg} ${theme.hover} text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Enable Location
                  </button>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* HEADER SECTION WITH TABS */}
      <div className={`${entryMode === 'SALE' ? theme.bg : 'bg-slate-800'} text-white relative transition-colors duration-300`}>
        <div className="p-4 pb-0 relative z-10">
           <div className="flex justify-between items-start mb-4">
             <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-white opacity-80" />
                  {store.name}
                </h2>
                <p className="text-white text-sm mt-1 opacity-75">{bizConfig.label}</p>
             </div>
             <div className="text-right">
                <div className="text-lg font-mono font-semibold text-white/90">
                 {currentDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
               </div>
             </div>
           </div>

           {/* Tabs */}
           <div className="flex gap-2 mt-4">
              <button 
                onClick={() => setEntryMode('SALE')}
                className={`flex-1 py-3 px-4 rounded-t-lg font-bold text-sm flex items-center justify-center gap-2 transition ${entryMode === 'SALE' ? 'bg-white text-slate-900' : 'bg-black/20 text-white/60 hover:bg-black/30'}`}
              >
                <ArrowDownRight className="w-4 h-4" />
                Record Sale
              </button>
              <button 
                onClick={() => setEntryMode('EXPENSE')}
                className={`flex-1 py-3 px-4 rounded-t-lg font-bold text-sm flex items-center justify-center gap-2 transition ${entryMode === 'EXPENSE' ? 'bg-white text-slate-900' : 'bg-black/20 text-white/60 hover:bg-black/30'}`}
              >
                <ArrowUpRight className="w-4 h-4" />
                Add Expense
              </button>
           </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Only show Quick Actions in Sale Mode */}
        {entryMode === 'SALE' && (
           <div className="grid grid-cols-2 gap-3">
               <button 
                 type="button"
                 onClick={() => setShowDebtorsList(true)}
                 className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-200 py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all transform hover:scale-[1.02] active:scale-95 relative overflow-hidden"
               >
                 <div className="flex items-center gap-2">
                    <AlertOctagon className="w-5 h-5 text-white" />
                    <span className="font-bold text-lg uppercase tracking-tight">Debtors</span>
                 </div>
                 <span className="text-red-100 text-[10px] font-medium">View Unpaid</span>
                 {debtCount > 0 && (
                   <div className="absolute top-2 right-2 bg-white text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px]">
                     {debtCount}
                   </div>
                 )}
               </button>

               <button 
                 type="button"
                 onClick={handleOpenHistory}
                 className={`bg-slate-800 hover:bg-slate-700 text-white shadow-lg py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all transform hover:scale-[1.02] active:scale-95`}
               >
                 <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-white" />
                    <span className="font-bold text-lg uppercase tracking-tight">History</span>
                 </div>
                 <span className="text-slate-300 text-[10px] font-medium">Recent Sales</span>
               </button>
           </div>
        )}

        {/* GPS Indicator (Always Visible) */}
        <button 
          type="button"
          onClick={geoState.error ? () => setShowLocationModal(true) : undefined}
          disabled={!geoState.error}
          className={`w-full text-xs px-4 py-3 rounded-lg flex items-center justify-between border transition-all ${
            geoState.error 
              ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100 active:scale-95 shadow-sm cursor-pointer' 
              : geoState.loading 
                ? 'bg-amber-50 border-amber-100 text-amber-700 cursor-wait' 
                : 'bg-green-50 border-green-100 text-green-700 cursor-default'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-full ${geoState.error ? 'bg-red-100' : geoState.loading ? 'bg-amber-100' : 'bg-green-100'}`}>
              <MapPin className={`w-4 h-4 ${geoState.error ? 'animate-pulse' : ''}`} />
            </div>
            <div className="text-left">
               <div className="font-bold text-sm">
                 {geoState.error ? "Enable Location" : 
                  geoState.loading ? "Acquiring Satellite Lock..." : 
                  "Location Verified"}
               </div>
               <div className="font-medium opacity-80">
                 {geoState.error ? "Tap to Fix GPS Issues" : 
                  geoState.loading ? "Please wait..." : 
                  `Accuracy: ±${Math.round(geoState.accuracy || 0)}m`}
               </div>
            </div>
          </div>
          {geoState.loading && <Loader2 className="w-4 h-4 animate-spin text-amber-600" />}
          {geoState.error && <RefreshCw className="w-4 h-4 text-red-600" />}
          {!geoState.error && !geoState.loading && <CheckCircle2 className="w-5 h-5 text-green-600" />}
        </button>

        {/* --- EXPENSE FORM --- */}
        {entryMode === 'EXPENSE' ? (
          <form onSubmit={handleExpenseSubmit} className="space-y-5 animate-in fade-in slide-in-from-left-2 duration-300">
             <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
               <span className="font-bold block mb-1">Record Money Out (Matumizi)</span>
               Use this when you take cash from the drawer for Lunch, Transport, KPLC Tokens, etc.
             </div>

             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Amount Taken (KES)</label>
               <input
                 type="number"
                 required
                 autoFocus
                 className="w-full text-2xl font-bold px-3 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                 placeholder="0"
                 value={expenseAmount}
                 onChange={(e) => setExpenseAmount(e.target.value)}
               />
             </div>

             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
               <div className="grid grid-cols-2 gap-2">
                 {['Transport', 'Lunch/Food', 'KPLC Tokens', 'Airtime', 'Wages', 'Other'].map(r => (
                   <button
                     type="button"
                     key={r}
                     onClick={() => setExpenseReason(r)}
                     className={`py-2 px-3 text-sm rounded-lg border text-left transition ${expenseReason === r ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                   >
                     {r}
                   </button>
                 ))}
               </div>
             </div>

             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
               <input
                 type="text"
                 className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                 placeholder="e.g. Boda to town"
                 value={expenseDescription}
                 onChange={(e) => setExpenseDescription(e.target.value)}
               />
             </div>

              {/* Dynamic Agent Field - Reused for Expense to know who took the money */}
              {bizConfig.showAgent && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Taken By ({bizConfig.agentLabel})</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium placeholder-slate-400 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      placeholder={`Name of person`}
                      value={collectedBy}
                      onChange={(e) => setCollectedBy(e.target.value)}
                    />
                  </div>
                </div>
             )}

             <button
              type="submit"
              disabled={submitting || !expenseAmount}
              className={`w-full py-3.5 px-4 rounded-lg flex items-center justify-center gap-2 font-semibold text-lg transition-all shadow-lg ${
                submitting || !expenseAmount
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                  : `bg-slate-800 hover:bg-slate-900 text-white shadow-slate-200 active:scale-95`
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Record Expense
                </>
              )}
            </button>
          </form>
        ) : (
          /* --- SALE FORM --- */
          <form onSubmit={handleSaleSubmit} className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-300">
             {/* Dynamic Agent Field with Points Display */}
             {bizConfig.showAgent && (
               <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-slate-700">{bizConfig.agentLabel}</label>
                    {staffPoints && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold">⭐ {staffPoints.points} pts</span>
                        <span className="text-slate-500">#{staffPoints.rank} of {staffPoints.total}</span>
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                    {allAgents.length > 0 ? (
                      <select
                        required
                        className={`w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:ring-2 ${theme.ring} focus:outline-none transition-all appearance-none`}
                        value={collectedBy}
                        onChange={(e) => setCollectedBy(e.target.value)}
                      >
                        <option value="">Select {bizConfig.agentLabel}</option>
                        {allAgents.filter(a => a.is_active !== false).map(agent => (
                          <option key={agent.id} value={agent.name}>
                            {agent.name} ({agent.total_points} pts)
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        required
                        className={`w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium placeholder-slate-400 focus:ring-2 ${theme.ring} focus:outline-none transition-all`}
                        placeholder={`Enter ${bizConfig.agentLabel}`}
                        value={collectedBy}
                        onChange={(e) => setCollectedBy(e.target.value)}
                      />
                    )}
                  </div>
                  {allAgents.length === 0 && (
                    <p className="text-xs text-slate-400 mt-1">Ask owner to add staff in dashboard</p>
                  )}
                </div>
             )}

            {/* Item Select with Scan Option */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-slate-700">Select Item</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className="text-xs flex items-center gap-1 text-purple-600 hover:underline font-medium"
                  >
                    <ScanLine className="w-3 h-3" />
                    Scan
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddItem(true)}
                    className={`text-xs flex items-center gap-1 ${theme.text} hover:underline font-medium`}
                  >
                    <Plus className="w-3 h-3" />
                    Add New
                  </button>
                </div>
              </div>
              
              {/* Scan Feedback */}
              {scanFeedback.type && (
                <div className={`mb-2 p-2 rounded-lg text-sm flex items-center gap-2 animate-in fade-in ${
                  scanFeedback.type === 'found' 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {scanFeedback.type === 'found' ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Package className="w-4 h-4" />
                  )}
                  {scanFeedback.message}
                </div>
              )}
              
              <select
                required
                className={`w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium focus:ring-2 ${theme.ring} focus:outline-none appearance-none`}
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                disabled={loadingInventory}
              >
                <option value="">-- Choose Item or Scan Barcode --</option>
                {inventory.map((item) => (
                  <option key={item.id} value={item.id} className="text-slate-900">
                    {item.item_name} (Stock: {item.current_stock})
                  </option>
                ))}
              </select>

              {/* ⭐ FEFO WARNING - Expiry Alert for Agro-Vets & Chemists ⭐ */}
              {selectedItem && getExpiryWarning() && (
                <div className={`p-3 rounded-lg border flex items-start gap-3 ${getExpiryWarning()?.color}`}>
                  <div className="flex-shrink-0 mt-0.5">
                    {getExpiryWarning()?.status === 'expired' ? (
                      <AlertOctagon className="w-5 h-5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm mb-1">{getExpiryWarning()?.message}</div>
                    {getExpiryWarning()?.status === 'expired' && (
                      <div className="text-xs opacity-90">Stock this item and file a damage report immediately.</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{bizConfig.quantityLabel}</label>
                <input
                  type="number"
                  min="1"
                  required
                  className={`w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:ring-2 ${theme.ring} focus:outline-none`}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div className={`bg-slate-50 rounded-lg p-2 flex flex-col justify-center items-end px-4 border ${theme.border}`}>
                <span className={`text-xs ${theme.text} font-semibold uppercase tracking-wider`}>Total (KES)</span>
                <span className="text-xl font-bold text-slate-900">
                  {totalAmount.toLocaleString()}
                </span>
                {/* Profit Display - Only visible to store owner users viewing as staff */}
                {profitAmount > 0 && selectedItem?.buying_price && selectedItem.buying_price > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingDown className="w-3 h-3 text-green-600" />
                    <span className="text-xs text-green-600 font-medium">
                      +KES {profitAmount.toLocaleString()} profit ({profitMargin.toFixed(0)}%)
                    </span>
                  </div>
                )}
              </div>
            </div>

             {/* Customer Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Customer Name {paymentMode !== PaymentMode.MADENI && <span className="text-slate-400 font-normal">(Optional)</span>}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required={paymentMode === PaymentMode.MADENI}
                  placeholder="e.g. Mama Boi"
                  className={`w-full pl-10 pr-3 py-2.5 border rounded-lg font-medium focus:ring-2 focus:outline-none transition-all ${
                    paymentMode === PaymentMode.MADENI 
                      ? 'bg-amber-50 border-amber-200 text-amber-900 placeholder-amber-400 focus:ring-amber-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-blue-500'
                  }`}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
            </div>

            {/* IMEI / Serial Number - For Electronics & Phone Repair */}
            {selectedItem && (bizConfig.businessType === 'Electronics' || bizConfig.businessType === 'Phone Repair') && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  IMEI / Serial Number <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 354563654563654 or SN123456"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={itemImeiSerial}
                  onChange={(e) => setItemImeiSerial(e.target.value.toUpperCase())}
                />
                <p className="text-xs text-slate-500 mt-1">Tracked for warranty validation &amp; anti-fraud</p>
              </div>
            )}

            {/* Payment Mode */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Payment Mode</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: PaymentMode.CASH, label: 'Cash', icon: Banknote },
                  { id: PaymentMode.MPESA, label: 'M-Pesa', icon: Smartphone },
                  { id: PaymentMode.MADENI, label: 'Madeni', icon: CreditCard },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setPaymentMode(mode.id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                      paymentMode === mode.id
                        ? `${theme.bg} text-white ${theme.border} shadow-md transform scale-105`
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <mode.icon className="w-5 h-5 mb-1" />
                    <span className="text-xs font-medium">{mode.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {paymentMode === PaymentMode.MPESA && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-medium text-green-700 mb-1">M-Pesa Reference Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. QWE123SDF"
                  className="w-full px-3 py-2.5 bg-green-50 border border-green-200 text-green-900 font-bold placeholder-green-400 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none uppercase"
                  value={mpesaRef}
                  onChange={(e) => setMpesaRef(e.target.value.toUpperCase())}
                />
              </div>
            )}

            {paymentMode === PaymentMode.MADENI && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-medium text-amber-700 mb-1">Customer Phone (For Follow-up)</label>
                <input
                  type="tel"
                  required
                  placeholder="07..."
                  className="w-full px-3 py-2.5 bg-amber-50 border border-amber-200 text-amber-900 font-medium placeholder-amber-400 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={!isGpsValid || submitting || loadingInventory}
              className={`w-full py-3.5 px-4 rounded-lg flex items-center justify-center gap-2 font-semibold text-lg transition-all shadow-lg ${
                !isGpsValid || submitting
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                  : `${theme.bg} ${theme.hover} text-white shadow-blue-200 active:scale-95`
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Record Sale
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Staff Add Item Modal */}
      {showAddItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 overflow-hidden">
            {/* Header */}
            <div className={`${theme.bg} text-white p-4 flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <Package className="w-6 h-6" />
                <div>
                  <h2 className="font-bold text-lg">Add New Item</h2>
                  <p className="text-xs opacity-80">Quick add for staff</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddItem(false)}
                className="p-2 hover:bg-white/20 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {itemAddedSuccess ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Item Added!</h3>
                <p className="text-slate-500">The item is now available in the dropdown</p>
              </div>
            ) : (
              <form onSubmit={handleStaffAddItem} className="p-6 space-y-4">
                {/* Barcode Scanner Button */}
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="w-full flex items-center justify-center gap-2 bg-purple-100 hover:bg-purple-200 text-purple-700 py-3 rounded-xl font-medium transition"
                >
                  <ScanLine className="w-5 h-5" />
                  Scan Barcode (Optional)
                </button>

                {newItemBarcode && (
                  <div className="bg-slate-100 p-2 rounded-lg text-center">
                    <span className="text-xs text-slate-500">Barcode:</span>
                    <span className="ml-2 font-mono text-slate-700">{newItemBarcode}</span>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Item Name *</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Cement Bamburi 50kg"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:outline-none"
                    value={newItemName}
                    onChange={e => setNewItemName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Selling Price *</label>
                    <input 
                      type="number"
                      required
                      placeholder="e.g. 750"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:outline-none"
                      value={newItemPrice}
                      onChange={e => setNewItemPrice(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Initial Stock</label>
                    <input 
                      type="number"
                      placeholder="e.g. 50"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:outline-none"
                      value={newItemStock}
                      onChange={e => setNewItemStock(e.target.value)}
                    />
                  </div>
                </div>

                {/* Niche-specific fields */}
                {store.business_type === 'CHEMIST' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Batch Number</label>
                      <input
                        type="text"
                        placeholder="e.g. BATCH-A23"
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:outline-none"
                        value={newItemBatchNumber}
                        onChange={e => setNewItemBatchNumber(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Expiry Date</label>
                      <input
                        type="date"
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:outline-none"
                        value={newItemExpiry}
                        onChange={e => setNewItemExpiry(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {store.business_type === 'HARDWARE' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">IMEI / Serial (optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. 356789012345678"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:outline-none"
                      value={newItemImei}
                      onChange={e => setNewItemImei(e.target.value)}
                    />
                  </div>
                )}

                {store.business_type === 'WINES' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Parent Unit Quantity (e.g. bottles per case)</label>
                    <input
                      type="number"
                      placeholder="e.g. 6"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:outline-none"
                      value={newItemParentUnitQty}
                      onChange={e => setNewItemParentUnitQty(e.target.value)}
                    />
                  </div>
                )}

                <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg">
                  💡 Tip: The owner can update the buying price and other details later from the dashboard.
                </p>

                <button 
                  type="submit"
                  disabled={addingItem || !newItemName || !newItemPrice}
                  className={`w-full ${theme.bg} ${theme.hover} disabled:bg-slate-300 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2`}
                >
                  {addingItem ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Add Item
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Barcode Scanner for Staff Add */}
      {showScanner && (
        <BarcodeScanner
          onDetected={handleBarcodeScan}
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

      {/* Offline Indicator */}
      {!isDemoMode && <OfflineIndicator />}
    </div>
  );
};
