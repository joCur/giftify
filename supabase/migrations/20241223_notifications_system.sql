-- Notifications System Migration
-- Adds notification types, notifications table, preferences, triggers, and RLS policies

-- Create notification type enum
CREATE TYPE notification_type AS ENUM (
  'friend_request_received',
  'friend_request_accepted',
  'birthday_reminder',
  'item_added',
  'wishlist_created'
);

-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Polymorphic references (nullable, depends on notification type)
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  wishlist_id UUID REFERENCES wishlists(id) ON DELETE CASCADE,
  item_id UUID REFERENCES wishlist_items(id) ON DELETE CASCADE,
  friendship_id UUID REFERENCES friendships(id) ON DELETE CASCADE,

  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Notification preferences table
CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  birthday_reminder_days INTEGER DEFAULT 7 NOT NULL CHECK (birthday_reminder_days >= 0 AND birthday_reminder_days <= 30),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_id_is_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_user_id_created_at ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);

-- Apply updated_at trigger to notification_preferences
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER FUNCTIONS FOR TRIGGERS
-- ============================================

-- Function to notify all friends of a user
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- NOTIFICATION TRIGGERS
-- ============================================

-- Trigger: Create notification when friend request is sent
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_friendship_created
  AFTER INSERT ON friendships
  FOR EACH ROW EXECUTE FUNCTION create_friend_request_notification();

-- Trigger: Create notification when friend request is accepted
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_friendship_accepted
  AFTER UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION create_friend_accepted_notification();

-- Trigger: Create notification when wishlist is created (notify friends)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_wishlist_created
  AFTER INSERT ON wishlists
  FOR EACH ROW EXECUTE FUNCTION create_wishlist_notification();

-- Trigger: Create notification when item is added to wishlist (notify friends)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_item_added
  AFTER INSERT ON wishlist_items
  FOR EACH ROW EXECUTE FUNCTION create_item_added_notification();

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- NOTIFICATIONS POLICIES
-- Users can only view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow triggers to insert notifications (service role)
-- Triggers run with SECURITY DEFINER so they bypass RLS

-- NOTIFICATION PREFERENCES POLICIES
-- Users can view their own preferences
CREATE POLICY "Users can view their own notification preferences"
  ON notification_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert their own notification preferences"
  ON notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update their own notification preferences"
  ON notification_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- AUTO-CREATE PREFERENCES ON PROFILE CREATION
-- ============================================

-- Function to create default notification preferences when profile is created
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id, birthday_reminder_days)
  VALUES (NEW.id, 7)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created_create_preferences
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION create_default_notification_preferences();

-- Create preferences for existing users
INSERT INTO notification_preferences (user_id, birthday_reminder_days)
SELECT id, 7 FROM profiles
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- ENABLE REALTIME FOR NOTIFICATIONS TABLE
-- ============================================

-- Enable realtime for the notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================
-- BIRTHDAY REMINDER CRON JOB (pg_cron)
-- ============================================

-- Enable pg_cron extension (requires superuser, available on Supabase Pro+)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- Function to send birthday reminders
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule the birthday reminder job to run daily at 8:00 AM UTC
SELECT cron.schedule(
  'send-birthday-reminders',  -- job name
  '0 8 * * *',                -- cron expression: 8:00 AM UTC daily
  'SELECT send_birthday_reminders()'
);
