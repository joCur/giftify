-- ============================================
-- WISHLIST PRIVACY: SELECTED FRIENDS
-- ============================================
-- Changes privacy from 'public/friends/private' to 'friends/selected_friends/private'
-- Adds ability for users to select specific friends who can see a wishlist

-- Step 1: Add new privacy enum value
ALTER TYPE wishlist_privacy ADD VALUE 'selected_friends';

-- Step 2: Create new table for selected friend visibility
CREATE TABLE wishlist_selected_friends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wishlist_id UUID NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Prevent duplicate entries
  UNIQUE(wishlist_id, friend_id)
);

-- Step 3: Create indexes for performance
CREATE INDEX idx_wishlist_selected_friends_wishlist_id ON wishlist_selected_friends(wishlist_id);
CREATE INDEX idx_wishlist_selected_friends_friend_id ON wishlist_selected_friends(friend_id);

-- Step 4: Migrate existing 'public' wishlists to 'friends' (same behavior)
UPDATE wishlists SET privacy = 'friends' WHERE privacy = 'public';

-- Step 5: Update the can_view_wishlist function to handle selected_friends
CREATE OR REPLACE FUNCTION can_view_wishlist(wishlist_id UUID, viewer_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  wishlist_record RECORD;
BEGIN
  SELECT user_id, privacy INTO wishlist_record
  FROM wishlists WHERE id = wishlist_id;

  -- Owner can always view
  IF wishlist_record.user_id = viewer_id THEN
    RETURN TRUE;
  END IF;

  -- Check based on privacy setting
  CASE wishlist_record.privacy
    WHEN 'friends' THEN
      -- All friends can view
      RETURN are_friends(wishlist_record.user_id, viewer_id);
    WHEN 'selected_friends' THEN
      -- Only selected friends can view (must be friends AND in the list)
      RETURN are_friends(wishlist_record.user_id, viewer_id)
        AND EXISTS (
          SELECT 1 FROM wishlist_selected_friends
          WHERE wishlist_selected_friends.wishlist_id = can_view_wishlist.wishlist_id
          AND wishlist_selected_friends.friend_id = viewer_id
        );
    WHEN 'private' THEN
      -- Private wishlists only visible to owner
      RETURN FALSE;
    ELSE
      -- Handle legacy 'public' same as 'friends' (shouldn't happen after migration)
      RETURN are_friends(wishlist_record.user_id, viewer_id);
  END CASE;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create trigger to clean up selected friends when friendship is removed
CREATE OR REPLACE FUNCTION cleanup_wishlist_selected_friends_on_unfriend()
RETURNS TRIGGER AS $$
BEGIN
  -- Remove all wishlist_selected_friends entries between these two users
  DELETE FROM wishlist_selected_friends
  WHERE (
    -- Remove requester's wishlists from addressee's access
    wishlist_id IN (
      SELECT id FROM wishlists WHERE user_id = OLD.requester_id
    ) AND friend_id = OLD.addressee_id
  ) OR (
    -- Remove addressee's wishlists from requester's access
    wishlist_id IN (
      SELECT id FROM wishlists WHERE user_id = OLD.addressee_id
    ) AND friend_id = OLD.requester_id
  );

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger on friendship deletion
CREATE TRIGGER on_friendship_deleted
  BEFORE DELETE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_wishlist_selected_friends_on_unfriend();

-- Step 7: RLS Policies for wishlist_selected_friends table
ALTER TABLE wishlist_selected_friends ENABLE ROW LEVEL SECURITY;

-- Users can view selected friends for their own wishlists
CREATE POLICY "Users can view selected friends for their own wishlists"
  ON wishlist_selected_friends FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wishlists
      WHERE wishlists.id = wishlist_selected_friends.wishlist_id
      AND wishlists.user_id = auth.uid()
    )
  );

-- Users can add selected friends to their own wishlists
CREATE POLICY "Users can add selected friends to their own wishlists"
  ON wishlist_selected_friends FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wishlists
      WHERE wishlists.id = wishlist_selected_friends.wishlist_id
      AND wishlists.user_id = auth.uid()
    )
  );

-- Users can remove selected friends from their own wishlists
CREATE POLICY "Users can remove selected friends from their own wishlists"
  ON wishlist_selected_friends FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wishlists
      WHERE wishlists.id = wishlist_selected_friends.wishlist_id
      AND wishlists.user_id = auth.uid()
    )
  );
