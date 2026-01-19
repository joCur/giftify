"use client";

import { cn } from "@/lib/utils";
import type { NotificationComponentProps } from "@/lib/notifications/component-registry";
import { generateTitle, generateMessage } from "@/lib/notifications/registry";

export function WishlistActivityNotification({ notification }: NotificationComponentProps) {
  const isUnread = !notification.read_at;
  const title = generateTitle(notification.type, notification.metadata);
  const message = generateMessage(notification.type, notification.metadata);
  const metadata = notification.metadata as any;

  return (
    <div>
      <p className={cn("text-sm leading-tight", isUnread && "font-semibold")}>{title}</p>
      <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{message}</p>

      {/* Show item image if available */}
      {metadata.item_image_url && (
        <div className="mt-2">
          <img
            src={metadata.item_image_url}
            alt={metadata.item_title || "Item"}
            className="w-16 h-16 object-cover rounded-md"
          />
        </div>
      )}

      {/* Show price if available */}
      {metadata.item_price && (
        <p className="text-xs text-primary font-medium mt-1">
          {metadata.item_currency || "$"}
          {metadata.item_price}
        </p>
      )}
    </div>
  );
}
