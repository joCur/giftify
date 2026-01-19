# Testing Guide: notification_type_categories RLS

## Overview

This guide provides step-by-step instructions for manually testing the Row Level Security (RLS) policies on the `notification_type_categories` table.

**Migration:** `20260119_add_rls_to_unrestricted_objects.sql`

⚠️ **IMPORTANT NOTE:** The `notification_type_categories` table was not found in any existing migration files in the codebase. This test guide first verifies whether the table exists before testing RLS policies.

## Prerequisites

- Supabase local instance running (`supabase start`)
- Access to Supabase Studio at http://localhost:54323
- Database migrations applied (`supabase db reset`)
- At least one test user in the database

## Testing Steps

### Step 1: Access Supabase Studio SQL Editor

1. Open your browser and navigate to: http://localhost:54323
2. Go to the SQL Editor section
3. Create a new query

### Step 2: Verify Table Exists

Run this query to check if the table exists:

```sql
SELECT
  EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'notification_type_categories'
  ) as table_exists;
```

**Expected Result:**
- If `table_exists = true`: Proceed with the remaining tests
- If `table_exists = false`: **STOP** - The migration will fail. See "Troubleshooting" section below.

### Step 3: Verify RLS is Enabled

```sql
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'notification_type_categories';
```

**Expected Result:**
- `rowsecurity = true`

### Step 4: Check RLS Policies

```sql
SELECT
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'notification_type_categories';
```

**Expected Result:**
- Policy name: `"Anyone can view notification type categories"`
- Command: `SELECT`
- Roles: `{authenticated}`
- Qualifier: `true` (all authenticated users can read all rows)

### Step 5: Test Authenticated User Access

Impersonate an authenticated user and query the table:

```sql
-- Set JWT claims to impersonate a user
SET LOCAL request.jwt.claims TO '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated"}';

-- Try to select all rows
SELECT * FROM notification_type_categories;

-- Count rows
SELECT COUNT(*) as total_categories FROM notification_type_categories;

-- Reset session
RESET request.jwt.claims;
```

**Expected Result:**
- ✅ Query succeeds without errors
- ✅ Returns all rows in the table
- ✅ COUNT query succeeds

### Step 6: Test Anonymous User Access (Should Fail)

Try to access as an anonymous user:

```sql
SET LOCAL role anon;
SET LOCAL request.jwt.claims TO '{"role": "anon"}';

-- This should fail
SELECT * FROM notification_type_categories;

-- Reset
RESET role;
RESET request.jwt.claims;
```

**Expected Result:**
- ❌ Query fails with permission denied error
- The policy only allows `authenticated` role, not `anon`

### Step 7: Verify Notification Functions Still Work

Check that notification system functions are intact:

```sql
SELECT
  proname as function_name,
  prosecdef as is_security_definer
FROM pg_proc
WHERE proname LIKE '%notification%'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY proname;
```

**Expected Result:**
- Functions like `notify_friends`, `create_*_notification` exist
- SECURITY DEFINER functions have `prosecdef = true`

### Step 8: Integration Test - Create a Notification

Create test data and trigger a notification:

```sql
-- This requires having test users and wishlists set up
-- The notification system should continue working because
-- notification creation functions use SECURITY DEFINER

-- Example: Create a friendship (triggers notification)
-- (Only if you have test user IDs)
```

**Expected Result:**
- Notifications are created successfully
- No RLS-related errors occur

## Verification Checklist

Use this checklist to verify all tests pass:

- [ ] **Test 1:** Table exists in database (`table_exists = true`)
- [ ] **Test 2:** RLS is enabled (`rowsecurity = true`)
- [ ] **Test 3:** Policy "Anyone can view notification type categories" exists
- [ ] **Test 4:** Policy applies to SELECT operations
- [ ] **Test 5:** Policy role is `authenticated`
- [ ] **Test 6:** Authenticated users can SELECT all rows
- [ ] **Test 7:** Anonymous users are denied access
- [ ] **Test 8:** Notification system functions exist and have SECURITY DEFINER
- [ ] **Test 9:** Creating notifications still works (no RLS blocking)

## Troubleshooting

### If Table Doesn't Exist

If Step 2 shows `table_exists = false`, this indicates one of the following:

1. **The table was never created in this database**
   - The spec may have been based on incorrect information
   - The table may exist in a production database but not in the base schema
   - Consider whether the migration should be removed or the table should be created

2. **Migration hasn't been applied yet**
   - Run `supabase db reset` to apply all migrations
   - Check for migration errors in the output

3. **Table has a different name**
   - Check if there's a similar table like `notification_categories` (without "type")
   - Search for notification-related tables:
     ```sql
     SELECT tablename
     FROM pg_tables
     WHERE tablename LIKE '%notification%'
     ORDER BY tablename;
     ```

### Investigation Steps

If the table doesn't exist:

```sql
-- List all notification-related tables
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE '%notification%'
ORDER BY tablename;

-- Check notification type definition (ENUM)
SELECT
  n.nspname as schema,
  t.typname as type_name,
  e.enumlabel as enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_namespace n ON t.typnamespace = n.oid
WHERE t.typname = 'notification_type'
ORDER BY e.enumsortorder;
```

**Context:**
The notification system in `20241223_notifications_system.sql` uses an ENUM type (`notification_type`) rather than a reference table. The `notification_type_categories` table may not actually be needed or may not exist in this database schema.

### If Migration Fails

If you encounter an error when running `supabase db reset`:

```
ERROR: relation "notification_type_categories" does not exist
```

**Resolution:**
1. Remove or comment out the migration file `20260119_add_rls_to_unrestricted_objects.sql`
2. OR create the table first in the migration before adding RLS
3. Document the finding in build-progress.txt

## Expected Outcomes

### Success Scenario

All tests pass:
- ✅ Table exists
- ✅ RLS is enabled
- ✅ Authenticated users can read all rows
- ✅ Anonymous users are denied
- ✅ Notification system still works

### Investigation Needed Scenario

Table doesn't exist:
- ❌ Table not found in database
- ⚠️ Migration will fail
- 📝 Document finding and determine next steps
- Consider: Remove migration OR create table first

## Additional Notes

1. **Reference Table Pattern:** This is a lookup/reference table with no user-specific data, so the `USING (true)` policy allows all authenticated users to read all rows.

2. **SECURITY DEFINER:** Notification creation functions use `SECURITY DEFINER`, which means they bypass RLS and can insert into tables regardless of policies.

3. **Performance:** Since the policy is `USING (true)`, there's no performance impact from RLS checks on this table.

4. **Future-Proofing:** Even though this is a simple reference table, enabling RLS follows security best practices and prevents future issues if the table structure changes.

## Related Files

- Migration: `supabase/migrations/20260119_add_rls_to_unrestricted_objects.sql`
- Notification System: `supabase/migrations/20241223_notifications_system.sql`
- Spec: `.auto-claude/specs/003-restrict-access-to-unrestricted-tables-views-for-b/spec.md`

## QA Sign-off

After completing all tests, update the implementation_plan.json:

```bash
# Mark this subtask as completed
# Update status in implementation_plan.json
```

Document results in build-progress.txt with:
- Whether table exists
- All test results (pass/fail)
- Any issues encountered
- Recommendations for next steps
