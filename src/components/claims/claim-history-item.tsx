"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Package, ExternalLink, Users, Crown, Gift } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { ClaimStatusBadge } from "./claim-status-badge";
import { markGiftGiven } from "@/lib/actions/claims";
import { toast } from "sonner";
import type { ClaimHistoryItem } from "@/lib/types/claims";

interface ClaimHistoryItemCardProps {
  claim: ClaimHistoryItem;
}

export function ClaimHistoryItemCard({ claim }: ClaimHistoryItemCardProps) {
  const [isMarking, setIsMarking] = useState(false);
  const imageUrl = claim.item.custom_image_url || claim.item.image_url;

  async function handleMarkGiven(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    setIsMarking(true);
    try {
      const result = await markGiftGiven(claim.id, claim.type);

      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Gift marked as given!");
      }
    } catch {
      toast.error("Failed to mark gift as given");
    } finally {
      setIsMarking(false);
    }
  }

  return (
    <div className="relative flex items-start gap-4 p-4 rounded-xl hover:bg-muted/50 transition-colors group border border-border/50">
      <Link
        href={`/friends/${claim.friend.id}/wishlists/${claim.item.wishlist_id}`}
        className="absolute inset-0 z-0"
      />

      {/* Item Image */}
      <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-muted">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={claim.item.title}
            fill
            className="object-cover"
            sizes="64px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-6 h-6 text-muted-foreground/30" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-medium truncate group-hover:text-primary transition-colors">
              {claim.item.title}
            </h3>
            <p className="text-sm text-muted-foreground truncate">
              For {claim.friend.display_name || "Friend"}
            </p>
          </div>
          <ClaimStatusBadge
            status={claim.status}
            type={claim.type}
            splitStatus={claim.type === "split" ? claim.split_status : undefined}
          />
        </div>

        {/* Price and Details */}
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          {claim.item.price && (
            <span>
              {claim.item.currency} {claim.item.price}
            </span>
          )}
          <span>{claim.wishlist.name}</span>
        </div>

        {/* Split Participants */}
        {claim.type === "split" && (
          <div className="mt-2 flex items-center gap-2">
            <Users className="w-3 h-3 text-muted-foreground" />
            <div className="flex -space-x-1">
              {claim.participants.slice(0, 4).map((participant, index) => (
                <div
                  key={participant.id}
                  className="relative"
                  title={participant.display_name || "Participant"}
                >
                  {index === 0 && claim.is_initiator && (
                    <Crown className="absolute -top-1 -right-1 w-3 h-3 text-amber-500 z-10" />
                  )}
                  <UserAvatar
                    displayName={participant.display_name}
                    size="xs"
                    className="ring-2 ring-background"
                  />
                </div>
              ))}
              {claim.participants.length > 4 && (
                <span className="text-xs text-muted-foreground ml-2">
                  +{claim.participants.length - 4} more
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {claim.current_participants}/{claim.target_participants}
            </span>
          </div>
        )}

        {/* Date */}
        <div className="mt-1 text-xs text-muted-foreground">
          {claim.status === "fulfilled" && claim.fulfilled_at
            ? `Given ${new Date(claim.fulfilled_at).toLocaleDateString()}`
            : claim.status === "cancelled" && claim.cancelled_at
              ? `Cancelled ${new Date(claim.cancelled_at).toLocaleDateString()}`
              : `Claimed ${new Date(claim.created_at).toLocaleDateString()}`}
        </div>

        {/* Mark as given button for active claims */}
        {claim.status === "active" && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleMarkGiven}
            disabled={isMarking}
            className="relative z-10 mt-2 gap-1.5"
          >
            <Gift className="w-3.5 h-3.5" />
            {isMarking ? "Marking..." : "Mark as given"}
          </Button>
        )}
      </div>

      {/* External Link */}
      {claim.item.url && (
        <a
          href={claim.item.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted rounded-lg"
        >
          <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-primary" />
        </a>
      )}
    </div>
  );
}
