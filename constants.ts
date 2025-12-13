import { InventoryItem, StoreProfile, BusinessConfig, BusinessType } from './types';

// Supabase configuration (injected at build time via vite.config.ts)
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ""; 
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// --- NICHE ADAPTABILITY CONFIGURATION ---
export const BUSINESS_CONFIG: Record<BusinessType, BusinessConfig> = {
  HARDWARE: {
    label: 'Hardware Store',
    agentLabel: 'Staff / Fundi',
    showAgent: true,
    quantityLabel: 'Quantity',
    stockLabel: 'Current Stock'
  },
  COSMETICS: {
    label: 'Cosmetics / Beauty',
    agentLabel: 'Staff Name',
    showAgent: true,
    quantityLabel: 'Pieces',
    stockLabel: 'In Stock'
  },
  BROKERAGE: {
    label: 'Real Estate / Brokerage',
    agentLabel: 'Agent / Broker',
    showAgent: true,
    quantityLabel: 'Units',
    stockLabel: 'Listings'
  },
  OTHER: {
    label: 'Other Business',
    agentLabel: 'Staff Name',
    showAgent: true,
    quantityLabel: 'Quantity',
    stockLabel: 'Stock'
  },
  WHOLESALER: {
    label: 'Wholesale / Distributor',
    agentLabel: 'Staff / Broker',
    showAgent: true,
    quantityLabel: 'Units / Cartons',
    stockLabel: 'Warehouse Stock'
  },
  BOUTIQUE: {
    label: 'Boutique / Retail',
    agentLabel: 'Staff Name',
    showAgent: false, // Often boutiques don't track per-person sales in simple mode
    quantityLabel: 'Pieces',
    stockLabel: 'In Store'
  },
  WINES: {
    label: 'Wines & Spirits',
    agentLabel: 'Staff / Seller',
    showAgent: true,
    quantityLabel: 'Units',
    stockLabel: 'Bottles'
  },
  SALON: {
    label: 'Salon / Spa',
    agentLabel: 'Stylist',
    showAgent: true,
    quantityLabel: 'Services',
    stockLabel: 'Products'
  },
  PHARMACY: {
    label: 'Chemist / Pharmacy',
    agentLabel: 'Staff / Doctor',
    showAgent: true,
    quantityLabel: 'Dose / Pcs',
    stockLabel: 'Inventory'
  },
  CHEMIST: {
    label: 'Agro-vet / Chemist',
    agentLabel: 'Staff / Pharmacist',
    showAgent: true,
    quantityLabel: 'Units',
    stockLabel: 'Inventory'
  },
  GENERAL: {
    label: 'General Shop',
    agentLabel: 'Staff Name',
    showAgent: true,
    quantityLabel: 'Quantity',
    stockLabel: 'Stock'
  }
};

export const MOCK_STORES: StoreProfile[] = [
  { 
    id: 'store_01', 
    name: 'Simba Hardware (Nairobi)', 
    location: 'River Road', 
    theme_color: 'blue', 
    access_code: 'SIMBA', 
    owner_pin: '1234',
    business_type: 'HARDWARE',
    // tier is omitted - determined by subscription
    currency: 'KES'
  },
  { 
    id: 'store_02', 
    name: 'Mombasa Builders', 
    location: 'Nyali', 
    theme_color: 'orange', 
    access_code: 'MOMBASA', 
    owner_pin: '1234',
    business_type: 'WHOLESALER',
    // tier is omitted - determined by subscription
    currency: 'KES'
  },
];

export const THEME_COLORS: Record<string, any> = {
  blue: {
    bg: 'bg-blue-600',
    hover: 'hover:bg-blue-700',
    text: 'text-blue-600',
    light: 'bg-blue-50',
    border: 'border-blue-200',
    ring: 'focus:ring-blue-500',
    chart: '#2563eb',
    icon: 'text-blue-500'
  },
  orange: {
    bg: 'bg-orange-600',
    hover: 'hover:bg-orange-700',
    text: 'text-orange-600',
    light: 'bg-orange-50',
    border: 'border-orange-200',
    ring: 'focus:ring-orange-500',
    chart: '#ea580c',
    icon: 'text-orange-500'
  },
  green: {
    bg: 'bg-emerald-600',
    hover: 'hover:bg-emerald-700',
    text: 'text-emerald-600',
    light: 'bg-emerald-50',
    border: 'border-emerald-200',
    ring: 'focus:ring-emerald-500',
    chart: '#059669',
    icon: 'text-emerald-500'
  },
  red: {
    bg: 'bg-red-600',
    hover: 'hover:bg-red-700',
    text: 'text-red-600',
    light: 'bg-red-50',
    border: 'border-red-200',
    ring: 'focus:ring-red-500',
    chart: '#dc2626',
    icon: 'text-red-500'
  },
  purple: {
    bg: 'bg-purple-600',
    hover: 'hover:bg-purple-700',
    text: 'text-purple-600',
    light: 'bg-purple-50',
    border: 'border-purple-200',
    ring: 'focus:ring-purple-500',
    chart: '#9333ea',
    icon: 'text-purple-500'
  }
};

// Fallback for undefined themes
export const DEFAULT_THEME = THEME_COLORS.blue;

// Helper to get future date
const getFutureDate = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

// MOCK DATA: Segregated by Store ID
export const MOCK_INVENTORY: InventoryItem[] = [
  // Store 1: Simba Hardware
  { id: '1', store_id: 'store_01', item_name: 'Cement (Simba 50kg)', current_stock: 45, buying_price: 780, unit_price: 850, low_stock_threshold: 10, expiry_date: getFutureDate(120) },
  { id: '2', store_id: 'store_01', item_name: 'Iron Sheets 30G (2.5m)', current_stock: 120, buying_price: 950, unit_price: 1100, low_stock_threshold: 20 },
  { id: '3', store_id: 'store_01', item_name: 'Wood Glue (1kg)', current_stock: 5, buying_price: 100, unit_price: 150, low_stock_threshold: 10, expiry_date: getFutureDate(15) }, 
  
  // Store 2: Mombasa Builders
  { id: '4', store_id: 'store_02', item_name: 'Marine Varnish (4L)', current_stock: 12, buying_price: 2600, unit_price: 3200, low_stock_threshold: 5, expiry_date: getFutureDate(365) },
  { id: '5', store_id: 'store_02', item_name: 'Coral Blocks (Machine Cut)', current_stock: 500, buying_price: 35, unit_price: 45, low_stock_threshold: 100 },
  { id: '6', store_id: 'store_02', item_name: 'PVC Solvent Cement', current_stock: 30, buying_price: 600, unit_price: 800, low_stock_threshold: 10, expiry_date: getFutureDate(5) },
];
