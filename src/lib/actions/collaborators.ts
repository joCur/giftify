"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "./helpers";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notifications/builder";

/**
 * Get all collaborators for a wishlist
 * Any user who can view the wishlist can see collaborators
 */
export async function getWishlistCollaborators(wishlistId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
      .from("wishlist_collaborators")
      .select(
        `
        id,
        user_id,
        invited_by,
        invited_at,
        user:profiles!wishlist_collaborators_user_id_fkey(id, display_name, avatar_url),
        inviter:profiles!wishlist_collaborators_invited_by_fkey(id, display_name)
      `
      )
      .eq("wishlist_id", wishlistId)
      .order("invited_at", { ascending: true });

    if (error) {
      console.error("Error fetching collaborators:", error);
      return [];
    }

    return data || [];
  } catch {
    return [];
  }
}

/**
 * Add a collaborator to a wishlist
 * Only primary owner can add collaborators
 * User must be a friend
 */
export async function addCollaborator(wishlistId: string, friendId: string) {
  try {
    const { supabase, user } = await requireAuth();

    // Get wishlist to verify primary ownership
    const { data: wishlist, error: wishlistError } = await supabase
      .from("wishlists")
      .select("user_id, name, is_archived")
      .eq("id", wishlistId)
      .single();

    if (wishlistError || !wishlist) {
      return { error: "Wishlist not found" };
    }

    if (wishlist.user_id !== user.id) {
      return { error: "Only the primary owner can add collaborators" };
    }

    if (wishlist.is_archived) {
      return { error: "Cannot add collaborators to archived wishlist" };
    }

    // Can't add yourself
    if (friendId === user.id) {
      return { error: "Cannot add yourself as a collaborator" };
    }

    // Verify users are friends
    const { data: areFriends, error: friendError } = await supabase.rpc(
      "are_friends",
      {
        user1_id: user.id,
        user2_id: friendId,
      }
    );

    if (friendError || !areFriends) {
      return { error: "Can only add friends as collaborators" };
    }

    // Check if already a collaborator
    const { data: existing } = await supabase
      .from("wishlist_collaborators")
      .select("id")
      .eq("wishlist_id", wishlistId)
      .eq("user_id", friendId)
      .single();

    if (existing) {
      return { error: "This friend is already a collaborator" };
    }

    // Add collaborator
    const { error: insertError } = await supabase
      .from("wishlist_collaborators")
      .insert({
        wishlist_id: wishlistId,
        user_id: friendId,
        invited_by: user.id,
      });

    if (insertError) {
      console.error("Error adding collaborator:", insertError);
      return { error: "Failed to add collaborator" };
    }

    // Get inviter profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();

    // Get primary owner profile (might be different from inviter)
    const { data: owner } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", wishlist.user_id)
      .single();

    // Create V2 notification for invited user
    try {
      await createNotification("collaborator_invited", {
        wishlist_id: wishlistId,
        wishlist_name: wishlist.name,
        primary_owner_id: wishlist.user_id,
        primary_owner_name: owner?.display_name || "Someone",
        inviter_id: user.id,
        inviter_name: profile?.display_name || "Someone",
        invited_user_id: friendId,
      })
        .to(friendId)
        .send();
    } catch (notifError) {
      console.error("Failed to send collaborator invited notification:", notifError);
    }

    revalidatePath(`/wishlists/${wishlistId}`);
    revalidatePath("/wishlists", "layout");
    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { error: "Not authenticated" };
  }
}

/**
 * Remove a collaborator from a wishlist
 * Can be done by primary owner or the collaborator themselves (leaving)
 */
export async function removeCollaborator(
  wishlistId: string,
  collaboratorUserId: string
) {
  try {
    const { supabase, user } = await requireAuth();

    // Check if user is primary owner or removing themselves
    const { data: wishlist } = await supabase
      .from("wishlists")
      .select("user_id, is_archived")
      .eq("id", wishlistId)
      .single();

    if (!wishlist) {
      return { error: "Wishlist not found" };
    }

    const isPrimaryOwner = wishlist.user_id === user.id;
    const isSelf = collaboratorUserId === user.id;

    if (!isPrimaryOwner && !isSelf) {
      return { error: "Not authorized" };
    }

    // Cannot remove collaborators from archived wishlist (unless self-removing)
    if (wishlist.is_archived && !isSelf) {
      return { error: "Cannot remove collaborators from archived wishlist" };
    }

    // Delete collaborator
    const { error: deleteError } = await supabase
      .from("wishlist_collaborators")
      .delete()
      .eq("wishlist_id", wishlistId)
      .eq("user_id", collaboratorUserId);

    if (deleteError) {
      console.error("Error removing collaborator:", deleteError);
      return { error: "Failed to remove collaborator" };
    }

    // Create V2 notification for self-removal (notify primary owner)
    if (isSelf) {
      try {
        // Get wishlist details
        const { data: fullWishlist } = await supabase
          .from("wishlists")
          .select("name")
          .eq("id", wishlistId)
          .single();

        // Get leaver profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .single();

        await createNotification("collaborator_left", {
          wishlist_id: wishlistId,
          wishlist_name: fullWishlist?.name || "a wishlist",
          primary_owner_id: wishlist.user_id,
          leaver_id: user.id,
          leaver_name: profile?.display_name || "Someone",
        })
          .to(wishlist.user_id)
          .send();
      } catch (notifError) {
        console.error("Failed to send collaborator left notification:", notifError);
      }
    }

    revalidatePath(`/wishlists/${wishlistId}`);
    revalidatePath("/wishlists", "layout");
    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { error: "Not authenticated" };
  }
}

/**
 * Leave a joint wishlist (for collaborators)
 * Convenience wrapper around removeCollaborator for clarity in UI
 */
export async function leaveJointWishlist(wishlistId: string) {
  try {
    const { supabase, user } = await requireAuth();

    // Verify user is a collaborator (not primary owner)
    const { data: wishlist } = await supabase
      .from("wishlists")
      .select("user_id")
      .eq("id", wishlistId)
      .single();

    if (!wishlist) {
      return { error: "Wishlist not found" };
    }

    if (wishlist.user_id === user.id) {
      return { error: "Primary owner cannot leave. Transfer ownership or delete the wishlist." };
    }

    // Check if user is actually a collaborator
    const { data: collab } = await supabase
      .from("wishlist_collaborators")
      .select("id")
      .eq("wishlist_id", wishlistId)
      .eq("user_id", user.id)
      .single();

    if (!collab) {
      return { error: "You are not a collaborator on this wishlist" };
    }

    return removeCollaborator(wishlistId, user.id);
  } catch {
    return { error: "Not authenticated" };
  }
}

/**
 * Convert an existing wishlist to a joint wishlist by adding collaborators
 */
export async function convertToJointWishlist(
  wishlistId: string,
  friendIds: string[]
) {
  try {
    const { supabase, user } = await requireAuth();

    if (friendIds.length === 0) {
      return { error: "Must add at least one collaborator" };
    }

    if (friendIds.length > 10) {
      return { error: "Cannot add more than 10 collaborators" };
    }

    // Verify primary ownership
    const { data: wishlist } = await supabase
      .from("wishlists")
      .select("user_id, is_archived, is_joint")
      .eq("id", wishlistId)
      .single();

    if (!wishlist) {
      return { error: "Wishlist not found" };
    }

    if (wishlist.user_id !== user.id) {
      return { error: "Only the primary owner can convert to joint wishlist" };
    }

    if (wishlist.is_archived) {
      return { error: "Cannot convert archived wishlist" };
    }

    // Verify all are friends
    for (const friendId of friendIds) {
      if (friendId === user.id) {
        return { error: "Cannot add yourself as a collaborator" };
      }

      const { data: isFriend, error: friendCheckError } = await supabase.rpc("are_friends", {
        user1_id: user.id,
        user2_id: friendId,
      });

      if (friendCheckError) {
        console.error("Error checking friendship:", friendCheckError);
        return { error: "Failed to verify friendships" };
      }

      if (!isFriend) {
        return { error: "All collaborators must be your friends" };
      }
    }

    // Add all collaborators
    const collaboratorInserts = friendIds.map((friendId) => ({
      wishlist_id: wishlistId,
      user_id: friendId,
      invited_by: user.id,
    }));

    const { error: insertError } = await supabase
      .from("wishlist_collaborators")
      .insert(collaboratorInserts);

    if (insertError) {
      // Handle partial insert errors
      if (insertError.code === "23505") {
        return { error: "Some friends are already collaborators" };
      }
      console.error("Error converting to joint wishlist:", insertError);
      return { error: "Failed to add collaborators" };
    }

    revalidatePath(`/wishlists/${wishlistId}`);
    revalidatePath("/wishlists", "layout");
    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { error: "Not authenticated" };
  }
}

/**
 * Get friends who can be added as collaborators (not already collaborators)
 */
export async function getAvailableFriendsForCollaboration(wishlistId: string) {
  try {
    const { supabase, user } = await requireAuth();

    // Verify user is primary owner
    const { data: wishlist } = await supabase
      .from("wishlists")
      .select("user_id")
      .eq("id", wishlistId)
      .single();

    if (!wishlist || wishlist.user_id !== user.id) {
      return { error: "Not authorized" };
    }

    // Get existing collaborator IDs
    const { data: existingCollabs } = await supabase
      .from("wishlist_collaborators")
      .select("user_id")
      .eq("wishlist_id", wishlistId);

    const existingIds = new Set(existingCollabs?.map((c) => c.user_id) || []);

    // Get all accepted friends
    const { data: friendships } = await supabase
      .from("friendships")
      .select(
        `
        requester_id,
        addressee_id,
        requester:profiles!friendships_requester_id_fkey(id, display_name, avatar_url),
        addressee:profiles!friendships_addressee_id_fkey(id, display_name, avatar_url)
      `
      )
      .eq("status", "accepted")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (!friendships) return { data: [] };

    // Extract friends (not including self or existing collaborators)
    const friends = friendships
      .map((f) => {
        if (f.requester_id === user.id) {
          return f.addressee;
        }
        return f.requester;
      })
      .filter((f): f is NonNullable<typeof f> => f !== null && !existingIds.has(f.id));

    return { data: friends };
  } catch {
    return { error: "Not authenticated" };
  }
}
