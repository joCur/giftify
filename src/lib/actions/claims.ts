"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getSplitClaimForItem } from "./split-claims";
import { recordClaimHistoryEvent } from "./claim-history";

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
    .in("item_id", itemIds)
    .eq("status", "active");

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

  // Check if already claimed (only active claims)
  const { data: existingClaim } = await supabase
    .from("item_claims")
    .select("id, claimed_by")
    .eq("item_id", itemId)
    .eq("status", "active")
    .maybeSingle();

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

  const { data: newClaim, error } = await supabase
    .from("item_claims")
    .insert({
      item_id: itemId,
      claimed_by: user.id,
      status: "active",
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  // Record history event
  await recordClaimHistoryEvent("claimed", newClaim.id, undefined, {
    item_id: itemId,
    wishlist_id: wishlistId,
  });

  revalidatePath(`/friends`);
  revalidatePath(`/dashboard`);
  revalidatePath(`/claims-history`);
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

  // Soft delete: update status to 'cancelled' instead of deleting
  const { data: updatedClaim, error } = await supabase
    .from("item_claims")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    })
    .eq("item_id", itemId)
    .eq("claimed_by", user.id)
    .eq("status", "active")
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  if (!updatedClaim) {
    return { error: "No active claim found for this item" };
  }

  // Record history event
  await recordClaimHistoryEvent("cancelled", updatedClaim.id, undefined, {
    item_id: itemId,
  });

  revalidatePath(`/friends`);
  revalidatePath(`/dashboard`);
  revalidatePath(`/claims-history`);
  return { success: true };
}

export async function markGiftGiven(
  claimId: string,
  claimType: "solo" | "split"
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (claimType === "solo") {
    // Get the claim and verify user is the claimer
    const { data: claim } = await supabase
      .from("item_claims")
      .select("id, item_id, claimed_by, status")
      .eq("id", claimId)
      .single();

    if (!claim) {
      return { error: "Claim not found" };
    }

    if (claim.claimed_by !== user.id) {
      return { error: "Not authorized - you can only mark your own claims as given" };
    }

    if (claim.status === "fulfilled") {
      return { error: "This gift has already been marked as given" };
    }

    if (claim.status === "cancelled") {
      return { error: "Cannot mark a cancelled claim as given" };
    }

    // Get item and wishlist details
    const { data: item } = await supabase
      .from("wishlist_items")
      .select("id, title, wishlist_id")
      .eq("id", claim.item_id)
      .single();

    if (!item) {
      return { error: "Item not found" };
    }

    // Get wishlist owner
    const { data: wishlist } = await supabase
      .from("wishlists")
      .select("user_id")
      .eq("id", item.wishlist_id)
      .single();

    if (!wishlist) {
      return { error: "Wishlist not found" };
    }

    // Update claim to fulfilled
    const { error: updateError } = await supabase
      .from("item_claims")
      .update({
        status: "fulfilled",
        fulfilled_at: new Date().toISOString(),
      })
      .eq("id", claimId);

    if (updateError) {
      return { error: updateError.message };
    }

    // Update item to received
    await supabase
      .from("wishlist_items")
      .update({ is_received: true })
      .eq("id", item.id);

    // Get gifter's name for notification
    const { data: gifter } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();

    // Notify the owner
    await supabase.from("notifications").insert({
      user_id: wishlist.user_id,
      type: "gift_marked_given",
      title: "Gift Given!",
      message: `${gifter?.display_name || "Someone"} marked "${item.title}" as given. Did you receive it?`,
      actor_id: user.id,
      wishlist_id: item.wishlist_id,
      item_id: item.id,
    });

    // Record history event
    await recordClaimHistoryEvent("fulfilled", claimId, undefined, {
      item_id: item.id,
      wishlist_id: item.wishlist_id,
      fulfilled_by: "gifter",
    });
  } else {
    // Split claim
    // First verify user is a participant
    const { data: participation } = await supabase
      .from("split_claim_participants")
      .select("split_claim_id")
      .eq("split_claim_id", claimId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!participation) {
      return { error: "Not authorized - you are not a participant in this split claim" };
    }

    // Get the split claim
    const { data: splitClaim } = await supabase
      .from("split_claims")
      .select("id, item_id, claim_status")
      .eq("id", claimId)
      .single();

    if (!splitClaim) {
      return { error: "Split claim not found" };
    }

    if (splitClaim.claim_status === "fulfilled") {
      return { error: "This gift has already been marked as given" };
    }

    if (splitClaim.claim_status === "cancelled") {
      return { error: "Cannot mark a cancelled claim as given" };
    }

    // Get item and wishlist details
    const { data: item } = await supabase
      .from("wishlist_items")
      .select("id, title, wishlist_id")
      .eq("id", splitClaim.item_id)
      .single();

    if (!item) {
      return { error: "Item not found" };
    }

    // Get wishlist owner
    const { data: wishlist } = await supabase
      .from("wishlists")
      .select("user_id")
      .eq("id", item.wishlist_id)
      .single();

    if (!wishlist) {
      return { error: "Wishlist not found" };
    }

    // Update split claim to fulfilled
    const { error: updateError } = await supabase
      .from("split_claims")
      .update({
        claim_status: "fulfilled",
        fulfilled_at: new Date().toISOString(),
      })
      .eq("id", claimId);

    if (updateError) {
      return { error: updateError.message };
    }

    // Update item to received
    await supabase
      .from("wishlist_items")
      .update({ is_received: true })
      .eq("id", item.id);

    // Get gifter's name for notification
    const { data: gifter } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();

    // Notify the owner
    await supabase.from("notifications").insert({
      user_id: wishlist.user_id,
      type: "gift_marked_given",
      title: "Gift Given!",
      message: `${gifter?.display_name || "Someone"} marked "${item.title}" as given. Did you receive it?`,
      actor_id: user.id,
      wishlist_id: item.wishlist_id,
      item_id: item.id,
    });

    // Record history event
    await recordClaimHistoryEvent("fulfilled", undefined, claimId, {
      item_id: item.id,
      wishlist_id: item.wishlist_id,
      fulfilled_by: "gifter",
    });
  }

  revalidatePath(`/friends`);
  revalidatePath(`/dashboard`);
  revalidatePath(`/claims-history`);
  return { success: true };
}
