-- ============================================================================
-- Migration: Expand business_type constraint to support niche features
-- ============================================================================
-- This migration updates the stores table to accept more business types
-- for the Chameleon super-app architecture.

BEGIN;

-- Drop the old constraint
ALTER TABLE stores DROP CONSTRAINT stores_business_type_check;

-- Add new constraint with expanded business types
ALTER TABLE stores ADD CONSTRAINT stores_business_type_check 
  CHECK (business_type IN (
    'HARDWARE',
    'WHOLESALER', 
    'BOUTIQUE',
    'PHARMACY',
    'GENERAL',
    'COSMETICS',
    'BROKERAGE',
    'OTHER',
    'WINES',
    'SALON',
    'CHEMIST'
  ));

COMMIT;
