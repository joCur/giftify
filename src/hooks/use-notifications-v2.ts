"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getNotificationsV2,
  getUnreadCountV2,
  markNotificationReadV2,
  markNotificationUnreadV2,
  markAllNotificationsReadV2,
  archiveNotificationV2 as archiveNotificationActionV2,
  archiveAllReadNotificationsV2,
} from "@/lib/actions/notifications-v2";
import type { ParsedNotification } from "@/lib/notifications/types";
import { safeParseNotification } from "@/lib/notifications/types";
import { useAuth } from "@/components/providers/auth-provider";

export function useNotificationsV2() {
  const { user } = useAuth();
  const userId = user?.id;
  const [notifications, setNotifications] = useState<ParsedNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch notifications from server (inbox only)
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    const [notifs, count] = await Promise.all([
      getNotificationsV2(50, "inbox"),
      getUnreadCountV2(),
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
      if (!notification || notification.read_at) {
        return { success: true };
      }

      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, read_at: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      const result = await markNotificationReadV2(notificationId);

      if (result.error) {
        // Revert on error
        await fetchNotifications();
      }

      return result;
    },
    [fetchNotifications, notifications]
  );

  // Mark single notification as unread
  const markAsUnread = useCallback(
    async (notificationId: string) => {
      // Find the notification to check if it's already unread
      const notification = notifications.find((n) => n.id === notificationId);
      if (!notification || !notification.read_at) {
        return { success: true };
      }

      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, read_at: null } : n
        )
      );
      setUnreadCount((prev) => prev + 1);

      const result = await markNotificationUnreadV2(notificationId);

      if (result.error) {
        // Revert on error
        await fetchNotifications();
      }

      return result;
    },
    [fetchNotifications, notifications]
  );

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: new Date().toISOString() }))
    );
    setUnreadCount(0);

    const result = await markAllNotificationsReadV2();

    if (result.error) {
      // Revert on error
      await fetchNotifications();
    }

    return result;
  }, [fetchNotifications]);

  // Archive notification
  const archiveNotification = useCallback(
    async (notificationId: string) => {
      const notification = notifications.find((n) => n.id === notificationId);
      const wasUnread = notification && !notification.read_at;

      // Optimistic update
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      if (wasUnread) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      const result = await archiveNotificationActionV2(notificationId);

      if (result.error) {
        // Revert on error
        await fetchNotifications();
      }

      return result;
    },
    [fetchNotifications, notifications]
  );

  // Archive all read
  const archiveAllRead = useCallback(async () => {
    // Optimistic update - keep only unread
    setNotifications((prev) => prev.filter((n) => !n.read_at));

    const result = await archiveAllReadNotificationsV2();

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

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`notifications_v2:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications_v2",
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          if (payload.new.status !== "inbox") return;

          // Parse and validate notification
          const result = safeParseNotification(payload.new as any);
          if (result.success) {
            setNotifications((prev) => [result.data, ...prev]);
            setUnreadCount((prev) => prev + 1);
          } else {
            console.error(
              "Received invalid notification from realtime:",
              payload.new.id,
              result.error
            );
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications_v2",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newStatus = payload.new.status;
          const notificationId = payload.new.id;

          // Handle archiving
          if (newStatus === "archived") {
            setNotifications((prev) => {
              const notification = prev.find((n) => n.id === notificationId);
              if (notification && !notification.read_at) {
                setUnreadCount((count) => Math.max(0, count - 1));
              }
              return prev.filter((n) => n.id !== notificationId);
            });
            return;
          }

          // Handle unarchiving or read/unread changes
          if (newStatus === "inbox") {
            setNotifications((prev) => {
              const existing = prev.find((n) => n.id === notificationId);
              if (!existing) {
                // Notification was unarchived, refetch to get it
                fetchNotifications();
                return prev;
              }

              // Update read status
              const localIsRead = !!existing.read_at;
              const newIsRead = !!payload.new.read_at;

              // Only update unread count if read status changed (avoid double-counting with optimistic updates)
              if (localIsRead !== newIsRead) {
                setUnreadCount((count) =>
                  newIsRead ? Math.max(0, count - 1) : count + 1
                );
              }

              // Update notification in list
              return prev.map((n) =>
                n.id === notificationId ? { ...n, ...payload.new } : n
              );
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications_v2",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notificationId = payload.old.id;

          setNotifications((prev) => {
            const notification = prev.find((n) => n.id === notificationId);
            if (notification && !notification.read_at) {
              setUnreadCount((count) => Math.max(0, count - 1));
            }
            return prev.filter((n) => n.id !== notificationId);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    archiveNotification,
    archiveAllRead,
    refetch: fetchNotifications,
  };
}
