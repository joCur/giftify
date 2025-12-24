"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const ALLOWED_TYPES: string[] = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Map MIME types to file extensions to prevent extension spoofing
const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return { error: "No file provided" };
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Invalid file type. Please use JPG, PNG, or WebP" };
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return { error: "File too large. Maximum size is 5MB" };
  }

  try {
    // Get current avatar URL to delete old file later
    const { data: profile } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .single();

    // Generate unique filename from validated MIME type (prevents extension spoofing)
    const fileExt = MIME_TO_EXTENSION[file.type] || "jpg";
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    // Upload new file
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return { error: "Failed to upload image. Please try again." };
    }

    // Get public URL for the uploaded file
    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(fileName);

    // Update profile with new avatar URL
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id);

    if (updateError) {
      // Rollback: delete the uploaded file if profile update fails
      await supabase.storage.from("avatars").remove([fileName]);
      return { error: "Failed to update profile. Please try again." };
    }

    // Clean up old avatar file if it exists and is from our storage
    if (profile?.avatar_url) {
      const oldPath = extractStoragePath(profile.avatar_url);
      if (oldPath) {
        const { error: deleteError } = await supabase.storage
          .from("avatars")
          .remove([oldPath]);
        if (deleteError) {
          // Log but don't fail - the new avatar is already set
          console.error("Failed to delete old avatar:", deleteError);
        }
      }
    }

    // Revalidate pages that show the avatar
    revalidatePath("/profile");
    revalidatePath("/dashboard");
    revalidatePath("/friends");
    revalidatePath("/", "layout");

    return { success: true, avatarUrl: publicUrl };
  } catch (error) {
    console.error("Avatar upload error:", error);
    return { error: "An unexpected error occurred. Please try again." };
  }
}

export async function removeAvatar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  try {
    // Get current avatar URL
    const { data: profile } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .single();

    if (!profile?.avatar_url) {
      return { error: "No avatar to remove" };
    }

    // Update profile to remove avatar URL
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", user.id);

    if (updateError) {
      return { error: "Failed to update profile. Please try again." };
    }

    // Delete file from storage if it's from our storage bucket
    const filePath = extractStoragePath(profile.avatar_url);
    if (filePath) {
      const { error: deleteError } = await supabase.storage
        .from("avatars")
        .remove([filePath]);
      if (deleteError) {
        // Log but don't fail - the avatar URL is already removed from profile
        console.error("Failed to delete avatar file:", deleteError);
      }
    }

    // Revalidate pages that show the avatar
    revalidatePath("/profile");
    revalidatePath("/dashboard");
    revalidatePath("/friends");
    revalidatePath("/", "layout");

    return { success: true };
  } catch (error) {
    console.error("Avatar removal error:", error);
    return { error: "An unexpected error occurred. Please try again." };
  }
}

/**
 * Extract the storage path from a full Supabase Storage public URL
 * Example: https://xxx.supabase.co/storage/v1/object/public/avatars/userId/timestamp.jpg
 * Returns: userId/timestamp.jpg
 *
 * Security: Only extracts paths from valid Supabase storage URLs
 */
function extractStoragePath(publicUrl: string): string | null {
  try {
    const url = new URL(publicUrl);

    // Validate this is a Supabase storage URL
    if (!url.pathname.includes("/storage/v1/object/public/avatars/")) {
      return null;
    }

    // Extract the path after /avatars/
    const match = url.pathname.match(/\/avatars\/(.+)$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
