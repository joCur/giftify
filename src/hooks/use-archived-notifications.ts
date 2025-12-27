"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getNotifications,
  unarchiveNotification as unarchiveNotificationAction,
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

export function useArchivedNotifications() {
  const { user } = useAuth();
  const userId = user?.id;
  const [notifications, setNotifications] = useState<NotificationWithActor[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);

  // Fetch archived notifications from server
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    const notifs = await getNotifications(50, "archived");
    setNotifications(notifs);
    setIsLoading(false);
  }, [userId]);

  // Unarchive single notification (restore to inbox)
  const unarchiveNotification = useCallback(
    async (notificationId: string) => {
      // Optimistic update - remove from archived list
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

      const result = await unarchiveNotificationAction(notificationId);

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

  // Set up Supabase Realtime subscription for archived notifications
  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`archived-notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const newStatus = payload.new.status;
          const notificationId = payload.new.id;

          // Handle status change to archived - add to archived list
          if (newStatus === "archived") {
            // Fetch the full notification with relations
            const { data } = await supabase
              .from("notifications")
              .select(NOTIFICATION_SELECT)
              .eq("id", notificationId)
              .single();

            if (data) {
              setNotifications((prev) => {
                // Check if we already have this notification
                const exists = prev.some((n) => n.id === notificationId);
                if (exists) {
                  // Update existing notification
                  return prev.map((n) =>
                    n.id === notificationId ? { ...n, ...payload.new } : n
                  );
                }
                // Add new notification to the list
                return [data as NotificationWithActor, ...prev];
              });
            }
            return;
          }

          // Handle status change to inbox (unarchive) - remove from archived list
          if (newStatus === "inbox") {
            setNotifications((prev) =>
              prev.filter((n) => n.id !== notificationId)
            );
            return;
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
          // Remove deleted notification from state if it was archived
          if (payload.old.status === "archived") {
            setNotifications((prev) =>
              prev.filter((n) => n.id !== payload.old.id)
            );
          }
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
