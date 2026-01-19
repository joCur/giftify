"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "./helpers";
import { revalidatePath } from "next/cache";
import {
  parseNotification,
  safeParseNotification,
  type ParsedNotification,
  type NotificationStatus,
} from "@/lib/notifications/types";

/**
 * Get user's notifications with parsed metadata
 * @param limit - Maximum number of notifications to fetch
 * @param status - Filter by notification status (inbox or archived)
 */
export async function getNotificationsV2(
  limit = 50,
  status: NotificationStatus = "inbox"
): Promise<ParsedNotification[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("notifications_v2")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }

  // Parse and validate each notification
  return (data || [])
    .map((row) => {
      const result = safeParseNotification(row as any);
      if (result.success) {
        return result.data;
      } else {
        console.error("Invalid notification metadata:", row.id, result.error);
        // Return null for invalid notifications
        return null;
      }
    })
    .filter((n): n is ParsedNotification => n !== null);
}

/**
 * Get count of unread notifications (inbox only)
 */
export async function getUnreadCountV2(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return 0;

  const { count, error } = await supabase
    .from("notifications_v2")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "inbox")
    .is("read_at", null);

  if (error) {
    console.error("Error fetching unread count:", error);
    return 0;
  }

  return count || 0;
}

/**
 * Mark a single notification as read
 */
export async function markNotificationReadV2(notificationId: string) {
  try {
    const { supabase, user } = await requireAuth();

    const { error } = await supabase
      .from("notifications_v2")
      .update({ read_at: new Date().toISOString() })
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
 * Mark a single notification as unread
 */
export async function markNotificationUnreadV2(notificationId: string) {
  try {
    const { supabase, user } = await requireAuth();

    const { error } = await supabase
      .from("notifications_v2")
      .update({ read_at: null })
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
export async function markAllNotificationsReadV2() {
  try {
    const { supabase, user } = await requireAuth();

    const { error } = await supabase
      .from("notifications_v2")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("status", "inbox")
      .is("read_at", null);

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
 * Archive a single notification
 */
export async function archiveNotificationV2(notificationId: string) {
  try {
    const { supabase, user } = await requireAuth();

    const { error } = await supabase
      .from("notifications_v2")
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
export async function archiveAllReadNotificationsV2() {
  try {
    const { supabase, user } = await requireAuth();

    const { error } = await supabase
      .from("notifications_v2")
      .update({ status: "archived" })
      .eq("user_id", user.id)
      .eq("status", "inbox")
      .not("read_at", "is", null);

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
export async function unarchiveNotificationV2(notificationId: string) {
  try {
    const { supabase, user } = await requireAuth();

    const { error } = await supabase
      .from("notifications_v2")
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

/**
 * Get user's notification preferences (V2 with categories)
 */
export async function getNotificationPreferencesV2() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("notification_preferences_v2")
    .select(
      `
      *,
      category:notification_categories(*)
    `
    )
    .eq("user_id", user.id);

  if (error) {
    console.error("Error fetching notification preferences:", error);
    return [];
  }

  return data || [];
}

/**
 * Update notification preferences for a category
 */
export async function updateNotificationPreferencesV2(
  categoryId: string,
  enabled: boolean,
  settings?: Record<string, any>
) {
  try {
    const { supabase, user } = await requireAuth();

    const updateData: any = { enabled };
    if (settings) {
      updateData.settings = settings;
    }

    const { error } = await supabase
      .from("notification_preferences_v2")
      .update(updateData)
      .eq("user_id", user.id)
      .eq("category_id", categoryId);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/profile");
    return { success: true };
  } catch {
    return { error: "Not authenticated" };
  }
}
