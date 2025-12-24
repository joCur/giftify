"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Gift, Package, Loader2, Users, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { claimItem, unclaimItem } from "@/lib/actions/claims";
import { toast } from "sonner";
import type { FriendItemActivity } from "@/lib/types/feed";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queries/keys";

interface FeedCardProps {
  item: FriendItemActivity;
}

export function FeedCard({ item }: FeedCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [optimisticClaimed, setOptimisticClaimed] = useState<boolean | null>(
    null
  );
  const queryClient = useQueryClient();

  const isClaimed =
    optimisticClaimed !== null ? optimisticClaimed : item.claimed_by_me;
  const wishlistUrl = `/friends/${item.friend.id}/wishlists/${item.wishlist.id}`;

  async function handleClaim() {
    setIsLoading(true);
    setOptimisticClaimed(true);

    const result = await claimItem(item.item.id, item.wishlist.id);

    if (result.error) {
      toast.error(result.error);
      setOptimisticClaimed(null);
    } else {
      toast.success("Item claimed!");
      queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.claims.all });
    }
    setIsLoading(false);
  }

  async function handleUnclaim() {
    setIsLoading(true);
    setOptimisticClaimed(false);

    const result = await unclaimItem(item.item.id);

    if (result.error) {
      toast.error(result.error);
      setOptimisticClaimed(null);
    } else {
      toast.success("Claim removed");
      queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.claims.all });
    }
    setIsLoading(false);
  }

  return (
    <div className="group relative h-full bg-card border border-border/50 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-primary/5 transition-all duration-200 hover:-translate-y-1">
      {/* Hover gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10" />

      {/* Image */}
      <div className="relative aspect-square bg-gradient-to-br from-muted to-muted/50 overflow-hidden">
        <Link href={wishlistUrl} className="absolute inset-0 z-0">
          {item.item.image_url ? (
            <Image
              src={item.item.image_url}
              alt={item.item.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Package className="w-12 h-12 text-muted-foreground/30" />
            </div>
          )}
        </Link>

        {/* Price badge */}
        {item.item.price && (
          <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-xl bg-card/95 backdrop-blur-sm text-sm font-semibold shadow-md border border-border/30 pointer-events-none">
            {item.item.currency} {item.item.price}
          </div>
        )}

        {/* External link - positioned outside any Link */}
        {item.item.url && (
          <a
            href={item.item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-20 h-9 w-9 rounded-xl bg-card/95 backdrop-blur-sm shadow-md hover:bg-card border border-border/30 flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}

        {/* Split claim badge */}
        {item.has_split_claim && (
          <div className="absolute top-3 left-3 pointer-events-none">
            <div className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-xs font-semibold text-white shadow-md flex items-center gap-1">
              <Users className="w-3 h-3" />
              Split active
            </div>
          </div>
        )}

        {/* Claimed overlay */}
        {(item.is_claimed && !item.claimed_by_me) && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
            <div className="px-3 py-1.5 rounded-full bg-muted text-sm font-medium text-muted-foreground">
              Already claimed
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="relative p-4">
        {/* Friend info */}
        <Link
          href={`/friends/${item.friend.id}`}
          className="flex items-center gap-2 mb-3 group/friend"
        >
          <UserAvatar
            avatarUrl={item.friend.avatar_url}
            displayName={item.friend.display_name}
            size="sm"
          />
          <span className="text-sm text-muted-foreground group-hover/friend:text-foreground transition-colors">
            {item.friend.display_name || "Friend"}
          </span>
        </Link>

        {/* Item title */}
        <Link href={wishlistUrl}>
          <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
            {item.item.title}
          </h3>
        </Link>

        {item.item.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1.5">
            {item.item.description}
          </p>
        )}

        {/* Action */}
        <div className="mt-3 pt-3 border-t border-border/50">
          {isClaimed ? (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                handleUnclaim();
              }}
              disabled={isLoading}
              className="w-full h-9 rounded-xl"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2 text-emerald-600" />
                  <span className="text-emerald-600">You&apos;re getting this</span>
                </>
              )}
            </Button>
          ) : item.is_claimed ? (
            <span className="text-xs text-muted-foreground flex items-center justify-center h-9">
              Already claimed by someone
            </span>
          ) : item.has_split_claim ? (
            <Button
              size="sm"
              variant="outline"
              className="w-full h-9 rounded-xl"
              asChild
            >
              <Link href={wishlistUrl}>
                <Users className="w-4 h-4 mr-2" />
                Join Split
              </Link>
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                handleClaim();
              }}
              disabled={isLoading}
              className="w-full h-9 rounded-xl shadow-md shadow-primary/20"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Gift className="w-4 h-4 mr-2" />
                  Quick Claim
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
