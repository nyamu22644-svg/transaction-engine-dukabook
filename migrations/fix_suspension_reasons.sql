-- ============================================================================
-- Fix Suspension Reasons - Update Old Messages to Professional ones
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Update all suspended stores with the old "Suspended by SuperAdmin" message
-- to the new professional message
UPDATE stores 
SET suspension_reason = 'Account suspended by DukaBook technical team'
WHERE is_suspended = true 
AND (suspension_reason = 'Suspended by SuperAdmin' 
     OR suspension_reason IS NULL 
     OR suspension_reason = 'Suspended by admin');

-- Verify the update
SELECT id, name, suspension_reason, suspended_at 
FROM stores 
WHERE is_suspended = true;
