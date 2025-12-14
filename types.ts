
export enum PaymentMode {
  CASH = 'CASH',
  MPESA = 'MPESA',
  MADENI = 'MADENI'
}

export type UserRole = 'SUPER_ADMIN' | 'STORE_OWNER' | 'EMPLOYEE' | 'ADMIN' | 'STAFF';

export type BusinessType = 'HARDWARE' | 'WINES' | 'SALON' | 'CHEMIST' | 'COSMETICS' | 'BROKERAGE' | 'OTHER' | 'WHOLESALER' | 'BOUTIQUE' | 'PHARMACY' | 'GENERAL';
export type SubscriptionTier = 'BASIC' | 'PREMIUM';
export type EffectiveTier = 'TRIAL' | 'BASIC' | 'PREMIUM' | 'EXPIRED' | 'NONE';

// Breaking Bulk: Unit conversion types
export type UnitMeasurement = 'ml' | 'l' | 'kg' | 'g' | 'units' | 'items' | 'pieces';

export interface ConversionInfo {
  bulkUnitName: string;          // e.g., 'Bottle', 'Sack'
  breakoutUnitName: string;      // e.g., 'Tot', 'Kg Bag'
  conversionRate: number;        // e.g., 25 (1 Bottle = 25 Tots)
  unitMeasurement?: UnitMeasurement;  // Optional: e.g., 'ml' for bottles
}

export type PaymentModeType = 'CASH' | 'MPESA' | 'MADENI' | 'CARD' | 'BANK_TRANSFER';
export type PaymentStatus = 'PAID' | 'PENDING' | 'PARTIAL';
export type ExpenseCategory = 'TRANSPORT' | 'FOOD' | 'AIRTIME' | 'UTILITIES' | 'RENT' | 'SUPPLIES' | 'MAINTENANCE' | 'OTHER';
export type AuditActionType = 'STOCK_UPDATE' | 'SALE_VOID' | 'PRICE_CHANGE' | 'CASH_CLOSE' | 'EXPENSE_ADD' | 'USER_LOGIN' | 'USER_LOGOUT' | 'PERMISSION_CHANGE' | 'DATA_EXPORT';

// User & Authentication
export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  store_id?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
}

export interface StoreProfile {
  id: string;
  name: string;
  location: string;
  theme_color?: string;
  access_code: string;
  owner_pin: string;
  business_type: BusinessType;
  tier?: SubscriptionTier; // Deprecated: Use getEffectiveTier() from billingService instead
  owner_id?: string;
  is_demo?: boolean;
  phone?: string;
  email?: string;
  website?: string;
  tax_registration_number?: string;
  tax_rate?: number;
  currency: string;
  timezone?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Customers
export interface Customer {
  id: string;
  store_id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  credit_limit?: number;
  is_active: boolean;
  notes?: string;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  store_id: string;
  item_name: string;
  current_stock: number;
  buying_price: number; // Cost price (Premium feature)
  unit_price: number; // Selling price
  low_stock_threshold: number;
  expiry_date?: string;
  sku?: string;
  barcode?: string;
  description?: string;
  category?: string;
  reorder_level?: number;
  reorder_quantity?: number;
  batch_number?: string;
  imei_serial?: string; // For electronics/hardware serial numbers
  parent_unit_qty?: number; // For wines/bulk units: how many child units per parent
  lot_number?: string;
  supplier_id?: string;
  // Breaking Bulk: Unit conversion fields
  bulk_unit_name?: string;      // e.g., 'Bottle', 'Sack'
  breakout_unit_name?: string;  // e.g., 'Tot', 'Kg Bag'
  conversion_rate?: number;     // e.g., 25 (1 Bottle = 25 Tots)
  parent_item_id?: string;      // Links breakout units to bulk parent
  is_bulk_parent?: boolean;     // Flag: true if this item breaks down into units
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Inventory Batch (for FEFO - First Expire, First Out)
export interface InventoryBatch {
  id: string;
  store_id: string;
  inventory_item_id: string;
  batch_number?: string;
  expiry_date?: string; // ISO string
  current_stock: number;
  status?: 'ACTIVE' | 'EXPIRED' | 'DISPOSED';
  notes?: string;
  // Breaking Bulk: Parent batch linking
  parent_batch_id?: string;  // If this batch is a derived breakout unit of a bulk batch
  created_at?: string;
  updated_at?: string;
}

// Stock Adjustments
export interface StockAdjustment {
  id: string;
  store_id: string;
  item_id: string;
  adjustment_type: 'DAMAGE' | 'LOSS' | 'SHRINKAGE' | 'COUNT_VARIANCE' | 'MANUAL_ADJUSTMENT';
  quantity_adjusted: number;
  reason: string;
  notes?: string;
  adjusted_by: string;
  created_at: string;
}

// Suppliers
export interface Supplier {
  id: string;
  store_id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  tax_id?: string;
  bank_account?: string;
  payment_terms?: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
}

// Purchase Orders
export interface PurchaseOrder {
  id: string;
  store_id: string;
  supplier_id: string;
  po_number: string;
  order_date: string;
  expected_delivery_date?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'RECEIVED' | 'CANCELLED';
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  created_by: string;
  approved_by?: string;
  created_at: string;
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  item_id?: string;
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

// Goods Received Notes
export interface GoodsReceivedNote {
  id: string;
  store_id: string;
  purchase_order_id: string;
  grn_number: string;
  received_date: string;
  received_by: string;
  notes?: string;
}

export interface GRNItem {
  id: string;
  grn_id: string;
  po_item_id?: string;
  item_name: string;
  quantity_received: number;
  quantity_rejected: number;
  notes?: string;
}

// Supplier Invoices
export interface SupplierInvoice {
  id: string;
  store_id: string;
  supplier_id: string;
  grn_id?: string;
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: 'PENDING' | 'VERIFIED' | 'PAID' | 'DISPUTED';
  payment_date?: string;
  notes?: string;
}

export interface SalesRecord {
  id?: string;
  store_id: string;
  created_at?: string;
  item_id: string;
  item_name?: string;
  quantity: number;
  total_amount: number;
  payment_mode: PaymentMode;
  mpesa_ref?: string;
  customer_phone?: string;
  customer_name?: string;
  collected_by: string; // This serves as Fundi/Broker/Sales Rep name
  gps_latitude: number;
  gps_longitude: number;
  gps_accuracy: number;
  customer_id?: string;
  unit_price?: number;
  tax_amount?: number;
  payment_status?: PaymentStatus;
  agent_name?: string;
  invoice_number?: string;
  notes?: string;
  is_voided?: boolean;
  updated_at?: string;
}

export interface ExpenseRecord {
  id?: string;
  store_id: string;
  amount: number;
  reason: string; // e.g., Transport, Food, Airtime
  description?: string;
  recorded_by: string;
  created_at: string;
  expense_category: ExpenseCategory;
  receipt_url?: string;
  is_tax_deductible?: boolean;
  updated_at?: string;
}

export interface Agent {
  id: string;
  store_id: string;
  name: string;
  phone?: string;
  email?: string;
  total_points: number;
  total_sales_value: number;
  is_active?: boolean;
  last_active: string;
}

// Shrinkage Debt - tracks inventory loss attributed to employees
export interface ShrinkageDebt {
  id: string;
  store_id: string;
  agent_id: string;
  agent_name: string;
  item_id: string;
  item_name: string;
  quantity_missing: number;
  unit_price: number;
  total_debt_amount: number;
  audit_id: string; // References inventory audit/count
  audit_date: string;
  status: 'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISPUTED'; // PENDING = waiting employee confirmation
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface AuditLog {
  id: string;
  store_id: string;
  action_type: 'STOCK_UPDATE' | 'SALE_VOID' | 'PRICE_CHANGE' | 'CASH_CLOSE' | 'EXPENSE_ADD';
  description: string;
  performed_by: string; // "Staff" or "Admin"
  timestamp: string;
  table_name?: string;
  record_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
}

// Financial & Reporting
export interface CashRegister {
  id: string;
  store_id: string;
  register_date: string;
  opening_balance: number;
  cash_sales: number;
  cash_expenses: number;
  other_receipts: number;
  expected_closing: number;
  actual_closing: number;
  variance: number;
  reconciled_by?: string;
  reconciled_at?: string;
}

export interface DailySummary {
  id: string;
  store_id: string;
  summary_date: string;
  total_sales: number;
  total_sales_count: number;
  total_expenses: number;
  gross_profit: number;
  cash_count: number;
}

export interface MonthlySummary {
  id: string;
  store_id: string;
  year: number;
  month: number;
  total_revenue: number;
  total_cost_of_goods_sold: number;
  gross_profit: number;
  total_expenses: number;
  net_profit: number;
  tax_amount: number;
}

export interface TaxRecord {
  id: string;
  store_id: string;
  tax_period_start: string;
  tax_period_end: string;
  gross_sales: number;
  taxable_sales: number;
  tax_rate: number;
  tax_amount: number;
  paid_amount: number;
  status: 'PENDING' | 'SUBMITTED' | 'PAID';
  notes?: string;
}

export interface GeoLocationState {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
}

export interface BusinessConfig {
  label: string;
  agentLabel: string; // e.g., "Fundi", "Broker", "Doctor"
  showAgent: boolean; // Hide for boutiques
  quantityLabel: string; // e.g., "Kgs", "Cartons", "Pcs"
  stockLabel: string; // e.g., "Stock"
}

// ============================================================================
// SUBSCRIPTION & BILLING TYPES
// ============================================================================

export type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED';
export type PaymentMethod = 'MPESA' | 'BANK_TRANSFER' | 'CARD' | 'CASH';
export type MpesaTransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: SubscriptionTier;
  billing_cycle: BillingCycle;
  price_kes: number;
  features: string[];
  max_staff: number;
  max_products: number;
  is_popular?: boolean;
  description?: string;
}

export interface StoreSubscription {
  id: string;
  store_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  current_period_start: string;
  current_period_end: string;
  trial_start?: string;
  trial_end?: string;
  is_trial: boolean;
  auto_renew: boolean;
  next_billing_date?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  grace_period_end?: string; // 3 days after expiry before suspension
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPayment {
  id: string;
  store_id: string;
  subscription_id: string;
  amount: number;
  currency: string;
  payment_method: PaymentMethod;
  mpesa_receipt_number?: string;
  mpesa_transaction_id?: string;
  phone_number?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  description?: string;
  billing_period_start: string;
  billing_period_end: string;
  paid_at?: string;
  created_at: string;
}

export interface MpesaSTKPushRequest {
  phone_number: string;
  amount: number;
  account_reference: string;
  transaction_desc: string;
  store_id: string;
  subscription_id?: string;
}

export interface MpesaSTKPushResponse {
  success: boolean;
  checkout_request_id?: string;
  merchant_request_id?: string;
  response_code?: string;
  response_description?: string;
  customer_message?: string;
  error?: string;
}

export interface MpesaCallback {
  checkout_request_id: string;
  result_code: number;
  result_desc: string;
  amount?: number;
  mpesa_receipt_number?: string;
  transaction_date?: string;
  phone_number?: string;
}

export interface PaymentReminder {
  id: string;
  store_id: string;
  subscription_id: string;
  reminder_type: 'TRIAL_ENDING' | 'PAYMENT_DUE' | 'OVERDUE' | 'FINAL_WARNING' | 'SUSPENDED';
  days_before_due?: number;
  days_overdue?: number;
  sent_at?: string;
  sms_sent: boolean;
  email_sent: boolean;
  phone_number?: string;
  email?: string;
  message: string;
  created_at: string;
}

export interface BillingDashboardStats {
  total_revenue: number;
  monthly_recurring_revenue: number;
  active_subscriptions: number;
  trial_subscriptions: number;
  expired_subscriptions: number;
  pending_payments: number;
  overdue_payments: number;
  churn_rate: number;
  conversion_rate: number; // Trial to paid
  avg_revenue_per_store: number;
  expiring_soon: StoreSubscription[]; // Within 7 days
  recently_expired: StoreSubscription[];
  pending_amount: number;
}

export interface PaymentConfig {
  id: string;
  mpesa_paybill: string;
  mpesa_till: string;
  mpesa_consumer_key?: string;
  mpesa_consumer_secret?: string;
  mpesa_passkey?: string;
  callback_url?: string;
  stk_enabled: boolean;
  paybill_enabled: boolean;
  till_enabled: boolean;
  sms_api_key?: string;
  sms_username?: string;
  sms_sender_id?: string;
  sms_enabled: boolean;
  trial_reminder_days: number;
  payment_reminder_days: number;
  grace_period_days: number;
  created_at: string;
  updated_at: string;
}

// Marketing & Promotional Config (SuperAdmin controlled)
export interface MarketingConfig {
  id: string;
  
  // Trial/Upgrade Discount
  trial_discount_percent: number; // e.g., 20 for "20% off"
  trial_discount_enabled: boolean;
  
  // Promotional Messages
  trial_ending_message: string; // e.g., "Your trial ends in {days} days"
  trial_urgency_message: string; // e.g., "⏰ Only {days} days left!"
  trial_ending_banner: string; // Banner message for trial ending
  upgrade_cta_text: string; // e.g., "Upgrade Now"
  discount_cta_text: string; // e.g., "Claim 20% Discount"
  
  // FOMO & Urgency Messages
  fomo_message: string; // e.g., "🔥 Limited time offer!"
  upgrade_benefits_headline: string; // e.g., "Unlock Your Full Business Potential"
  missing_out_message: string; // What basic users are missing
  
  // CTA Texts
  cta_button_text: string; // Primary upgrade button
  cta_secondary_text: string; // Secondary CTA
  cta_dismiss_text: string; // "Maybe Later" text
  
  // Social Proof Numbers (can be real or promotional)
  show_social_proof: boolean;
  businesses_count: number; // e.g., 2847 "happy businesses"
  weekly_upgrades_count: number; // e.g., 25 "upgraded this week"
  avg_savings_amount: number; // e.g., 15000 "KES saved per month"
  annual_savings_months: number; // e.g., 2 for "Save 2 months"
  
  // Feature Benefits (what they're missing) - Simple list for display
  feature_benefits_list: string[]; // e.g., ["📊 Real-time profit tracking", "📍 GPS sales location map"]
  
  // Feature Benefits (detailed - for specific features)
  feature_benefits: {
    feature_id: string;
    benefit_text: string; // e.g., "Save up to KES 15,000/month"
    hook_text: string; // e.g., "See where your money goes"
  }[];
  
  // Success Stories/Testimonials
  testimonials: {
    name: string;
    business: string;
    location: string;
    quote: string;
    avatar: string; // emoji or image URL
    rating: number; // 1-5
  }[];
  
  // Simple success stories (for popup)
  success_stories: {
    name: string;
    business: string;
    quote: string;
  }[];
  
  // Timing Settings
  show_success_story_after_minutes: number; // e.g., 2
  show_floating_badge: boolean;
  show_trial_banner: boolean;
  
  created_at: string;
  updated_at: string;
}

