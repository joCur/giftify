"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Archive, ArchiveRestore, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { ParsedNotification } from "@/lib/notifications/types";
import { getNotificationConfig } from "@/lib/notifications/registry";
import { getNotificationComponent } from "@/lib/notifications/component-registry";

interface NotificationItemProps {
  notification: ParsedNotification;
  view: "inbox" | "archived";
  onMarkAsRead: (id: string) => Promise<void>;
  onMarkAsUnread?: (id: string) => Promise<void>;
  onArchive?: (id: string) => Promise<void>;
  onUnarchive?: (id: string) => Promise<void>;
}

export function NotificationItemV2({
  notification,
  view,
  onMarkAsRead,
  onMarkAsUnread,
  onArchive,
  onUnarchive,
}: NotificationItemProps) {
  const config = getNotificationConfig(notification.type);
  const Component = getNotificationComponent(notification.type);
  const IconComponent = config.icon;

  const isUnread = !notification.read_at;

  const handleClick = () => {
    if (isUnread) {
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

  const handleMarkAsUnread = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onMarkAsUnread?.(notification.id);
  };

  // Check if notification has actor metadata
  const metadata = notification.metadata as any;
  const actorId = metadata?.requester_id || metadata?.accepter_id || metadata?.owner_id || metadata?.actor_id;
  const actorName = metadata?.requester_name || metadata?.accepter_name || metadata?.owner_name || metadata?.actor_name;
  const actorAvatar = metadata?.requester_avatar_url || metadata?.accepter_avatar_url || metadata?.owner_avatar_url || metadata?.actor_avatar_url;

  const actorInitials = actorName
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  return (
    <Link
      href={notification.action_url || "/dashboard"}
      onClick={handleClick}
      className={cn(
        "block px-6 py-4 hover:bg-muted/50 transition-colors group",
        isUnread && view === "inbox" && "bg-primary/5"
      )}
    >
      <div className="flex gap-3">
        {/* Avatar or Icon */}
        {actorId ? (
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={actorAvatar || undefined} />
            <AvatarFallback className="text-xs">{actorInitials}</AvatarFallback>
          </Avatar>
        ) : (
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <IconComponent className={cn("h-5 w-5", config.color)} />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              {/* Type-specific component renders the notification content */}
              <Component
                notification={notification}
                onMarkAsRead={onMarkAsRead}
                onArchive={onArchive}
              />
            </div>

            {/* Action Buttons */}
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
              {view === "inbox" && !isUnread && onMarkAsUnread && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={handleMarkAsUnread}
                  aria-label="Mark as unread"
                >
                  <Circle className="h-3.5 w-3.5 text-muted-foreground" />
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
              {isUnread && view === "inbox" && (
                <div className="h-6 w-6 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
              )}
            </div>
          </div>

          {/* Timestamp */}
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
