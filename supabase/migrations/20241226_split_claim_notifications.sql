-- Split Claim Notifications Migration
-- Adds notification types and triggers for split claim events

-- ============================================
-- ADD NEW NOTIFICATION TYPES
-- ============================================

-- Add new enum values for split claim notifications
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'split_initiated';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'split_joined';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'split_left';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'split_confirmed';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'split_cancelled';

-- ============================================
-- ADD SPLIT CLAIM REFERENCE TO NOTIFICATIONS
-- ============================================

-- Add split_claim_id column to notifications table
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS split_claim_id UUID REFERENCES split_claims(id) ON DELETE CASCADE;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_notifications_split_claim_id ON notifications(split_claim_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to notify all participants of a split claim
CREATE OR REPLACE FUNCTION notify_split_participants(
  p_split_claim_id UUID,
  p_type notification_type,
  p_title TEXT,
  p_message TEXT,
  p_actor_id UUID,
  p_exclude_user_id UUID DEFAULT NULL,
  p_item_id UUID DEFAULT NULL,
  p_wishlist_id UUID DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  participant_record RECORD;
BEGIN
  FOR participant_record IN
    SELECT user_id
    FROM split_claim_participants
    WHERE split_claim_id = p_split_claim_id
    AND (p_exclude_user_id IS NULL OR user_id != p_exclude_user_id)
  LOOP
    INSERT INTO notifications (user_id, type, title, message, actor_id, split_claim_id, item_id, wishlist_id)
    VALUES (participant_record.user_id, p_type, p_title, p_message, p_actor_id, p_split_claim_id, p_item_id, p_wishlist_id);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get item and wishlist info for a split claim
CREATE OR REPLACE FUNCTION get_split_claim_item_info(p_item_id UUID)
RETURNS TABLE(
  item_title TEXT,
  wishlist_id UUID,
  wishlist_name TEXT,
  wishlist_owner_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    wi.title::TEXT as item_title,
    w.id as wishlist_id,
    w.name::TEXT as wishlist_name,
    w.user_id as wishlist_owner_id
  FROM wishlist_items wi
  JOIN wishlists w ON w.id = wi.wishlist_id
  WHERE wi.id = p_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- NOTIFICATION TRIGGERS
-- ============================================

-- Trigger: Notify friends when split claim is initiated
CREATE OR REPLACE FUNCTION create_split_initiated_notification()
RETURNS TRIGGER AS $$
DECLARE
  initiator_name TEXT;
  item_info RECORD;
BEGIN
  -- Get initiator name
  SELECT display_name INTO initiator_name
  FROM profiles WHERE id = NEW.initiated_by;

  -- Get item and wishlist info
  SELECT * INTO item_info
  FROM get_split_claim_item_info(NEW.item_id);

  -- Notify all friends who can view this wishlist (excluding wishlist owner)
  -- Using similar pattern to notify_friends but checking wishlist visibility
  INSERT INTO notifications (user_id, type, title, message, actor_id, split_claim_id, item_id, wishlist_id)
  SELECT
    CASE
      WHEN f.requester_id = NEW.initiated_by THEN f.addressee_id
      ELSE f.requester_id
    END as friend_id,
    'split_initiated',
    'Split Gift Started',
    COALESCE(initiator_name, 'Someone') || ' started a split for "' || COALESCE(item_info.item_title, 'an item') || '"',
    NEW.initiated_by,
    NEW.id,
    NEW.item_id,
    item_info.wishlist_id
  FROM friendships f
  WHERE f.status = 'accepted'
  AND (f.requester_id = NEW.initiated_by OR f.addressee_id = NEW.initiated_by)
  -- Exclude the wishlist owner (they shouldn't see claims)
  AND CASE
    WHEN f.requester_id = NEW.initiated_by THEN f.addressee_id
    ELSE f.requester_id
  END != item_info.wishlist_owner_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_split_claim_initiated
  AFTER INSERT ON split_claims
  FOR EACH ROW EXECUTE FUNCTION create_split_initiated_notification();

-- Trigger: Notify participants when someone joins a split
CREATE OR REPLACE FUNCTION create_split_joined_notification()
RETURNS TRIGGER AS $$
DECLARE
  joiner_name TEXT;
  split_info RECORD;
  item_info RECORD;
BEGIN
  -- Get split claim info
  SELECT * INTO split_info
  FROM split_claims WHERE id = NEW.split_claim_id;

  -- Don't notify if this is the initiator joining (they're auto-added)
  IF split_info.initiated_by = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Get joiner name
  SELECT display_name INTO joiner_name
  FROM profiles WHERE id = NEW.user_id;

  -- Get item info
  SELECT * INTO item_info
  FROM get_split_claim_item_info(split_info.item_id);

  -- Notify all existing participants except the joiner
  PERFORM notify_split_participants(
    NEW.split_claim_id,
    'split_joined',
    'Someone Joined Split',
    COALESCE(joiner_name, 'Someone') || ' joined the split for "' || COALESCE(item_info.item_title, 'an item') || '"',
    NEW.user_id,
    NEW.user_id,
    split_info.item_id,
    item_info.wishlist_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_split_participant_joined
  AFTER INSERT ON split_claim_participants
  FOR EACH ROW EXECUTE FUNCTION create_split_joined_notification();

-- Trigger: Notify participants when someone leaves a split (before delete to access data)
CREATE OR REPLACE FUNCTION create_split_left_notification()
RETURNS TRIGGER AS $$
DECLARE
  leaver_name TEXT;
  split_info RECORD;
  item_info RECORD;
BEGIN
  -- Get split claim info
  SELECT * INTO split_info
  FROM split_claims WHERE id = OLD.split_claim_id;

  -- If the split claim doesn't exist (being deleted via cascade), skip
  IF split_info IS NULL THEN
    RETURN OLD;
  END IF;

  -- If the initiator is leaving, the split will be cancelled (handled by split_cancelled trigger)
  IF split_info.initiated_by = OLD.user_id THEN
    RETURN OLD;
  END IF;

  -- Get leaver name
  SELECT display_name INTO leaver_name
  FROM profiles WHERE id = OLD.user_id;

  -- Get item info
  SELECT * INTO item_info
  FROM get_split_claim_item_info(split_info.item_id);

  -- Notify all remaining participants (excluding the leaver)
  PERFORM notify_split_participants(
    OLD.split_claim_id,
    'split_left',
    'Someone Left Split',
    COALESCE(leaver_name, 'Someone') || ' left the split for "' || COALESCE(item_info.item_title, 'an item') || '"',
    OLD.user_id,
    OLD.user_id,
    split_info.item_id,
    item_info.wishlist_id
  );

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_split_participant_left
  BEFORE DELETE ON split_claim_participants
  FOR EACH ROW EXECUTE FUNCTION create_split_left_notification();

-- Trigger: Notify participants when split is confirmed
CREATE OR REPLACE FUNCTION create_split_confirmed_notification()
RETURNS TRIGGER AS $$
DECLARE
  item_info RECORD;
BEGIN
  -- Only trigger when status changes from pending to confirmed
  IF OLD.status = 'pending' AND NEW.status = 'confirmed' THEN
    -- Get item info
    SELECT * INTO item_info
    FROM get_split_claim_item_info(NEW.item_id);

    -- Notify all participants
    PERFORM notify_split_participants(
      NEW.id,
      'split_confirmed',
      'Split Confirmed!',
      'The split for "' || COALESCE(item_info.item_title, 'an item') || '" is now confirmed',
      NEW.initiated_by,
      NULL,  -- Don't exclude anyone
      NEW.item_id,
      item_info.wishlist_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_split_claim_confirmed
  AFTER UPDATE ON split_claims
  FOR EACH ROW EXECUTE FUNCTION create_split_confirmed_notification();

-- Trigger: Notify participants when split is cancelled (before delete to access participants)
CREATE OR REPLACE FUNCTION create_split_cancelled_notification()
RETURNS TRIGGER AS $$
DECLARE
  initiator_name TEXT;
  item_info RECORD;
  participant_record RECORD;
BEGIN
  -- Only if status is pending (confirmed splits shouldn't be cancelled)
  IF OLD.status != 'pending' THEN
    RETURN OLD;
  END IF;

  -- Get initiator name
  SELECT display_name INTO initiator_name
  FROM profiles WHERE id = OLD.initiated_by;

  -- Get item info
  SELECT * INTO item_info
  FROM get_split_claim_item_info(OLD.item_id);

  -- Notify all participants except the initiator (who cancelled it)
  FOR participant_record IN
    SELECT user_id
    FROM split_claim_participants
    WHERE split_claim_id = OLD.id
    AND user_id != OLD.initiated_by
  LOOP
    INSERT INTO notifications (user_id, type, title, message, actor_id, split_claim_id, item_id, wishlist_id)
    VALUES (
      participant_record.user_id,
      'split_cancelled',
      'Split Cancelled',
      COALESCE(initiator_name, 'Someone') || ' cancelled the split for "' || COALESCE(item_info.item_title, 'an item') || '"',
      OLD.initiated_by,
      NULL,  -- Explicitly NULL because split_claim is being deleted
      OLD.item_id,
      item_info.wishlist_id
    );
  END LOOP;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_split_claim_cancelled
  BEFORE DELETE ON split_claims
  FOR EACH ROW EXECUTE FUNCTION create_split_cancelled_notification();
