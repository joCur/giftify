"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ShoppingBag,
  Package,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useMyClaimedItems } from "@/lib/queries/hooks";

export function ClaimedItemsSection() {
  const { data: claimedGroups, isLoading } = useMyClaimedItems();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (friendId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(friendId)) {
        next.delete(friendId);
      } else {
        next.add(friendId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="bg-card border border-border/50 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400/20 to-emerald-500/5 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-emerald-600" />
          </div>
          <h2 className="font-[family-name:var(--font-outfit)] text-lg font-semibold">
            My Claimed Gifts
          </h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!claimedGroups || claimedGroups.length === 0) {
    return (
      <div className="bg-card border border-border/50 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400/20 to-emerald-500/5 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-emerald-600" />
          </div>
          <h2 className="font-[family-name:var(--font-outfit)] text-lg font-semibold">
            My Claimed Gifts
          </h2>
        </div>
        <p className="text-sm text-muted-foreground text-center py-4">
          You haven&apos;t claimed any gifts yet
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400/20 to-emerald-500/5 flex items-center justify-center">
          <ShoppingBag className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h2 className="font-[family-name:var(--font-outfit)] text-lg font-semibold">
            My Claimed Gifts
          </h2>
          <p className="text-xs text-muted-foreground">
            Gifts you&apos;re planning to give
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {claimedGroups.map((group) => {
          const isExpanded = expandedGroups.has(group.friend.id);
          const visibleItems = isExpanded ? group.items : group.items.slice(0, 2);
          const hasMore = group.items.length > 2;

          return (
            <div
              key={group.friend.id}
              className="border border-border/50 rounded-xl p-4"
            >
              {/* Friend header */}
              <Link
                href={`/friends/${group.friend.id}`}
                className="flex items-center gap-3 mb-3 group/friend"
              >
                <UserAvatar
                  avatarUrl={group.friend.avatar_url}
                  displayName={group.friend.display_name}
                  size="md"
                />
                <div className="flex-1">
                  <p className="font-medium group-hover/friend:text-primary transition-colors">
                    {group.friend.display_name || "Friend"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {group.items.length}{" "}
                    {group.items.length === 1 ? "gift" : "gifts"} claimed
                  </p>
                </div>
              </Link>

              {/* Items */}
              <div className="space-y-2">
                {visibleItems.map((item) => (
                  <div
                    key={item.id}
                    className="relative flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <Link
                      href={`/friends/${group.friend.id}/wishlists/${item.wishlist_id}`}
                      className="absolute inset-0 z-0"
                    />
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-muted">
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={item.title}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-5 h-5 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {item.title}
                      </p>
                      {item.price && (
                        <p className="text-xs text-muted-foreground">
                          {item.currency} {item.price}
                        </p>
                      )}
                    </div>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="relative z-10 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-muted rounded-lg"
                      >
                        <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-primary" />
                      </a>
                    )}
                  </div>
                ))}
              </div>

              {/* Show more/less */}
              {hasMore && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleGroup(group.friend.id)}
                  className="w-full mt-2 text-xs h-8"
                >
                  {isExpanded ? (
                    <>
                      Show less <ChevronUp className="w-3 h-3 ml-1" />
                    </>
                  ) : (
                    <>
                      Show {group.items.length - 2} more{" "}
                      <ChevronDown className="w-3 h-3 ml-1" />
                    </>
                  )}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
