"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { NotificationComponentProps } from "@/lib/notifications/component-registry";
import { generateTitle, generateMessage } from "@/lib/notifications/registry";

export function BirthdayReminderNotification({ notification }: NotificationComponentProps) {
  const isUnread = !notification.read_at;
  const title = generateTitle(notification.type, notification.metadata);
  const message = generateMessage(notification.type, notification.metadata);
  const metadata = notification.metadata as any;

  return (
    <div>
      <div className="flex items-center gap-2">
        <p className={cn("text-sm leading-tight", isUnread && "font-semibold")}>{title}</p>
        {metadata.days_until === 0 && (
          <Badge variant="default" className="text-xs">
            Today!
          </Badge>
        )}
        {metadata.days_until === 1 && (
          <Badge variant="secondary" className="text-xs">
            Tomorrow
          </Badge>
        )}
      </div>
      <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{message}</p>
    </div>
  );
}
