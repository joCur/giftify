-- Migration: Make wishlist_items.url nullable for manual entry
-- This allows users to add items without a product URL

-- Make URL column nullable
ALTER TABLE wishlist_items
  ALTER COLUMN url DROP NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN wishlist_items.url IS
  'Optional product URL. Null when item is added manually without a link.';
