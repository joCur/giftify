// Feed item type discriminator
export type FeedItemType = "friend_item" | "birthday";

// Base interface for all feed items
export interface BaseFeedItem {
  id: string;
  timestamp: string;
  type: FeedItemType;
}

// Feed item for a friend's wishlist item
export interface FriendItemActivity extends BaseFeedItem {
  type: "friend_item";
  friend: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  item: {
    id: string;
    title: string;
    description: string | null;
    image_url: string | null;
    price: string | null;
    currency: string | null;
    url: string | null;
  };
  wishlist: {
    id: string;
    name: string;
  };
  is_claimed: boolean;
  claimed_by_me: boolean;
  has_split_claim: boolean;
}

// Feed item for an upcoming birthday
export interface BirthdayEvent extends BaseFeedItem {
  type: "birthday";
  friend: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    birthday: string;
  };
  days_until: number;
}

// Union type for all feed items
export type FeedItem = FriendItemActivity | BirthdayEvent;

// Paginated feed response
export interface FeedResponse {
  items: FriendItemActivity[];
  next_cursor: string | null;
  has_more: boolean;
}

// Dashboard statistics
export interface DashboardStats {
  total_wishlists: number;
  total_items: number;
  friends_count: number;
  claimed_items_count: number;
}

// Claimed item with wishlist context
export interface ClaimedItem {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  price: string | null;
  currency: string | null;
  url: string | null;
  claimed_at: string;
  wishlist_id: string;
  wishlist_name: string;
}

// Claimed items grouped by friend
export interface ClaimedItemGroup {
  friend: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  items: ClaimedItem[];
}

// Wishlist preview for dashboard
export interface WishlistPreview {
  id: string;
  name: string;
  privacy: string;
  item_count: number;
}
