"use client";

import { Bell, Archive, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { NotificationItemV2 } from "./notification-item-v2";
import type { ParsedNotification } from "@/lib/notifications/types";

interface NotificationListProps {
  notifications: ParsedNotification[];
  isLoading: boolean;
  view: "inbox" | "archived";
  onMarkAsRead: (id: string) => Promise<void>;
  onMarkAsUnread?: (id: string) => Promise<void>;
  onMarkAllAsRead?: () => Promise<void>;
  onArchive?: (id: string) => Promise<void>;
  onArchiveAllRead?: () => Promise<void>;
  onUnarchive?: (id: string) => Promise<void>;
}

export function NotificationListV2({
  notifications,
  isLoading,
  view,
  onMarkAsRead,
  onMarkAsUnread,
  onMarkAllAsRead,
  onArchive,
  onArchiveAllRead,
  onUnarchive,
}: NotificationListProps) {
  const hasUnread = notifications.some((n) => !n.read_at);
  const hasRead = notifications.some((n) => n.read_at);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-6">
        {view === "inbox" ? (
          <>
            <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No notifications yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              You&apos;ll see updates from your friends here
            </p>
          </>
        ) : (
          <>
            <Archive className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No archived notifications</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Notifications you archive will appear here
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {view === "inbox" && (hasUnread || hasRead) && (
        <div className="flex justify-end gap-2 px-6 py-2">
          {hasRead && onArchiveAllRead && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onArchiveAllRead()}
              className="text-xs"
            >
              <Archive className="h-3 w-3 mr-1" />
              Archive read
            </Button>
          )}
          {hasUnread && onMarkAllAsRead && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMarkAllAsRead()}
              className="text-xs"
            >
              <Check className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
      )}
      {view === "inbox" && (hasUnread || hasRead) && <Separator />}
      <ScrollArea className="flex-1">
        <div className="divide-y divide-border">
          {notifications.map((notification) => (
            <NotificationItemV2
              key={notification.id}
              notification={notification}
              view={view}
              onMarkAsRead={onMarkAsRead}
              onMarkAsUnread={onMarkAsUnread}
              onArchive={onArchive}
              onUnarchive={onUnarchive}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
