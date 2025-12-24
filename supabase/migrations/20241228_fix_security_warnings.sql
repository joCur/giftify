-- Fix Supabase Security Warnings Migration
-- 1. Adds SET search_path = public to all SECURITY DEFINER functions
-- 2. Updates RLS policies to use (select auth.uid()) for better performance

-- ============================================
-- PART 1: FIX FUNCTION SEARCH_PATH ISSUES
-- ============================================
-- Functions need SET search_path = public to prevent search_path injection attacks

-- Fix: update_updated_at_column()
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fix: prevent_solo_on_split_item()
CREATE OR REPLACE FUNCTION prevent_solo_on_split_item()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM split_claims WHERE item_id = NEW.item_id) THEN
    RAISE EXCEPTION 'Item already has a split claim in progress';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fix: prevent_split_on_claimed_item()
CREATE OR REPLACE FUNCTION prevent_split_on_claimed_item()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM item_claims WHERE item_id = NEW.item_id) THEN
    RAISE EXCEPTION 'Item already has a solo claim';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fix: are_friends()
CREATE OR REPLACE FUNCTION are_friends(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM friendships
    WHERE status = 'accepted'
    AND (
      (requester_id = user1_id AND addressee_id = user2_id)
      OR (requester_id = user2_id AND addressee_id = user1_id)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix: can_view_wishlist()
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

  -- Check based on privacy setting and return result
  RETURN CASE wishlist_record.privacy
    WHEN 'friends' THEN
      -- All friends can view
      are_friends(wishlist_record.user_id, viewer_id)
    WHEN 'selected_friends' THEN
      -- Only selected friends can view (must be friends AND in the list)
      are_friends(wishlist_record.user_id, viewer_id)
        AND EXISTS (
          SELECT 1 FROM wishlist_selected_friends
          WHERE wishlist_selected_friends.wishlist_id = can_view_wishlist.wishlist_id
          AND wishlist_selected_friends.friend_id = viewer_id
        )
    WHEN 'private' THEN
      -- Private wishlists only visible to owner
      FALSE
    ELSE
      -- Handle legacy 'public' same as 'friends' (shouldn't happen after migration)
      are_friends(wishlist_record.user_id, viewer_id)
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix: notify_friends()
CREATE OR REPLACE FUNCTION notify_friends(
  p_user_id UUID,
  p_type notification_type,
  p_title TEXT,
  p_message TEXT,
  p_wishlist_id UUID DEFAULT NULL,
  p_item_id UUID DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  friend_record RECORD;
BEGIN
  FOR friend_record IN
    SELECT
      CASE
        WHEN requester_id = p_user_id THEN addressee_id
        ELSE requester_id
      END as friend_id
    FROM friendships
    WHERE status = 'accepted'
    AND (requester_id = p_user_id OR addressee_id = p_user_id)
  LOOP
    INSERT INTO notifications (user_id, type, title, message, actor_id, wishlist_id, item_id)
    VALUES (friend_record.friend_id, p_type, p_title, p_message, p_user_id, p_wishlist_id, p_item_id);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix: create_friend_request_notification()
CREATE OR REPLACE FUNCTION create_friend_request_notification()
RETURNS TRIGGER AS $$
DECLARE
  requester_name TEXT;
BEGIN
  -- Only create notification for new pending requests
  IF NEW.status = 'pending' THEN
    SELECT display_name INTO requester_name
    FROM profiles WHERE id = NEW.requester_id;

    INSERT INTO notifications (user_id, type, title, message, actor_id, friendship_id)
    VALUES (
      NEW.addressee_id,
      'friend_request_received',
      'New Friend Request',
      COALESCE(requester_name, 'Someone') || ' sent you a friend request',
      NEW.requester_id,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix: create_friend_accepted_notification()
CREATE OR REPLACE FUNCTION create_friend_accepted_notification()
RETURNS TRIGGER AS $$
DECLARE
  addressee_name TEXT;
BEGIN
  -- Only create notification when status changes to accepted
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    SELECT display_name INTO addressee_name
    FROM profiles WHERE id = NEW.addressee_id;

    INSERT INTO notifications (user_id, type, title, message, actor_id, friendship_id)
    VALUES (
      NEW.requester_id,
      'friend_request_accepted',
      'Friend Request Accepted',
      COALESCE(addressee_name, 'Someone') || ' accepted your friend request',
      NEW.addressee_id,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix: create_wishlist_notification()
CREATE OR REPLACE FUNCTION create_wishlist_notification()
RETURNS TRIGGER AS $$
DECLARE
  owner_name TEXT;
BEGIN
  -- Only notify for non-private wishlists
  IF NEW.privacy != 'private' THEN
    SELECT display_name INTO owner_name
    FROM profiles WHERE id = NEW.user_id;

    PERFORM notify_friends(
      NEW.user_id,
      'wishlist_created',
      'New Wishlist',
      COALESCE(owner_name, 'A friend') || ' created a new wishlist: ' || NEW.name,
      NEW.id,
      NULL
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix: create_item_added_notification()
CREATE OR REPLACE FUNCTION create_item_added_notification()
RETURNS TRIGGER AS $$
DECLARE
  wishlist_record RECORD;
BEGIN
  -- Get wishlist info
  SELECT w.*, p.display_name as owner_name
  INTO wishlist_record
  FROM wishlists w
  JOIN profiles p ON w.user_id = p.id
  WHERE w.id = NEW.wishlist_id;

  -- Only proceed if wishlist exists and is not private
  IF wishlist_record IS NOT NULL AND wishlist_record.privacy != 'private' THEN
    PERFORM notify_friends(
      wishlist_record.user_id,
      'item_added',
      'New Item Added',
      COALESCE(wishlist_record.owner_name, 'A friend') || ' added "' || NEW.title || '" to ' || wishlist_record.name,
      NEW.wishlist_id,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix: create_default_notification_preferences()
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id, birthday_reminder_days)
  VALUES (NEW.id, 7)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix: send_birthday_reminders()
CREATE OR REPLACE FUNCTION send_birthday_reminders()
RETURNS void AS $$
DECLARE
  pref_record RECORD;
  friend_record RECORD;
  target_date DATE;
  birthday_this_year DATE;
  days_until INTEGER;
  notification_message TEXT;
BEGIN
  -- Loop through all users with birthday notifications enabled
  FOR pref_record IN
    SELECT user_id, birthday_reminder_days
    FROM notification_preferences
    WHERE birthday_reminder_days > 0
  LOOP
    -- Calculate target date (today + reminder days)
    target_date := CURRENT_DATE + pref_record.birthday_reminder_days;

    -- Find friends with birthdays on the target date
    FOR friend_record IN
      SELECT
        p.id as friend_id,
        p.display_name as friend_name,
        p.birthday as friend_birthday
      FROM friendships f
      JOIN profiles p ON (
        CASE
          WHEN f.requester_id = pref_record.user_id THEN f.addressee_id
          ELSE f.requester_id
        END = p.id
      )
      WHERE f.status = 'accepted'
      AND (f.requester_id = pref_record.user_id OR f.addressee_id = pref_record.user_id)
      AND p.birthday IS NOT NULL
    LOOP
      -- Calculate birthday this year
      birthday_this_year := make_date(
        EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
        EXTRACT(MONTH FROM friend_record.friend_birthday)::INTEGER,
        EXTRACT(DAY FROM friend_record.friend_birthday)::INTEGER
      );

      -- If birthday already passed this year, check next year
      IF birthday_this_year < CURRENT_DATE THEN
        birthday_this_year := birthday_this_year + INTERVAL '1 year';
      END IF;

      -- Check if birthday matches target date
      IF birthday_this_year = target_date THEN
        -- Check if we already sent a notification for this friend's birthday this year
        IF NOT EXISTS (
          SELECT 1 FROM notifications
          WHERE user_id = pref_record.user_id
          AND type = 'birthday_reminder'
          AND actor_id = friend_record.friend_id
          AND created_at >= date_trunc('year', CURRENT_DATE)
        ) THEN
          -- Calculate days until birthday
          days_until := pref_record.birthday_reminder_days;

          -- Build notification message
          IF days_until = 0 THEN
            notification_message := 'Today is ' || COALESCE(friend_record.friend_name, 'A friend') || '''s birthday!';
          ELSIF days_until = 1 THEN
            notification_message := COALESCE(friend_record.friend_name, 'A friend') || '''s birthday is tomorrow!';
          ELSE
            notification_message := COALESCE(friend_record.friend_name, 'A friend') || '''s birthday is in ' || days_until || ' days';
          END IF;

          -- Insert birthday reminder notification
          INSERT INTO notifications (user_id, type, title, message, actor_id)
          VALUES (
            pref_record.user_id,
            'birthday_reminder',
            'Birthday Reminder',
            notification_message,
            friend_record.friend_id
          );
        END IF;
      END IF;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix: cleanup_wishlist_selected_friends_on_unfriend()
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix: check_split_claim_completion()
CREATE OR REPLACE FUNCTION check_split_claim_completion()
RETURNS TRIGGER AS $$
DECLARE
  participant_count INT;
  target INT;
  current_status split_claim_status;
BEGIN
  -- Count participants AFTER the insert (trigger fires AFTER INSERT, so NEW row is counted)
  SELECT COUNT(*)
  INTO participant_count
  FROM split_claim_participants
  WHERE split_claim_id = NEW.split_claim_id;

  -- Get split claim details
  SELECT target_participants, status
  INTO target, current_status
  FROM split_claims
  WHERE id = NEW.split_claim_id;

  -- Auto-confirm if target reached and not already confirmed
  IF participant_count >= target AND current_status = 'pending' THEN
    UPDATE split_claims
    SET status = 'confirmed', confirmed_at = NOW()
    WHERE id = NEW.split_claim_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix: notify_split_participants()
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix: get_split_claim_item_info()
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix: create_split_initiated_notification()
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix: create_split_joined_notification()
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix: create_split_left_notification()
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix: create_split_confirmed_notification()
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix: create_split_cancelled_notification()
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ============================================
-- PART 2: FIX RLS POLICIES WITH (SELECT auth.uid())
-- ============================================
-- Replacing auth.uid() with (select auth.uid()) prevents re-evaluation for each row
-- This improves query performance significantly at scale

-- =====================
-- PROFILES TABLE
-- =====================
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- =====================
-- WISHLISTS TABLE
-- =====================
DROP POLICY IF EXISTS "Users can view their own wishlists" ON wishlists;
CREATE POLICY "Users can view their own wishlists"
  ON wishlists FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Friends can view wishlists based on privacy" ON wishlists;
CREATE POLICY "Friends can view wishlists based on privacy"
  ON wishlists FOR SELECT
  TO authenticated
  USING (
    user_id != (select auth.uid())
    AND can_view_wishlist(id, (select auth.uid()))
  );

DROP POLICY IF EXISTS "Users can create their own wishlists" ON wishlists;
CREATE POLICY "Users can create their own wishlists"
  ON wishlists FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own wishlists" ON wishlists;
CREATE POLICY "Users can update their own wishlists"
  ON wishlists FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own wishlists" ON wishlists;
CREATE POLICY "Users can delete their own wishlists"
  ON wishlists FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- =====================
-- WISHLIST_ITEMS TABLE
-- =====================
DROP POLICY IF EXISTS "Users can view their own wishlist items" ON wishlist_items;
CREATE POLICY "Users can view their own wishlist items"
  ON wishlist_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wishlists
      WHERE wishlists.id = wishlist_items.wishlist_id
      AND wishlists.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Friends can view items in viewable wishlists" ON wishlist_items;
CREATE POLICY "Friends can view items in viewable wishlists"
  ON wishlist_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wishlists
      WHERE wishlists.id = wishlist_items.wishlist_id
      AND wishlists.user_id != (select auth.uid())
      AND can_view_wishlist(wishlists.id, (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can create items in their own wishlists" ON wishlist_items;
CREATE POLICY "Users can create items in their own wishlists"
  ON wishlist_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wishlists
      WHERE wishlists.id = wishlist_items.wishlist_id
      AND wishlists.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update items in their own wishlists" ON wishlist_items;
CREATE POLICY "Users can update items in their own wishlists"
  ON wishlist_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wishlists
      WHERE wishlists.id = wishlist_items.wishlist_id
      AND wishlists.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wishlists
      WHERE wishlists.id = wishlist_items.wishlist_id
      AND wishlists.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete items from their own wishlists" ON wishlist_items;
CREATE POLICY "Users can delete items from their own wishlists"
  ON wishlist_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wishlists
      WHERE wishlists.id = wishlist_items.wishlist_id
      AND wishlists.user_id = (select auth.uid())
    )
  );

-- =====================
-- FRIENDSHIPS TABLE
-- =====================
DROP POLICY IF EXISTS "Users can view their own friendships" ON friendships;
CREATE POLICY "Users can view their own friendships"
  ON friendships FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = requester_id OR (select auth.uid()) = addressee_id);

DROP POLICY IF EXISTS "Users can send friend requests" ON friendships;
CREATE POLICY "Users can send friend requests"
  ON friendships FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = requester_id);

DROP POLICY IF EXISTS "Addressee can respond to friend requests" ON friendships;
CREATE POLICY "Addressee can respond to friend requests"
  ON friendships FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = addressee_id)
  WITH CHECK ((select auth.uid()) = addressee_id);

DROP POLICY IF EXISTS "Users can remove friendships" ON friendships;
CREATE POLICY "Users can remove friendships"
  ON friendships FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = requester_id OR (select auth.uid()) = addressee_id);

-- =====================
-- ITEM_CLAIMS TABLE
-- =====================
DROP POLICY IF EXISTS "Users can view claims on others wishlists" ON item_claims;
CREATE POLICY "Users can view claims on others wishlists"
  ON item_claims FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wishlist_items
      JOIN wishlists ON wishlists.id = wishlist_items.wishlist_id
      WHERE wishlist_items.id = item_claims.item_id
      AND wishlists.user_id != (select auth.uid())
      AND can_view_wishlist(wishlists.id, (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can claim items on viewable wishlists" ON item_claims;
CREATE POLICY "Users can claim items on viewable wishlists"
  ON item_claims FOR INSERT
  TO authenticated
  WITH CHECK (
    (select auth.uid()) = claimed_by
    AND EXISTS (
      SELECT 1 FROM wishlist_items
      JOIN wishlists ON wishlists.id = wishlist_items.wishlist_id
      WHERE wishlist_items.id = item_claims.item_id
      AND wishlists.user_id != (select auth.uid())
      AND can_view_wishlist(wishlists.id, (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can unclaim their own claims" ON item_claims;
CREATE POLICY "Users can unclaim their own claims"
  ON item_claims FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = claimed_by);

-- =====================
-- NOTIFICATIONS TABLE
-- =====================
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- =====================
-- NOTIFICATION_PREFERENCES TABLE
-- =====================
DROP POLICY IF EXISTS "Users can view their own notification preferences" ON notification_preferences;
CREATE POLICY "Users can view their own notification preferences"
  ON notification_preferences FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own notification preferences" ON notification_preferences;
CREATE POLICY "Users can insert their own notification preferences"
  ON notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own notification preferences" ON notification_preferences;
CREATE POLICY "Users can update their own notification preferences"
  ON notification_preferences FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- =====================
-- WISHLIST_SELECTED_FRIENDS TABLE
-- =====================
DROP POLICY IF EXISTS "Users can view selected friends for their own wishlists" ON wishlist_selected_friends;
CREATE POLICY "Users can view selected friends for their own wishlists"
  ON wishlist_selected_friends FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wishlists
      WHERE wishlists.id = wishlist_selected_friends.wishlist_id
      AND wishlists.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can add selected friends to their own wishlists" ON wishlist_selected_friends;
CREATE POLICY "Users can add selected friends to their own wishlists"
  ON wishlist_selected_friends FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wishlists
      WHERE wishlists.id = wishlist_selected_friends.wishlist_id
      AND wishlists.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can remove selected friends from their own wishlists" ON wishlist_selected_friends;
CREATE POLICY "Users can remove selected friends from their own wishlists"
  ON wishlist_selected_friends FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wishlists
      WHERE wishlists.id = wishlist_selected_friends.wishlist_id
      AND wishlists.user_id = (select auth.uid())
    )
  );

-- =====================
-- SPLIT_CLAIMS TABLE
-- =====================
DROP POLICY IF EXISTS "Users can view split claims on viewable wishlists" ON split_claims;
CREATE POLICY "Users can view split claims on viewable wishlists"
  ON split_claims FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wishlist_items
      JOIN wishlists ON wishlists.id = wishlist_items.wishlist_id
      WHERE wishlist_items.id = split_claims.item_id
      AND wishlists.user_id != (select auth.uid())
      AND can_view_wishlist(wishlists.id, (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can initiate split claims on viewable wishlists" ON split_claims;
CREATE POLICY "Users can initiate split claims on viewable wishlists"
  ON split_claims FOR INSERT
  TO authenticated
  WITH CHECK (
    (select auth.uid()) = initiated_by
    AND EXISTS (
      SELECT 1 FROM wishlist_items
      JOIN wishlists ON wishlists.id = wishlist_items.wishlist_id
      WHERE wishlist_items.id = split_claims.item_id
      AND wishlists.user_id != (select auth.uid())
      AND can_view_wishlist(wishlists.id, (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Initiator can update split claim" ON split_claims;
CREATE POLICY "Initiator can update split claim"
  ON split_claims FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = initiated_by)
  WITH CHECK ((select auth.uid()) = initiated_by);

DROP POLICY IF EXISTS "Initiator can delete pending split claim" ON split_claims;
CREATE POLICY "Initiator can delete pending split claim"
  ON split_claims FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = initiated_by AND status = 'pending');

-- =====================
-- SPLIT_CLAIM_PARTICIPANTS TABLE
-- =====================
DROP POLICY IF EXISTS "Users can view split participants" ON split_claim_participants;
CREATE POLICY "Users can view split participants"
  ON split_claim_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM split_claims
      JOIN wishlist_items ON wishlist_items.id = split_claims.item_id
      JOIN wishlists ON wishlists.id = wishlist_items.wishlist_id
      WHERE split_claims.id = split_claim_participants.split_claim_id
      AND wishlists.user_id != (select auth.uid())
      AND can_view_wishlist(wishlists.id, (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can join split claims" ON split_claim_participants;
CREATE POLICY "Users can join split claims"
  ON split_claim_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    (select auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM split_claims
      JOIN wishlist_items ON wishlist_items.id = split_claims.item_id
      JOIN wishlists ON wishlists.id = wishlist_items.wishlist_id
      WHERE split_claims.id = split_claim_participants.split_claim_id
      AND wishlists.user_id != (select auth.uid())
      AND can_view_wishlist(wishlists.id, (select auth.uid()))
      AND split_claims.status = 'pending'
    )
  );

DROP POLICY IF EXISTS "Users can leave pending split claims" ON split_claim_participants;
CREATE POLICY "Users can leave pending split claims"
  ON split_claim_participants FOR DELETE
  TO authenticated
  USING (
    (select auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM split_claims
      WHERE split_claims.id = split_claim_participants.split_claim_id
      AND split_claims.status = 'pending'
    )
  );

-- =====================
-- STORAGE.OBJECTS (Avatars bucket)
-- =====================
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (select auth.uid())::text
);

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (select auth.uid())::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (select auth.uid())::text
);

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (select auth.uid())::text
);
