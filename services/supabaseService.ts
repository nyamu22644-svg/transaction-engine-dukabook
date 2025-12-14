
import {
  SalesRecord,
  InventoryItem,
  StoreProfile,
  PaymentMode,
  Agent,
  AuditLog,
  ExpenseRecord,
  Customer,
  Supplier,
  SupplierInvoice,
  PurchaseOrder,
  PurchaseOrderItem,
  GoodsReceivedNote,
  GRNItem,
  StockAdjustment,
  DailySummary,
  MonthlySummary,
  TaxRecord,
  ShrinkageDebt,
  InventoryBatch,
} from '../types';
import { MOCK_INVENTORY, MOCK_STORES } from '../constants';
import { supabase, isSupabaseEnabled } from './supabaseClient';
import { getTemplatesByBusinessType, ItemTemplate } from '../data/itemTemplates';
import { utcToZonedTime } from 'date-fns-tz';
import { startOfDay, startOfMonth, differenceInCalendarDays } from 'date-fns';

// Keep it simple: Supabase first, fall back to localStorage when offline/disabled
const STORAGE_KEYS = {
  INVENTORY: 'dukabook_inventory_v2',
  SALES: 'dukabook_sales_v2',
  STORES: 'dukabook_stores_v1',
  AGENTS: 'dukabook_agents_v1',
  LOGS: 'dukabook_logs_v1',
  EXPENSES: 'dukabook_expenses_v1',
  SUPPLIERS: 'dukabook_suppliers_v1',
  CUSTOMERS: 'dukabook_customers_v1',
  SUPPLIER_INVOICES: 'dukabook_supplier_invoices_v1',
  DEBTORS: 'dukabook_debtors_v1'
};

// -----------------------------------------------------------------------------
// Local helpers (offline fallback)
// -----------------------------------------------------------------------------
const getLocal = <T>(key: string, fallback: T): T => {
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : fallback;
};
const setLocal = (key: string, value: any) => localStorage.setItem(key, JSON.stringify(value));

const getLocalInventory = (): InventoryItem[] => getLocal(STORAGE_KEYS.INVENTORY, MOCK_INVENTORY);
const saveLocalInventory = (inv: InventoryItem[]) => setLocal(STORAGE_KEYS.INVENTORY, inv);

const getLocalSales = (): SalesRecord[] => getLocal(STORAGE_KEYS.SALES, []);
const saveLocalSales = (sales: SalesRecord[]) => setLocal(STORAGE_KEYS.SALES, sales);

const getLocalAgents = (): Agent[] => getLocal(STORAGE_KEYS.AGENTS, []);
const saveLocalAgents = (agents: Agent[]) => setLocal(STORAGE_KEYS.AGENTS, agents);

const getLocalLogs = (): AuditLog[] => getLocal(STORAGE_KEYS.LOGS, []);
const saveLocalLogs = (logs: AuditLog[]) => setLocal(STORAGE_KEYS.LOGS, logs);

const getLocalExpenses = (): ExpenseRecord[] => getLocal(STORAGE_KEYS.EXPENSES, []);
const saveLocalExpenses = (expenses: ExpenseRecord[]) => setLocal(STORAGE_KEYS.EXPENSES, expenses);

const getLocalSuppliers = (): Supplier[] => getLocal(STORAGE_KEYS.SUPPLIERS, []);
const saveLocalSuppliers = (suppliers: Supplier[]) => setLocal(STORAGE_KEYS.SUPPLIERS, suppliers);

const getLocalCustomers = (): Customer[] => getLocal(STORAGE_KEYS.CUSTOMERS, []);
const saveLocalCustomers = (customers: Customer[]) => setLocal(STORAGE_KEYS.CUSTOMERS, customers);

const getLocalSupplierInvoices = (): SupplierInvoice[] => getLocal(STORAGE_KEYS.SUPPLIER_INVOICES, []);
const saveLocalSupplierInvoices = (invoices: SupplierInvoice[]) => setLocal(STORAGE_KEYS.SUPPLIER_INVOICES, invoices);

const getLocalDebtors = (): SalesRecord[] => getLocal(STORAGE_KEYS.DEBTORS, []);
const saveLocalDebtors = (debtors: SalesRecord[]) => setLocal(STORAGE_KEYS.DEBTORS, debtors);

// Check if we're online
const isOnline = (): boolean => navigator.onLine;

const getLocalStores = (): StoreProfile[] => {
  const stored = localStorage.getItem(STORAGE_KEYS.STORES);
  if (stored) return JSON.parse(stored);
  setLocal(STORAGE_KEYS.STORES, MOCK_STORES);
  return MOCK_STORES;
};
const saveLocalStores = (stores: StoreProfile[]) => setLocal(STORAGE_KEYS.STORES, stores);

const logLocalAction = (storeId: string, type: AuditLog['action_type'], desc: string) => {
  const logs = getLocalLogs();
  logs.unshift({
    id: Math.random().toString(36).slice(2, 10),
    store_id: storeId,
    action_type: type,
    description: desc,
    performed_by: 'Admin',
    timestamp: new Date().toISOString()
  });
  saveLocalLogs(logs);
};

// Helper: Supabase wrapper with fallback
const supa = async <T>(fn: () => Promise<T>, fallback: () => T | Promise<T>): Promise<T> => {
  if (isSupabaseEnabled && supabase) {
    try {
      return await fn();
    } catch (err) {
      console.warn('Supabase fallback due to error', err);
    }
  }
  return await fallback();
};

// -----------------------------------------------------------------------------
// STORE METHODS
// -----------------------------------------------------------------------------
export const fetchAllStores = async (): Promise<StoreProfile[]> => {
  return supa(async () => {
    const { data, error } = await supabase!.from('stores').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }, async () => getLocalStores());
};

export const createNewStore = async (storeData: Omit<StoreProfile, 'id'>): Promise<StoreProfile> => {
  return supa(async () => {
    const { data, error } = await supabase!.from('stores').insert(storeData).select('*').single();
    if (error) throw error;
    
    // Seed inventory with business-type templates
    const store = data as StoreProfile;
    await seedStoreInventory(store.id, store.business_type);
    
    return store;
  }, async () => {
    const newStore: StoreProfile = { ...storeData, id: `store_${Math.random().toString(36).slice(2, 8)}` };
    const stores = getLocalStores();
    stores.push(newStore);
    saveLocalStores(stores);
    
    // Seed inventory with business-type templates (local)
    const templates = getTemplatesByBusinessType(newStore.business_type);
    const inventory = getLocalInventory();
    templates.forEach(template => {
      inventory.push({
        id: Math.random().toString(36).slice(2, 10),
        store_id: newStore.id,
        item_name: template.item_name,
        barcode: template.barcode,
        current_stock: template.current_stock,
        buying_price: template.buying_price,
        unit_price: template.unit_price,
        low_stock_threshold: template.low_stock_threshold,
        category: template.category
      });
    });
    saveLocalInventory(inventory);
    return newStore;
  });
};

// Seed store with template items based on business type
export const seedStoreInventory = async (storeId: string, businessType: StoreProfile['business_type']): Promise<void> => {
  const templates = getTemplatesByBusinessType(businessType);
  
  const inventoryItems = templates.map(template => ({
    store_id: storeId,
    item_name: template.item_name,
    barcode: template.barcode,
    current_stock: template.current_stock,
    buying_price: template.buying_price,
    unit_price: template.unit_price,
    low_stock_threshold: template.low_stock_threshold,
    category: template.category
  }));
  
  if (isSupabaseEnabled && supabase) {
    try {
      const { error } = await supabase.from('inventory').insert(inventoryItems);
      if (error) console.warn('Error seeding inventory:', error);
    } catch (err) {
      console.warn('Failed to seed inventory:', err);
    }
  }
};

export const getStoreById = async (id: string): Promise<StoreProfile | undefined> => {
  return supa(async () => {
    const { data, error } = await supabase!.from('stores').select('*').eq('id', id).single();
    if (error) throw error;
    return data as StoreProfile;
  }, async () => getLocalStores().find(s => s.id === id));
};

/**
 * Update a store's details
 */
export const updateStore = async (storeId: string, updates: Partial<StoreProfile>): Promise<boolean> => {
  if (!isSupabaseEnabled || !supabase) return false;
  
  try {
    const { error } = await supabase
      .from('stores')
      .update(updates)
      .eq('id', storeId);
    
    if (error) {
      console.error('Failed to update store:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Update store error:', error);
    return false;
  }
};

/**
 * Link an owner (by email) to a store
 * Updates both the users table (store_id) and stores table (owner_id)
 */
export const linkOwnerToStore = async (storeId: string, ownerEmail: string): Promise<boolean> => {
  if (!isSupabaseEnabled || !supabase) return false;
  
  try {
    // 1. Find the user by email
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', ownerEmail.toLowerCase())
      .single();
    
    if (userError || !userData) {
      console.error('User not found:', ownerEmail);
      return false;
    }
    
    // 2. Update the user's store_id
    const { error: updateUserError } = await supabase
      .from('users')
      .update({ store_id: storeId, role: 'STORE_OWNER' })
      .eq('id', userData.id);
    
    if (updateUserError) {
      console.error('Failed to update user:', updateUserError);
      return false;
    }
    
    // 3. Update the store's owner_id
    const { error: updateStoreError } = await supabase
      .from('stores')
      .update({ owner_id: userData.id })
      .eq('id', storeId);
    
    if (updateStoreError) {
      console.error('Failed to update store:', updateStoreError);
      return false;
    }
    
    console.log('Successfully linked', ownerEmail, 'to store', storeId);
    return true;
  } catch (error) {
    console.error('Link owner error:', error);
    return false;
  }
};

export const getStoreByAccessCode = async (code: string): Promise<StoreProfile | null> => {
  return supa(async () => {
    const { data, error } = await supabase!.from('stores').select('*').ilike('access_code', code).single();
    if (error) throw error;
    return (data as StoreProfile) || null;
  }, async () => {
    const stores = getLocalStores();
    return stores.find(s => s.access_code.toUpperCase() === code.toUpperCase()) || null;
  });
};

// -----------------------------------------------------------------------------
// INVENTORY METHODS
// -----------------------------------------------------------------------------
export const fetchInventory = async (storeId: string): Promise<InventoryItem[]> => {
  return supa(async () => {
    const { data, error } = await supabase!.from('inventory_items').select('*').eq('store_id', storeId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }, async () => {
    const items = getLocalInventory().filter(i => i.store_id === storeId);
    return items;
  });
};

export const addNewInventoryItem = async (item: Omit<InventoryItem, 'id'>): Promise<void> => {
  // Always save locally first for immediate use
  const newItem = { ...item, id: Math.random().toString(36).slice(2, 10) };
  const inventory = getLocalInventory();
  inventory.push(newItem);
  saveLocalInventory(inventory);
  logLocalAction(item.store_id, 'STOCK_UPDATE', `Added new item: ${item.item_name} (Qty: ${item.current_stock})`);
  
  // Try to sync to Supabase
  if (isSupabaseEnabled && isOnline() && supabase) {
    try {
      const { error } = await supabase.from('inventory_items').insert(item);
      if (error) throw error;
    } catch (err) {
      console.warn('Offline - item queued for sync');
      addToSyncQueue('ADD_ITEM', item);
    }
  } else if (!isOnline()) {
    addToSyncQueue('ADD_ITEM', item);
  }
};

// Bulk add inventory items
export const bulkAddInventoryItems = async (items: Omit<InventoryItem, 'id'>[]): Promise<void> => {
  if (items.length === 0) return;
  
  return supa(async () => {
    const { error } = await supabase!.from('inventory_items').insert(items);
    if (error) throw error;
  }, async () => {
    const inventory = getLocalInventory();
    items.forEach(item => {
      inventory.push({ ...item, id: Math.random().toString(36).slice(2, 10) });
    });
    saveLocalInventory(inventory);
    logLocalAction(items[0].store_id, 'STOCK_UPDATE', `Bulk added ${items.length} items`);
  });
};

// Copy inventory from one store to another
export const copyInventoryToStore = async (sourceStoreId: string, targetStoreId: string): Promise<number> => {
  const sourceInventory = await fetchInventory(sourceStoreId);
  
  if (sourceInventory.length === 0) return 0;
  
  const itemsToCopy = sourceInventory.map(item => ({
    store_id: targetStoreId,
    item_name: item.item_name,
    barcode: item.barcode,
    current_stock: item.current_stock,
    buying_price: item.buying_price,
    unit_price: item.unit_price,
    low_stock_threshold: item.low_stock_threshold,
    category: item.category
  }));
  
  await bulkAddInventoryItems(itemsToCopy);
  return itemsToCopy.length;
};

export const updateStockLevel = async (itemId: string, newStock: number): Promise<void> => {
  return supa(async () => {
    const { error } = await supabase!.from('inventory_items').update({ current_stock: newStock }).eq('id', itemId);
    if (error) throw error;
  }, async () => {
    const inventory = getLocalInventory();
    const item = inventory.find(i => i.id === itemId);
    if (item) {
      const oldStock = item.current_stock;
      item.current_stock = newStock;
      saveLocalInventory(inventory);
      logLocalAction(item.store_id, 'STOCK_UPDATE', `Adjusted ${item.item_name} from ${oldStock} to ${newStock}`);
    }
  });
};

// Stock adjustment (e.g., damage/loss)
export const recordStockAdjustment = async (adjustment: Omit<StockAdjustment, 'id' | 'created_at'>): Promise<void> => {
  return supa(async () => {
    const { error } = await supabase!.from('stock_adjustments').insert(adjustment);
    if (error) throw error;
  }, async () => {
    logLocalAction(adjustment.store_id, 'STOCK_UPDATE', `Stock adjustment for item ${adjustment.item_id}: ${adjustment.reason}`);
  });
};

// -----------------------------------------------------------------------------
// SALES METHODS
// -----------------------------------------------------------------------------
export const recordSale = async (sale: SalesRecord): Promise<string> => {
  return supa(async () => {
    // Build payload - collected_by expects UUID, so use agent_name for the name
    const payload = {
      store_id: sale.store_id,
      item_id: sale.item_id,
      item_name: sale.item_name || 'Unknown Item',
      quantity: sale.quantity,
      unit_price: sale.unit_price || 0,
      total_amount: sale.total_amount,
      payment_mode: sale.payment_mode || PaymentMode.CASH,
      payment_status: sale.payment_status || 'PAID',
      mpesa_ref: sale.mpesa_ref,
      customer_phone: sale.customer_phone,
      customer_name: sale.customer_name,
      agent_name: sale.collected_by || sale.agent_name || 'Staff',
      gps_latitude: sale.gps_latitude,
      gps_longitude: sale.gps_longitude,
      gps_accuracy: sale.gps_accuracy,
      created_at: new Date().toISOString(),
    };
    console.log('Recording sale with payload:', payload);
    const { data, error } = await supabase!.from('sales_records').insert(payload).select('id').single();
    if (error) {
      console.error('Supabase sale insert error:', error);
      throw error;
    }
    console.log('Sale recorded successfully:', data.id);

    // Decrement inventory simply (no RPC to keep it simple)
    const { data: item } = await supabase!.from('inventory_items').select('current_stock').eq('id', sale.item_id).single();
    if (item && typeof item.current_stock === 'number') {
      const newStock = Math.max(0, item.current_stock - sale.quantity);
      await supabase!.from('inventory_items').update({ current_stock: newStock }).eq('id', sale.item_id);
    }
    
    // Update agent points (if staff name provided)
    const agentName = sale.collected_by || sale.agent_name;
    if (agentName && agentName.length > 2 && agentName.toLowerCase() !== 'self') {
      const points = Math.floor(sale.total_amount / 100);
      
      // Check if agent exists
      const { data: existingAgent } = await supabase!
        .from('agents')
        .select('*')
        .eq('store_id', sale.store_id)
        .ilike('name', agentName)
        .single();
      
      if (existingAgent) {
        // Update existing agent
        await supabase!.from('agents').update({
          total_points: existingAgent.total_points + points,
          total_sales_value: existingAgent.total_sales_value + sale.total_amount,
          last_active: new Date().toISOString()
        }).eq('id', existingAgent.id);
      } else {
        // Create new agent
        await supabase!.from('agents').insert({
          store_id: sale.store_id,
          name: agentName,
          total_points: points,
          total_sales_value: sale.total_amount,
          last_active: new Date().toISOString()
        });
      }
    }
    
    return data.id as string;
  }, async () => {
    const inventory = getLocalInventory();
    const itemIndex = inventory.findIndex(i => i.id === sale.item_id);
    let soldItemName = 'Unknown';
    if (itemIndex >= 0) {
      inventory[itemIndex].current_stock -= sale.quantity;
      soldItemName = inventory[itemIndex].item_name;
      saveLocalInventory(inventory);
    }
    const newId = Math.random().toString(36).slice(2, 10);
    const newSale = { ...sale, id: newId, created_at: new Date().toISOString(), item_name: soldItemName };
    const sales = getLocalSales();
    sales.unshift(newSale);
    saveLocalSales(sales);
    if (sale.collected_by && sale.collected_by.length > 2) {
      const agents = getLocalAgents();
      const idx = agents.findIndex(a => a.store_id === sale.store_id && a.name.toLowerCase() === sale.collected_by.toLowerCase());
      const points = Math.floor(sale.total_amount / 100);
      if (idx >= 0) {
        agents[idx].total_points += points;
        agents[idx].total_sales_value += sale.total_amount;
        agents[idx].last_active = new Date().toISOString();
      } else {
        agents.push({
          id: Math.random().toString(36).slice(2, 10),
          store_id: sale.store_id,
          name: sale.collected_by,
          total_points: points,
          total_sales_value: sale.total_amount,
          last_active: new Date().toISOString()
        });
      }
      saveLocalAgents(agents);
    }
    // Queue for sync when back online
    addToSyncQueue('CREATE_SALE', sale);
    return newId;
  });
};

export const deleteSale = async (saleId: string): Promise<void> => {
  return supa(async () => {
    // Mark as voided and restock
    const { data: sale } = await supabase!.from('sales_records').select('*').eq('id', saleId).single();
    if (sale) {
      await supabase!.from('sales_records').update({ is_voided: true }).eq('id', saleId);
      if (sale.item_id) {
        const { data: item } = await supabase!.from('inventory_items').select('current_stock').eq('id', sale.item_id).single();
        if (item && typeof item.current_stock === 'number') {
          await supabase!.from('inventory_items').update({ current_stock: item.current_stock + sale.quantity }).eq('id', sale.item_id);
        }
      }
    }
  }, async () => {
    const sales = getLocalSales();
    const idx = sales.findIndex(s => s.id === saleId);
    if (idx !== -1) {
      const sale = sales[idx];
      const inventory = getLocalInventory();
      const itemIndex = inventory.findIndex(i => i.id === sale.item_id);
      if (itemIndex !== -1) {
        inventory[itemIndex].current_stock += sale.quantity;
        saveLocalInventory(inventory);
      }
      logLocalAction(sale.store_id, 'SALE_VOID', `Voided sale ${saleId} of ${sale.item_name}`);
      sales.splice(idx, 1);
      saveLocalSales(sales);
    }
  });
};

export const fetchRecentSales = async (storeId: string): Promise<SalesRecord[]> => {
  return supa(async () => {
    const { data, error } = await supabase!.from('sales_records').select('*').eq('store_id', storeId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }, async () => {
    const sales = getLocalSales().filter(s => s.store_id === storeId);
    sales.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    return sales;
  });
};

export const fetchDebtors = async (storeId: string): Promise<SalesRecord[]> => {
  return supa(async () => {
    const { data, error } = await supabase!.from('sales_records')
      .select('*')
      .eq('store_id', storeId)
      .eq('payment_mode', PaymentMode.MADENI)
      .in('payment_status', ['PENDING', 'PARTIAL']);
    if (error) throw error;
    return data || [];
  }, async () => {
    const debtors = getLocalSales().filter(s => s.store_id === storeId && s.payment_mode === PaymentMode.MADENI);
    debtors.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    return debtors;
  });
};

export const settleDebt = async (saleId: string): Promise<void> => {
  return supa(async () => {
    const { error } = await supabase!.from('sales_records').update({ payment_mode: PaymentMode.CASH, payment_status: 'PAID' }).eq('id', saleId);
    if (error) throw error;
  }, async () => {
    const sales = getLocalSales();
    const sale = sales.find(s => s.id === saleId);
    if (sale) {
      sale.payment_mode = PaymentMode.CASH;
      saveLocalSales(sales);
      logLocalAction(sale.store_id, 'CASH_CLOSE', `Debt settled for sale ${saleId}`);
    }
  });
};

export const getSaleById = async (id: string): Promise<SalesRecord | null> => {
  return supa(async () => {
    const { data, error } = await supabase!.from('sales_records').select('*').eq('id', id).single();
    if (error) throw error;
    return (data as SalesRecord) || null;
  }, async () => getLocalSales().find(s => s.id === id) || null);
};

// -----------------------------------------------------------------------------
// EXPENSES
// -----------------------------------------------------------------------------
export const recordExpense = async (expense: Omit<ExpenseRecord, 'id' | 'created_at'>): Promise<string> => {
  return supa(async () => {
    const { data, error } = await supabase!.from('expenses').insert({ ...expense, created_at: new Date().toISOString() }).select('id').single();
    if (error) throw error;
    return data.id as string;
  }, async () => {
    const expenses = getLocalExpenses();
    const newExpense: ExpenseRecord = { ...expense, id: Math.random().toString(36).slice(2, 10), created_at: new Date().toISOString() };
    expenses.unshift(newExpense);
    saveLocalExpenses(expenses);
    logLocalAction(expense.store_id, 'EXPENSE_ADD', `Added Expense: ${expense.reason} - KES ${expense.amount}`);
    return newExpense.id!;
  });
};

export const fetchExpenses = async (storeId: string): Promise<ExpenseRecord[]> => {
  return supa(async () => {
    const { data, error } = await supabase!.from('expenses').select('*').eq('store_id', storeId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }, async () => {
    const expenses = getLocalExpenses().filter(e => e.store_id === storeId);
    expenses.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return expenses;
  });
};

// -----------------------------------------------------------------------------
// AGENTS & AUDIT
// -----------------------------------------------------------------------------
export const fetchAgents = async (storeId: string): Promise<Agent[]> => {
  return supa(async () => {
    const { data, error } = await supabase!.from('agents').select('*').eq('store_id', storeId).order('total_points', { ascending: false });
    if (error) throw error;
    return data || [];
  }, async () => {
    const agents = getLocalAgents().filter(a => a.store_id === storeId);
    agents.sort((a, b) => b.total_points - a.total_points);
    return agents;
  });
};

// Add a new staff member
export const addStaffMember = async (storeId: string, name: string, phone?: string): Promise<Agent> => {
  return supa(async () => {
    const { data, error } = await supabase!.from('agents').insert({
      store_id: storeId,
      name: name.trim(),
      phone: phone || null,
      total_points: 0,
      total_sales_value: 0,
      is_active: true,
      last_active: new Date().toISOString()
    }).select('*').single();
    if (error) throw error;
    return data as Agent;
  }, async () => {
    const newAgent: Agent = {
      id: Math.random().toString(36).slice(2, 10),
      store_id: storeId,
      name: name.trim(),
      phone: phone || undefined,
      total_points: 0,
      total_sales_value: 0,
      is_active: true,
      last_active: new Date().toISOString()
    };
    const agents = getLocalAgents();
    agents.push(newAgent);
    saveLocalAgents(agents);
    return newAgent;
  });
};

// Remove a staff member (soft delete by setting is_active to false)
export const removeStaffMember = async (agentId: string): Promise<void> => {
  return supa(async () => {
    const { error } = await supabase!.from('agents').update({ is_active: false }).eq('id', agentId);
    if (error) throw error;
  }, async () => {
    const agents = getLocalAgents();
    const idx = agents.findIndex(a => a.id === agentId);
    if (idx >= 0) {
      agents[idx].is_active = false;
      saveLocalAgents(agents);
    }
  });
};

// Permanently delete a staff member
export const deleteStaffMember = async (agentId: string): Promise<void> => {
  return supa(async () => {
    const { error } = await supabase!.from('agents').delete().eq('id', agentId);
    if (error) throw error;
  }, async () => {
    const agents = getLocalAgents();
    const idx = agents.findIndex(a => a.id === agentId);
    if (idx >= 0) {
      agents.splice(idx, 1);
      saveLocalAgents(agents);
    }
  });
};

export const fetchAuditLogs = async (storeId: string): Promise<AuditLog[]> => {
  return supa(async () => {
    const { data, error } = await supabase!.from('audit_logs').select('*').eq('store_id', storeId).order('timestamp', { ascending: false });
    if (error) throw error;
    return data || [];
  }, async () => getLocalLogs().filter(l => l.store_id === storeId));
};

export const performCashReconciliation = async (storeId: string, actualCash: number, expectedCash: number): Promise<void> => {
  return supa(async () => {
    const diff = actualCash - expectedCash;
    const status = diff === 0 ? 'MATCH' : diff > 0 ? 'SURPLUS' : 'SHORTAGE';
    const { error } = await supabase!.from('cash_register').insert({
      store_id: storeId,
      register_date: new Date().toISOString().slice(0, 10),
      actual_closing: actualCash,
      expected_closing: expectedCash,
      variance: diff,
      notes: status
    });
    if (error) throw error;
  }, async () => {
    const diff = actualCash - expectedCash;
    const status = diff === 0 ? 'MATCH' : diff > 0 ? 'SURPLUS' : 'SHORTAGE';
    logLocalAction(storeId, 'CASH_CLOSE', `Register Closed. Actual: ${actualCash}, Expected: ${expectedCash}. Result: ${status} (${diff})`);
  });
};

// -----------------------------------------------------------------------------
// CUSTOMERS
// -----------------------------------------------------------------------------
export const fetchCustomers = async (storeId: string): Promise<Customer[]> => {
  return supa(async () => {
    const { data, error } = await supabase!.from('customers').select('*').eq('store_id', storeId).order('created_at', { ascending: false });
    if (error) throw error;
    // Cache locally for offline access
    const localCustomers = getLocalCustomers().filter(c => c.store_id !== storeId);
    saveLocalCustomers([...data || [], ...localCustomers]);
    return data || [];
  }, async () => getLocalCustomers().filter(c => c.store_id === storeId));
};

export const createCustomer = async (customer: Omit<Customer, 'id' | 'created_at' | 'is_active'>): Promise<Customer | null> => {
  const newCustomer: Customer = {
    ...customer,
    id: Math.random().toString(36).slice(2, 10),
    is_active: true,
    created_at: new Date().toISOString()
  };
  
  // Always save locally first
  const customers = getLocalCustomers();
  customers.unshift(newCustomer);
  saveLocalCustomers(customers);
  
  // Try to sync to Supabase
  if (isSupabaseEnabled && isOnline() && supabase) {
    try {
      const { data, error } = await supabase.from('customers').insert({ ...customer, is_active: true }).select('*').single();
      if (!error && data) {
        // Update local with server ID
        const idx = customers.findIndex(c => c.id === newCustomer.id);
        if (idx >= 0) {
          customers[idx] = data as Customer;
          saveLocalCustomers(customers);
        }
        return data as Customer;
      }
    } catch (err) {
      console.warn('Offline - customer queued for sync');
    }
  }
  
  // Queue for later sync if offline
  if (!isOnline()) {
    addToSyncQueue('CREATE_CUSTOMER', { ...customer, is_active: true });
  }
  
  return newCustomer;
};

export const updateCustomer = async (customerId: string, updates: Partial<Customer>): Promise<boolean> => {
  // Update locally first
  const customers = getLocalCustomers();
  const idx = customers.findIndex(c => c.id === customerId);
  if (idx >= 0) {
    customers[idx] = { ...customers[idx], ...updates };
    saveLocalCustomers(customers);
  }
  
  // Try Supabase
  if (isSupabaseEnabled && isOnline() && supabase) {
    try {
      const { error } = await supabase.from('customers').update(updates).eq('id', customerId);
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('Offline - update queued');
      addToSyncQueue('UPDATE_CUSTOMER', { customerId, updates });
    }
  }
  
  return true;
};

// -----------------------------------------------------------------------------
// SUPPLIERS & PURCHASES
// -----------------------------------------------------------------------------
export const fetchSuppliers = async (storeId: string): Promise<Supplier[]> => {
  return supa(async () => {
    const { data, error } = await supabase!.from('suppliers').select('*').eq('store_id', storeId).order('created_at', { ascending: false });
    if (error) throw error;
    // Cache locally for offline use
    const suppliers = data || [];
    saveLocalSuppliers(suppliers);
    return suppliers;
  }, async () => {
    // Return cached local suppliers
    return getLocalSuppliers().filter(s => s.store_id === storeId);
  });
};

export const createSupplier = async (supplier: Omit<Supplier, 'id' | 'created_at' | 'is_active'>): Promise<Supplier | null> => {
  const newSupplier: Supplier = {
    ...supplier,
    id: Math.random().toString(36).slice(2, 10),
    is_active: true,
    created_at: new Date().toISOString()
  };
  
  // Always save locally first
  const suppliers = getLocalSuppliers();
  suppliers.unshift(newSupplier);
  saveLocalSuppliers(suppliers);
  
  // Try to sync to Supabase
  if (isSupabaseEnabled && isOnline() && supabase) {
    try {
      const { data, error } = await supabase.from('suppliers').insert({ ...supplier, is_active: true }).select('*').single();
      if (!error && data) {
        // Update local with server ID
        const idx = suppliers.findIndex(s => s.id === newSupplier.id);
        if (idx >= 0) {
          suppliers[idx] = data as Supplier;
          saveLocalSuppliers(suppliers);
        }
        return data as Supplier;
      }
    } catch (err) {
      console.warn('Offline - supplier queued for sync');
    }
  }
  
  // Queue for later sync if offline
  if (!isOnline()) {
    addToSyncQueue('CREATE_SUPPLIER', { ...supplier, is_active: true });
  }
  
  return newSupplier;
};

export const updateSupplier = async (supplierId: string, updates: Partial<Supplier>): Promise<boolean> => {
  return supa(async () => {
    const { error } = await supabase!.from('suppliers').update(updates).eq('id', supplierId);
    if (error) throw error;
    return true;
  }, async () => false);
};

export const createPurchaseOrder = async (po: Omit<PurchaseOrder, 'id' | 'created_at' | 'updated_at'>, items: PurchaseOrderItem[]): Promise<string> => {
  return supa(async () => {
    const { data: poData, error } = await supabase!.from('purchase_orders').insert(po).select('id').single();
    if (error) throw error;
    const poId = poData.id as string;
    if (items.length) {
      await supabase!.from('purchase_order_items').insert(items.map(i => ({ ...i, purchase_order_id: poId })));
    }
    return poId;
  }, async () => Math.random().toString(36).slice(2, 10));
};

export const fetchPurchaseOrders = async (storeId: string): Promise<PurchaseOrder[]> => {
  return supa(async () => {
    const { data, error } = await supabase!.from('purchase_orders').select('*').eq('store_id', storeId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }, async () => []);
};

export const createGoodsReceivedNote = async (grn: Omit<GoodsReceivedNote, 'id'>, items: GRNItem[]): Promise<string> => {
  return supa(async () => {
    const { data: grnData, error } = await supabase!.from('goods_received_notes').insert(grn).select('id').single();
    if (error) throw error;
    const grnId = grnData.id as string;
    if (items.length) {
      await supabase!.from('grn_items').insert(items.map(i => ({ ...i, grn_id: grnId })));
    }
    return grnId;
  }, async () => Math.random().toString(36).slice(2, 10));
};

// -----------------------------------------------------------------------------
// REPORTS & ANALYTICS (simple fetches)
// -----------------------------------------------------------------------------
export const fetchDailySummaries = async (storeId: string): Promise<DailySummary[]> => {
  return supa(async () => {
    const { data, error } = await supabase!.from('daily_summaries').select('*').eq('store_id', storeId).order('summary_date', { ascending: false });
    if (error) throw error;
    return data || [];
  }, async () => []);
};

export const fetchMonthlySummaries = async (storeId: string): Promise<MonthlySummary[]> => {
  return supa(async () => {
    const { data, error } = await supabase!.from('monthly_summaries').select('*').eq('store_id', storeId).order('year', { ascending: false }).order('month', { ascending: false });
    if (error) throw error;
    return data || [];
  }, async () => []);
};

export const fetchTaxRecords = async (storeId: string): Promise<TaxRecord[]> => {
  return supa(async () => {
    const { data, error } = await supabase!.from('tax_records').select('*').eq('store_id', storeId).order('tax_period_start', { ascending: false });
    if (error) throw error;
    return data || [];
  }, async () => []);
};

export const fetchLowStockItems = async (storeId: string): Promise<InventoryItem[]> => {
  return supa(async () => {
    const { data, error } = await supabase!.from('inventory_items')
      .select('*')
      .eq('store_id', storeId);
    if (error) throw error;
    const rows = (data || []) as InventoryItem[];
    return rows.filter(i => i.current_stock <= (i.low_stock_threshold || 10));
  }, async () => getLocalInventory().filter(i => i.store_id === storeId && i.current_stock <= (i.low_stock_threshold || 10)));
};

// -----------------------------------------------------------------------------
// SUPPLIER DEBT TRACKING (Extended functionality)
// -----------------------------------------------------------------------------

export const fetchSupplierInvoices = async (storeId: string): Promise<SupplierInvoice[]> => {
  return supa(async () => {
    const { data, error } = await supabase!.from('supplier_invoices').select('*').eq('store_id', storeId).order('due_date', { ascending: true });
    if (error) throw error;
    return data || [];
  }, async () => {
    const invoices = getLocalSupplierInvoices().filter(i => i.store_id === storeId);
    invoices.sort((a, b) => new Date(a.due_date || '').getTime() - new Date(b.due_date || '').getTime());
    return invoices;
  });
};

export const addSupplierInvoice = async (invoice: Omit<SupplierInvoice, 'id'>): Promise<SupplierInvoice> => {
  return supa(async () => {
    const { data, error } = await supabase!.from('supplier_invoices').insert(invoice).select('*').single();
    if (error) throw error;
    return data as SupplierInvoice;
  }, async () => {
    const newInvoice: SupplierInvoice = {
      ...invoice,
      id: Math.random().toString(36).slice(2, 10)
    };
    const invoices = getLocalSupplierInvoices();
    invoices.push(newInvoice);
    saveLocalSupplierInvoices(invoices);
    return newInvoice;
  });
};

export const markSupplierInvoicePaid = async (invoiceId: string): Promise<void> => {
  return supa(async () => {
    const { error } = await supabase!.from('supplier_invoices').update({ 
      status: 'PAID', 
      payment_date: new Date().toISOString() 
    }).eq('id', invoiceId);
    if (error) throw error;
  }, async () => {
    const invoices = getLocalSupplierInvoices();
    const idx = invoices.findIndex(i => i.id === invoiceId);
    if (idx >= 0) {
      invoices[idx].status = 'PAID';
      invoices[idx].payment_date = new Date().toISOString();
      saveLocalSupplierInvoices(invoices);
    }
  });
};

// -----------------------------------------------------------------------------
// CUSTOMER CREDIT LIMITS (Extended functionality)
// -----------------------------------------------------------------------------

export const updateCustomerCreditLimit = async (customerId: string, creditLimit: number): Promise<void> => {
  // Update locally first
  const customers = getLocalCustomers();
  const idx = customers.findIndex(c => c.id === customerId);
  if (idx >= 0) {
    customers[idx].credit_limit = creditLimit;
    saveLocalCustomers(customers);
  }
  
  // Try Supabase
  if (isSupabaseEnabled && isOnline() && supabase) {
    try {
      const { error } = await supabase.from('customers').update({ credit_limit: creditLimit }).eq('id', customerId);
      if (error) throw error;
    } catch (err) {
      console.warn('Offline - credit update queued');
    }
  }
};

export const getCustomerDebtTotal = async (storeId: string, customerPhone: string): Promise<number> => {
  return supa(async () => {
    const { data, error } = await supabase!.from('sales_records')
      .select('total_amount')
      .eq('store_id', storeId)
      .eq('customer_phone', customerPhone)
      .eq('payment_mode', PaymentMode.MADENI)
      .in('payment_status', ['PENDING', 'PARTIAL']);
    if (error) throw error;
    return (data || []).reduce((sum, s) => sum + (s.total_amount || 0), 0);
  }, async () => {
    const sales = getLocalSales().filter(s => 
      s.store_id === storeId && 
      s.customer_phone === customerPhone && 
      s.payment_mode === PaymentMode.MADENI
    );
    return sales.reduce((sum, s) => sum + s.total_amount, 0);
  });
};

// -----------------------------------------------------------------------------
// OFFLINE SYNC QUEUE
// -----------------------------------------------------------------------------
const STORAGE_SYNC_QUEUE = 'dukabook_sync_queue_v1';

interface SyncQueueItem {
  id: string;
  action: 'CREATE_SALE' | 'UPDATE_STOCK' | 'ADD_EXPENSE' | 'ADD_ITEM' | 'CREATE_SUPPLIER' | 'CREATE_CUSTOMER' | 'CREATE_INVOICE' | 'PAY_INVOICE' | 'ADD_AGENT' | 'DELETE_AGENT' | 'UPDATE_CUSTOMER' | 'CLEAR_DEBT';
  data: any;
  timestamp: string;
  retries: number;
}

const getSyncQueue = (): SyncQueueItem[] => getLocal(STORAGE_SYNC_QUEUE, []);
const saveSyncQueue = (queue: SyncQueueItem[]) => setLocal(STORAGE_SYNC_QUEUE, queue);

export const addToSyncQueue = (action: SyncQueueItem['action'], data: any): void => {
  const queue = getSyncQueue();
  queue.push({
    id: Math.random().toString(36).slice(2, 10),
    action,
    data,
    timestamp: new Date().toISOString(),
    retries: 0
  });
  saveSyncQueue(queue);
};

export const processSyncQueue = async (): Promise<{ success: number; failed: number }> => {
  if (!isSupabaseEnabled || !navigator.onLine) {
    return { success: 0, failed: 0 };
  }
  
  const queue = getSyncQueue();
  let success = 0;
  let failed = 0;
  const remainingQueue: SyncQueueItem[] = [];
  
  for (const item of queue) {
    try {
      switch (item.action) {
        case 'CREATE_SALE':
          // Use direct supabase insert for synced items
          if (supabase) {
            await supabase.from('sales_records').insert(item.data);
          }
          break;
        case 'UPDATE_STOCK':
          await updateStockLevel(item.data.itemId, item.data.newStock);
          break;
        case 'ADD_EXPENSE':
          await recordExpense(item.data);
          break;
        case 'ADD_ITEM':
          if (supabase) {
            await supabase.from('inventory_items').insert(item.data);
          }
          break;
        case 'CREATE_SUPPLIER':
          if (supabase) {
            await supabase.from('suppliers').insert(item.data);
          }
          break;
        case 'CREATE_CUSTOMER':
          if (supabase) {
            await supabase.from('customers').insert(item.data);
          }
          break;
        case 'CREATE_INVOICE':
          if (supabase) {
            await supabase.from('supplier_invoices').insert(item.data);
          }
          break;
        case 'PAY_INVOICE':
          if (supabase) {
            await supabase.from('supplier_invoices').update({ is_paid: true, paid_at: new Date().toISOString() }).eq('id', item.data.invoiceId);
          }
          break;
        case 'ADD_AGENT':
          if (supabase) {
            await supabase.from('agents').insert(item.data);
          }
          break;
        case 'CLEAR_DEBT':
          if (supabase) {
            await supabase.from('sales_records').update({ payment_status: 'PAID' }).eq('id', item.data.saleId);
          }
          break;
      }
      success++;
    } catch (err) {
      console.error('Sync failed for item:', item, err);
      item.retries++;
      if (item.retries < 3) {
        remainingQueue.push(item);
      }
      failed++;
    }
  }
  
  saveSyncQueue(remainingQueue);
  return { success, failed };
};

export const getSyncQueueCount = (): number => getSyncQueue().length;

// -----------------------------------------------------------------------------
// SuperAdmin Analytics Functions
// -----------------------------------------------------------------------------

export interface StoreHealthData {
  store: StoreProfile;
  totalSales: number;
  totalRevenue: number;
  lastSaleDate: Date | null;
  daysSinceLastSale: number;
  totalDebt: number;
  activeStaffCount: number;
  inventoryCount: number;
  lowStockCount: number;
  todaySales: number;
  todayRevenue: number;
  thisMonthRevenue: number;
  isActive: boolean;
}

export interface PlatformAnalytics {
  totalStores: number;
  activeStores: number;
  inactiveStores: number;
  premiumStores: number;
  basicStores: number;
  totalRevenue: number;
  todayRevenue: number;
  thisMonthRevenue: number;
  totalTransactions: number;
  todayTransactions: number;
  totalDebtExposure: number;
  avgRevenuePerStore: number;
  topStores: StoreHealthData[];
  inactiveStoresList: StoreHealthData[];
  revenueByBusinessType: Record<string, number>;
  storesByBusinessType: Record<string, number>;
}

export const fetchStoreHealthData = async (storeId: string): Promise<StoreHealthData | null> => {
  if (!isSupabaseEnabled) return null;
  
  try {
    // Get store info
    const { data: store } = await supabase!.from('stores').select('*').eq('id', storeId).single();
    if (!store) return null;

    // Get all sales for this store
    const { data: sales } = await supabase!.from('sales_records').select('*').eq('store_id', storeId);
    const allSales = sales || [];

    // Get staff
    const { data: agents } = await supabase!.from('staff').select('*').eq('store_id', storeId).eq('is_active', true);

    // Get ALL inventory items (don't filter by stock - count all added items)
    const { data: inventory } = await supabase!.from('inventory_items').select('*').eq('store_id', storeId);

    const timeZone = 'Africa/Nairobi';
    const now = new Date();
    const nowZoned = utcToZonedTime(now, timeZone);
    const today = startOfDay(nowZoned);
    const monthStart = startOfMonth(nowZoned);

    // Calculate metrics
    const totalRevenue = allSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const totalDebt = allSales.filter(s => s.payment_mode === 'DEBT' && !s.is_debt_settled).reduce((sum, s) => sum + (s.total_amount || 0), 0);
    
    const todaySales = allSales.filter(s => {
      const saleZoned = utcToZonedTime(new Date(s.created_at), timeZone);
      return saleZoned >= today;
    });

    const monthSales = allSales.filter(s => {
      const saleZoned = utcToZonedTime(new Date(s.created_at), timeZone);
      return saleZoned >= monthStart;
    });

    const sortedSales = [...allSales].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const lastSaleDate = sortedSales.length > 0 ? new Date(sortedSales[0].created_at) : null;
    const lastSaleZoned = lastSaleDate ? utcToZonedTime(lastSaleDate, timeZone) : null;
    const daysSinceLastSale = lastSaleZoned ? differenceInCalendarDays(nowZoned, lastSaleZoned) : 999;

    // Low stock = items with stock but below reorder level
    const lowStockItems = (inventory || []).filter(i => i.current_stock > 0 && i.current_stock <= (i.reorder_level || 5));

    return {
      store: store as StoreProfile,
      totalSales: allSales.length,
      totalRevenue,
      lastSaleDate,
      daysSinceLastSale,
      totalDebt,
      activeStaffCount: (agents || []).length,
      inventoryCount: (inventory || []).length, // All items added to inventory
      lowStockCount: lowStockItems.length, // Only items with stock but below reorder level
      todaySales: todaySales.length,
      todayRevenue: todaySales.reduce((sum, s) => sum + (s.total_amount || 0), 0),
      thisMonthRevenue: monthSales.reduce((sum, s) => sum + (s.total_amount || 0), 0),
      isActive: daysSinceLastSale < 7
    };
  } catch (err) {
    console.error('Error fetching store health:', err);
    return null;
  }
};

export const fetchPlatformAnalytics = async (): Promise<PlatformAnalytics | null> => {
  if (!isSupabaseEnabled) return null;

  try {
    // Get all stores
    const { data: stores } = await supabase!.from('stores').select('*');
    if (!stores) return null;

    // Get ALL sales across platform
    const { data: allSales } = await supabase!.from('sales_records').select('*');
    const sales = allSales || [];

    const timeZone = 'Africa/Nairobi';
    const now = new Date();
    const nowZoned = utcToZonedTime(now, timeZone);
    const today = startOfDay(nowZoned);
    const monthStart = startOfMonth(nowZoned);

    // Calculate platform-wide metrics
    const totalRevenue = sales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const todaySales = sales.filter(s => {
      const saleZoned = utcToZonedTime(new Date(s.created_at), timeZone);
      return saleZoned >= today;
    });
    const monthSales = sales.filter(s => {
      const saleZoned = utcToZonedTime(new Date(s.created_at), timeZone);
      return saleZoned >= monthStart;
    });
    const totalDebt = sales.filter(s => s.payment_mode === 'DEBT' && !s.is_debt_settled).reduce((sum, s) => sum + (s.total_amount || 0), 0);

    // Get health data for each store
    const storeHealthPromises = stores.map(s => fetchStoreHealthData(s.id));
    const healthData = (await Promise.all(storeHealthPromises)).filter(h => h !== null) as StoreHealthData[];

    // Sort by revenue for top stores
    const topStores = [...healthData].sort((a, b) => b.thisMonthRevenue - a.thisMonthRevenue).slice(0, 10);
    
    // Get inactive stores (no sales in 7+ days)
    const inactiveStoresList = healthData.filter(h => h.daysSinceLastSale >= 7).sort((a, b) => b.daysSinceLastSale - a.daysSinceLastSale);

    // Revenue by business type
    const revenueByBusinessType: Record<string, number> = {};
    const storesByBusinessType: Record<string, number> = {};
    
    for (const h of healthData) {
      const type = h.store.business_type || 'OTHER';
      revenueByBusinessType[type] = (revenueByBusinessType[type] || 0) + h.thisMonthRevenue;
      storesByBusinessType[type] = (storesByBusinessType[type] || 0) + 1;
    }

    return {
      totalStores: stores.length,
      activeStores: healthData.filter(h => h.isActive).length,
      inactiveStores: healthData.filter(h => !h.isActive).length,
      premiumStores: stores.filter(s => s.tier === 'PREMIUM').length,
      basicStores: stores.filter(s => s.tier === 'BASIC').length,
      totalRevenue,
      todayRevenue: todaySales.reduce((sum, s) => sum + (s.total_amount || 0), 0),
      thisMonthRevenue: monthSales.reduce((sum, s) => sum + (s.total_amount || 0), 0),
      totalTransactions: sales.length,
      todayTransactions: todaySales.length,
      totalDebtExposure: totalDebt,
      avgRevenuePerStore: stores.length > 0 ? totalRevenue / stores.length : 0,
      topStores,
      inactiveStoresList,
      revenueByBusinessType,
      storesByBusinessType
    };
  } catch (err) {
    console.error('Error fetching platform analytics:', err);
    return null;
  }
};

export const suspendStore = async (storeId: string, reason?: string): Promise<boolean> => {
  if (!isSupabaseEnabled) return false;
  try {
    const { error } = await supabase!.from('stores').update({ 
      is_suspended: true, 
      suspension_reason: reason || 'Suspended by admin',
      suspended_at: new Date().toISOString()
    }).eq('id', storeId);
    return !error;
  } catch {
    return false;
  }
};

export const activateStore = async (storeId: string): Promise<boolean> => {
  if (!isSupabaseEnabled) return false;
  try {
    const { error } = await supabase!.from('stores').update({ 
      is_suspended: false, 
      suspension_reason: null,
      suspended_at: null
    }).eq('id', storeId);
    return !error;
  } catch {
    return false;
  }
};

// -----------------------------------------------------------------------------
// Simple CSV/PDF export helpers can be implemented client-side using existing data.
// -----------------------------------------------------------------------------
// ============================================================================
// SHRINKAGE DEBT MANAGEMENT (KES 3 Billion Loss Crisis)
// ============================================================================

export const recordShrinkageDebt = async (debt: Omit<ShrinkageDebt, 'id' | 'created_at'>): Promise<string | null> => {
  if (!isSupabaseEnabled) return null;
  try {
    const { data, error } = await supabase!
      .from('shrinkage_debts')
      .insert(debt)
      .select('id')
      .single();

    if (!error && data) {
      const { data: agent } = await supabase!.from('agents').select('total_shrinkage_debt').eq('id', debt.agent_id).single();
      if (agent) {
        await supabase!
          .from('agents')
          .update({ total_shrinkage_debt: (agent.total_shrinkage_debt || 0) + debt.total_debt_amount })
          .eq('id', debt.agent_id);
      }
      logLocalAction(debt.store_id, 'STOCK_UPDATE', `Shrinkage debt: ${debt.agent_name} - ${debt.item_name} (KES ${debt.total_debt_amount})`);
      return data.id;
    }
    return null;
  } catch (err) {
    console.error('Error recording shrinkage debt:', err);
    return null;
  }
};

export const getShrinkageDebts = async (storeId: string, agentId?: string): Promise<ShrinkageDebt[]> => {
  if (!isSupabaseEnabled) return [];
  try {
    let query = supabase!.from('shrinkage_debts').select('*').eq('store_id', storeId);
    if (agentId) query = query.eq('agent_id', agentId);
    const { data } = await query.order('created_at', { ascending: false });
    return data || [];
  } catch (err) {
    console.error('Error fetching shrinkage debts:', err);
    return [];
  }
};

export const updateShrinkageDebtStatus = async (debtId: string, status: ShrinkageDebt['status'], notes?: string): Promise<boolean> => {
  if (!isSupabaseEnabled) return false;
  try {
    const { error } = await supabase!
      .from('shrinkage_debts')
      .update({ status, notes, updated_at: new Date().toISOString() })
      .eq('id', debtId);
    return !error;
  } catch (err) {
    console.error('Error updating shrinkage debt:', err);
    return false;
  }
};

export const getAgentShrinkageSummary = async (agentId: string): Promise<any> => {
  if (!isSupabaseEnabled) return null;
  try {
    const { data } = await supabase!
      .from('agent_shrinkage_summary')
      .select('*')
      .eq('agent_id', agentId)
      .single();
    return data;
  } catch (err) {
    console.error('Error fetching agent shrinkage summary:', err);
    return null;
  }
};
