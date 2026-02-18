
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

// Auth user (includes Supabase metadata)
export interface AuthUser extends User {
  aud?: string;
  provider?: string;
  store_id?: string;
  needsStoreCreation?: boolean;
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
  is_suspended?: boolean;
  suspension_reason?: string;
  suspended_at?: string;
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

// Subscription Features (Database-driven FEFO list)
export interface SubscriptionFeature {
  id: string;
  name: string;                    // e.g., "Profit tracking & analytics"
  icon?: string;                   // Icon name for UI (e.g., "BarChart3")
  description?: string;
  is_premium: boolean;             // If true, only PREMIUM plans get this
  sort_order: number;              // Display order
  is_active: boolean;
  created_at: string;
  updated_at?: string;
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
export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'active' | 'expired' | 'cancelled';
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
  // Status & Expiration (aligned with STRICT_SUBSCRIPTION_SCHEMA)
  status: 'active' | 'expired' | 'cancelled';
  expires_at: string; // Single expiration point (replaces trial_end and current_period_end)
  
  // Plan info
  plan_name: string; // e.g., 'free_trial'
  is_trial: boolean;
  
  // Payment Reference (from IntaSend/M-Pesa webhook)
  payment_ref?: string;
  payment_method?: string;
  last_payment_date?: string;
  
  // Audit
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

// ============================================================================
// CASH RECONCILIATION & FRAUD DETECTION
// ============================================================================

export interface CashRegisterAudit {
  id: string;
  store_id: string;
  register_date: string;
  opening_balance: number;
  expected_closing: number;
  actual_closing: number;
  variance_amount: number;
  variance_percentage: number;
  is_fraud_suspect: boolean;
  fraud_category: 'OVERAGE' | 'SHORTAGE' | 'NORMAL';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  reconciled_by?: string;
  reconciled_at?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface CashFraudPattern {
  store_id: string;
  variance_count_30d: number;
  avg_variance_percent: number;
  fraud_suspect_count: number;
  total_variance_30d: number;
  risk_level: 'HIGH_RISK' | 'MEDIUM_RISK' | 'LOW_RISK';
}

// ============================================================================
// EXPIRY DISCOUNT MANAGEMENT
// ============================================================================

export interface ExpiryDiscountRule {
  id: string;
  store_id: string;
  days_before_expiry: number;
  suggested_discount_percent: number;
  auto_apply: boolean;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface InventoryExpiryStatus {
  id: string;
  store_id: string;
  inventory_item_id: string;
  item_name: string;
  current_stock: number;
  expiry_date?: string;
  days_until_expiry: number;
  expiry_status: 'EXPIRED' | 'CRITICAL' | 'URGENT' | 'CAUTION' | 'OK';
  suggested_discount_percent: number;
  estimated_daily_sales: number;
  estimated_loss_if_not_cleared: number;
  created_at: string;
  updated_at?: string;
}

export interface ExpiryClearance {
  id: string;
  store_id: string;
  inventory_item_id: string;
  item_name: string;
  quantity_cleared: number;
  original_price: number;
  clearance_price: number;
  discount_percent: number;
  cleared_via: 'DISCOUNTED_SALE' | 'DONATION' | 'DISPOSED';
  sale_id?: string;
  cleared_by: string;
  cleared_at: string;
  created_at: string;
}

// ============================================================================
// DEBT COLLECTIONS & CREDIT MANAGEMENT
// ============================================================================

export interface DebtCollection {
  id: string;
  store_id: string;
  customer_id?: string;
  customer_name: string;
  customer_phone?: string;
  original_amount: number;
  remaining_amount: number;
  due_date?: string;
  days_overdue: number;
  aging_bucket: '1-30' | '31-60' | '61-90' | '90+';
  status: 'ACTIVE' | 'OVERDUE' | 'SUSPENDED' | 'PARTIALLY_PAID' | 'COLLECTED' | 'WRITTEN_OFF';
  last_reminder_date?: string;
  reminder_count: number;
  next_reminder_date?: string;
  is_credit_ceiling_breach: boolean;
  collection_agent_assigned?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface DebtReminderLog {
  id: string;
  store_id: string;
  debt_id: string;
  customer_name: string;
  customer_phone?: string;
  remaining_amount: number;
  days_overdue: number;
  reminder_type: 'DUE_IN_7' | 'OVERDUE_7' | 'OVERDUE_14' | 'OVERDUE_30' | 'CRITICAL';
  message_template?: string;
  message_sent?: string;
  sms_sent: boolean;
  sms_status: 'PENDING' | 'SENT' | 'FAILED';
  sms_error?: string;
  sent_at?: string;
  created_at: string;
}

export interface CustomerCreditCeiling {
  id: string;
  store_id: string;
  customer_id: string;
  credit_limit: number;
  current_debt: number;
  available_credit: number;
  block_sales_on_ceiling_breach: boolean;
  suspension_days_overdue: number;
  created_at: string;
  updated_at?: string;
}

export interface DebtCollectionsDashboard {
  store_id: string;
  total_active_debts: number;
  total_outstanding: number;
  debt_1_30_days: number;
  debt_31_60_days: number;
  debt_61_90_days: number;
  debt_90_plus_days: number;
  ceiling_breaches: number;
  unique_debtors: number;
  avg_days_overdue: number;
}

// ============================================================================
// PRODUCT PROFITABILITY TRACKING
// ============================================================================

export interface ProductProfitability {
  id: string;
  store_id: string;
  inventory_item_id: string;
  item_name: string;
  current_stock: number;
  cost_price: number;
  selling_price: number;
  profit_per_unit: number;
  profit_margin_percent: number;
  period_month: number;
  period_year: number;
  units_sold: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  profit_percent_of_store: number;
  profit_rank: number;
  sales_rank: number;
  profit_change_percent: number;
  sales_velocity: number;
  created_at: string;
  updated_at?: string;
}

export interface ProductPerformance {
  id: string;
  store_id: string;
  top_profit_product_id?: string;
  top_profit_amount?: number;
  top_profit_margin_percent?: number;
  bottom_profit_product_id?: string;
  bottom_profit_amount?: number;
  bottom_profit_margin_percent?: number;
  high_velocity_product_id?: string;
  high_velocity_units_per_day?: number;
  dead_stock_product_id?: string;
  days_without_sale?: number;
  analysis_period_start: string;
  analysis_period_end: string;
  created_at: string;
  updated_at?: string;
}

export interface ProductProfitabilitySummary {
  store_id: string;
  total_products_tracked: number;
  total_store_profit: number;
  avg_margin_percent: number;
  highest_profit_product: number;
  lowest_profit_product: number;
  loss_making_products: number;
  low_margin_products: number;
}

// ============================================================================
// INVENTORY STOCKOUT ALERTS
// ============================================================================

export interface StockoutAlert {
  id: string;
  store_id: string;
  inventory_item_id: string;
  item_name: string;
  stockout_date: string;
  days_out_of_stock: number;
  is_resolved: boolean;
  resolved_date?: string;
  avg_daily_sales_units: number;
  estimated_lost_units: number;
  estimated_lost_revenue: number;
  supplier_id?: string;
  suggested_reorder_qty: number;
  reorder_po_created: boolean;
  po_id?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface StockoutImpactSummary {
  store_id: string;
  total_stockouts: number;
  resolved_stockouts: number;
  ongoing_stockouts: number;
  total_days_stockout: number;
  total_lost_revenue: number;
  avg_loss_per_stockout: number;
  po_created_count: number;
}

// ============================================================================
// SUPPLIER FRAUD DETECTION
// ============================================================================

export interface SupplierFraudFlag {
  id: string;
  store_id: string;
  supplier_id: string;
  purchase_order_id?: string;
  grn_id?: string;
  supplier_invoice_id?: string;
  fraud_type: 'QUANTITY_MISMATCH' | 'PRICE_OVERCHARGE' | 'QUALITY_ISSUE' | 'DELIVERY_LATE' | 'INVOICE_MISMATCH';
  po_quantity: number;
  grn_quantity_received: number;
  grn_quantity_rejected: number;
  quantity_variance: number;
  variance_percent: number;
  po_unit_price: number;
  invoice_unit_price: number;
  price_variance: number;
  total_overcharge: number;
  po_expected_date?: string;
  grn_actual_date?: string;
  days_late: number;
  rejection_reason?: string;
  quality_score: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  is_resolved: boolean;
  resolution_notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface SupplierQualityScore {
  id: string;
  store_id: string;
  supplier_id: string;
  total_orders: number;
  on_time_deliveries: number;
  quality_accepted_percent: number;
  price_accuracy_percent: number;
  overall_score: number;
  reliability_score: number;
  quality_score: number;
  pricing_score: number;
  is_blacklisted: boolean;
  blacklist_reason?: string;
  last_evaluated: string;
  created_at: string;
  updated_at?: string;
}

export interface SupplierFraudSummary {
  store_id: string;
  supplier_id: string;
  fraud_flags_count: number;
  quantity_mismatches: number;
  price_overcharges: number;
  quality_issues: number;
  late_deliveries: number;
  total_overcharge_amount: number;
  avg_variance_percent: number;
  high_severity_count: number;
}

// ============================================================================
// M-PESA RECONCILIATION
// ============================================================================

export interface MpesaTransaction {
  id: string;
  store_id: string;
  mpesa_ref: string;
  phone_number: string;
  amount: number;
  transaction_type: 'DEPOSIT' | 'WITHDRAWAL' | 'PAYMENT' | 'SUBSCRIPTION';
  mpesa_timestamp: string;
  received_at: string;
  is_reconciled: boolean;
  reconciled_to_sale_id?: string;
  reconciled_to_payment_id?: string;
  matched_sale_amount?: number;
  amount_variance?: number;
  is_variance_flagged: boolean;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface MpesaReconciliationLog {
  id: string;
  store_id: string;
  period_start: string;
  period_end: string;
  reconciliation_date: string;
  total_mpesa_deposits: number;
  total_matched_sales: number;
  total_unmatched: number;
  unmatched_count: number;
  variance_count: number;
  total_variance_amount: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'RECONCILED' | 'ISSUES_FOUND';
  notes?: string;
  reconciled_by?: string;
  created_at: string;
}

export interface MpesaReconciliationStatus {
  store_id: string;
  total_transactions: number;
  reconciled_count: number;
  unmatched_count: number;
  total_amount: number;
  reconciled_amount: number;
  unmatched_amount: number;
  total_variance: number;
  reconciliation_percent: number;
}

// ============================================================================
// KRA / iDEAL TAX COMPLIANCE
// ============================================================================

export interface TaxComplianceRecord {
  id: string;
  store_id: string;
  tax_period_start: string;
  tax_period_end: string;
  period_type: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  gross_sales: number;
  exempt_sales: number;
  taxable_sales: number;
  tax_rate: number;
  tax_amount: number;
  tax_paid_amount: number;
  tax_balance: number;
  ideal_filing_status: 'DRAFT' | 'READY' | 'FILED' | 'CONFIRMED';
  ideal_filing_date?: string;
  ideal_confirmation_date?: string;
  ideal_reference_number?: string;
  kra_status: 'PENDING' | 'SUBMITTED' | 'VERIFIED' | 'ISSUE';
  kra_reference?: string;
  kra_issue_notes?: string;
  prepared_by?: string;
  approved_by?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface TaxExemptionRule {
  id: string;
  store_id: string;
  category_name: string;
  category_code: string;
  is_exempt: boolean;
  tax_rate: number;
  created_at: string;
  updated_at?: string;
}

export interface TaxPaymentSchedule {
  id: string;
  store_id: string;
  payment_due_date: string;
  period_type: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  amount_due: number;
  amount_paid: number;
  is_paid: boolean;
  payment_date?: string;
  payment_method: 'BANK_TRANSFER' | 'MPESA';
  payment_reference?: string;
  days_until_due: number;
  is_overdue: boolean;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface KraComplianceStatus {
  store_id: string;
  total_periods_filed: number;
  ideal_filed_count: number;
  kra_verified_count: number;
  kra_issue_count: number;
  total_tax_calculated: number;
  total_tax_paid: number;
  outstanding_tax: number;
  avg_taxable_sales: number;
}

// ============================================================================
// GLOBAL PRODUCTS CATALOG (Network Effect - Shared Database)
// ============================================================================

export interface GlobalProduct {
  barcode: string; // Primary key - e.g., "4800016000115"
  generic_name: string; // e.g., "Simba Cement 50kg"
  category: string; // e.g., "Building Materials"
  image_url?: string; // Photo of the product/packaging
  created_by: string; // User ID who first added this
  contribution_count: number; // How many shops confirmed/used this product
  created_at: string;
}

export interface GlobalProductSearchResult {
  found: boolean;
  product?: GlobalProduct;
  isNewBarcode: boolean;
}

// ============================================================================
// SHOP INVENTORY (Private Per-Shop Inventory with Prices)
// ============================================================================

export interface ShopInventoryItem {
  id: string;
  shop_id: string;
  barcode: string; // Link to global_products
  generic_name: string; // From global_products
  category: string; // From global_products
  image_url?: string; // From global_products
  quantity: number; // Private - this shop's stock
  selling_price: number; // Private - this shop's selling price
  buying_price?: number; // Private - cost for profitability calculation
  custom_alias?: string; // Optional: User's internal name (e.g., "Simba Mfuko")
  last_restocked_at?: string;
  margin_percent?: number; // Calculated: (selling_price - buying_price) / buying_price * 100
  created_at: string;
  updated_at: string;
}

export interface ShopInventoryStats {
  total_items: number;
  total_value: number; // quantity * selling_price
  total_cost: number; // quantity * buying_price
  low_stock_count: number;
  avg_margin: number;
}

// ============================================================================
// NETWORK EFFECT DATA (For Future Market Insights)
// ============================================================================

export interface PriceInsight {
  barcode: string;
  product_name: string;
  category: string;
  your_price: number;
  market_average_price: number;
  market_min_price: number;
  market_max_price: number;
  price_difference_percent: number; // Positive = you're expensive
  shops_in_market: number;
  region?: string;
}

export interface ProductMarketTrend {
  barcode: string;
  product_name: string;
  category: string;
  shops_selling: number; // How many shops in the network sell this
  avg_selling_price: number;
  price_trend: 'UP' | 'DOWN' | 'STABLE';
  month_over_month_change: number;
  total_contribution_count: number;
}

