-- ================================================
-- Notification System V2 Migration: Remove V1 Triggers
-- ================================================
-- This migration removes all V1 notification triggers and functions
-- V2 notifications are now created explicitly in server actions

-- ================================================
-- Drop V1 Triggers
-- ================================================

-- Friend request triggers
DROP TRIGGER IF EXISTS create_friend_request_notification ON friendships;
DROP TRIGGER IF EXISTS create_friend_accepted_notification ON friendships;

-- Wishlist triggers
DROP TRIGGER IF EXISTS create_wishlist_notification ON wishlists;
DROP TRIGGER IF EXISTS notify_friends_on_wishlist_created ON wishlists;

-- Item triggers
DROP TRIGGER IF EXISTS create_item_added_notification ON wishlist_items;
DROP TRIGGER IF EXISTS notify_friends_on_item_added ON wishlist_items;

-- Split claim triggers
DROP TRIGGER IF EXISTS on_split_claim_initiated ON split_claims;
DROP TRIGGER IF EXISTS on_split_claim_confirmed ON split_claims;
DROP TRIGGER IF EXISTS on_split_claim_cancelled ON split_claims;
DROP TRIGGER IF EXISTS on_split_participant_joined ON split_claim_participants;
DROP TRIGGER IF EXISTS on_split_participant_left ON split_claim_participants;

-- Ownership flag triggers
DROP TRIGGER IF EXISTS trigger_notify_owner_on_flag ON item_ownership_flags;
DROP TRIGGER IF EXISTS trigger_notify_on_flag_resolution ON item_ownership_flags;

-- ================================================
-- Drop V1 Trigger Functions
-- ================================================

-- Friend request functions
DROP FUNCTION IF EXISTS create_friend_request_notification() CASCADE;
DROP FUNCTION IF EXISTS create_friend_accepted_notification() CASCADE;

-- Wishlist functions
DROP FUNCTION IF EXISTS create_wishlist_notification() CASCADE;
DROP FUNCTION IF EXISTS notify_friends_on_wishlist_created() CASCADE;

-- Item functions
DROP FUNCTION IF EXISTS create_item_added_notification() CASCADE;
DROP FUNCTION IF EXISTS notify_friends_on_item_added() CASCADE;

-- Split claim functions
DROP FUNCTION IF EXISTS on_split_claim_initiated() CASCADE;
DROP FUNCTION IF EXISTS on_split_claim_confirmed() CASCADE;
DROP FUNCTION IF EXISTS on_split_claim_cancelled() CASCADE;
DROP FUNCTION IF EXISTS on_split_participant_joined() CASCADE;
DROP FUNCTION IF EXISTS on_split_participant_left() CASCADE;

-- Ownership flag functions
DROP FUNCTION IF EXISTS trigger_notify_owner_on_flag() CASCADE;
DROP FUNCTION IF EXISTS trigger_notify_on_flag_resolution() CASCADE;

-- Helper functions
DROP FUNCTION IF EXISTS notify_friends(UUID, notification_type, TEXT, TEXT, UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS notify_friends(UUID, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS notify_split_participants(UUID, notification_type, TEXT, TEXT, UUID, UUID, UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_split_claim_item_info(UUID) CASCADE;

-- ================================================
-- Remove Birthday Reminder Cron Job
-- ================================================

-- Unschedule the cron job (if it exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'send-birthday-reminders'
  ) THEN
    PERFORM cron.unschedule('send-birthday-reminders');
  END IF;
END $$;

-- Drop the function
DROP FUNCTION IF EXISTS send_birthday_reminders() CASCADE;

-- ================================================
-- Add Deprecation Notice to V1 Tables
-- ================================================

COMMENT ON TABLE notifications IS 'DEPRECATED - Use notifications_v2 instead. This table is kept for historical data only. Will be removed in a future migration.';
COMMENT ON TABLE notification_preferences IS 'DEPRECATED - Use notification_preferences_v2 instead. Will be removed in a future migration.';

-- ================================================
-- Verification Query
-- ================================================

-- Run this to verify no triggers remain:
-- SELECT trigger_name, event_object_table
-- FROM information_schema.triggers
-- WHERE trigger_name LIKE '%notification%';
