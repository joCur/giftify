"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { NotificationComponentProps } from "@/lib/notifications/component-registry";
import { generateTitle, generateMessage } from "@/lib/notifications/registry";
import { acceptFriendRequest, declineFriendRequest } from "@/lib/actions/friends";
import { toast } from "sonner";

export function FriendRequestNotification({ notification, onMarkAsRead }: NotificationComponentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isUnread = !notification.read_at;
  const title = generateTitle(notification.type, notification.metadata);
  const message = generateMessage(notification.type, notification.metadata);
  const metadata = notification.metadata as any;

  const handleAccept = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLoading(true);

    const result = await acceptFriendRequest(metadata.friendship_id);

    if (result.success) {
      toast.success("Friend request accepted!");
      await onMarkAsRead(notification.id);
    } else {
      toast.error(result.error || "Failed to accept friend request");
    }

    setIsLoading(false);
  };

  const handleDecline = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLoading(true);

    const result = await declineFriendRequest(metadata.friendship_id);

    if (result.success) {
      toast.success("Friend request declined");
      await onMarkAsRead(notification.id);
    } else {
      toast.error(result.error || "Failed to decline friend request");
    }

    setIsLoading(false);
  };

  return (
    <div>
      <p className={cn("text-sm leading-tight", isUnread && "font-semibold")}>{title}</p>
      <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{message}</p>

      {/* Inline action buttons for friend_request_received */}
      {notification.type === "friend_request_received" && !notification.action_completed_at && (
        <div className="mt-2 flex items-center gap-2">
          <Button size="sm" onClick={handleAccept} disabled={isLoading} className="h-7 text-xs">
            Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDecline}
            disabled={isLoading}
            className="h-7 text-xs"
          >
            Decline
          </Button>
        </div>
      )}

      {notification.action_completed_at && (
        <p className="text-xs text-muted-foreground mt-2 italic">
          {notification.type === "friend_request_received" ? "Request handled" : ""}
        </p>
      )}
    </div>
  );
}
