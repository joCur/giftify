"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "./helpers";
import { revalidatePath } from "next/cache";

/**
 * Flag an item as already owned by the wishlist owner
 */
export async function flagItemAsOwned(itemId: string, wishlistId: string) {
  try {
    const { supabase, user } = await requireAuth();

    // Verify user doesn't own this wishlist
    const { data: wishlist } = await supabase
      .from("wishlists")
      .select("user_id, name")
      .eq("id", wishlistId)
      .single();

    if (!wishlist) {
      return { error: "Wishlist not found" };
    }

    if (wishlist.user_id === user.id) {
      return { error: "Cannot flag items on your own wishlist" };
    }

    // Verify item exists
    const { data: item } = await supabase
      .from("wishlist_items")
      .select("title")
      .eq("id", itemId)
      .single();

    if (!item) {
      return { error: "Item not found" };
    }

    // Check if already flagged
    const { data: existingFlag } = await supabase
      .from("item_ownership_flags")
      .select("id, status")
      .eq("item_id", itemId)
      .maybeSingle();

    if (existingFlag) {
      if (existingFlag.status === "pending") {
        return { error: "This item is already under review" };
      }
      return { error: "This item has already been reviewed" };
    }

    // Create flag
    const { data: flag, error: flagError } = await supabase
      .from("item_ownership_flags")
      .insert({
        item_id: itemId,
        flagged_by: user.id,
      })
      .select()
      .single();

    if (flagError || !flag) {
      console.error("Error creating flag:", flagError);
      // Handle unique constraint violation (race condition)
      if (flagError?.code === "23505") {
        return { error: "This item is already under review" };
      }
      return { error: flagError?.message || "Failed to create flag" };
    }

    // Notification is automatically created by database trigger
    revalidatePath(`/friends`, "layout");
    revalidatePath(`/wishlists/${wishlistId}`);
    return { success: true };
  } catch (error) {
    console.error("Error in flagItemAsOwned:", error);
    return { error: error instanceof Error ? error.message : "An error occurred" };
  }
}

/**
 * Helper: Verify user owns the item and return wishlist ID
 */
async function verifyItemOwnership(supabase: any, userId: string, itemId: string) {
  const { data: item } = await supabase
    .from("wishlist_items")
    .select("wishlist_id, wishlists!inner(user_id)")
    .eq("id", itemId)
    .single();

  if (!item || item.wishlists.user_id !== userId) {
    return { error: "Not authorized" };
  }

  return { wishlistId: item.wishlist_id };
}

/**
 * Helper: Resolve ownership flag (confirm or deny)
 */
async function resolveOwnershipFlag(
  flagId: string,
  itemId: string,
  status: "confirmed" | "denied"
) {
  const { supabase, user } = await requireAuth();

  // Verify ownership
  const verification = await verifyItemOwnership(supabase, user.id, itemId);
  if ("error" in verification) {
    return verification;
  }

  const { wishlistId } = verification;

  // Update flag status (trigger handles unclaiming and notification)
  const { error } = await supabase
    .from("item_ownership_flags")
    .update({
      status,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", flagId)
    .eq("item_id", itemId); // Extra safety

  if (error) {
    console.error(`Error ${status === "confirmed" ? "confirming" : "denying"} flag:`, error);
    return { error: error.message };
  }

  // Archive the item only if confirmed
  if (status === "confirmed") {
    await supabase
      .from("wishlist_items")
      .update({ is_purchased: true })
      .eq("id", itemId);
  }

  revalidatePath(`/wishlists/${wishlistId}`);
  revalidatePath(`/friends`, "layout");
  return { success: true };
}

/**
 * Owner confirms they already own the item
 */
export async function confirmOwnershipFlag(flagId: string, itemId: string) {
  try {
    return await resolveOwnershipFlag(flagId, itemId, "confirmed");
  } catch (error) {
    console.error("Error in confirmOwnershipFlag:", error);
    return { error: error instanceof Error ? error.message : "An error occurred" };
  }
}

/**
 * Owner denies they own the item
 */
export async function denyOwnershipFlag(flagId: string, itemId: string) {
  try {
    return await resolveOwnershipFlag(flagId, itemId, "denied");
  } catch (error) {
    console.error("Error in denyOwnershipFlag:", error);
    return { error: error instanceof Error ? error.message : "An error occurred" };
  }
}

/**
 * Get ownership flags for multiple items
 */
export async function getOwnershipFlags(wishlistId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Get items in wishlist
  const { data: items } = await supabase
    .from("wishlist_items")
    .select("id")
    .eq("wishlist_id", wishlistId);

  if (!items || items.length === 0) return [];

  const itemIds = items.map((i) => i.id);

  // Fetch flags for these items
  const { data: flags, error } = await supabase
    .from("item_ownership_flags")
    .select(
      `
      id,
      item_id,
      flagged_by,
      status,
      created_at,
      resolved_at,
      flagger:profiles!item_ownership_flags_flagged_by_fkey(id, display_name)
    `
    )
    .in("item_id", itemIds);

  if (error) {
    console.error("Error fetching ownership flags:", error);
    return [];
  }

  return flags || [];
}
