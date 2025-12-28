-- Fix: Allow reclaiming items after cancellation
-- Problem: UNIQUE(item_id) constraint prevents multiple rows even with different statuses
-- Solution: Replace with partial unique index that only enforces uniqueness for active claims

-- =============================================================================
-- FIX ITEM_CLAIMS TABLE
-- =============================================================================

-- Drop the existing unique constraint on item_id
ALTER TABLE item_claims DROP CONSTRAINT IF EXISTS item_claims_item_id_key;

-- Create partial unique index: only one ACTIVE claim per item
-- This allows multiple cancelled/fulfilled claims for the same item (preserving history)
-- but still prevents duplicate active claims
CREATE UNIQUE INDEX idx_item_claims_item_id_active
  ON item_claims(item_id)
  WHERE status = 'active';

-- =============================================================================
-- FIX SPLIT_CLAIMS TABLE
-- =============================================================================

-- Drop the existing unique constraint on item_id
ALTER TABLE split_claims DROP CONSTRAINT IF EXISTS split_claims_item_id_key;

-- Create partial unique index: only one ACTIVE split claim per item
CREATE UNIQUE INDEX idx_split_claims_item_id_active
  ON split_claims(item_id)
  WHERE claim_status = 'active';

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON INDEX idx_item_claims_item_id_active IS
  'Ensures only one active claim per item while allowing multiple cancelled/fulfilled claims for history';

COMMENT ON INDEX idx_split_claims_item_id_active IS
  'Ensures only one active split claim per item while allowing multiple cancelled/fulfilled claims for history';
