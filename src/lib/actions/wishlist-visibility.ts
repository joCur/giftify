"use server";

import { requireAuth } from "./helpers";
import { revalidatePath } from "next/cache";
import type { SelectableFriend } from "@/lib/supabase/types";

/**
 * Get all friends with their selection state for a wishlist
 * Used in the friend picker dialog
 */
export async function getFriendsWithSelectionState(wishlistId: string) {
  try {
    const { supabase, user } = await requireAuth();

    // Verify ownership
    const { data: wishlist } = await supabase
      .from("wishlists")
      .select("user_id")
      .eq("id", wishlistId)
      .single();

    if (!wishlist || wishlist.user_id !== user.id) {
      return { error: "Not authorized" };
    }

    // Get all friends
    const { data: friendships, error: friendError } = await supabase
      .from("friendships")
      .select(
        `
        id,
        requester_id,
        addressee_id,
        requester:profiles!friendships_requester_id_fkey(id, display_name, avatar_url, birthday),
        addressee:profiles!friendships_addressee_id_fkey(id, display_name, avatar_url, birthday)
      `
      )
      .eq("status", "accepted")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (friendError) {
      return { error: friendError.message };
    }

    // Get selected friends for this wishlist
    const { data: selectedFriends } = await supabase
      .from("wishlist_selected_friends")
      .select("friend_id")
      .eq("wishlist_id", wishlistId);

    const selectedIds = new Set(
      selectedFriends?.map((sf) => sf.friend_id) || []
    );

    // Map to friend profiles with selection state
    const friends: SelectableFriend[] = (friendships || []).map((friendship) => {
      const friend =
        friendship.requester_id === user.id
          ? friendship.addressee
          : friendship.requester;

      return {
        friendshipId: friendship.id,
        id: friend.id,
        display_name: friend.display_name,
        avatar_url: friend.avatar_url,
        birthday: friend.birthday,
        isSelected: selectedIds.has(friend.id),
      };
    });

    // Sort alphabetically by display name
    friends.sort((a, b) =>
      (a.display_name || "").localeCompare(b.display_name || "")
    );

    return { data: friends };
  } catch {
    return { error: "Not authenticated" };
  }
}

/**
 * Update the selected friends for a wishlist
 * Replaces the entire selection with the new list
 */
export async function updateWishlistSelectedFriends(
  wishlistId: string,
  friendIds: string[]
) {
  try {
    const { supabase, user } = await requireAuth();

    // Verify ownership
    const { data: wishlist } = await supabase
      .from("wishlists")
      .select("user_id, privacy")
      .eq("id", wishlistId)
      .single();

    if (!wishlist || wishlist.user_id !== user.id) {
      return { error: "Not authorized" };
    }

    // Only allow updating if privacy is selected_friends
    if (wishlist.privacy !== "selected_friends") {
      return { error: "Wishlist privacy must be set to 'selected_friends'" };
    }

    // Verify all friend IDs are actually friends
    if (friendIds.length > 0) {
      const { data: friendships } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      const validFriendIds = new Set(
        (friendships || []).map((f) =>
          f.requester_id === user.id ? f.addressee_id : f.requester_id
        )
      );

      const invalidFriends = friendIds.filter((id) => !validFriendIds.has(id));
      if (invalidFriends.length > 0) {
        return { error: "Some selected users are not your friends" };
      }
    }

    // Delete existing selections
    await supabase
      .from("wishlist_selected_friends")
      .delete()
      .eq("wishlist_id", wishlistId);

    // Insert new selections
    if (friendIds.length > 0) {
      const { error: insertError } = await supabase
        .from("wishlist_selected_friends")
        .insert(
          friendIds.map((friendId) => ({
            wishlist_id: wishlistId,
            friend_id: friendId,
          }))
        );

      if (insertError) {
        return { error: insertError.message };
      }
    }

    revalidatePath(`/wishlists/${wishlistId}`);
    revalidatePath("/dashboard");
    return { success: true, count: friendIds.length };
  } catch {
    return { error: "Not authenticated" };
  }
}

/**
 * Get the count of selected friends for a wishlist
 */
export async function getSelectedFriendsCount(wishlistId: string) {
  try {
    const { supabase, user } = await requireAuth();

    // Verify ownership
    const { data: wishlist } = await supabase
      .from("wishlists")
      .select("user_id, privacy")
      .eq("id", wishlistId)
      .single();

    if (!wishlist || wishlist.user_id !== user.id) {
      return { error: "Not authorized" };
    }

    if (wishlist.privacy !== "selected_friends") {
      return { data: 0 };
    }

    const { count, error } = await supabase
      .from("wishlist_selected_friends")
      .select("*", { count: "exact", head: true })
      .eq("wishlist_id", wishlistId);

    if (error) {
      return { error: error.message };
    }

    return { data: count || 0 };
  } catch {
    return { error: "Not authenticated" };
  }
}
