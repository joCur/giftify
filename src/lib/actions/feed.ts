"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  FeedResponse,
  FriendItemActivity,
  ClaimedItemGroup,
} from "@/lib/types/feed";

const ITEMS_PER_PAGE = 12;

export async function getFriendActivityFeed(
  cursor?: string,
  limit: number = ITEMS_PER_PAGE
): Promise<FeedResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { items: [], next_cursor: null, has_more: false };
  }

  // Get all friend IDs
  const { data: friendships } = await supabase
    .from("friendships")
    .select("requester_id, addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  if (!friendships || friendships.length === 0) {
    return { items: [], next_cursor: null, has_more: false };
  }

  const friendIds = friendships.map((f) =>
    f.requester_id === user.id ? f.addressee_id : f.requester_id
  );

  // Get wishlists where user is in the selected_friends list
  const { data: selectedFriendsAccess } = await supabase
    .from("wishlist_selected_friends")
    .select("wishlist_id")
    .eq("friend_id", user.id);

  const accessibleSelectedWishlistIds =
    selectedFriendsAccess?.map((sf) => sf.wishlist_id) || [];

  // Build query for wishlist items from friends
  // Only show items from:
  // 1. Wishlists with privacy "friends" or "public" (visible to all friends)
  // 2. Wishlists with privacy "selected_friends" where user is in the selected list
  let query = supabase
    .from("wishlist_items")
    .select(
      `
      id,
      title,
      description,
      image_url,
      price,
      currency,
      url,
      created_at,
      wishlist_id,
      wishlists!inner(
        id,
        name,
        user_id,
        privacy
      )
    `
    )
    .in("wishlists.user_id", friendIds)
    .or(
      `wishlists.privacy.in.(friends,public),and(wishlists.privacy.eq.selected_friends,wishlists.id.in.(${accessibleSelectedWishlistIds.length > 0 ? accessibleSelectedWishlistIds.join(",") : "00000000-0000-0000-0000-000000000000"}))`
    )
    .order("created_at", { ascending: false })
    .limit(limit + 1); // Fetch one extra to determine has_more

  // Cursor-based pagination
  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data: items } = await query;

  if (!items || items.length === 0) {
    return { items: [], next_cursor: null, has_more: false };
  }

  const has_more = items.length > limit;
  const feedItems = items.slice(0, limit);
  const next_cursor = has_more
    ? feedItems[feedItems.length - 1].created_at
    : null;

  // Get owner profiles for the wishlists
  const wishlistOwnerIds = [
    ...new Set(feedItems.map((item) => (item.wishlists as { user_id: string }).user_id)),
  ];
  const { data: ownerProfiles } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", wishlistOwnerIds);

  const ownersMap = new Map(ownerProfiles?.map((p) => [p.id, p]) || []);

  // Get claims for these items
  const itemIds = feedItems.map((item) => item.id);
  const { data: claims } = await supabase
    .from("item_claims")
    .select("item_id, claimed_by")
    .in("item_id", itemIds);

  const claimsMap = new Map(claims?.map((c) => [c.item_id, c]) || []);

  // Get split claims
  const { data: splitClaims } = await supabase
    .from("split_claims")
    .select("item_id")
    .in("item_id", itemIds);

  const splitClaimsSet = new Set(splitClaims?.map((sc) => sc.item_id) || []);

  // Transform to feed items
  const feedActivityItems: FriendItemActivity[] = feedItems.map((item) => {
    const claim = claimsMap.get(item.id);
    const wishlist = item.wishlists as { id: string; name: string; user_id: string };
    const owner = ownersMap.get(wishlist.user_id);

    return {
      id: item.id,
      type: "friend_item" as const,
      timestamp: item.created_at,
      friend: {
        id: wishlist.user_id,
        display_name: owner?.display_name || null,
        avatar_url: owner?.avatar_url || null,
      },
      item: {
        id: item.id,
        title: item.title,
        description: item.description,
        image_url: item.image_url,
        price: item.price,
        currency: item.currency,
        url: item.url,
      },
      wishlist: {
        id: wishlist.id,
        name: wishlist.name,
      },
      is_claimed: !!claim,
      claimed_by_me: claim?.claimed_by === user.id,
      has_split_claim: splitClaimsSet.has(item.id),
    };
  });

  return {
    items: feedActivityItems,
    next_cursor,
    has_more,
  };
}

export async function getMyClaimedItems(): Promise<ClaimedItemGroup[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: claims } = await supabase
    .from("item_claims")
    .select(
      `
      id,
      claimed_by,
      created_at,
      item:wishlist_items!inner(
        id,
        title,
        description,
        image_url,
        price,
        currency,
        url,
        wishlist_id
      )
    `
    )
    .eq("claimed_by", user.id)
    .order("created_at", { ascending: false });

  if (!claims || claims.length === 0) return [];

  // Get wishlist IDs and fetch wishlist details with owners
  const wishlistIds = [
    ...new Set(claims.map((c) => (c.item as { wishlist_id: string }).wishlist_id)),
  ];

  const { data: wishlists } = await supabase
    .from("wishlists")
    .select(
      `
      id,
      name,
      user_id,
      owner:profiles!wishlists_user_id_fkey(id, display_name, avatar_url)
    `
    )
    .in("id", wishlistIds);

  const wishlistsMap = new Map(wishlists?.map((w) => [w.id, w]) || []);

  // Group by friend (wishlist owner)
  const groupedByFriend = new Map<string, ClaimedItemGroup>();

  claims.forEach((claim) => {
    const item = claim.item as {
      id: string;
      title: string;
      description: string | null;
      image_url: string | null;
      price: string | null;
      currency: string | null;
      url: string | null;
      wishlist_id: string;
    };
    const wishlist = wishlistsMap.get(item.wishlist_id);
    if (!wishlist) return;

    const owner = wishlist.owner as {
      id: string;
      display_name: string | null;
      avatar_url: string | null;
    };
    const friendId = owner.id;

    if (!groupedByFriend.has(friendId)) {
      groupedByFriend.set(friendId, {
        friend: {
          id: owner.id,
          display_name: owner.display_name,
          avatar_url: owner.avatar_url,
        },
        items: [],
      });
    }

    groupedByFriend.get(friendId)!.items.push({
      id: item.id,
      title: item.title,
      description: item.description,
      image_url: item.image_url,
      price: item.price,
      currency: item.currency,
      url: item.url,
      claimed_at: claim.created_at,
      wishlist_id: wishlist.id,
      wishlist_name: wishlist.name,
    });
  });

  return Array.from(groupedByFriend.values());
}
