"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  archiveNotification as archiveNotificationAction,
  archiveAllReadNotifications,
} from "@/lib/actions/notifications";
import type { NotificationWithActor } from "@/lib/supabase/types.custom";
import { useAuth } from "@/components/providers/auth-provider";

// Shared query for notification with relations
const NOTIFICATION_SELECT = `
  *,
  actor:profiles!notifications_actor_id_fkey(id, display_name, avatar_url),
  wishlist:wishlists(id, name, user_id),
  item:wishlist_items(id, title)
`;

export function useNotifications() {
  const { user } = useAuth();
  const userId = user?.id;
  const [notifications, setNotifications] = useState<NotificationWithActor[]>(
    []
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch notifications from server (inbox only)
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    const [notifs, count] = await Promise.all([
      getNotifications(50, "inbox"),
      getUnreadCount(),
    ]);

    setNotifications(notifs);
    setUnreadCount(count);
    setIsLoading(false);
  }, [userId]);

  // Mark single notification as read
  const markAsRead = useCallback(
    async (notificationId: string) => {
      // Find the notification to check if it's unread
      const notification = notifications.find((n) => n.id === notificationId);
      if (!notification || notification.is_read) {
        return { success: true };
      }

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
    [fetchNotifications, notifications]
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

  // Archive single notification
  const archiveNotification = useCallback(
    async (notificationId: string) => {
      // Find the notification to check if it was unread
      const notification = notifications.find((n) => n.id === notificationId);
      const wasUnread = notification && !notification.is_read;

      // Optimistic update - remove from list
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      if (wasUnread) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      const result = await archiveNotificationAction(notificationId);

      if (result.error) {
        // Revert on error
        await fetchNotifications();
      }

      return result;
    },
    [fetchNotifications, notifications]
  );

  // Archive all read notifications
  const archiveAllRead = useCallback(async () => {
    // Optimistic update - remove all read notifications
    setNotifications((prev) => prev.filter((n) => !n.is_read));

    const result = await archiveAllReadNotifications();

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
          // Only add to list if it's an inbox notification
          if (payload.new.status !== "inbox") return;

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
          const newStatus = payload.new.status;
          const notificationId = payload.new.id;

          // Handle status change to archived - remove from inbox list
          if (newStatus === "archived") {
            setNotifications((prev) => {
              const notification = prev.find((n) => n.id === notificationId);
              if (notification && !notification.is_read) {
                // Decrement unread count if the archived notification was unread
                setUnreadCount((count) => Math.max(0, count - 1));
              }
              return prev.filter((n) => n.id !== notificationId);
            });
            return;
          }

          // Handle status change to inbox (unarchive) - add to inbox list
          if (newStatus === "inbox") {
            setNotifications((prev) => {
              // Check if we already have this notification
              const exists = prev.some((n) => n.id === notificationId);
              if (!exists) {
                // Refetch to get the full notification with relations
                fetchNotifications();
                return prev;
              }
              // Update existing notification
              return prev.map((n) =>
                n.id === notificationId ? { ...n, ...payload.new } : n
              );
            });

            // Update unread count if is_read changed
            const wasRead = payload.old?.is_read;
            const isRead = payload.new.is_read;
            if (wasRead !== undefined && wasRead !== isRead) {
              setUnreadCount((prev) =>
                isRead ? Math.max(0, prev - 1) : prev + 1
              );
            }
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
          const notificationId = payload.old.id;

          // Remove deleted notification from state and update unread count if needed
          setNotifications((prev) => {
            const notification = prev.find((n) => n.id === notificationId);
            if (notification && !notification.is_read) {
              setUnreadCount((count) => Math.max(0, count - 1));
            }
            return prev.filter((n) => n.id !== notificationId);
          });
        }
      )
      .subscribe();

    // Cleanup subscription on unmount or userId change
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    archiveAllRead,
    refetch: fetchNotifications,
  };
}
