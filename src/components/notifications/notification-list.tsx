"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Bell, Gift, Users, UserPlus, Cake, Package, Check, Split, UserMinus, CircleCheck, CircleX, Flag, AlertCircle, Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { NotificationWithActor, NotificationType } from "@/lib/supabase/types.custom";

interface NotificationListProps {
  notifications: NotificationWithActor[];
  isLoading: boolean;
  view: "inbox" | "archived";
  onMarkAsRead: (id: string) => Promise<{ success?: boolean; error?: string }>;
  onMarkAllAsRead?: () => Promise<{ success?: boolean; error?: string }>;
  onArchive?: (id: string) => Promise<{ success?: boolean; error?: string }>;
  onArchiveAllRead?: () => Promise<{ success?: boolean; error?: string }>;
  onUnarchive?: (id: string) => Promise<{ success?: boolean; error?: string }>;
}

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case "friend_request_received":
      return <UserPlus className="h-5 w-5 text-primary" />;
    case "friend_request_accepted":
      return <Users className="h-5 w-5 text-green-500" />;
    case "birthday_reminder":
      return <Cake className="h-5 w-5 text-pink-500" />;
    case "item_added":
      return <Package className="h-5 w-5 text-blue-500" />;
    case "wishlist_created":
      return <Gift className="h-5 w-5 text-purple-500" />;
    case "split_initiated":
      return <Split className="h-5 w-5 text-amber-500" />;
    case "split_joined":
      return <UserPlus className="h-5 w-5 text-amber-500" />;
    case "split_left":
      return <UserMinus className="h-5 w-5 text-orange-500" />;
    case "split_confirmed":
      return <CircleCheck className="h-5 w-5 text-green-500" />;
    case "split_cancelled":
      return <CircleX className="h-5 w-5 text-red-500" />;
    case "item_flagged_already_owned":
      return <Flag className="h-5 w-5 text-amber-500" />;
    case "flag_confirmed":
      return <CircleCheck className="h-5 w-5 text-green-500" />;
    case "flag_denied":
      return <AlertCircle className="h-5 w-5 text-blue-500" />;
    default:
      return <Bell className="h-5 w-5" />;
  }
}

function getNotificationLink(notification: NotificationWithActor): string {
  switch (notification.type) {
    case "friend_request_received":
      return "/friends";
    case "friend_request_accepted":
      return notification.actor_id ? `/friends/${notification.actor_id}` : "/friends";
    case "birthday_reminder":
      return notification.actor_id ? `/friends/${notification.actor_id}` : "/friends";
    case "item_added":
    case "wishlist_created":
      if (notification.actor_id && notification.wishlist_id) {
        return `/friends/${notification.actor_id}/wishlists/${notification.wishlist_id}`;
      }
      return notification.actor_id ? `/friends/${notification.actor_id}` : "/friends";
    case "split_initiated":
    case "split_joined":
    case "split_left":
    case "split_confirmed":
    case "split_cancelled":
      // Link to the wishlist with item anchor for direct navigation
      // Use wishlist owner ID (not actor_id, which is the person who performed the action)
      if (notification.wishlist?.user_id && notification.wishlist_id) {
        const base = `/friends/${notification.wishlist.user_id}/wishlists/${notification.wishlist_id}`;
        return notification.item_id ? `${base}#item-${notification.item_id}` : base;
      }
      return "/friends";
    case "item_flagged_already_owned":
      // Owner receives this - link to their own wishlist where they can respond
      if (notification.wishlist_id) {
        const base = `/wishlists/${notification.wishlist_id}`;
        return notification.item_id ? `${base}#item-${notification.item_id}` : base;
      }
      return "/dashboard";
    case "flag_confirmed":
    case "flag_denied":
      // Flagger receives this - link to the friend's wishlist
      if (notification.wishlist?.user_id && notification.wishlist_id) {
        const base = `/friends/${notification.wishlist.user_id}/wishlists/${notification.wishlist_id}`;
        return notification.item_id ? `${base}#item-${notification.item_id}` : base;
      }
      return "/friends";
    default:
      return "/dashboard";
  }
}

export function NotificationList({
  notifications,
  isLoading,
  view,
  onMarkAsRead,
  onMarkAllAsRead,
  onArchive,
  onArchiveAllRead,
  onUnarchive,
}: NotificationListProps) {
  const hasUnread = notifications.some((n) => !n.is_read);
  const hasRead = notifications.some((n) => n.is_read);

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
            <NotificationItem
              key={notification.id}
              notification={notification}
              view={view}
              onMarkAsRead={onMarkAsRead}
              onArchive={onArchive}
              onUnarchive={onUnarchive}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

interface NotificationItemProps {
  notification: NotificationWithActor;
  view: "inbox" | "archived";
  onMarkAsRead: (id: string) => Promise<{ success?: boolean; error?: string }>;
  onArchive?: (id: string) => Promise<{ success?: boolean; error?: string }>;
  onUnarchive?: (id: string) => Promise<{ success?: boolean; error?: string }>;
}

function NotificationItem({ notification, view, onMarkAsRead, onArchive, onUnarchive }: NotificationItemProps) {
  const link = getNotificationLink(notification);
  const initials = notification.actor?.display_name
    ? notification.actor.display_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
  };

  const handleArchive = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onArchive?.(notification.id);
  };

  const handleUnarchive = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onUnarchive?.(notification.id);
  };

  return (
    <Link
      href={link}
      onClick={handleClick}
      className={cn(
        "block px-6 py-4 hover:bg-muted/50 transition-colors group",
        !notification.is_read && view === "inbox" && "bg-primary/5"
      )}
    >
      <div className="flex gap-3">
        {notification.actor ? (
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={notification.actor.avatar_url || undefined} />
            <AvatarFallback className="text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            {getNotificationIcon(notification.type)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                "text-sm leading-tight",
                !notification.is_read && view === "inbox" && "font-semibold"
              )}
            >
              {notification.title}
            </p>
            <div className="flex items-center gap-1 flex-shrink-0">
              {view === "inbox" && onArchive && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={handleArchive}
                  aria-label="Archive notification"
                >
                  <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              )}
              {view === "archived" && onUnarchive && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={handleUnarchive}
                  aria-label="Restore notification"
                >
                  <ArchiveRestore className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              )}
              {!notification.is_read && view === "inbox" && (
                <div className="h-2 w-2 rounded-full bg-primary mt-1" />
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5 leading-snug">
            {notification.message}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
            })}
          </p>
        </div>
      </div>
    </Link>
  );
}
