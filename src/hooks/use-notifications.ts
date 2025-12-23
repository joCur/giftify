"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/actions/notifications";
import type { NotificationWithActor } from "@/lib/supabase/types";

// Shared query for notification with relations
const NOTIFICATION_SELECT = `
  *,
  actor:profiles!notifications_actor_id_fkey(id, display_name, avatar_url),
  wishlist:wishlists(id, name, user_id),
  item:wishlist_items(id, title)
`;

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<NotificationWithActor[]>(
    []
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch notifications from server
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    const [notifs, count] = await Promise.all([
      getNotifications(),
      getUnreadCount(),
    ]);

    setNotifications(notifs);
    setUnreadCount(count);
    setIsLoading(false);
  }, [userId]);

  // Mark single notification as read
  const markAsRead = useCallback(
    async (notificationId: string) => {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      const result = await markNotificationRead(notificationId);

      if (result.error) {
        // Revert on error
        await fetchNotifications();
      }

      return result;
    },
    [fetchNotifications]
  );

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    const result = await markAllNotificationsRead();

    if (result.error) {
      // Revert on error
      await fetchNotifications();
    }

    return result;
  }, [fetchNotifications]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Set up Supabase Realtime subscription
  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();

    // Create channel and subscribe to notifications table for this user
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          // Fetch the full notification with relations
          const { data, error } = await supabase
            .from("notifications")
            .select(NOTIFICATION_SELECT)
            .eq("id", payload.new.id)
            .single();

          if (data) {
            setNotifications((prev) => [
              data as NotificationWithActor,
              ...prev,
            ]);
            setUnreadCount((prev) => prev + 1);
          } else if (error) {
            // If relation fetch fails, increment count anyway
            // User will see updated list on next fetch
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // Update the notification in state
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === payload.new.id ? { ...n, ...payload.new } : n
            )
          );

          // Update unread count if is_read changed
          if (payload.old.is_read !== payload.new.is_read) {
            setUnreadCount((prev) =>
              payload.new.is_read ? Math.max(0, prev - 1) : prev + 1
            );
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // Remove deleted notification from state
          setNotifications((prev) =>
            prev.filter((n) => n.id !== payload.old.id)
          );

          // Decrement unread count if the deleted notification was unread
          if (!payload.old.is_read) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount or userId change
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}
