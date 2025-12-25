"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getSplitClaimForItem } from "./split-claims";

export async function getItemClaims(wishlistId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Get items and their claims for this wishlist
  const { data: items } = await supabase
    .from("wishlist_items")
    .select("id")
    .eq("wishlist_id", wishlistId);

  if (!items || items.length === 0) return [];

  const itemIds = items.map((i) => i.id);

  const { data: claims, error } = await supabase
    .from("item_claims")
    .select(
      `
      id,
      item_id,
      claimed_by,
      created_at,
      claimer:profiles!item_claims_claimed_by_fkey(id, display_name)
    `
    )
    .in("item_id", itemIds);

  if (error) {
    console.error("Error fetching claims:", error);
    return [];
  }

  return claims || [];
}

export async function claimItem(itemId: string, wishlistId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Verify user doesn't own this wishlist
  const { data: wishlist } = await supabase
    .from("wishlists")
    .select("user_id")
    .eq("id", wishlistId)
    .single();

  if (wishlist?.user_id === user.id) {
    return { error: "Cannot claim items on your own wishlist" };
  }

  // Check if already claimed
  const { data: existingClaim } = await supabase
    .from("item_claims")
    .select("id, claimed_by")
    .eq("item_id", itemId)
    .single();

  if (existingClaim) {
    if (existingClaim.claimed_by === user.id) {
      return { error: "You already claimed this item" };
    }
    return { error: "This item has already been claimed by someone else" };
  }

  // Check for split claims
  const splitClaim = await getSplitClaimForItem(itemId);
  if (splitClaim) {
    return { error: "This item has a split claim in progress. Join the split instead!" };
  }

  // Check for ownership flag (pending or confirmed)
  const { data: ownershipFlag } = await supabase
    .from("item_ownership_flags")
    .select("status")
    .eq("item_id", itemId)
    .in("status", ["pending", "confirmed"])
    .maybeSingle();

  if (ownershipFlag) {
    if (ownershipFlag.status === "pending") {
      return { error: "This item is under review by the owner" };
    }
    return { error: "The owner already has this item" };
  }

  const { error } = await supabase.from("item_claims").insert({
    item_id: itemId,
    claimed_by: user.id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/friends`);
  return { success: true };
}

export async function unclaimItem(itemId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("item_claims")
    .delete()
    .eq("item_id", itemId)
    .eq("claimed_by", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/friends`);
  return { success: true };
}
