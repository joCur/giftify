"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getNotificationsV2,
  unarchiveNotificationV2 as unarchiveNotificationActionV2,
} from "@/lib/actions/notifications-v2";
import type { ParsedNotification } from "@/lib/notifications/types";
import { safeParseNotification } from "@/lib/notifications/types";
import { useAuth } from "@/components/providers/auth-provider";

export function useArchivedNotificationsV2() {
  const { user } = useAuth();
  const userId = user?.id;
  const [notifications, setNotifications] = useState<ParsedNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch archived notifications
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    const notifs = await getNotificationsV2(50, "archived");

    setNotifications(notifs);
    setIsLoading(false);
  }, [userId]);

  // Unarchive notification (restore to inbox)
  const unarchiveNotification = useCallback(
    async (notificationId: string) => {
      // Optimistic update
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

      const result = await unarchiveNotificationActionV2(notificationId);

      if (result.error) {
        // Revert on error
        await fetchNotifications();
      }

      return result;
    },
    [fetchNotifications]
  );

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`archived-notifications_v2:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications_v2",
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const newStatus = payload.new.status;
          const notificationId = payload.new.id;

          // Notification was archived - add to list
          if (newStatus === "archived") {
            // Parse notification
            const result = safeParseNotification(payload.new as any);
            if (result.success) {
              setNotifications((prev) => {
                // Check if already in list
                if (prev.some((n) => n.id === notificationId)) {
                  return prev;
                }
                // Add to top
                return [result.data, ...prev];
              });
            } else {
              console.error(
                "Received invalid archived notification:",
                notificationId,
                result.error
              );
            }
          }

          // Notification was unarchived - remove from list
          if (newStatus === "inbox") {
            setNotifications((prev) =>
              prev.filter((n) => n.id !== notificationId)
            );
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
          setNotifications((prev) =>
            prev.filter((n) => n.id !== notificationId)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return {
    notifications,
    isLoading,
    unarchiveNotification,
    refetch: fetchNotifications,
  };
}
