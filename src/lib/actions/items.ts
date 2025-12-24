"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "./helpers";
import { revalidatePath } from "next/cache";

interface LinkMetadata {
  title: string;
  description: string | null;
  image_url: string | null;
  price: string | null;
  currency: string | null;
  url: string;
}

export async function fetchLinkMetadata(
  url: string
): Promise<LinkMetadata | { error: string }> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { error: "Not authenticated" };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/fetch-link-metadata`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return { error: errorData.error || "Failed to fetch metadata" };
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching link metadata:", error);
    return { error: "Failed to fetch link metadata" };
  }
}

export async function addItem(wishlistId: string, formData: FormData) {
  try {
    const { supabase, user } = await requireAuth();

    // Verify user owns the wishlist
    const { data: wishlist } = await supabase
      .from("wishlists")
      .select("user_id")
      .eq("id", wishlistId)
      .single();

    if (!wishlist || wishlist.user_id !== user.id) {
      return { error: "Not authorized" };
    }

    const url = (formData.get("url") as string) || null;
    const title = formData.get("title") as string;

    if (!title || !title.trim()) {
      return { error: "Title is required" };
    }

    const description = formData.get("description") as string | null;
    const imageUrl = formData.get("image_url") as string | null;
    const price = formData.get("price") as string | null;
    const currency = formData.get("currency") as string | null;
    const notes = formData.get("notes") as string | null;

    const { error } = await supabase.from("wishlist_items").insert({
      wishlist_id: wishlistId,
      url: url?.trim() || null,
      title: title.trim(),
      description: description?.trim() || null,
      image_url: imageUrl?.trim() || null,
      price: price?.trim() || null,
      currency: currency?.trim() || null,
      notes: notes?.trim() || null,
    });

    if (error) {
      return { error: error.message };
    }

    revalidatePath(`/wishlists/${wishlistId}`);
    return { success: true };
  } catch {
    return { error: "Not authenticated" };
  }
}

export async function updateItem(
  itemId: string,
  wishlistId: string,
  formData: FormData
) {
  try {
    const { supabase, user } = await requireAuth();

    // Verify user owns the wishlist
    const { data: wishlist } = await supabase
      .from("wishlists")
      .select("user_id")
      .eq("id", wishlistId)
      .single();

    if (!wishlist || wishlist.user_id !== user.id) {
      return { error: "Not authorized" };
    }

    const title = formData.get("title") as string;
    if (!title || !title.trim()) {
      return { error: "Title is required" };
    }

    const description = formData.get("description") as string | null;
    const imageUrl = formData.get("image_url") as string | null;
    const price = formData.get("price") as string | null;
    const currency = formData.get("currency") as string | null;
    const notes = formData.get("notes") as string | null;

    const { error } = await supabase
      .from("wishlist_items")
      .update({
        title: title.trim(),
        description: description?.trim() || null,
        image_url: imageUrl?.trim() || null,
        price: price?.trim() || null,
        currency: currency?.trim() || null,
        notes: notes?.trim() || null,
      })
      .eq("id", itemId);

    if (error) {
      return { error: error.message };
    }

    revalidatePath(`/wishlists/${wishlistId}`);
    return { success: true };
  } catch {
    return { error: "Not authenticated" };
  }
}

export async function deleteItem(itemId: string, wishlistId: string) {
  try {
    const { supabase, user } = await requireAuth();

    // Verify user owns the wishlist
    const { data: wishlist } = await supabase
      .from("wishlists")
      .select("user_id")
      .eq("id", wishlistId)
      .single();

    if (!wishlist || wishlist.user_id !== user.id) {
      return { error: "Not authorized" };
    }

    const { error } = await supabase
      .from("wishlist_items")
      .delete()
      .eq("id", itemId);

    if (error) {
      return { error: error.message };
    }

    revalidatePath(`/wishlists/${wishlistId}`);
    return { success: true };
  } catch {
    return { error: "Not authenticated" };
  }
}

export async function markItemPurchased(
  itemId: string,
  wishlistId: string,
  purchased: boolean
) {
  try {
    const { supabase, user } = await requireAuth();

    // Verify user owns the wishlist
    const { data: wishlist } = await supabase
      .from("wishlists")
      .select("user_id")
      .eq("id", wishlistId)
      .single();

    if (!wishlist || wishlist.user_id !== user.id) {
      return { error: "Not authorized" };
    }

    const { error } = await supabase
      .from("wishlist_items")
      .update({ is_purchased: purchased })
      .eq("id", itemId);

    if (error) {
      return { error: error.message };
    }

    revalidatePath(`/wishlists/${wishlistId}`);
    return { success: true };
  } catch {
    return { error: "Not authenticated" };
  }
}
