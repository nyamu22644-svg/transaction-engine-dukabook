-- Create reminder settings table
CREATE TABLE IF NOT EXISTS reminder_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cron_hour INTEGER DEFAULT 8 CHECK (cron_hour >= 0 AND cron_hour <= 23),
  afternoon_cron_hour INTEGER DEFAULT 15 CHECK (afternoon_cron_hour >= 0 AND afternoon_cron_hour <= 23),
  trial_days_before INTEGER DEFAULT 3,
  payment_days_before_7 INTEGER DEFAULT 7,
  payment_days_before_3 INTEGER DEFAULT 3,
  enable_trial_reminders BOOLEAN DEFAULT true,
  enable_payment_reminders BOOLEAN DEFAULT true,
  enable_overdue_reminders BOOLEAN DEFAULT true,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT
);

-- Add afternoon_cron_hour column if it doesn't exist (for existing tables)
ALTER TABLE reminder_settings
ADD COLUMN IF NOT EXISTS afternoon_cron_hour INTEGER DEFAULT 15 CHECK (afternoon_cron_hour >= 0 AND afternoon_cron_hour <= 23);

-- Insert default settings only if table is empty
INSERT INTO reminder_settings (cron_hour, afternoon_cron_hour, trial_days_before, payment_days_before_7, payment_days_before_3)
SELECT 8, 15, 3, 7, 3
WHERE NOT EXISTS (SELECT 1 FROM reminder_settings);

-- Enable RLS
ALTER TABLE reminder_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists, then create it
DROP POLICY IF EXISTS "Superadmin can manage reminder settings" ON reminder_settings;

CREATE POLICY "Superadmin can manage reminder settings"
  ON reminder_settings
  USING (true)
  WITH CHECK (true);
