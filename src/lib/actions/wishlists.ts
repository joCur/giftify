"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "./helpers";
import { revalidatePath } from "next/cache";
import type { WishlistPrivacy } from "@/lib/supabase/types";

export async function getMyWishlists() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("wishlists")
    .select(
      `
      *,
      items:wishlist_items(count)
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching wishlists:", error);
    return [];
  }

  return data || [];
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
      items:wishlist_items(*)
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

    revalidatePath("/dashboard");
    return { data };
  } catch {
    return { error: "Not authenticated" };
  }
}

export async function updateWishlist(id: string, formData: FormData) {
  try {
    const { supabase, user } = await requireAuth();

    // Verify ownership
    const { data: wishlist } = await supabase
      .from("wishlists")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!wishlist || wishlist.user_id !== user.id) {
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
    const { data: wishlist } = await supabase
      .from("wishlists")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!wishlist || wishlist.user_id !== user.id) {
      return { error: "Not authorized" };
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
