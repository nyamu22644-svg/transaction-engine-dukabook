-- ============================================================================
-- Reminder Message Templates
-- Allows customization of reminder messages per type
-- Run this in Supabase SQL Editor
-- ============================================================================

CREATE TABLE IF NOT EXISTS reminder_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reminder_type VARCHAR(50) NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default templates
INSERT INTO reminder_templates (reminder_type, subject, message) VALUES
  (
    'TRIAL_ENDING',
    '⏰ Your DukaBook free trial is ending soon',
    'Hi {storeName},

Your free trial period is ending in {daysLeft} days ({expiryDate}). After that, you''ll need to upgrade to a paid plan to continue using DukaBook.

Click the link below to upgrade now and enjoy uninterrupted service:
{paymentLink}

Best regards,
DukaBook Team'
  ),
  (
    'PAYMENT_DUE',
    '💳 Your DukaBook subscription payment is due',
    'Hi {storeName},

Your DukaBook subscription payment is due in {daysLeft} days ({expiryDate}). Please ensure payment is made on time to avoid service interruption.

Pay via M-Pesa to: 174379
Account: {accessCode}

{paymentLink}

Best regards,
DukaBook Team'
  ),
  (
    'OVERDUE',
    '⚠️ Your DukaBook subscription payment is overdue',
    'Hi {storeName},

Your subscription payment is now overdue by {daysLeft} days. Your access may be suspended soon if payment is not received.

Please pay immediately:
M-Pesa: 174379
Account: {accessCode}

{paymentLink}

Contact support: support@dukabook.com

Best regards,
DukaBook Team'
  ),
  (
    'FINAL_WARNING',
    '🚨 URGENT: Your DukaBook account will be suspended',
    'Hi {storeName},

Your account will be SUSPENDED in 24 hours due to unpaid subscription.

Pay now to avoid losing access:
M-Pesa: 174379
Account: {accessCode}

{paymentLink}

Contact: support@dukabook.com

Best regards,
DukaBook Team'
  ),
  (
    'MANUAL_REMINDER',
    '📢 DukaBook Subscription Reminder',
    'Hi {storeName},

This is a reminder that your DukaBook subscription will expire in {daysLeft} days ({expiryDate}).

To keep your store running smoothly, please renew your subscription now:
M-Pesa: 174379
Account: {accessCode}

{paymentLink}

Thank you for using DukaBook!

Best regards,
DukaBook Team'
  )
ON CONFLICT (reminder_type) DO NOTHING;

-- ============================================================================
-- End of Migration
-- ============================================================================
