"use client";

import { cn } from "@/lib/utils";
import type { NotificationComponentProps } from "@/lib/notifications/component-registry";
import { generateTitle, generateMessage } from "@/lib/notifications/registry";

export function OwnershipFlagNotification({ notification }: NotificationComponentProps) {
  const isUnread = !notification.read_at;
  const title = generateTitle(notification.type, notification.metadata);
  const message = generateMessage(notification.type, notification.metadata);

  return (
    <div>
      <p className={cn("text-sm leading-tight", isUnread && "font-semibold")}>{title}</p>
      <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{message}</p>
    </div>
  );
}
