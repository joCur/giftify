"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "./helpers";
import { revalidatePath } from "next/cache";
import { cleanupItemImage } from "./item-images";
import {
  validateImageFile,
  generateStorageFileName,
} from "@/lib/utils/storage";
import { notifyWishlistViewers, createNotification } from "@/lib/notifications/builder";

const BUCKET_NAME = "item-images";

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

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Not authenticated" };
  }

  const { data, error } = await supabase.functions.invoke("fetch-link-metadata", {
    body: { url },
  });

  if (error) {
    console.error("Error fetching link metadata:", error);
    return { error: error.message || "Failed to fetch metadata" };
  }

  return data;
}

export async function addItem(wishlistId: string, formData: FormData) {
  try {
    const { supabase, user } = await requireAuth();

    // Verify user can edit the wishlist (owner or collaborator) and it's not archived
    const { data: wishlist } = await supabase
      .from("wishlists")
      .select("user_id, is_archived, name, privacy")
      .eq("id", wishlistId)
      .single();

    if (!wishlist) {
      return { error: "Wishlist not found" };
    }

    const isOwner = wishlist.user_id === user.id;
    const { data: isCollab } = await supabase.rpc("is_wishlist_collaborator", {
      target_wishlist_id: wishlistId,
      target_user_id: user.id,
    });

    if (!isOwner && !isCollab) {
      return { error: "Not authorized" };
    }

    if (wishlist.is_archived) {
      return { error: "Cannot add items to archived wishlist" };
    }

    const url = (formData.get("url") as string) || null;
    const title = formData.get("title") as string;

    if (!title || !title.trim()) {
      return { error: "Title is required" };
    }

    const description = formData.get("description") as string | null;
    const price = formData.get("price") as string | null;
    const currency = formData.get("currency") as string | null;
    const notes = formData.get("notes") as string | null;

    // Handle image mode - either uploaded custom image or external URL
    const imageMode = formData.get("image_mode") as string | null;
    const imageUrl = formData.get("image_url") as string | null;
    const imageFile = formData.get("image_file") as File | null;

    // Check if we have a file to upload
    const hasImageFile = imageFile && imageFile.size > 0 && imageMode === "upload";

    // Validate file if provided
    if (hasImageFile) {
      const validationError = validateImageFile(imageFile);
      if (validationError) {
        return { error: validationError };
      }
    }

    // Create the item first
    const { data: newItem, error: insertError } = await supabase
      .from("wishlist_items")
      .insert({
        wishlist_id: wishlistId,
        url: url?.trim() || null,
        title: title.trim(),
        description: description?.trim() || null,
        image_url: imageMode === "url" ? imageUrl?.trim() || null : null,
        custom_image_url: null, // Will be updated after upload if needed
        price: price?.trim() || null,
        currency: currency?.trim() || null,
        notes: notes?.trim() || null,
      })
      .select("id, title, image_url, price, currency")
      .single();

    if (insertError || !newItem) {
      return { error: insertError?.message || "Failed to create item" };
    }

    // If we have a file, upload it and update the item
    if (hasImageFile) {
      const fileName = generateStorageFileName(user.id, newItem.id, imageFile.type);

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, imageFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        // Item was created but image upload failed - don't fail the whole operation
        // The user can add the image later
      } else {
        // Get public URL and update the item
        const {
          data: { publicUrl },
        } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);

        await supabase
          .from("wishlist_items")
          .update({ custom_image_url: publicUrl })
          .eq("id", newItem.id);
      }
    }

    // Create V2 notification (only for non-private wishlists)
    if (wishlist.privacy !== "private") {
      try {
        // Get user profile for notification metadata
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, avatar_url")
          .eq("id", user.id)
          .single();

        // Get final item data (including custom_image_url if uploaded)
        const { data: finalItem } = await supabase
          .from("wishlist_items")
          .select("image_url, custom_image_url")
          .eq("id", newItem.id)
          .single();

        const imageUrl = finalItem?.custom_image_url || finalItem?.image_url || newItem.image_url;

        await notifyWishlistViewers(wishlistId, wishlist.user_id, "item_added", {
          wishlist_id: wishlistId,
          wishlist_name: wishlist.name,
          item_id: newItem.id,
          item_title: newItem.title,
          item_image_url: imageUrl,
          item_price: newItem.price ? parseFloat(newItem.price) : null,
          item_currency: newItem.currency,
          owner_id: wishlist.user_id,
          owner_name: profile?.display_name || "A friend",
          owner_avatar_url: profile?.avatar_url,
        });
      } catch (notifError) {
        // Log but don't fail the main operation
        console.error("Failed to send item added notification:", notifError);
      }
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

    // Verify user can edit the wishlist (owner or collaborator) and it's not archived
    const { data: wishlist } = await supabase
      .from("wishlists")
      .select("user_id, is_archived")
      .eq("id", wishlistId)
      .single();

    if (!wishlist) {
      return { error: "Wishlist not found" };
    }

    const isOwner = wishlist.user_id === user.id;
    const { data: isCollab } = await supabase.rpc("is_wishlist_collaborator", {
      target_wishlist_id: wishlistId,
      target_user_id: user.id,
    });

    if (!isOwner && !isCollab) {
      return { error: "Not authorized" };
    }

    if (wishlist.is_archived) {
      return { error: "Cannot update items in archived wishlist" };
    }

    const title = formData.get("title") as string;
    if (!title || !title.trim()) {
      return { error: "Title is required" };
    }

    const description = formData.get("description") as string | null;
    const price = formData.get("price") as string | null;
    const currency = formData.get("currency") as string | null;
    const notes = formData.get("notes") as string | null;

    // Handle image mode - either uploaded custom image or external URL
    const imageMode = formData.get("image_mode") as string | null;
    const existingCustomImageUrl = formData.get("custom_image_url") as string | null;
    const imageUrl = formData.get("image_url") as string | null;
    const imageFile = formData.get("image_file") as File | null;

    // Check if we have a new file to upload
    const hasNewImageFile = imageFile && imageFile.size > 0 && imageMode === "upload";

    // Validate file if provided
    if (hasNewImageFile) {
      const validationError = validateImageFile(imageFile);
      if (validationError) {
        return { error: validationError };
      }
    }

    // Get current item to check if we need to clean up old custom image
    const { data: currentItem } = await supabase
      .from("wishlist_items")
      .select("custom_image_url")
      .eq("id", itemId)
      .single();

    let newCustomImageUrl: string | null = null;
    const newImageUrl = imageMode === "url" ? imageUrl?.trim() || null : null;

    // Handle image based on mode
    if (imageMode === "upload") {
      if (hasNewImageFile) {
        // Upload new file
        const fileName = generateStorageFileName(user.id, itemId, imageFile.type);

        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(fileName, imageFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          return { error: "Failed to upload image. Please try again." };
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);

        newCustomImageUrl = publicUrl;

        // Clean up old custom image if it exists and is different
        if (currentItem?.custom_image_url && currentItem.custom_image_url !== newCustomImageUrl) {
          await cleanupItemImage(currentItem.custom_image_url);
        }
      } else {
        // Keep existing custom image URL
        newCustomImageUrl = existingCustomImageUrl?.trim() || null;
      }
    } else if (imageMode === "url") {
      // Switching to URL mode - clean up old custom image
      if (currentItem?.custom_image_url) {
        await cleanupItemImage(currentItem.custom_image_url);
      }
    }

    const { error } = await supabase
      .from("wishlist_items")
      .update({
        title: title.trim(),
        description: description?.trim() || null,
        image_url: newImageUrl,
        custom_image_url: newCustomImageUrl,
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

    // Verify user can edit the wishlist (owner or collaborator) and it's not archived
    const { data: wishlist } = await supabase
      .from("wishlists")
      .select("user_id, is_archived")
      .eq("id", wishlistId)
      .single();

    if (!wishlist) {
      return { error: "Wishlist not found" };
    }

    const isOwner = wishlist.user_id === user.id;
    const { data: isCollab } = await supabase.rpc("is_wishlist_collaborator", {
      target_wishlist_id: wishlistId,
      target_user_id: user.id,
    });

    if (!isOwner && !isCollab) {
      return { error: "Not authorized" };
    }

    if (wishlist.is_archived) {
      return { error: "Cannot delete items from archived wishlist" };
    }

    // Get item to clean up custom image if exists
    const { data: item } = await supabase
      .from("wishlist_items")
      .select("custom_image_url")
      .eq("id", itemId)
      .single();

    const { error } = await supabase
      .from("wishlist_items")
      .delete()
      .eq("id", itemId);

    if (error) {
      return { error: error.message };
    }

    // Clean up custom image from storage after successful deletion
    if (item?.custom_image_url) {
      await cleanupItemImage(item.custom_image_url);
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

    // Verify user can edit the wishlist (owner or collaborator) and it's not archived
    const { data: wishlist } = await supabase
      .from("wishlists")
      .select("user_id, is_archived")
      .eq("id", wishlistId)
      .single();

    if (!wishlist) {
      return { error: "Wishlist not found" };
    }

    const isOwner = wishlist.user_id === user.id;
    const { data: isCollab } = await supabase.rpc("is_wishlist_collaborator", {
      target_wishlist_id: wishlistId,
      target_user_id: user.id,
    });

    if (!isOwner && !isCollab) {
      return { error: "Not authorized" };
    }

    if (wishlist.is_archived) {
      return { error: "Cannot modify items in archived wishlist" };
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

export async function markItemReceived(
  itemId: string,
  wishlistId: string,
  received: boolean
) {
  try {
    const { supabase, user } = await requireAuth();

    // Verify user owns the wishlist and it's not archived
    const { data: wishlist } = await supabase
      .from("wishlists")
      .select("user_id, is_archived")
      .eq("id", wishlistId)
      .single();

    if (!wishlist) {
      return { error: "Wishlist not found" };
    }

    if (wishlist.user_id !== user.id) {
      return { error: "Not authorized" };
    }

    if (wishlist.is_archived) {
      return { error: "Cannot modify items in archived wishlist" };
    }

    // Get item details for notification
    const { data: item } = await supabase
      .from("wishlist_items")
      .select("title")
      .eq("id", itemId)
      .single();

    if (!item) {
      return { error: "Item not found" };
    }

    // Update the item's received status
    const { error: updateError } = await supabase
      .from("wishlist_items")
      .update({ is_received: received })
      .eq("id", itemId);

    if (updateError) {
      return { error: updateError.message };
    }

    // If marking as received, find and fulfill any active claims
    // Uses a database function with SECURITY DEFINER to bypass RLS
    // (owners can't normally see claims on their own items to keep gifts secret)
    // The function also creates notifications directly in the database
    if (received) {
      const { data: fulfilledClaims, error: rpcError } = await supabase
        .rpc("fulfill_claims_for_item", {
          p_item_id: itemId,
          p_owner_id: user.id
        });

      if (rpcError) {
        console.error("Failed to fulfill claims:", rpcError);
        // Continue anyway - item is already marked as received
      }

      // Record history events for any fulfilled claims
      if (fulfilledClaims && fulfilledClaims.length > 0) {
        const { recordClaimHistoryEvent } = await import("./claim-history");

        for (const claim of fulfilledClaims) {
          // Record history event
          if (claim.claim_type === "solo") {
            await recordClaimHistoryEvent("fulfilled", claim.claim_id, undefined, {
              item_id: itemId,
              wishlist_id: wishlistId,
              fulfilled_by: "owner",
            });
          } else {
            await recordClaimHistoryEvent("fulfilled", undefined, claim.claim_id, {
              item_id: itemId,
              wishlist_id: wishlistId,
              fulfilled_by: "owner",
            });
          }
        }

        // Send V2 gift_received notifications to claimers
        try {
          // Get item details for notification
          const { data: itemDetails } = await supabase
            .from("wishlist_items")
            .select("title, image_url, custom_image_url")
            .eq("id", itemId)
            .single();

          // Get wishlist details
          const { data: wishlistDetails } = await supabase
            .from("wishlists")
            .select("name")
            .eq("id", wishlistId)
            .single();

          // Get recipient (owner) profile
          const { data: recipientProfile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", user.id)
            .single();

          if (itemDetails && wishlistDetails) {
            const itemImageUrl = itemDetails.custom_image_url || itemDetails.image_url;

            for (const claim of fulfilledClaims) {
              // Send notification to all claimers
              if (claim.claimer_ids && claim.claimer_ids.length > 0) {
                await createNotification("gift_received", {
                  item_id: itemId,
                  item_title: itemDetails.title,
                  item_image_url: itemImageUrl,
                  wishlist_id: wishlistId,
                  wishlist_name: wishlistDetails.name,
                  recipient_id: user.id,
                  recipient_name: recipientProfile?.display_name || "Someone",
                  claim_type: claim.claim_type as "solo" | "split",
                  claim_id: claim.claim_id,
                  marked_at: new Date().toISOString(),
                })
                  .to(claim.claimer_ids)
                  .send();
              }
            }
          }
        } catch (notifError) {
          // Log but don't fail the main operation
          console.error("Failed to send gift received notification:", notifError);
        }
      }
    }

    revalidatePath(`/wishlists/${wishlistId}`);
    revalidatePath(`/claims-history`);
    revalidatePath(`/dashboard`);
    return { success: true };
  } catch {
    return { error: "Not authenticated" };
  }
}
