import { StoreProfile, InventoryItem, SalesRecord, PaymentMode } from './types';

// ============================================================================
// DEMO MODE DATA - "Kamaa Hardware (Demo)"
// This creates a fully functional playground with realistic Kenyan hardware data
// ============================================================================

export const DEMO_STORE: StoreProfile = {
  id: 'demo_store_001',
  name: 'Kamaa Hardware (Demo)',
  location: 'River Road, Nairobi',
  theme_color: 'green',
  access_code: 'DEMO',
  owner_pin: '0000',
  business_type: 'HARDWARE',
  // tier is intentionally omitted - will be determined by subscription status
  // Demo mode simulates 7-day trial with full premium access
  currency: 'KES',
  phone: '0712 345 678',
  email: 'demo@dukabook.me',
};

// Helper for dates
const getDate = (daysAgo: number) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
};

const getFutureDate = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

// Realistic Kenyan Hardware Inventory
export const DEMO_INVENTORY: InventoryItem[] = [
  // Cement - The king of hardware
  { id: 'demo_1', store_id: 'demo_store_001', item_name: 'Simba Cement 50kg', current_stock: 45, buying_price: 780, unit_price: 850, low_stock_threshold: 10, category: 'Cement' },
  { id: 'demo_2', store_id: 'demo_store_001', item_name: 'Bamburi Cement 50kg', current_stock: 32, buying_price: 760, unit_price: 830, low_stock_threshold: 10, category: 'Cement' },
  { id: 'demo_3', store_id: 'demo_store_001', item_name: 'Blue Triangle 50kg', current_stock: 8, buying_price: 750, unit_price: 820, low_stock_threshold: 10, category: 'Cement' }, // Low stock!
  
  // Iron Sheets
  { id: 'demo_4', store_id: 'demo_store_001', item_name: 'Mabati 30G (2.5m)', current_stock: 120, buying_price: 950, unit_price: 1100, low_stock_threshold: 20, category: 'Roofing' },
  { id: 'demo_5', store_id: 'demo_store_001', item_name: 'Mabati 28G (3m)', current_stock: 85, buying_price: 1400, unit_price: 1650, low_stock_threshold: 15, category: 'Roofing' },
  { id: 'demo_6', store_id: 'demo_store_001', item_name: 'Ridge Cap (2m)', current_stock: 45, buying_price: 450, unit_price: 600, low_stock_threshold: 10, category: 'Roofing' },
  
  // Paint - High margin
  { id: 'demo_7', store_id: 'demo_store_001', item_name: 'Crown Paint (20L) - White', current_stock: 18, buying_price: 4800, unit_price: 5800, low_stock_threshold: 5, category: 'Paint' },
  { id: 'demo_8', store_id: 'demo_store_001', item_name: 'Sadolin Varnish (4L)', current_stock: 12, buying_price: 2200, unit_price: 2800, low_stock_threshold: 5, category: 'Paint', expiry_date: getFutureDate(365) },
  { id: 'demo_9', store_id: 'demo_store_001', item_name: 'Plascon Weatherguard (20L)', current_stock: 3, buying_price: 6500, unit_price: 7800, low_stock_threshold: 5, category: 'Paint' }, // Low stock!
  
  // Nails & Fasteners
  { id: 'demo_10', store_id: 'demo_store_001', item_name: 'Nails 4" (1kg)', current_stock: 50, buying_price: 180, unit_price: 250, low_stock_threshold: 20, category: 'Fasteners' },
  { id: 'demo_11', store_id: 'demo_store_001', item_name: 'Nails 3" (1kg)', current_stock: 65, buying_price: 170, unit_price: 240, low_stock_threshold: 20, category: 'Fasteners' },
  { id: 'demo_12', store_id: 'demo_store_001', item_name: 'Roofing Nails (1kg)', current_stock: 40, buying_price: 200, unit_price: 280, low_stock_threshold: 15, category: 'Fasteners' },
  
  // Pipes & Plumbing
  { id: 'demo_13', store_id: 'demo_store_001', item_name: 'PVC Pipe 4" (3m)', current_stock: 25, buying_price: 850, unit_price: 1100, low_stock_threshold: 10, category: 'Plumbing' },
  { id: 'demo_14', store_id: 'demo_store_001', item_name: 'PVC Pipe 2" (3m)', current_stock: 40, buying_price: 350, unit_price: 480, low_stock_threshold: 15, category: 'Plumbing' },
  { id: 'demo_15', store_id: 'demo_store_001', item_name: 'Ball Valve 1"', current_stock: 20, buying_price: 450, unit_price: 650, low_stock_threshold: 10, category: 'Plumbing' },
  
  // Electrical
  { id: 'demo_16', store_id: 'demo_store_001', item_name: 'Cable 2.5mm (100m)', current_stock: 8, buying_price: 4500, unit_price: 5500, low_stock_threshold: 5, category: 'Electrical' },
  { id: 'demo_17', store_id: 'demo_store_001', item_name: 'Switch Socket', current_stock: 35, buying_price: 120, unit_price: 180, low_stock_threshold: 20, category: 'Electrical' },
  
  // Tools
  { id: 'demo_18', store_id: 'demo_store_001', item_name: 'Wheelbarrow (Lasher)', current_stock: 6, buying_price: 5500, unit_price: 7000, low_stock_threshold: 3, category: 'Tools' },
  { id: 'demo_19', store_id: 'demo_store_001', item_name: 'Jembe (Hoe)', current_stock: 15, buying_price: 350, unit_price: 500, low_stock_threshold: 5, category: 'Tools' },
  { id: 'demo_20', store_id: 'demo_store_001', item_name: 'Tape Measure 5m', current_stock: 20, buying_price: 150, unit_price: 250, low_stock_threshold: 10, category: 'Tools' },
];

// Realistic Recent Sales (Today + Yesterday)
export const DEMO_SALES: Partial<SalesRecord>[] = [
  // Today's Sales
  {
    id: 'sale_demo_1',
    store_id: 'demo_store_001',
    item_id: 'demo_1',
    item_name: 'Simba Cement 50kg',
    quantity: 5,
    unit_price: 850,
    total_amount: 4250,
    payment_mode: PaymentMode.CASH,
    collected_by: 'Peter',
    created_at: getDate(0),
    gps_latitude: -1.2864,
    gps_longitude: 36.8172,
    gps_accuracy: 10,
  },
  {
    id: 'sale_demo_2',
    store_id: 'demo_store_001',
    item_id: 'demo_4',
    item_name: 'Mabati 30G (2.5m)',
    quantity: 10,
    unit_price: 1100,
    total_amount: 11000,
    payment_mode: PaymentMode.MPESA,
    mpesa_ref: 'SHK3F4G5H6',
    collected_by: 'Mary',
    created_at: getDate(0),
    gps_latitude: -1.2864,
    gps_longitude: 36.8172,
    gps_accuracy: 10,
  },
  {
    id: 'sale_demo_3',
    store_id: 'demo_store_001',
    item_id: 'demo_7',
    item_name: 'Crown Paint (20L) - White',
    quantity: 2,
    unit_price: 5800,
    total_amount: 11600,
    payment_mode: PaymentMode.MPESA,
    mpesa_ref: 'SHK7J8K9L0',
    collected_by: 'Peter',
    created_at: getDate(0),
    gps_latitude: -1.2864,
    gps_longitude: 36.8172,
    gps_accuracy: 10,
  },
  {
    id: 'sale_demo_4',
    store_id: 'demo_store_001',
    item_id: 'demo_10',
    item_name: 'Nails 4" (1kg)',
    quantity: 3,
    unit_price: 250,
    total_amount: 750,
    payment_mode: PaymentMode.CASH,
    collected_by: 'Mary',
    created_at: getDate(0),
    gps_latitude: -1.2864,
    gps_longitude: 36.8172,
    gps_accuracy: 10,
  },
  // Sale on Credit (MADENI) - The hook!
  {
    id: 'sale_demo_5',
    store_id: 'demo_store_001',
    item_id: 'demo_2',
    item_name: 'Bamburi Cement 50kg',
    quantity: 10,
    unit_price: 830,
    total_amount: 8300,
    payment_mode: PaymentMode.MADENI,
    customer_name: 'Mwangi Constructions',
    customer_phone: '0722 111 222',
    collected_by: 'Peter',
    created_at: getDate(0),
    gps_latitude: -1.2864,
    gps_longitude: 36.8172,
    gps_accuracy: 10,
  },
  
  // Yesterday's Sales
  {
    id: 'sale_demo_6',
    store_id: 'demo_store_001',
    item_id: 'demo_5',
    item_name: 'Mabati 28G (3m)',
    quantity: 20,
    unit_price: 1650,
    total_amount: 33000,
    payment_mode: PaymentMode.MPESA,
    mpesa_ref: 'SHK1A2B3C4',
    collected_by: 'Peter',
    created_at: getDate(1),
    gps_latitude: -1.2864,
    gps_longitude: 36.8172,
    gps_accuracy: 10,
  },
  {
    id: 'sale_demo_7',
    store_id: 'demo_store_001',
    item_id: 'demo_18',
    item_name: 'Wheelbarrow (Lasher)',
    quantity: 1,
    unit_price: 7000,
    total_amount: 7000,
    payment_mode: PaymentMode.CASH,
    collected_by: 'Mary',
    created_at: getDate(1),
    gps_latitude: -1.2864,
    gps_longitude: 36.8172,
    gps_accuracy: 10,
  },
  // Another MADENI sale
  {
    id: 'sale_demo_8',
    store_id: 'demo_store_001',
    item_id: 'demo_13',
    item_name: 'PVC Pipe 4" (3m)',
    quantity: 5,
    unit_price: 1100,
    total_amount: 5500,
    payment_mode: PaymentMode.MADENI,
    customer_name: 'Ochieng Plumbers',
    customer_phone: '0733 444 555',
    collected_by: 'Peter',
    created_at: getDate(1),
    gps_latitude: -1.2864,
    gps_longitude: 36.8172,
    gps_accuracy: 10,
  },
];

// Demo Debtors (MADENI) - This is the "sticky" data
export const DEMO_DEBTORS = [
  {
    id: 'debtor_1',
    store_id: 'demo_store_001',
    customer_name: 'Mwangi Constructions',
    customer_phone: '0722 111 222',
    total_owed: 8300,
    items: 'Bamburi Cement 50kg x 10',
    date: getDate(0),
    status: 'PENDING'
  },
  {
    id: 'debtor_2',
    store_id: 'demo_store_001',
    customer_name: 'Ochieng Plumbers',
    customer_phone: '0733 444 555',
    total_owed: 5500,
    items: 'PVC Pipe 4" x 5',
    date: getDate(1),
    status: 'PENDING'
  },
  {
    id: 'debtor_3',
    store_id: 'demo_store_001',
    customer_name: 'Kamau Hardware (Githurai)',
    customer_phone: '0711 888 999',
    total_owed: 24500,
    items: 'Simba Cement x 20, Nails x 10kg',
    date: getDate(5),
    status: 'OVERDUE'
  },
  {
    id: 'debtor_4',
    store_id: 'demo_store_001',
    customer_name: 'Wanjiku Builders',
    customer_phone: '0700 123 456',
    total_owed: 15200,
    items: 'Mabati 30G x 12, Paint x 1',
    date: getDate(14),
    status: 'OVERDUE'
  },
];

// Demo Staff (for GPS tracking hook)
export const DEMO_STAFF = [
  { name: 'Peter', role: 'Senior Staff', salesCount: 45, lastLocation: 'At Shop', lastSeen: '2 min ago' },
  { name: 'Mary', role: 'Staff', salesCount: 32, lastLocation: 'At Shop', lastSeen: '5 min ago' },
  { name: 'John', role: 'Delivery', salesCount: 12, lastLocation: 'Githurai (Delivery)', lastSeen: '1 hour ago' },
];

// Demo Daily Summary
export const DEMO_SUMMARY = {
  todaySales: 35900,
  todayCash: 5000,
  todayMpesa: 22600,
  todayMadeni: 8300,
  yesterdaySales: 45500,
  totalDebt: 53500,
  lowStockItems: 3,
  transactionCount: 5,
};

// Marketing hooks text
export const DEMO_HOOKS = {
  gpsHook: {
    title: '📍 Where is your employee right now?',
    subtitle: 'Every sale shows GPS location. Catch lazy staff instantly.',
    cta: 'Track My Staff →'
  },
  madeniHook: {
    title: '📒 If your notebook gets lost today...',
    subtitle: `You have KES ${DEMO_SUMMARY.totalDebt.toLocaleString()} in Madeni. DukaBook keeps it safe forever.`,
    cta: 'Protect My Madeni →'
  },
  lazyOwnerHook: {
    title: '🛋️ Check sales from your bed',
    subtitle: "No need to drive to the shop. See today's cash count on your phone.",
    cta: 'Get Started Free →'
  }
};
