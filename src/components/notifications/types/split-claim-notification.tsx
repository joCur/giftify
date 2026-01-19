"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { NotificationComponentProps } from "@/lib/notifications/component-registry";
import type { ParsedNotification } from "@/lib/notifications/types";
import { generateTitle, generateMessage } from "@/lib/notifications/registry";
import { getInitials } from "@/lib/utils";

export function SplitClaimNotification({ notification }: NotificationComponentProps) {
  const isUnread = !notification.read_at;
  const title = generateTitle(notification.type, notification.metadata);
  const message = generateMessage(notification.type, notification.metadata);
  const metadata = notification.metadata as any;

  return (
    <div>
      <p className={cn("text-sm leading-tight", isUnread && "font-semibold")}>{title}</p>
      <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{message}</p>

      {/* Type-specific enhancements based on notification subtype */}
      {notification.type === "split_initiated" && (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            Need {metadata.target_participants} {metadata.target_participants === 1 ? "person" : "people"}
          </span>
          {metadata.cost_per_person && (
            <span className="text-primary font-medium">
              {metadata.item_currency || "$"}
              {metadata.cost_per_person} per person
            </span>
          )}
        </div>
      )}

      {notification.type === "split_joined" && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-primary h-full transition-all"
              style={{
                width: `${(metadata.current_participants / metadata.target_participants) * 100}%`,
              }}
            />
          </div>
          <span className="text-muted-foreground">
            {metadata.current_participants}/{metadata.target_participants}
          </span>
        </div>
      )}

      {notification.type === "split_confirmed" && metadata.participants && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Participants:</span>
          <div className="flex -space-x-1">
            {metadata.participants.slice(0, 5).map((participant: any) => (
              <Avatar key={participant.user_id} className="h-6 w-6 border-2 border-background">
                <AvatarImage src={participant.avatar_url || undefined} />
                <AvatarFallback className="text-[10px]">
                  {getInitials(participant.display_name)}
                </AvatarFallback>
              </Avatar>
            ))}
            {metadata.participants.length > 5 && (
              <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                <span className="text-[10px] font-medium">+{metadata.participants.length - 5}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {metadata.item_image_url && (
        <div className="mt-2">
          <img
            src={metadata.item_image_url}
            alt={metadata.item_title}
            className="w-16 h-16 object-cover rounded-md"
          />
        </div>
      )}
    </div>
  );
}
