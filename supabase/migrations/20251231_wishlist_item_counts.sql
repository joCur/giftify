-- Migration: Add wishlist item count view for accurate counting
--
-- Problem: The friend wishlist list page counts ALL items including those
-- marked as received or purchased, which are hidden from friend views.
--
-- Solution: Create a view that pre-computes both total and available item counts.
-- Friends see available_items, owners see total_items.

-- Create index to optimize item counting queries
CREATE INDEX IF NOT EXISTS idx_wishlist_items_availability
  ON wishlist_items(wishlist_id, is_received, is_purchased)
  WHERE is_received = FALSE AND is_purchased = FALSE;

COMMENT ON INDEX idx_wishlist_items_availability IS
  'Optimizes counting of available items (not received, not purchased) for friend views';

-- Create view with pre-computed item counts
CREATE OR REPLACE VIEW wishlist_item_counts
WITH (security_invoker = true) AS
SELECT
  w.id AS wishlist_id,
  w.user_id AS owner_id,
  COUNT(wi.id) AS total_items,
  COUNT(wi.id) FILTER (WHERE wi.is_received = FALSE AND wi.is_purchased = FALSE) AS available_items
FROM wishlists w
LEFT JOIN wishlist_items wi ON wi.wishlist_id = w.id
GROUP BY w.id, w.user_id;

COMMENT ON VIEW wishlist_item_counts IS
  'Pre-computed item counts per wishlist. total_items = all items (for owner views), available_items = excludes received/purchased (for friend views)';

-- Grant permissions for authenticated users to read the view
GRANT SELECT ON wishlist_item_counts TO authenticated;
