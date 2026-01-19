-- ============================================================
-- Manual Test Script: notification_type_categories Table Access
-- ============================================================
--
-- Purpose: Test RLS policies on notification_type_categories table
-- Migration: 20260119_add_rls_to_unrestricted_objects.sql
--
-- IMPORTANT NOTE: The notification_type_categories table was not found
-- in any existing migration files. This test script first verifies if
-- the table exists before testing RLS policies.
--
-- Run this in Supabase Studio SQL Editor:
-- http://localhost:54323/project/default/sql
-- ============================================================

-- ============================================================
-- PART 1: VERIFY TABLE EXISTS
-- ============================================================

-- Test 1: Check if notification_type_categories table exists
SELECT
  EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'notification_type_categories'
  ) as table_exists;

-- Expected: If table_exists = true, proceed with tests
-- Expected: If table_exists = false, the migration will fail and table needs investigation

-- If table exists, show its structure
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'notification_type_categories'
ORDER BY ordinal_position;

-- ============================================================
-- PART 2: VERIFY RLS IS ENABLED
-- ============================================================

-- Test 2: Check if RLS is enabled on the table
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'notification_type_categories';

-- Expected: rowsecurity = true (RLS is enabled)

-- Test 3: View RLS policies on the table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'notification_type_categories';

-- Expected:
-- - policyname = 'Anyone can view notification type categories'
-- - cmd = 'SELECT'
-- - roles = {authenticated}
-- - qual = 'true' (all authenticated users can read)

-- ============================================================
-- PART 3: TEST AUTHENTICATED USER ACCESS (IF TABLE EXISTS)
-- ============================================================

-- Test 4: Query the table as an authenticated user
-- Set JWT claims to impersonate a user
SET LOCAL request.jwt.claims TO '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated"}';

-- Try to select all rows
SELECT * FROM notification_type_categories;

-- Expected: Query succeeds and returns all rows
-- Expected: No permission denied error

-- Test 5: Count rows in the table
SELECT COUNT(*) as total_categories
FROM notification_type_categories;

-- Expected: Returns count without error

-- Reset session
RESET request.jwt.claims;

-- ============================================================
-- PART 4: TEST NOTIFICATION FUNCTION STILL WORKS
-- ============================================================

-- Test 6: Check if notification-related functions exist
SELECT
  proname as function_name,
  prosecdef as is_security_definer
FROM pg_proc
WHERE proname LIKE '%notification%'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY proname;

-- Expected: Functions like notify_friends, create_*_notification exist
-- Expected: SECURITY DEFINER functions should have prosecdef = true

-- Test 7: Verify triggers that create notifications are still working
-- (This requires creating test data - see integration test section)

-- ============================================================
-- PART 5: TEST ANONYMOUS USER ACCESS (SHOULD FAIL)
-- ============================================================

-- Test 8: Try to access as anonymous user (should fail)
SET LOCAL role anon;
SET LOCAL request.jwt.claims TO '{"role": "anon"}';

-- This should fail if RLS is working correctly
SELECT * FROM notification_type_categories;

-- Expected: Permission denied error (if table has RLS enabled)
-- Note: The policy only allows 'authenticated' role, not 'anon'

-- Reset
RESET role;
RESET request.jwt.claims;

-- ============================================================
-- SUMMARY OF EXPECTED RESULTS
-- ============================================================

-- ✅ Test 1: table_exists should be true (if table exists in DB)
-- ✅ Test 2: rowsecurity should be true
-- ✅ Test 3: Should show one policy for SELECT with USING (true)
-- ✅ Test 4: SELECT * should succeed for authenticated users
-- ✅ Test 5: COUNT(*) should succeed for authenticated users
-- ✅ Test 6: Notification functions should exist
-- ✅ Test 8: Anonymous access should be denied

-- ============================================================
-- NOTES
-- ============================================================

-- 1. If Test 1 shows table_exists = false, the migration will fail
--    and the table needs to be created or the migration removed.
--
-- 2. The notification system uses an ENUM type (notification_type)
--    defined in 20241223_notifications_system.sql, not a separate
--    reference table. The notification_type_categories table may not
--    actually be needed or may not exist.
--
-- 3. If the table doesn't exist, verify:
--    - Is this a production database that has additional migrations?
--    - Was the table name mentioned in error in the spec?
--    - Should the migration be removed or should the table be created?
--
-- 4. The notification system should continue working regardless of
--    RLS on this table because notification creation uses SECURITY
--    DEFINER functions that bypass RLS.
