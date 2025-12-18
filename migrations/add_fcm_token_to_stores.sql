-- Add FCM token and notification preferences to stores table
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS fcm_token TEXT NULL,
ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS fcm_token_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_stores_fcm_token ON stores(fcm_token)
WHERE fcm_token IS NOT NULL;

-- Comment for clarity
COMMENT ON COLUMN stores.fcm_token IS 'Firebase Cloud Messaging token for push notifications';
COMMENT ON COLUMN stores.notifications_enabled IS 'Whether the store has enabled push notifications';
COMMENT ON COLUMN stores.fcm_token_updated_at IS 'Last time the FCM token was updated or refreshed';
