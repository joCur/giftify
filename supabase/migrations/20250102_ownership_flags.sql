-- Ownership Flags Migration
-- Allows friends to flag items as "already owned" by the wishlist owner
-- Owner must confirm/deny, which archives the item or returns it to normal

-- Create ownership flag status enum
CREATE TYPE ownership_flag_status AS ENUM ('pending', 'confirmed', 'denied');

-- Create ownership flags table
CREATE TABLE item_ownership_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES wishlist_items(id) ON DELETE CASCADE,
  flagged_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status ownership_flag_status DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  resolved_at TIMESTAMPTZ,
  -- Only one active flag per item
  UNIQUE(item_id)
);

-- Create indexes for performance
CREATE INDEX idx_item_ownership_flags_item_id ON item_ownership_flags(item_id);
CREATE INDEX idx_item_ownership_flags_flagged_by ON item_ownership_flags(flagged_by);
CREATE INDEX idx_item_ownership_flags_status ON item_ownership_flags(status);

-- Apply updated_at trigger to item_ownership_flags
CREATE TRIGGER update_item_ownership_flags_updated_at
  BEFORE UPDATE ON item_ownership_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add new notification types
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'item_flagged_already_owned';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'flag_confirmed';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'flag_denied';

-- Add foreign key to notifications table for ownership flags
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS ownership_flag_id UUID REFERENCES item_ownership_flags(id) ON DELETE CASCADE;

-- ============================================
-- TRIGGERS FOR AUTOMATED WORKFLOWS
-- ============================================

-- Trigger 1: Auto-unclaim items when flag is confirmed
CREATE OR REPLACE FUNCTION handle_ownership_flag_confirmed()
RETURNS TRIGGER AS $$
BEGIN
  -- If status changed to confirmed, delete all claims on this item
  IF NEW.status = 'confirmed' AND OLD.status = 'pending' THEN
    -- Delete solo claims
    DELETE FROM item_claims WHERE item_id = NEW.item_id;

    -- Delete split claims (cascades to participants)
    DELETE FROM split_claims WHERE item_id = NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_ownership_flag_confirmed
  AFTER UPDATE ON item_ownership_flags
  FOR EACH ROW
  WHEN (NEW.status = 'confirmed' AND OLD.status = 'pending')
  EXECUTE FUNCTION handle_ownership_flag_confirmed();

-- Trigger 2: Notify owner when item is flagged
CREATE OR REPLACE FUNCTION notify_owner_on_flag_created()
RETURNS TRIGGER AS $$
DECLARE
  owner_id UUID;
  owner_name TEXT;
  flagger_name TEXT;
  item_title TEXT;
  wishlist_id_var UUID;
BEGIN
  -- Get owner, flagger, and item info
  SELECT w.user_id, p.display_name, wi.title, wi.wishlist_id
  INTO owner_id, owner_name, item_title, wishlist_id_var
  FROM wishlist_items wi
  JOIN wishlists w ON w.id = wi.wishlist_id
  LEFT JOIN profiles p ON p.id = w.user_id
  WHERE wi.id = NEW.item_id;

  -- Get flagger name
  SELECT display_name INTO flagger_name
  FROM profiles
  WHERE id = NEW.flagged_by;

  -- Create notification for owner
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    actor_id,
    item_id,
    wishlist_id,
    ownership_flag_id
  ) VALUES (
    owner_id,
    'item_flagged_already_owned',
    'Item Ownership Question',
    COALESCE(flagger_name, 'A friend') || ' thinks you might already own "' || item_title || '"',
    NEW.flagged_by,
    NEW.item_id,
    wishlist_id_var,
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_owner_on_flag
  AFTER INSERT ON item_ownership_flags
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION notify_owner_on_flag_created();

-- Trigger 3: Notify flagger when flag is resolved (confirmed or denied)
CREATE OR REPLACE FUNCTION notify_on_flag_resolution()
RETURNS TRIGGER AS $$
DECLARE
  owner_name TEXT;
  item_title TEXT;
  owner_id UUID;
  wishlist_id_var UUID;
BEGIN
  IF NEW.status IN ('confirmed', 'denied') AND OLD.status = 'pending' THEN
    -- Get owner and item info
    SELECT p.display_name, wi.title, w.user_id, w.id
    INTO owner_name, item_title, owner_id, wishlist_id_var
    FROM wishlist_items wi
    JOIN wishlists w ON w.id = wi.wishlist_id
    JOIN profiles p ON p.id = w.user_id
    WHERE wi.id = NEW.item_id;

    -- Create notification for flagger
    INSERT INTO notifications (user_id, type, title, message, actor_id, item_id, wishlist_id, ownership_flag_id)
    VALUES (
      NEW.flagged_by,
      (CASE WHEN NEW.status = 'confirmed' THEN 'flag_confirmed' ELSE 'flag_denied' END)::notification_type,
      CASE WHEN NEW.status = 'confirmed' THEN 'Item Confirmed as Owned' ELSE 'Item Still Wanted' END,
      CASE
        WHEN NEW.status = 'confirmed'
        THEN COALESCE(owner_name, 'The owner') || ' confirmed they already own "' || item_title || '"'
        ELSE COALESCE(owner_name, 'The owner') || ' says they still want "' || item_title || '"'
      END,
      owner_id,
      NEW.item_id,
      wishlist_id_var,
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_flag_resolution
  AFTER UPDATE ON item_ownership_flags
  FOR EACH ROW
  WHEN (NEW.status IN ('confirmed', 'denied') AND OLD.status = 'pending')
  EXECUTE FUNCTION notify_on_flag_resolution();

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE item_ownership_flags ENABLE ROW LEVEL SECURITY;

-- Friends can view flags on items they can see
CREATE POLICY "Users can view flags on viewable items"
  ON item_ownership_flags FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wishlist_items wi
      JOIN wishlists w ON w.id = wi.wishlist_id
      WHERE wi.id = item_ownership_flags.item_id
      AND can_view_wishlist(w.id, auth.uid())
    )
  );

-- Friends can create flags on viewable items (not their own)
CREATE POLICY "Users can flag items on viewable wishlists"
  ON item_ownership_flags FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = flagged_by
    AND EXISTS (
      SELECT 1 FROM wishlist_items wi
      JOIN wishlists w ON w.id = wi.wishlist_id
      WHERE wi.id = item_ownership_flags.item_id
      AND w.user_id != auth.uid()
      AND can_view_wishlist(w.id, auth.uid())
    )
  );

-- Only item owner can update flag status
CREATE POLICY "Owners can update flags on their items"
  ON item_ownership_flags FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wishlist_items wi
      JOIN wishlists w ON w.id = wi.wishlist_id
      WHERE wi.id = item_ownership_flags.item_id
      AND w.user_id = auth.uid()
    )
  );

-- Users can delete flags they created (only if still pending)
CREATE POLICY "Users can delete their own pending flags"
  ON item_ownership_flags FOR DELETE
  TO authenticated
  USING (
    auth.uid() = flagged_by
    AND status = 'pending'
  );
