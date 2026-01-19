"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requireAuth } from "./helpers";
import { recordClaimHistoryEvent } from "./claim-history";
import type { SplitClaimWithParticipants } from "@/lib/supabase/types.custom";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types.custom";
import { notifyWishlistViewers } from "@/lib/notifications/builder";

// Constants
const MIN_SPLIT_PARTICIPANTS = 2;
const MAX_SPLIT_PARTICIPANTS = 10;

// Shared select query for split claims with participants
const SPLIT_CLAIM_SELECT = `
  id,
  item_id,
  initiated_by,
  target_participants,
  status,
  created_at,
  updated_at,
  confirmed_at,
  initiator:profiles!split_claims_initiated_by_fkey(id, display_name),
  participants:split_claim_participants(
    id,
    user_id,
    joined_at,
    user:profiles!split_claim_participants_user_id_fkey(id, display_name)
  )
` as const;

// Helper: Verify user doesn't own the wishlist
async function verifyNotWishlistOwner(
  supabase: SupabaseClient<Database>,
  wishlistId: string,
  userId: string
): Promise<{ error?: string }> {
  const { data: wishlist } = await supabase
    .from("wishlists")
    .select("user_id")
    .eq("id", wishlistId)
    .single();

  if (wishlist?.user_id === userId) {
    return { error: "Cannot perform this action on your own wishlist" };
  }

  return {};
}

// Helper: Count participants in a split claim
async function getParticipantCount(
  supabase: SupabaseClient<Database>,
  splitClaimId: string
): Promise<number> {
  const { count } = await supabase
    .from("split_claim_participants")
    .select("*", { count: "exact", head: true })
    .eq("split_claim_id", splitClaimId);

  return count || 0;
}

/**
 * Get all split claims for items in a wishlist
 */
export async function getSplitClaimsForWishlist(
  wishlistId: string
): Promise<SplitClaimWithParticipants[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Get items in this wishlist
  const { data: items } = await supabase
    .from("wishlist_items")
    .select("id")
    .eq("wishlist_id", wishlistId);

  if (!items || items.length === 0) return [];

  const itemIds = items.map((i) => i.id);

  const { data: splitClaims, error } = await supabase
    .from("split_claims")
    .select(SPLIT_CLAIM_SELECT)
    .in("item_id", itemIds)
    .eq("claim_status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching split claims:", error);
    return [];
  }

  return (splitClaims || []) as SplitClaimWithParticipants[];
}

/**
 * Get a single split claim by item ID
 */
export async function getSplitClaimForItem(
  itemId: string
): Promise<SplitClaimWithParticipants | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: splitClaim, error } = await supabase
    .from("split_claims")
    .select(SPLIT_CLAIM_SELECT)
    .eq("item_id", itemId)
    .eq("claim_status", "active")
    .maybeSingle();

  if (error) {
    console.error("Error fetching split claim:", error);
    return null;
  }

  return splitClaim as SplitClaimWithParticipants | null;
}

/**
 * Initiate a split claim on an item
 */
export async function initiateSplitClaim(
  itemId: string,
  wishlistId: string,
  targetParticipants: number
) {
  try {
    const { supabase, user } = await requireAuth();

    // Validate target participants
    if (
      targetParticipants < MIN_SPLIT_PARTICIPANTS ||
      targetParticipants > MAX_SPLIT_PARTICIPANTS
    ) {
      return {
        error: `Target participants must be between ${MIN_SPLIT_PARTICIPANTS} and ${MAX_SPLIT_PARTICIPANTS}`,
      };
    }

    // Verify user doesn't own this wishlist
    const ownerCheck = await verifyNotWishlistOwner(supabase, wishlistId, user.id);
    if (ownerCheck.error) return ownerCheck;

    // Check if already claimed (solo) - only active claims
    const { data: existingSoloClaim } = await supabase
      .from("item_claims")
      .select("id")
      .eq("item_id", itemId)
      .eq("status", "active")
      .maybeSingle();

    if (existingSoloClaim) {
      return { error: "This item already has a solo claim" };
    }

    // Check if already has an active split claim
    const { data: existingSplitClaim } = await supabase
      .from("split_claims")
      .select("id")
      .eq("item_id", itemId)
      .eq("claim_status", "active")
      .maybeSingle();

    if (existingSplitClaim) {
      return { error: "This item already has a split claim in progress" };
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

    // Create split claim
    const { data: splitClaim, error: splitError } = await supabase
      .from("split_claims")
      .insert({
        item_id: itemId,
        initiated_by: user.id,
        target_participants: targetParticipants,
        status: "pending",
        claim_status: "active",
      })
      .select()
      .single();

    if (splitError) {
      return { error: splitError.message };
    }

    // Add initiator as first participant
    const { error: participantError } = await supabase
      .from("split_claim_participants")
      .insert({
        split_claim_id: splitClaim.id,
        user_id: user.id,
      });

    if (participantError) {
      // Rollback split claim creation
      await supabase.from("split_claims").delete().eq("id", splitClaim.id);
      return { error: participantError.message };
    }

    // Record history event
    await recordClaimHistoryEvent("joined_split", undefined, splitClaim.id, {
      item_id: itemId,
      wishlist_id: wishlistId,
      is_initiator: true,
    });

    // Send split_initiated notification to eligible friends
    try {
      // Get item details
      const { data: item } = await supabase
        .from("wishlist_items")
        .select("id, title, image_url, price, currency")
        .eq("id", itemId)
        .single();

      // Get wishlist details
      const { data: wishlist } = await supabase
        .from("wishlists")
        .select("id, name, user_id")
        .eq("id", wishlistId)
        .single();

      // Get wishlist owner profile
      const { data: owner } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", wishlist?.user_id || "")
        .single();

      // Get initiator profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .single();

      if (item && wishlist) {
        // Calculate cost per person if price exists
        const costPerPerson =
          item.price && targetParticipants > 0
            ? Math.ceil(item.price / targetParticipants)
            : undefined;

        // Notify friends who can view this wishlist (respects privacy)
        await notifyWishlistViewers(wishlistId, wishlist.user_id, "split_initiated", {
          split_claim_id: splitClaim.id,
          item_id: item.id,
          item_title: item.title,
          item_image_url: item.image_url,
          item_price: item.price,
          item_currency: item.currency,
          wishlist_id: wishlist.id,
          wishlist_name: wishlist.name,
          wishlist_owner_id: wishlist.user_id,
          wishlist_owner_name: owner?.display_name || "Someone",
          initiator_id: user.id,
          initiator_name: profile?.display_name || "Someone",
          initiator_avatar_url: profile?.avatar_url,
          target_participants: targetParticipants,
          cost_per_person: costPerPerson,
        });
      }
    } catch (notifError) {
      console.error("Failed to send split initiated notification:", notifError);
    }

    revalidatePath(`/friends`);
    revalidatePath(`/dashboard`);
    revalidatePath(`/claims-history`);
    return { success: true, data: splitClaim };
  } catch {
    return { error: "Not authenticated" };
  }
}

/**
 * Join an existing split claim
 */
export async function joinSplitClaim(splitClaimId: string, wishlistId: string) {
  try {
    const { supabase, user } = await requireAuth();

    // Verify user doesn't own this wishlist
    const ownerCheck = await verifyNotWishlistOwner(supabase, wishlistId, user.id);
    if (ownerCheck.error) return ownerCheck;

    // Check if split claim exists, is pending, and is active
    const { data: splitClaim } = await supabase
      .from("split_claims")
      .select("id, item_id, status, claim_status, target_participants")
      .eq("id", splitClaimId)
      .maybeSingle();

    if (!splitClaim) {
      return { error: "Split claim not found" };
    }

    if (splitClaim.claim_status !== "active") {
      return { error: "Split claim is no longer active" };
    }

    if (splitClaim.status !== "pending") {
      return { error: "Split claim is already confirmed" };
    }

    // Check if already participating
    const { data: existingParticipant } = await supabase
      .from("split_claim_participants")
      .select("id")
      .eq("split_claim_id", splitClaimId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingParticipant) {
      return { error: "You are already participating in this split" };
    }

    // Check if split is full
    const participantCount = await getParticipantCount(supabase, splitClaimId);

    if (participantCount >= splitClaim.target_participants) {
      return { error: "Split claim is full" };
    }

    // Insert participant - auto-confirm trigger will handle confirmation
    const { error } = await supabase.from("split_claim_participants").insert({
      split_claim_id: splitClaimId,
      user_id: user.id,
    });

    if (error) {
      return { error: error.message };
    }

    // Record history event
    await recordClaimHistoryEvent("joined_split", undefined, splitClaimId, {
      item_id: splitClaim.item_id,
      wishlist_id: wishlistId,
      is_initiator: false,
    });

    revalidatePath(`/friends`);
    revalidatePath(`/dashboard`);
    revalidatePath(`/claims-history`);
    return { success: true };
  } catch {
    return { error: "Not authenticated" };
  }
}

/**
 * Leave a split claim (if not confirmed)
 */
export async function leaveSplitClaim(splitClaimId: string) {
  try {
    const { supabase, user } = await requireAuth();

    // Check if split claim exists and is pending
    const { data: splitClaim } = await supabase
      .from("split_claims")
      .select("id, item_id, status, claim_status, initiated_by")
      .eq("id", splitClaimId)
      .maybeSingle();

    if (!splitClaim) {
      return { error: "Split claim not found" };
    }

    if (splitClaim.claim_status !== "active") {
      return { error: "Split claim is no longer active" };
    }

    if (splitClaim.status !== "pending") {
      return { error: "Cannot leave a confirmed split claim" };
    }

    // If initiator is leaving, soft-delete entire split claim
    if (splitClaim.initiated_by === user.id) {
      const { error } = await supabase
        .from("split_claims")
        .update({
          claim_status: "cancelled",
          cancelled_at: new Date().toISOString(),
        })
        .eq("id", splitClaimId);

      if (error) {
        return { error: error.message };
      }

      // Record history event for split cancellation
      await recordClaimHistoryEvent("split_cancelled", undefined, splitClaimId, {
        item_id: splitClaim.item_id,
        cancelled_by_initiator: true,
      });

      revalidatePath(`/friends`);
      revalidatePath(`/dashboard`);
      revalidatePath(`/claims-history`);
      return { success: true, cancelled: true };
    }

    // Otherwise, participant leaving (still hard delete for participants, but record event)
    const { error } = await supabase
      .from("split_claim_participants")
      .delete()
      .eq("split_claim_id", splitClaimId)
      .eq("user_id", user.id);

    if (error) {
      return { error: error.message };
    }

    // Record history event for leaving split
    await recordClaimHistoryEvent("left_split", undefined, splitClaimId, {
      item_id: splitClaim.item_id,
    });

    revalidatePath(`/friends`);
    revalidatePath(`/dashboard`);
    revalidatePath(`/claims-history`);
    return { success: true };
  } catch {
    return { error: "Not authenticated" };
  }
}

/**
 * Manually confirm split claim (initiator only, before target reached)
 */
export async function confirmSplitClaim(splitClaimId: string) {
  try {
    const { supabase, user } = await requireAuth();

    // Check if user is initiator and split is pending
    const { data: splitClaim } = await supabase
      .from("split_claims")
      .select("id, status, initiated_by, target_participants")
      .eq("id", splitClaimId)
      .maybeSingle();

    if (!splitClaim) {
      return { error: "Split claim not found" };
    }

    if (splitClaim.initiated_by !== user.id) {
      return { error: "Only the initiator can manually confirm" };
    }

    if (splitClaim.status !== "pending") {
      return { error: "Split claim is already confirmed" };
    }

    // Verify at least 2 participants
    const participantCount = await getParticipantCount(supabase, splitClaimId);

    if (participantCount < MIN_SPLIT_PARTICIPANTS) {
      return {
        error: `Need at least ${MIN_SPLIT_PARTICIPANTS} participants to confirm`,
      };
    }

    if (participantCount > splitClaim.target_participants) {
      return { error: "Too many participants for this split" };
    }

    const { error } = await supabase
      .from("split_claims")
      .update({
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", splitClaimId);

    if (error) {
      return { error: error.message };
    }

    revalidatePath(`/friends`);
    return { success: true };
  } catch {
    return { error: "Not authenticated" };
  }
}
