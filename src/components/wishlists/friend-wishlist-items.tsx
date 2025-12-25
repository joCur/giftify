"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ExternalLink,
  Check,
  Gift,
  Loader2,
  Package,
  Sparkles,
  Users,
  Minus,
  Plus,
  HandHeart,
  UserPlus,
  Crown,
  Flag,
  AlertCircle,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { claimItem, unclaimItem } from "@/lib/actions/claims";
import {
  initiateSplitClaim,
  joinSplitClaim,
  leaveSplitClaim,
  confirmSplitClaim,
} from "@/lib/actions/split-claims";
import { flagItemAsOwned } from "@/lib/actions/ownership-flags";
import { toast } from "sonner";
import type { WishlistItem, SplitClaimWithParticipants } from "@/lib/supabase/types";
import { getInitials } from "@/lib/utils";

interface Claim {
  id: string;
  item_id: string;
  claimed_by: string;
  claimer: { id: string; display_name: string | null } | null;
}

interface OwnershipFlag {
  id: string;
  item_id: string;
  flagged_by: string;
  status: string;
  flagger: { id: string; display_name: string | null } | null;
}

interface FriendWishlistItemsProps {
  items: WishlistItem[];
  wishlistId: string;
  claimsMap: Map<string, Claim>;
  splitClaimsMap: Map<string, SplitClaimWithParticipants>;
  ownershipFlagsMap: Map<string, OwnershipFlag>;
  currentUserId: string | undefined;
}

export function FriendWishlistItems({
  items,
  wishlistId,
  claimsMap,
  splitClaimsMap,
  ownershipFlagsMap,
  currentUserId,
}: FriendWishlistItemsProps) {
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [localClaims, setLocalClaims] = useState(claimsMap);
  const [localSplitClaims, setLocalSplitClaims] = useState(splitClaimsMap);
  const [localOwnershipFlags, setLocalOwnershipFlags] = useState(ownershipFlagsMap);

  // Split dialog state
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [splitDialogItem, setSplitDialogItem] = useState<WishlistItem | null>(null);
  const [targetParticipants, setTargetParticipants] = useState(2);

  async function handleClaim(itemId: string) {
    if (!currentUserId) return;

    setLoadingItemId(itemId);
    const result = await claimItem(itemId, wishlistId);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Item claimed! Others can see you're getting this.");
      setLocalClaims((prev) => {
        const newMap = new Map(prev);
        newMap.set(itemId, {
          id: "temp",
          item_id: itemId,
          claimed_by: currentUserId,
          claimer: { id: currentUserId, display_name: "You" },
        });
        return newMap;
      });
    }
    setLoadingItemId(null);
  }

  async function handleUnclaim(itemId: string) {
    setLoadingItemId(itemId);
    const result = await unclaimItem(itemId);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Item unclaimed");
      setLocalClaims((prev) => {
        const newMap = new Map(prev);
        newMap.delete(itemId);
        return newMap;
      });
    }
    setLoadingItemId(null);
  }

  function openSplitDialog(item: WishlistItem) {
    setSplitDialogItem(item);
    setTargetParticipants(2);
    setSplitDialogOpen(true);
  }

  async function handleInitiateSplit() {
    if (!splitDialogItem || !currentUserId) return;

    setLoadingItemId(splitDialogItem.id);
    setSplitDialogOpen(false);

    const result = await initiateSplitClaim(
      splitDialogItem.id,
      wishlistId,
      targetParticipants
    );

    if ("error" in result && result.error) {
      toast.error(result.error);
    } else if ("success" in result && result.success) {
      toast.success(`Split started! Looking for ${targetParticipants} people total.`);
      // Optimistically update UI
      if ("data" in result && result.data) {
        setLocalSplitClaims((prev) => {
          const newMap = new Map(prev);
          newMap.set(splitDialogItem.id, {
            id: result.data.id,
            item_id: splitDialogItem.id,
            initiated_by: currentUserId,
            target_participants: targetParticipants,
            status: "pending",
            created_at: result.data.created_at,
            updated_at: result.data.updated_at,
            confirmed_at: null,
            initiator: { id: currentUserId, display_name: "You" },
            participants: [
              {
                id: "temp",
                user_id: currentUserId,
                joined_at: new Date().toISOString(),
                user: { id: currentUserId, display_name: "You" },
              },
            ],
          });
          return newMap;
        });
      }
    }
    setSplitDialogItem(null);
    setLoadingItemId(null);
  }

  async function handleJoinSplit(splitClaimId: string, itemId: string) {
    if (!currentUserId) return;

    setLoadingItemId(itemId);
    const result = await joinSplitClaim(splitClaimId, wishlistId);

    if ("error" in result && result.error) {
      toast.error(result.error);
    } else {
      toast.success("Joined the split!");
      // Optimistically update UI
      setLocalSplitClaims((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(itemId);
        if (existing) {
          const updatedParticipants = [
            ...existing.participants,
            {
              id: "temp-" + currentUserId,
              user_id: currentUserId,
              joined_at: new Date().toISOString(),
              user: { id: currentUserId, display_name: "You" },
            },
          ];
          // Check if auto-confirmed
          const isAutoConfirmed = updatedParticipants.length >= existing.target_participants;
          newMap.set(itemId, {
            ...existing,
            participants: updatedParticipants,
            status: isAutoConfirmed ? "confirmed" : "pending",
            confirmed_at: isAutoConfirmed ? new Date().toISOString() : null,
          });
          if (isAutoConfirmed) {
            toast.success("Split is now complete!");
          }
        }
        return newMap;
      });
    }
    setLoadingItemId(null);
  }

  async function handleLeaveSplit(
    splitClaimId: string,
    itemId: string,
    isInitiator: boolean
  ) {
    if (!currentUserId) return;

    setLoadingItemId(itemId);
    const result = await leaveSplitClaim(splitClaimId);

    if ("error" in result && result.error) {
      toast.error(result.error);
    } else {
      const cancelled = "cancelled" in result && result.cancelled;
      toast.success(cancelled ? "Split cancelled" : "Left the split");
      if (isInitiator) {
        // Remove entire split
        setLocalSplitClaims((prev) => {
          const newMap = new Map(prev);
          newMap.delete(itemId);
          return newMap;
        });
      } else {
        // Remove just this participant
        setLocalSplitClaims((prev) => {
          const newMap = new Map(prev);
          const existing = newMap.get(itemId);
          if (existing) {
            newMap.set(itemId, {
              ...existing,
              participants: existing.participants.filter(
                (p) => p.user_id !== currentUserId
              ),
            });
          }
          return newMap;
        });
      }
    }
    setLoadingItemId(null);
  }

  async function handleConfirmSplit(splitClaimId: string, itemId: string) {
    setLoadingItemId(itemId);
    const result = await confirmSplitClaim(splitClaimId);

    if ("error" in result && result.error) {
      toast.error(result.error);
    } else {
      toast.success("Split confirmed!");
      setLocalSplitClaims((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(itemId);
        if (existing) {
          newMap.set(itemId, {
            ...existing,
            status: "confirmed",
            confirmed_at: new Date().toISOString(),
          });
        }
        return newMap;
      });
    }
    setLoadingItemId(null);
  }

  async function handleFlagItem(itemId: string) {
    if (!currentUserId) return;

    setLoadingItemId(itemId);
    const result = await flagItemAsOwned(itemId, wishlistId);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Owner notified to review if they already own this");
      setLocalOwnershipFlags((prev) => {
        const newMap = new Map(prev);
        newMap.set(itemId, {
          id: "temp",
          item_id: itemId,
          flagged_by: currentUserId,
          status: "pending",
          flagger: { id: currentUserId, display_name: "You" },
        });
        return newMap;
      });
    }
    setLoadingItemId(null);
  }

  // Helper to calculate cost per person
  function getCostPerPerson(
    price: string | null,
    participantCount: number
  ): string | null {
    if (!price || participantCount === 0) return null;
    const numericPrice = parseFloat(price.replace(/[^0-9.]/g, ""));
    if (isNaN(numericPrice)) return null;
    return (numericPrice / participantCount).toFixed(2);
  }

  if (items.length === 0) {
    return (
      <div className="bg-card border border-border/50 rounded-3xl p-8 md:p-12 lg:p-16">
        <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6">
            <Gift className="w-10 h-10 text-primary" />
          </div>
          <h3 className="font-[family-name:var(--font-outfit)] text-xl sm:text-2xl font-semibold mb-3">
            No items yet
          </h3>
          <p className="text-muted-foreground">
            This wishlist is empty. Check back later!
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Hint banner */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-primary/5 via-amber-500/5 to-primary/5 border border-primary/10">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-amber-500/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            Claim items solo or <span className="font-medium text-amber-600 dark:text-amber-400">split the cost</span> with friends.
            The wishlist owner won&apos;t see who claimed what!
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const claim = localClaims.get(item.id);
            const splitClaim = localSplitClaims.get(item.id);
            const ownershipFlag = localOwnershipFlags.get(item.id);

            const isClaimedByMe = claim?.claimed_by === currentUserId;
            const isClaimedByOther = claim && !isClaimedByMe;

            const isInSplit = splitClaim?.participants.some(
              (p) => p.user_id === currentUserId
            );
            const isInitiator = splitClaim?.initiated_by === currentUserId;
            const splitConfirmed = splitClaim?.status === "confirmed";
            const isSplitFull =
              splitClaim &&
              splitClaim.participants.length >= splitClaim.target_participants;

            const isPendingReview = ownershipFlag?.status === "pending";
            const isLoading = loadingItemId === item.id;

            // Calculate cost per person for splits
            const costPerPerson = splitClaim
              ? getCostPerPerson(item.price, splitClaim.participants.length)
              : null;

            return (
              <div
                key={item.id}
                className={`group relative h-full bg-card border rounded-2xl overflow-hidden transition-all duration-300 ${
                  isClaimedByMe
                    ? "border-emerald-500/50 shadow-lg shadow-emerald-500/10"
                    : isClaimedByOther
                    ? "border-border/50 opacity-60"
                    : splitClaim
                    ? isInSplit
                      ? "border-amber-500/50 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/20"
                      : "border-amber-400/30 shadow-md shadow-amber-500/5"
                    : "border-border/50 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1"
                }`}
              >
                {/* Hover gradient overlay */}
                {!isClaimedByOther && !splitConfirmed && (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10" />
                )}

                {/* Image - prefer custom uploaded image over external URL */}
                <div className="relative aspect-square bg-gradient-to-br from-muted to-muted/50 overflow-hidden">
                  {(item.custom_image_url || item.image_url) ? (
                    <Image
                      src={item.custom_image_url || item.image_url!}
                      alt={item.title}
                      fill
                      className={`object-cover transition-transform duration-300 ${
                        !isClaimedByOther && !splitConfirmed
                          ? "group-hover:scale-105"
                          : ""
                      }`}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Package className="w-12 h-12 text-muted-foreground/30" />
                    </div>
                  )}

                  {/* Solo claimed overlay */}
                  {isClaimedByMe && (
                    <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center backdrop-blur-[1px]">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-scale-in">
                        <Check className="w-7 h-7 text-white" />
                      </div>
                    </div>
                  )}

                  {/* Split claim overlay */}
                  {splitClaim && (
                    <div className={`absolute inset-0 flex items-center justify-center backdrop-blur-[1px] ${
                      splitConfirmed
                        ? "bg-gradient-to-br from-amber-500/25 to-orange-500/20"
                        : "bg-gradient-to-br from-amber-500/20 to-amber-600/15"
                    }`}>
                      <div className={`relative w-16 h-16 rounded-full flex items-center justify-center shadow-lg animate-scale-in ${
                        splitConfirmed
                          ? "bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/30"
                          : "bg-gradient-to-br from-amber-400 to-amber-500 shadow-amber-400/25"
                      }`}>
                        {splitConfirmed ? (
                          <HandHeart className="w-8 h-8 text-white" />
                        ) : (
                          <Users className="w-7 h-7 text-white" />
                        )}
                        {/* Participant count badge */}
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-card border-2 border-amber-400 flex items-center justify-center text-xs font-bold text-amber-600">
                          {splitClaim.participants.length}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Other's claimed overlay */}
                  {isClaimedByOther && (
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] flex items-center justify-center">
                      <div className="px-4 py-2 rounded-xl bg-card/95 text-sm font-medium shadow-lg border border-border/50">
                        Already claimed
                      </div>
                    </div>
                  )}

                  {/* Price badge */}
                  {item.price && (
                    <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-xl bg-card/95 backdrop-blur-sm text-sm font-semibold shadow-md border border-border/30">
                      {item.currency && item.currency} {item.price}
                    </div>
                  )}

                  {/* Cost per person badge for splits */}
                  {splitClaim && costPerPerson && (
                    <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 backdrop-blur-sm text-sm font-semibold shadow-md text-white">
                      ~{item.currency || ""}{costPerPerson}/person
                    </div>
                  )}

                  {/* External link button */}
                  {item.url && (
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-9 w-9 rounded-xl bg-card/95 backdrop-blur-sm shadow-md hover:bg-card border border-border/30"
                        asChild
                      >
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    </div>
                  )}

                  {/* Split status ribbon */}
                  {splitClaim && !splitConfirmed && (
                    <div className="absolute top-3 left-3">
                      <div className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-xs font-semibold text-white shadow-md flex items-center gap-1.5">
                        <Users className="w-3 h-3" />
                        {splitClaim.participants.length}/{splitClaim.target_participants} joined
                      </div>
                    </div>
                  )}

                  {splitClaim && splitConfirmed && (
                    <div className="absolute top-3 left-3">
                      <div className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-xs font-semibold text-white shadow-md flex items-center gap-1.5">
                        <Check className="w-3 h-3" />
                        Split complete
                      </div>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="relative p-4">
                  <h3
                    className={`font-semibold line-clamp-2 ${
                      !isClaimedByOther && !splitConfirmed
                        ? "group-hover:text-primary transition-colors"
                        : ""
                    }`}
                  >
                    {item.title}
                  </h3>

                  {item.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1.5">
                      {item.description}
                    </p>
                  )}

                  {/* Split claim participants preview */}
                  {splitClaim && (
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex -space-x-2">
                        {splitClaim.participants.map((participant, index) => (
                          <div
                            key={participant.id}
                            className={`relative w-8 h-8 rounded-full border-2 border-card flex items-center justify-center text-xs font-semibold text-white shadow-sm transition-transform hover:scale-110 hover:z-10 ${
                              participant.user_id === splitClaim.initiated_by
                                ? "bg-gradient-to-br from-amber-400 to-orange-500"
                                : participant.user_id === currentUserId
                                ? "bg-gradient-to-br from-primary to-primary/80"
                                : "bg-gradient-to-br from-amber-400/80 to-amber-500"
                            }`}
                            style={{
                              animationDelay: `${index * 50}ms`,
                              zIndex: splitClaim.participants.length - index
                            }}
                            title={
                              participant.user_id === splitClaim.initiated_by
                                ? `${participant.user?.display_name || "Someone"} (organizer)`
                                : participant.user?.display_name || "Someone"
                            }
                          >
                            {participant.user_id === splitClaim.initiated_by && (
                              <Crown className="absolute -top-1.5 -right-0.5 w-3 h-3 text-amber-500 drop-shadow-sm" />
                            )}
                            {getInitials(participant.user?.display_name)}
                          </div>
                        ))}
                        {/* Empty slots indicator */}
                        {!splitConfirmed && splitClaim.participants.length < splitClaim.target_participants && (
                          <>
                            {Array.from({ length: Math.min(2, splitClaim.target_participants - splitClaim.participants.length) }).map((_, i) => (
                              <div
                                key={`empty-${i}`}
                                className="w-8 h-8 rounded-full border-2 border-dashed border-amber-300/50 dark:border-amber-500/30 flex items-center justify-center bg-amber-50/50 dark:bg-amber-500/5"
                                style={{ zIndex: 0 }}
                              >
                                <UserPlus className="w-3.5 h-3.5 text-amber-400/60" />
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                      {splitConfirmed && (
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          Confirmed
                        </span>
                      )}
                    </div>
                  )}

                  {/* Claim status and buttons */}
                  <div className="mt-3 pt-3 border-t border-border/50">
                    {isClaimedByMe ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          <Check className="w-3.5 h-3.5" />
                          You&apos;re getting this
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUnclaim(item.id)}
                          disabled={isLoading}
                          className="h-8 rounded-xl"
                        >
                          {isLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            "Unclaim"
                          )}
                        </Button>
                      </div>
                    ) : isClaimedByOther ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <Check className="w-3 h-3" />
                        {claim.claimer?.display_name || "Someone"} is getting this
                      </span>
                    ) : splitClaim ? (
                      <div className="space-y-2">
                        {isInSplit ? (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5" />
                                {splitConfirmed
                                  ? "You're part of this gift!"
                                  : isInitiator
                                    ? "You're organizing this split"
                                    : "You've joined this split"}
                              </span>
                              {!splitConfirmed && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    handleLeaveSplit(
                                      splitClaim.id,
                                      item.id,
                                      isInitiator
                                    )
                                  }
                                  disabled={isLoading}
                                  className="h-7 text-xs text-muted-foreground hover:text-destructive"
                                >
                                  {isLoading ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : isInitiator ? (
                                    "Cancel split"
                                  ) : (
                                    "Leave"
                                  )}
                                </Button>
                              )}
                            </div>
                            {isInitiator &&
                              !splitConfirmed &&
                              splitClaim.participants.length >= 2 && (
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleConfirmSplit(splitClaim.id, item.id)
                                  }
                                  disabled={isLoading}
                                  className="w-full h-9 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-amber-500/20 border-0"
                                >
                                  {isLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Check className="w-4 h-4 mr-2" />
                                      Confirm Split
                                    </>
                                  )}
                                </Button>
                              )}
                          </>
                        ) : !splitConfirmed ? (
                          <Button
                            size="sm"
                            onClick={() =>
                              handleJoinSplit(splitClaim.id, item.id)
                            }
                            disabled={isLoading || isSplitFull}
                            className={`w-full h-9 rounded-xl ${
                              isSplitFull
                                ? ""
                                : "bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:border-amber-500/50"
                            }`}
                            variant="outline"
                          >
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : isSplitFull ? (
                              "Split Full"
                            ) : (
                              <>
                                <UserPlus className="w-4 h-4 mr-2" />
                                Join Split
                              </>
                            )}
                          </Button>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <HandHeart className="w-4 h-4 text-amber-500" />
                            <span>
                              Split by{" "}
                              {splitClaim.participants
                                .map((p) => p.user?.display_name || "Someone")
                                .join(", ")}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : isPendingReview ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-xl px-3 py-2 border border-border/40">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Owner reviewing</span>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleClaim(item.id)}
                          disabled={isLoading}
                          className="flex-1 h-9 rounded-xl shadow-md shadow-primary/20"
                        >
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Gift className="w-4 h-4 mr-2" />
                              I&apos;ll get this
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openSplitDialog(item)}
                          disabled={isLoading}
                          className="h-9 px-3 rounded-xl border-amber-500/30 hover:border-amber-500/50 hover:bg-amber-500/5 group/split"
                          title="Split with friends"
                        >
                          <Users className="w-4 h-4 text-amber-600 dark:text-amber-400 group-hover/split:scale-110 transition-transform" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={isLoading}
                              className="h-9 px-2 rounded-xl hover:bg-muted/50"
                            >
                              <MoreVertical className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() => handleFlagItem(item.id)}
                              className="text-xs cursor-pointer"
                            >
                              <Flag className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                              <span className="text-muted-foreground">They might own this</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Split claim dialog */}
      <Dialog open={splitDialogOpen} onOpenChange={setSplitDialogOpen}>
        <DialogContent className="sm:max-w-md overflow-hidden">
          {/* Decorative background */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5 pointer-events-none" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />

          <DialogHeader className="relative">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="font-[family-name:var(--font-outfit)] text-xl">
                  Split This Gift
                </DialogTitle>
                <DialogDescription className="text-sm mt-0.5">
                  Share the cost with friends
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {splitDialogItem && (
            <div className="relative py-4 space-y-6">
              {/* Item preview */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-muted/50 to-muted/30 border border-border/50">
                {(splitDialogItem.custom_image_url || splitDialogItem.image_url) ? (
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 shadow-md">
                    <Image
                      src={splitDialogItem.custom_image_url || splitDialogItem.image_url!}
                      alt={splitDialogItem.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Package className="w-7 h-7 text-muted-foreground/40" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold line-clamp-2">
                    {splitDialogItem.title}
                  </p>
                  {splitDialogItem.price && (
                    <p className="text-sm font-medium text-muted-foreground mt-1">
                      {splitDialogItem.currency} {splitDialogItem.price}
                    </p>
                  )}
                </div>
              </div>

              {/* Participant count selector */}
              <div className="flex flex-col items-center gap-5">
                <p className="text-sm text-muted-foreground">
                  How many people will chip in?
                </p>

                <div className="flex items-center gap-5">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setTargetParticipants(Math.max(2, targetParticipants - 1))
                    }
                    disabled={targetParticipants <= 2}
                    className="h-12 w-12 rounded-full border-2 hover:border-primary hover:bg-primary/5 disabled:opacity-40"
                  >
                    <Minus className="w-5 h-5" />
                  </Button>

                  <div className="flex flex-col items-center gap-1.5">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
                        <span className="text-3xl font-bold text-white">
                          {targetParticipants}
                        </span>
                      </div>
                      {/* Animated ring */}
                      <div className="absolute inset-0 rounded-full border-2 border-amber-400/30 animate-ping" style={{ animationDuration: '2s' }} />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">
                      {targetParticipants === 2 ? "people" : "people"}
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setTargetParticipants(Math.min(10, targetParticipants + 1))
                    }
                    disabled={targetParticipants >= 10}
                    className="h-12 w-12 rounded-full border-2 hover:border-primary hover:bg-primary/5 disabled:opacity-40"
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>

                {/* Cost per person preview */}
                {splitDialogItem.price && (
                  <div className="w-full p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-orange-500/10 border border-amber-500/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Cost per person
                      </span>
                      <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
                        {splitDialogItem.currency || ""}{" "}
                        {getCostPerPerson(splitDialogItem.price, targetParticipants)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <p className="text-xs text-center text-muted-foreground px-4">
                You&apos;ll be the organizer. The split auto-confirms when{" "}
                <span className="font-medium text-foreground">{targetParticipants} people</span> have joined,
                or you can confirm early once 2+ people join.
              </p>
            </div>
          )}

          <DialogFooter className="relative gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setSplitDialogOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleInitiateSplit}
              disabled={loadingItemId !== null}
              className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-amber-500/20 border-0"
            >
              {loadingItemId ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  Start Split
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
