"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "./helpers";
import { revalidatePath } from "next/cache";
import type { WishlistPrivacy } from "@/lib/supabase/types.custom";
import { notifyFriends } from "@/lib/notifications/builder";

/**
 * Helper: Verify user owns the wishlist
 */
async function verifyWishlistOwnership(
  supabase: any,
  userId: string,
  wishlistId: string,
  additionalFields?: string
): Promise<{ wishlist: any } | { error: string }> {
  const selectFields = additionalFields ? `user_id, ${additionalFields}` : "user_id";

  const { data: wishlist, error: fetchError } = await supabase
    .from("wishlists")
    .select(selectFields)
    .eq("id", wishlistId)
    .single();

  if (fetchError) {
    return { error: "Wishlist not found" };
  }

  if (!wishlist || wishlist.user_id !== userId) {
    return { error: "Not authorized" };
  }

  return { wishlist };
}

export async function getMyWishlists(archived: boolean = false) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Get wishlists where user is primary owner
  const { data: ownedWishlists, error: ownedError } = await supabase
    .from("wishlists")
    .select(
      `
      *,
      items:wishlist_items(count),
      owner:profiles!wishlists_user_id_fkey(id, display_name, avatar_url)
    `
    )
    .eq("user_id", user.id)
    .eq("is_archived", archived)
    .order("created_at", { ascending: false });

  if (ownedError) {
    console.error("Error fetching owned wishlists:", ownedError);
    return [];
  }

  // Get wishlists where user is a collaborator
  const { data: collabData, error: collabError } = await supabase
    .from("wishlist_collaborators")
    .select(
      `
      wishlist:wishlists!wishlist_collaborators_wishlist_id_fkey(
        *,
        items:wishlist_items(count),
        owner:profiles!wishlists_user_id_fkey(id, display_name, avatar_url)
      )
    `
    )
    .eq("user_id", user.id);

  if (collabError) {
    console.error("Error fetching collaborating wishlists:", collabError);
    return ownedWishlists || [];
  }

  // Extract and filter collaborator wishlists by archived status
  const collabWishlists = (collabData || [])
    .map((item) => item.wishlist)
    .filter((w): w is NonNullable<typeof w> => w !== null && w.is_archived === archived);

  // Combine all wishlists and sort by created_at (newest first)
  const allWishlists = [...(ownedWishlists || []), ...collabWishlists];
  allWishlists.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return allWishlists;
}

export async function getWishlist(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("wishlists")
    .select(
      `
      *,
      owner:profiles!wishlists_user_id_fkey(id, display_name, avatar_url),
      items:wishlist_items(*),
      collaborators:wishlist_collaborators(
        id,
        user_id,
        invited_at,
        user:profiles!wishlist_collaborators_user_id_fkey(id, display_name, avatar_url)
      )
    `
    )
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching wishlist:", error);
    return null;
  }

  return data;
}

export async function createWishlist(formData: FormData) {
  try {
    const { supabase, user } = await requireAuth();

    const name = formData.get("name") as string;
    if (!name || !name.trim()) {
      return { error: "Name is required" };
    }

    const description = (formData.get("description") as string) || null;
    const privacy = (formData.get("privacy") as WishlistPrivacy) || "friends";

    if (!["friends", "selected_friends", "private"].includes(privacy)) {
      return { error: "Invalid privacy setting" };
    }

    // Get user profile for notification metadata
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .single();

    const { data, error } = await supabase
      .from("wishlists")
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        privacy,
      })
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    // Create V2 notification (only for non-private wishlists)
    if (privacy !== "private") {
      try {
        await notifyFriends(user.id, "wishlist_created", {
          wishlist_id: data.id,
          wishlist_name: data.name,
          owner_id: user.id,
          owner_name: profile?.display_name || "A friend",
          owner_avatar_url: profile?.avatar_url,
          privacy: data.privacy,
        });
      } catch (notifError) {
        // Log but don't fail the main operation
        console.error("Failed to send wishlist created notification:", notifError);
      }
    }

    revalidatePath("/dashboard");
    return { data };
  } catch {
    return { error: "Not authenticated" };
  }
}

export async function updateWishlist(id: string, formData: FormData) {
  try {
    const { supabase, user } = await requireAuth();

    // Verify user can edit (owner or collaborator)
    const { data: wishlist } = await supabase
      .from("wishlists")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!wishlist) {
      return { error: "Wishlist not found" };
    }

    const isOwner = wishlist.user_id === user.id;
    const { data: isCollab } = await supabase.rpc("is_wishlist_collaborator", {
      target_wishlist_id: id,
      target_user_id: user.id,
    });

    if (!isOwner && !isCollab) {
      return { error: "Not authorized" };
    }

    const name = formData.get("name") as string;
    if (!name || !name.trim()) {
      return { error: "Name is required" };
    }

    const description = (formData.get("description") as string) || null;
    const privacy = (formData.get("privacy") as WishlistPrivacy) || "friends";

    if (!["friends", "selected_friends", "private"].includes(privacy)) {
      return { error: "Invalid privacy setting" };
    }

    const { error } = await supabase
      .from("wishlists")
      .update({
        name: name.trim(),
        description: description?.trim() || null,
        privacy,
      })
      .eq("id", id);

    if (error) {
      return { error: error.message };
    }

    revalidatePath(`/wishlists/${id}`);
    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { error: "Not authenticated" };
  }
}

export async function deleteWishlist(id: string) {
  try {
    const { supabase, user } = await requireAuth();

    // Verify ownership
    const verification = await verifyWishlistOwnership(supabase, user.id, id);
    if ("error" in verification) {
      return verification;
    }

    const { error } = await supabase.from("wishlists").delete().eq("id", id);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { error: "Not authenticated" };
  }
}

export async function archiveWishlist(id: string) {
  try {
    const { supabase, user } = await requireAuth();

    // Verify ownership and get wishlist details
    const verification = await verifyWishlistOwnership(supabase, user.id, id, "name, is_archived, privacy");
    if ("error" in verification) {
      return verification;
    }

    const { wishlist } = verification;

    if (wishlist.is_archived) {
      return { error: "Wishlist is already archived" };
    }

    // Get user profile for notification metadata
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .single();

    // Update wishlist to archived
    const { error: updateError } = await supabase
      .from("wishlists")
      .update({ is_archived: true })
      .eq("id", id);

    if (updateError) {
      console.error("Error archiving wishlist:", updateError);
      return { error: "Failed to archive wishlist" };
    }

    // Create V2 notification (only for non-private wishlists)
    if (wishlist.privacy !== "private") {
      try {
        await notifyFriends(user.id, "wishlist_archived", {
          wishlist_id: id,
          wishlist_name: wishlist.name,
          owner_id: user.id,
          owner_name: profile?.display_name || "A friend",
          owner_avatar_url: profile?.avatar_url,
        });
      } catch (notifError) {
        // Log but don't fail the main operation
        console.error("Failed to send wishlist archived notification:", notifError);
      }
    }

    // Revalidate relevant paths
    revalidatePath("/wishlists", "layout");
    revalidatePath(`/wishlists/${id}`);

    return { success: true };
  } catch (error) {
    console.error("Unexpected error archiving wishlist:", error);
    return { error: "Not authenticated" };
  }
}

export async function unarchiveWishlist(id: string) {
  try {
    const { supabase, user } = await requireAuth();

    // Verify ownership and get wishlist details
    const verification = await verifyWishlistOwnership(supabase, user.id, id, "is_archived");
    if ("error" in verification) {
      return verification;
    }

    const { wishlist } = verification;

    if (!wishlist.is_archived) {
      return { error: "Wishlist is not archived" };
    }

    // Update wishlist to active
    const { error: updateError } = await supabase
      .from("wishlists")
      .update({ is_archived: false })
      .eq("id", id);

    if (updateError) {
      console.error("Error unarchiving wishlist:", updateError);
      return { error: "Failed to unarchive wishlist" };
    }

    // Revalidate relevant paths
    revalidatePath("/wishlists", "layout");
    revalidatePath(`/wishlists/${id}`);

    return { success: true };
  } catch (error) {
    console.error("Unexpected error unarchiving wishlist:", error);
    return { error: "Not authenticated" };
  }
}
