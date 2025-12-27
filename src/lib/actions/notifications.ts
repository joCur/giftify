"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "./helpers";
import { revalidatePath } from "next/cache";
import type { NotificationWithActor, NotificationStatus } from "@/lib/supabase/types.custom";

/**
 * Get user's notifications with related actor, wishlist, and item data
 * @param limit - Maximum number of notifications to fetch
 * @param status - Filter by notification status (inbox or archived)
 */
export async function getNotifications(
  limit = 50,
  status: NotificationStatus = "inbox"
): Promise<NotificationWithActor[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select(
      `
      *,
      actor:profiles!notifications_actor_id_fkey(id, display_name, avatar_url),
      wishlist:wishlists(id, name, user_id),
      item:wishlist_items(id, title)
    `
    )
    .eq("user_id", user.id)
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }

  return (data as NotificationWithActor[]) || [];
}

/**
 * Get count of unread notifications (inbox only)
 */
export async function getUnreadCount(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return 0;

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "inbox")
    .eq("is_read", false);

  if (error) {
    console.error("Error fetching unread count:", error);
    return 0;
  }

  return count || 0;
}

/**
 * Mark a single notification as read
 */
export async function markNotificationRead(notificationId: string) {
  try {
    const { supabase, user } = await requireAuth();

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return { error: "Not authenticated" };
  }
}

/**
 * Mark all inbox notifications as read
 */
export async function markAllNotificationsRead() {
  try {
    const { supabase, user } = await requireAuth();

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("status", "inbox")
      .eq("is_read", false);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return { error: "Not authenticated" };
  }
}

/**
 * Get user's notification preferences
 */
export async function getNotificationPreferences() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // Return default values if not found
  if (error && error.code === "PGRST116") {
    return {
      user_id: user.id,
      birthday_reminder_days: 7,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  if (error) {
    console.error("Error fetching notification preferences:", error);
    return null;
  }

  return data;
}

/**
 * Update user's notification preferences
 */
export async function updateNotificationPreferences(birthdayReminderDays: number) {
  try {
    const { supabase, user } = await requireAuth();

    if (birthdayReminderDays < 0 || birthdayReminderDays > 30) {
      return { error: "Birthday reminder days must be between 0 and 30" };
    }

    const { error } = await supabase.from("notification_preferences").upsert(
      {
        user_id: user.id,
        birthday_reminder_days: birthdayReminderDays,
      },
      {
        onConflict: "user_id",
      }
    );

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/profile");
    return { success: true };
  } catch {
    return { error: "Not authenticated" };
  }
}

/**
 * Archive a single notification
 */
export async function archiveNotification(notificationId: string) {
  try {
    const { supabase, user } = await requireAuth();

    const { error } = await supabase
      .from("notifications")
      .update({ status: "archived" })
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return { error: "Not authenticated" };
  }
}

/**
 * Archive all read notifications (bulk action)
 */
export async function archiveAllReadNotifications() {
  try {
    const { supabase, user } = await requireAuth();

    const { error } = await supabase
      .from("notifications")
      .update({ status: "archived" })
      .eq("user_id", user.id)
      .eq("status", "inbox")
      .eq("is_read", true);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return { error: "Not authenticated" };
  }
}

/**
 * Unarchive a notification (restore to inbox)
 */
export async function unarchiveNotification(notificationId: string) {
  try {
    const { supabase, user } = await requireAuth();

    const { error } = await supabase
      .from("notifications")
      .update({ status: "inbox" })
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return { error: "Not authenticated" };
  }
}

