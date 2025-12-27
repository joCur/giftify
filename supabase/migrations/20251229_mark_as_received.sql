-- Mark as Received Feature
-- Allows owners to mark items as received (gift from someone) and gifters to mark claims as given

-- Add is_received column to wishlist_items (distinct from is_purchased)
-- is_purchased = owner bought it themselves
-- is_received = owner received it as a gift
ALTER TABLE wishlist_items
  ADD COLUMN IF NOT EXISTS is_received BOOLEAN DEFAULT FALSE NOT NULL;

-- Add 'fulfilled' status to claim_status enum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'fulfilled' AND enumtypid = 'claim_status'::regtype) THEN
    ALTER TYPE claim_status ADD VALUE 'fulfilled';
  END IF;
END $$;

-- Add fulfilled_at timestamp to item_claims
ALTER TABLE item_claims
  ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMPTZ;

-- Add fulfilled_at timestamp to split_claims
ALTER TABLE split_claims
  ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMPTZ;

-- Add new notification types for gift fulfillment (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'gift_received' AND enumtypid = 'notification_type'::regtype) THEN
    ALTER TYPE notification_type ADD VALUE 'gift_received';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'gift_marked_given' AND enumtypid = 'notification_type'::regtype) THEN
    ALTER TYPE notification_type ADD VALUE 'gift_marked_given';
  END IF;
END $$;

-- Indexes for performance (IF NOT EXISTS is implicit for CREATE INDEX)
CREATE INDEX IF NOT EXISTS idx_wishlist_items_is_received ON wishlist_items(is_received);
CREATE INDEX IF NOT EXISTS idx_item_claims_fulfilled_at ON item_claims(fulfilled_at) WHERE fulfilled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_split_claims_fulfilled_at ON split_claims(fulfilled_at) WHERE fulfilled_at IS NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN wishlist_items.is_received IS 'True when the owner received this item as a gift (distinct from is_purchased which means owner bought it themselves)';
COMMENT ON COLUMN item_claims.fulfilled_at IS 'Timestamp when the claim was marked as fulfilled (gift given/received)';
COMMENT ON COLUMN split_claims.fulfilled_at IS 'Timestamp when the split claim was marked as fulfilled (gift given/received)';

-- Function to fulfill claims when owner marks item as received
-- Uses SECURITY DEFINER to bypass RLS (owner can't see claims on their own items)
-- Also creates notifications directly to bypass RLS on notifications table
CREATE OR REPLACE FUNCTION fulfill_claims_for_item(p_item_id UUID, p_owner_id UUID DEFAULT NULL)
RETURNS TABLE (
  claim_type TEXT,
  claim_id UUID,
  claimer_ids UUID[]
) AS $$
DECLARE
  v_solo_claim RECORD;
  v_split_claim RECORD;
  v_participant_ids UUID[];
  v_item RECORD;
  v_owner RECORD;
  v_claimer_id UUID;
BEGIN
  -- Get item details for notifications
  SELECT wi.title, wi.wishlist_id INTO v_item
  FROM wishlist_items wi
  WHERE wi.id = p_item_id;

  -- Get owner's display name for notification message
  IF p_owner_id IS NOT NULL THEN
    SELECT display_name INTO v_owner
    FROM profiles
    WHERE id = p_owner_id;
  END IF;

  -- Check for solo claim
  SELECT id, claimed_by INTO v_solo_claim
  FROM item_claims
  WHERE item_id = p_item_id AND status = 'active'
  LIMIT 1;

  IF v_solo_claim.id IS NOT NULL THEN
    -- Update solo claim to fulfilled
    UPDATE item_claims
    SET status = 'fulfilled', fulfilled_at = NOW()
    WHERE id = v_solo_claim.id;

    -- Create notification for the claimer (bypass RLS with SECURITY DEFINER)
    INSERT INTO notifications (user_id, type, title, message, actor_id, wishlist_id, item_id)
    VALUES (
      v_solo_claim.claimed_by,
      'gift_received',
      'Gift Received!',
      COALESCE(v_owner.display_name, 'Someone') || ' marked "' || COALESCE(v_item.title, 'an item') || '" as received. Thank you for the gift!',
      p_owner_id,
      v_item.wishlist_id,
      p_item_id
    );

    RETURN QUERY SELECT 'solo'::TEXT, v_solo_claim.id, ARRAY[v_solo_claim.claimed_by];
    RETURN;
  END IF;

  -- Check for split claim
  SELECT id INTO v_split_claim
  FROM split_claims
  WHERE item_id = p_item_id AND claim_status = 'active'
  LIMIT 1;

  IF v_split_claim.id IS NOT NULL THEN
    -- Update split claim to fulfilled
    UPDATE split_claims
    SET claim_status = 'fulfilled', fulfilled_at = NOW()
    WHERE id = v_split_claim.id;

    -- Get all participant IDs
    SELECT ARRAY_AGG(user_id) INTO v_participant_ids
    FROM split_claim_participants
    WHERE split_claim_id = v_split_claim.id;

    -- Create notifications for all participants (bypass RLS with SECURITY DEFINER)
    IF v_participant_ids IS NOT NULL THEN
      FOREACH v_claimer_id IN ARRAY v_participant_ids
      LOOP
        INSERT INTO notifications (user_id, type, title, message, actor_id, wishlist_id, item_id)
        VALUES (
          v_claimer_id,
          'gift_received',
          'Gift Received!',
          COALESCE(v_owner.display_name, 'Someone') || ' marked "' || COALESCE(v_item.title, 'an item') || '" as received. Thank you for the gift!',
          p_owner_id,
          v_item.wishlist_id,
          p_item_id
        );
      END LOOP;
    END IF;

    RETURN QUERY SELECT 'split'::TEXT, v_split_claim.id, v_participant_ids;
    RETURN;
  END IF;

  -- No claims found
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
