-- ============================================
-- COMPREHENSIVE NOTIFICATION SYSTEM V2
-- ============================================
-- Clean rebuild with JSONB metadata as single source of truth
-- Modern architecture: type registry, builder pattern, component registry

-- ============================================
-- NOTIFICATION CATEGORIES
-- ============================================
CREATE TABLE notification_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  default_enabled BOOLEAN DEFAULT TRUE NOT NULL,
  default_channels JSONB DEFAULT '["in_app"]'::jsonb NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Seed categories
INSERT INTO notification_categories (id, name, description, icon, default_enabled, sort_order) VALUES
  ('social', 'Social', 'Friend requests, acceptances, and birthdays', 'users', true, 1),
  ('wishlist_activity', 'Wishlist Activity', 'Updates on wishlists from friends', 'gift', true, 2),
  ('gift_claims', 'Gift Claims', 'Split gifts and claim activities', 'package', true, 3),
  ('ownership_flags', 'Item Flags', 'Notifications about already-owned items', 'flag', true, 4),
  ('reminders', 'Reminders', 'Birthday reminders and upcoming events', 'bell', true, 5),
  ('collaboration', 'Collaboration', 'Joint wishlist invitations and updates', 'users', true, 6);

-- ============================================
-- NOTIFICATION PREFERENCES
-- ============================================
CREATE TABLE notification_preferences_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES notification_categories(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT TRUE NOT NULL,
  channels JSONB DEFAULT '["in_app"]'::jsonb NOT NULL,
  settings JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE(user_id, category_id)
);

CREATE INDEX idx_notification_preferences_v2_user_id ON notification_preferences_v2(user_id);
CREATE INDEX idx_notification_preferences_v2_category_id ON notification_preferences_v2(category_id);

-- ============================================
-- NOTIFICATION TYPE ENUM
-- ============================================
CREATE TYPE notification_type_v2 AS ENUM (
  -- Social (3 types)
  'friend_request_received',
  'friend_request_accepted',
  'birthday_reminder',

  -- Wishlist Activity (3 types)
  'wishlist_created',
  'wishlist_archived',
  'item_added',

  -- Gift Claims (5 types)
  'split_initiated',
  'split_joined',
  'split_left',
  'split_confirmed',
  'split_cancelled',
  'gift_received',
  'gift_marked_given',

  -- Ownership Flags (3 types)
  'item_flagged_already_owned',
  'flag_confirmed',
  'flag_denied',

  -- Collaboration (2 types)
  'collaborator_invited',
  'collaborator_left'
);

CREATE TYPE notification_status_v2 AS ENUM (
  'inbox',
  'archived',
  'deleted'
);

-- ============================================
-- NOTIFICATIONS V2 TABLE
-- ============================================
CREATE TABLE notifications_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type_v2 NOT NULL,
  category_id TEXT NOT NULL REFERENCES notification_categories(id),

  -- JSONB metadata is the single source of truth
  metadata JSONB NOT NULL,

  -- Action handling
  action_url TEXT,
  action_completed_at TIMESTAMPTZ,

  -- State management
  status notification_status_v2 DEFAULT 'inbox' NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Grouping and deduplication
  dedup_key TEXT,
  group_key TEXT,

  -- Priority and expiration
  priority INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,

  CONSTRAINT unique_dedup_key UNIQUE NULLS NOT DISTINCT (user_id, dedup_key)
);

-- Indexes for performance
CREATE INDEX idx_notifications_v2_user_id_status ON notifications_v2(user_id, status);
CREATE INDEX idx_notifications_v2_user_id_category ON notifications_v2(user_id, category_id);
CREATE INDEX idx_notifications_v2_created_at ON notifications_v2(created_at DESC);
CREATE INDEX idx_notifications_v2_read_at ON notifications_v2(read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_v2_type ON notifications_v2(type);
CREATE INDEX idx_notifications_v2_group_key ON notifications_v2(group_key) WHERE group_key IS NOT NULL;
CREATE INDEX idx_notifications_v2_metadata ON notifications_v2 USING gin(metadata);

-- ============================================
-- NOTIFICATION TYPE -> CATEGORY MAPPING
-- ============================================
CREATE TABLE notification_type_categories (
  type notification_type_v2 PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES notification_categories(id) ON DELETE CASCADE
);

INSERT INTO notification_type_categories (type, category_id) VALUES
  ('friend_request_received', 'social'),
  ('friend_request_accepted', 'social'),
  ('birthday_reminder', 'reminders'),
  ('wishlist_created', 'wishlist_activity'),
  ('wishlist_archived', 'wishlist_activity'),
  ('item_added', 'wishlist_activity'),
  ('split_initiated', 'gift_claims'),
  ('split_joined', 'gift_claims'),
  ('split_left', 'gift_claims'),
  ('split_confirmed', 'gift_claims'),
  ('split_cancelled', 'gift_claims'),
  ('gift_received', 'gift_claims'),
  ('gift_marked_given', 'gift_claims'),
  ('item_flagged_already_owned', 'ownership_flags'),
  ('flag_confirmed', 'ownership_flags'),
  ('flag_denied', 'ownership_flags'),
  ('collaborator_invited', 'collaboration'),
  ('collaborator_left', 'collaboration');

-- ============================================
-- UNIFIED NOTIFICATION SERVICE FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION create_notification_v2(
  p_type notification_type_v2,
  p_user_ids UUID[],
  p_metadata JSONB,
  p_action_url TEXT DEFAULT NULL,
  p_dedup_key TEXT DEFAULT NULL,
  p_group_key TEXT DEFAULT NULL,
  p_priority INTEGER DEFAULT 0
)
RETURNS INTEGER AS $$
DECLARE
  v_category_id TEXT;
  v_user_id UUID;
  v_enabled BOOLEAN;
  v_channels JSONB;
  v_insert_count INTEGER := 0;
BEGIN
  -- Get category for this notification type
  SELECT category_id INTO v_category_id
  FROM notification_type_categories
  WHERE type = p_type;

  IF v_category_id IS NULL THEN
    RAISE EXCEPTION 'Unknown notification type: %', p_type;
  END IF;

  -- Insert notification for each user (respecting preferences)
  FOREACH v_user_id IN ARRAY p_user_ids
  LOOP
    -- Check if user has disabled this category
    SELECT
      COALESCE(np.enabled, nc.default_enabled),
      COALESCE(np.channels, nc.default_channels)
    INTO v_enabled, v_channels
    FROM notification_categories nc
    LEFT JOIN notification_preferences_v2 np
      ON np.category_id = nc.id AND np.user_id = v_user_id
    WHERE nc.id = v_category_id;

    -- Only insert if enabled for in_app channel
    IF v_enabled AND v_channels ? 'in_app' THEN
      INSERT INTO notifications_v2 (
        user_id,
        type,
        category_id,
        metadata,
        action_url,
        dedup_key,
        group_key,
        priority
      )
      VALUES (
        v_user_id,
        p_type,
        v_category_id,
        p_metadata,
        p_action_url,
        p_dedup_key,
        p_group_key,
        p_priority
      )
      ON CONFLICT (user_id, dedup_key)
      WHERE dedup_key IS NOT NULL
      DO NOTHING;

      IF FOUND THEN
        v_insert_count := v_insert_count + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN v_insert_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_notification_v2 IS 'Unified notification creation service. Validates preferences and handles deduplication.';

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get all friend IDs for a user
CREATE OR REPLACE FUNCTION get_friend_ids(p_user_id UUID)
RETURNS UUID[] AS $$
  SELECT ARRAY_AGG(
    CASE
      WHEN requester_id = p_user_id THEN addressee_id
      ELSE requester_id
    END
  )
  FROM friendships
  WHERE status = 'accepted'
  AND (requester_id = p_user_id OR addressee_id = p_user_id);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Get split claim participant IDs (excluding specified user)
CREATE OR REPLACE FUNCTION get_split_participant_ids(
  p_split_claim_id UUID,
  p_exclude_user_id UUID DEFAULT NULL
)
RETURNS UUID[] AS $$
  SELECT ARRAY_AGG(user_id)
  FROM split_claim_participants
  WHERE split_claim_id = p_split_claim_id
  AND (p_exclude_user_id IS NULL OR user_id != p_exclude_user_id);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE notifications_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_categories ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications_v2 FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update their own notifications
CREATE POLICY "Users can update own notifications"
  ON notifications_v2 FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications_v2 FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can view their own preferences
CREATE POLICY "Users can view own preferences"
  ON notification_preferences_v2 FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can manage their own preferences
CREATE POLICY "Users can manage own preferences"
  ON notification_preferences_v2 FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Everyone can view categories (public reference data)
CREATE POLICY "Anyone can view categories"
  ON notification_categories FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- AUTO-CREATE DEFAULT PREFERENCES
-- ============================================
CREATE OR REPLACE FUNCTION create_default_notification_preferences_v2()
RETURNS TRIGGER AS $$
BEGIN
  -- Create preferences for all categories with defaults
  INSERT INTO notification_preferences_v2 (user_id, category_id, enabled, channels, settings)
  SELECT
    NEW.id,
    nc.id,
    nc.default_enabled,
    nc.default_channels,
    CASE
      WHEN nc.id = 'reminders' THEN '{"birthday_reminder_days": 7}'::jsonb
      ELSE '{}'::jsonb
    END
  FROM notification_categories nc
  ON CONFLICT (user_id, category_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created_preferences_v2
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION create_default_notification_preferences_v2();

-- Create preferences for existing users
INSERT INTO notification_preferences_v2 (user_id, category_id, enabled, channels, settings)
SELECT
  p.id,
  nc.id,
  nc.default_enabled,
  nc.default_channels,
  CASE
    WHEN nc.id = 'reminders' THEN '{"birthday_reminder_days": 7}'::jsonb
    ELSE '{}'::jsonb
  END
FROM profiles p
CROSS JOIN notification_categories nc
ON CONFLICT (user_id, category_id) DO NOTHING;

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE TRIGGER update_notification_preferences_v2_updated_at
  BEFORE UPDATE ON notification_preferences_v2
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- REALTIME
-- ============================================
ALTER TABLE notifications_v2 REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications_v2;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON TABLE notifications_v2 IS 'Modern notification system with JSONB metadata as single source of truth';
COMMENT ON COLUMN notifications_v2.metadata IS 'Type-specific JSONB metadata containing all notification data';
COMMENT ON COLUMN notifications_v2.category_id IS 'Category for grouping and preference filtering';
COMMENT ON COLUMN notifications_v2.action_url IS 'Deep link / navigation target for notification click';
COMMENT ON COLUMN notifications_v2.dedup_key IS 'Unique key to prevent duplicate notifications';
COMMENT ON COLUMN notifications_v2.group_key IS 'Key for grouping related notifications (future feature)';
COMMENT ON COLUMN notifications_v2.priority IS 'Higher = more important (for sorting and prominence)';
COMMENT ON TABLE notification_categories IS 'Category definitions with default settings';
COMMENT ON TABLE notification_preferences_v2 IS 'User-specific notification preferences per category';
