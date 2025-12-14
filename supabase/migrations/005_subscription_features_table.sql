-- ============================================================================
-- SUBSCRIPTION FEATURES TABLE (Make FEFOs Database-Driven)
-- ============================================================================
-- Moves hardcoded feature list to database for SuperAdmin flexibility

CREATE TABLE IF NOT EXISTS subscription_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,                    -- e.g., "Profit tracking & analytics"
  icon TEXT,                                    -- Icon name for UI (e.g., "BarChart3")
  description TEXT,
  is_premium BOOLEAN DEFAULT false,             -- If true, only PREMIUM plans get this
  sort_order INTEGER DEFAULT 0,                 -- Display order
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default features (matching current hardcoded list)
INSERT INTO subscription_features (name, icon, description, is_premium, sort_order) VALUES
('Record sales & expenses', 'Receipt', 'Log all sales and expenses', false, 1),
('Inventory tracking', 'Package', 'Track stock levels and updates', false, 2),
('Daily/Weekly reports', 'FileText', 'Generate business reports', false, 3),
('Profit tracking & analytics', 'BarChart3', 'View profits and analyze trends', true, 4),
('GPS sales location map', 'Map', 'Track sales locations with GPS', true, 5),
('Supplier management', 'Wallet', 'Manage suppliers and orders', true, 6),
('Customer management', 'Users', 'Track customer info and history', true, 7),
('Debt/Credit tracking (Madeni)', 'CreditCard', 'Manage customer credit and debt', true, 8),
('Bulk inventory import', 'Package', 'Import inventory from CSV', false, 9),
('Barcode scanning', 'Smartphone', 'Scan barcodes for quick sales', false, 10),
('Priority support', 'Shield', 'Get priority help from support team', true, 11),
('API access', 'Globe', 'Access DukaBook API for integrations', true, 12)
ON CONFLICT DO NOTHING;

-- Index
CREATE INDEX IF NOT EXISTS idx_features_is_active ON subscription_features(is_active);

-- RLS
ALTER TABLE subscription_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY subscription_features_access ON subscription_features FOR ALL USING (true);
