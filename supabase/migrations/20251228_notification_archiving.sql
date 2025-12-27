-- Notification Archiving Feature
-- Adds ability to archive notifications with status-based state management
-- Supports future extensibility (deleted, snoozed, etc.)

-- ============================================
-- SCHEMA CHANGES
-- ============================================

-- Create notification status enum
CREATE TYPE notification_status AS ENUM (
  'inbox',      -- Active notification (default)
  'archived'    -- User archived the notification
);

-- Add status column to notifications
ALTER TABLE notifications
ADD COLUMN status notification_status DEFAULT 'inbox' NOT NULL;

-- ============================================
-- INDEX UPDATES
-- ============================================

-- Drop redundant indexes (replaced by status-aware composite indexes)
DROP INDEX IF EXISTS idx_notifications_user_id;
DROP INDEX IF EXISTS idx_notifications_user_id_is_read;

-- Create composite index for efficient status-based filtering
CREATE INDEX idx_notifications_user_id_status ON notifications(user_id, status);

-- Create index for unread count queries (inbox only)
CREATE INDEX idx_notifications_user_id_status_is_read ON notifications(user_id, status, is_read);

-- ============================================
-- ENABLE FULL REPLICA IDENTITY FOR REALTIME
-- ============================================

-- Required for realtime subscriptions to receive old values in UPDATE events
-- This allows us to detect status transitions (inbox -> archived, archived -> inbox)
ALTER TABLE notifications REPLICA IDENTITY FULL;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON COLUMN notifications.status IS 'Notification status: inbox (active), archived (user archived). Supports future states.';
