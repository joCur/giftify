"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "./helpers";
import { revalidatePath } from "next/cache";

// Escape SQL wildcard characters to prevent injection
function escapeWildcards(str: string): string {
  return str.replace(/[%_]/g, "\\$&");
}

export async function searchUsers(query: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !query.trim()) return [];

  const sanitizedQuery = escapeWildcards(query.trim());

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .neq("id", user.id)
    .ilike("display_name", `%${sanitizedQuery}%`)
    .limit(10);

  if (error) {
    console.error("Error searching users:", error);
    return [];
  }

  return data || [];
}

export async function getMyFriends() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("friendships")
    .select(
      `
      id,
      status,
      requester_id,
      addressee_id,
      requester:profiles!friendships_requester_id_fkey(id, display_name, avatar_url, birthday),
      addressee:profiles!friendships_addressee_id_fkey(id, display_name, avatar_url, birthday)
    `
    )
    .eq("status", "accepted")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  if (error) {
    console.error("Error fetching friends:", error);
    return [];
  }

  // Map to friend profile (the other person in the friendship)
  return (data || []).map((friendship) => {
    const friend =
      friendship.requester_id === user.id
        ? friendship.addressee
        : friendship.requester;
    return {
      friendshipId: friendship.id,
      ...friend,
    };
  });
}

export async function getPendingRequests() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { incoming: [], outgoing: [] };

  const { data, error } = await supabase
    .from("friendships")
    .select(
      `
      id,
      status,
      requester_id,
      addressee_id,
      created_at,
      requester:profiles!friendships_requester_id_fkey(id, display_name, avatar_url),
      addressee:profiles!friendships_addressee_id_fkey(id, display_name, avatar_url)
    `
    )
    .eq("status", "pending")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  if (error) {
    console.error("Error fetching pending requests:", error);
    return { incoming: [], outgoing: [] };
  }

  const incoming = (data || [])
    .filter((r) => r.addressee_id === user.id)
    .map((r) => ({
      id: r.id,
      from: r.requester,
      created_at: r.created_at,
    }));

  const outgoing = (data || [])
    .filter((r) => r.requester_id === user.id)
    .map((r) => ({
      id: r.id,
      to: r.addressee,
      created_at: r.created_at,
    }));

  return { incoming, outgoing };
}

export async function sendFriendRequest(addresseeId: string) {
  try {
    const { supabase, user } = await requireAuth();

    if (user.id === addresseeId) {
      return { error: "Cannot send friend request to yourself" };
    }

    // Check if friendship already exists
    const { data: existing } = await supabase
      .from("friendships")
      .select("id, status")
      .or(
        `and(requester_id.eq.${user.id},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${user.id})`
      )
      .single();

    if (existing) {
      if (existing.status === "accepted") {
        return { error: "You are already friends" };
      }
      if (existing.status === "pending") {
        return { error: "Friend request already pending" };
      }
    }

    const { error } = await supabase.from("friendships").insert({
      requester_id: user.id,
      addressee_id: addresseeId,
      status: "pending",
    });

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/friends");
    return { success: true };
  } catch {
    return { error: "Not authenticated" };
  }
}

export async function acceptFriendRequest(friendshipId: string) {
  try {
    const { supabase, user } = await requireAuth();

    // Verify user is the addressee
    const { data: friendship } = await supabase
      .from("friendships")
      .select("addressee_id")
      .eq("id", friendshipId)
      .eq("status", "pending")
      .single();

    if (!friendship || friendship.addressee_id !== user.id) {
      return { error: "Not authorized" };
    }

    const { error } = await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", friendshipId);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/friends");
    return { success: true };
  } catch {
    return { error: "Not authenticated" };
  }
}

export async function declineFriendRequest(friendshipId: string) {
  try {
    const { supabase, user } = await requireAuth();

    // Verify user is the addressee
    const { data: friendship } = await supabase
      .from("friendships")
      .select("addressee_id")
      .eq("id", friendshipId)
      .eq("status", "pending")
      .single();

    if (!friendship || friendship.addressee_id !== user.id) {
      return { error: "Not authorized" };
    }

    const { error } = await supabase
      .from("friendships")
      .update({ status: "declined" })
      .eq("id", friendshipId);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/friends");
    return { success: true };
  } catch {
    return { error: "Not authenticated" };
  }
}

export async function removeFriend(friendshipId: string) {
  try {
    const { supabase, user } = await requireAuth();

    // Verify user is part of the friendship
    const { data: friendship } = await supabase
      .from("friendships")
      .select("requester_id, addressee_id")
      .eq("id", friendshipId)
      .single();

    if (
      !friendship ||
      (friendship.requester_id !== user.id &&
        friendship.addressee_id !== user.id)
    ) {
      return { error: "Not authorized" };
    }

    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", friendshipId);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/friends");
    return { success: true };
  } catch {
    return { error: "Not authenticated" };
  }
}

export async function cancelFriendRequest(friendshipId: string) {
  try {
    const { supabase, user } = await requireAuth();

    // Verify user is the requester
    const { data: friendship } = await supabase
      .from("friendships")
      .select("requester_id")
      .eq("id", friendshipId)
      .eq("status", "pending")
      .single();

    if (!friendship || friendship.requester_id !== user.id) {
      return { error: "Not authorized" };
    }

    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", friendshipId);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/friends");
    return { success: true };
  } catch {
    return { error: "Not authenticated" };
  }
}

export async function getFriendWishlists(friendId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Verify they are friends
  const { data: friendship } = await supabase
    .from("friendships")
    .select("id")
    .eq("status", "accepted")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${user.id})`
    )
    .single();

  if (!friendship) return [];

  const { data, error } = await supabase
    .from("wishlists")
    .select(
      `
      *,
      owner:profiles!wishlists_user_id_fkey(id, display_name, avatar_url),
      items:wishlist_items(count)
    `
    )
    .eq("user_id", friendId)
    .in("privacy", ["friends", "selected_friends"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching friend wishlists:", error);
    return [];
  }

  return data || [];
}

export async function getFriendProfile(friendId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Check if they are friends
  const { data: friendship } = await supabase
    .from("friendships")
    .select("id")
    .eq("status", "accepted")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${user.id})`
    )
    .single();

  if (!friendship) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", friendId)
    .single();

  return profile;
}
