"use client";

import { useState } from "react";
import Image from "next/image";
import { ExternalLink, Trash2, Check, MoreVertical, Package, Pencil, Flag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteItem, markItemPurchased } from "@/lib/actions/items";
import { confirmOwnershipFlag, denyOwnershipFlag } from "@/lib/actions/ownership-flags";
import { toast } from "sonner";
import type { WishlistItem } from "@/lib/supabase/types";
import { EditItemDialog } from "./edit-item-dialog";

interface OwnershipFlag {
  id: string;
  item_id: string;
  flagged_by: string;
  status: string;
  flagger: { id: string; display_name: string | null } | null;
}

interface WishlistItemCardProps {
  item: WishlistItem;
  wishlistId: string;
  isOwner: boolean;
  showClaimStatus?: boolean;
  isClaimed?: boolean;
  onClaim?: () => void;
  onUnclaim?: () => void;
  ownershipFlag?: OwnershipFlag | null;
}

export function WishlistItemCard({
  item,
  wishlistId,
  isOwner,
  showClaimStatus = false,
  isClaimed = false,
  onClaim,
  onUnclaim,
  ownershipFlag,
}: WishlistItemCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [denyDialogOpen, setDenyDialogOpen] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    const result = await deleteItem(item.id, wishlistId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Item removed");
    }
    setIsDeleting(false);
  }

  async function handleTogglePurchased() {
    const result = await markItemPurchased(item.id, wishlistId, !item.is_purchased);
    if (result.error) {
      toast.error(result.error);
    }
  }

  async function handleConfirmOwnership() {
    if (!ownershipFlag) return;

    setIsDeleting(true);
    const result = await confirmOwnershipFlag(ownershipFlag.id, item.id);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Item archived - you already own it");
    }
    setIsDeleting(false);
    setConfirmDialogOpen(false);
  }

  async function handleDenyOwnership() {
    if (!ownershipFlag) return;

    setIsDeleting(true);
    const result = await denyOwnershipFlag(ownershipFlag.id, item.id);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Confirmed - you still want this");
    }
    setIsDeleting(false);
    setDenyDialogOpen(false);
  }

  return (
    <div
      className={`group relative h-full bg-card border border-border/50 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-primary/5 transition-all duration-200 hover:-translate-y-1 ${
        item.is_purchased ? "opacity-60" : ""
      }`}
    >
      {/* Hover gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10" />

      {/* Image - prefer custom uploaded image over external URL */}
      <div className="relative aspect-square bg-gradient-to-br from-muted to-muted/50 overflow-hidden">
        {(item.custom_image_url || item.image_url) ? (
          <Image
            src={item.custom_image_url || item.image_url!}
            alt={item.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Package className="w-12 h-12 text-muted-foreground/30" />
          </div>
        )}

        {/* Purchased overlay */}
        {item.is_purchased && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
              <Check className="w-6 h-6 text-white" />
            </div>
          </div>
        )}

        {/* Ownership flag badge */}
        {isOwner && ownershipFlag?.status === "pending" && (
          <div className="absolute top-3 left-3">
            <div className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-xs font-semibold text-white shadow-md flex items-center gap-1.5">
              <Flag className="w-3 h-3" />
              Needs review
            </div>
          </div>
        )}

        {/* Price badge */}
        {item.price && (
          <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-background/90 backdrop-blur-sm text-sm font-medium shadow-sm">
            {item.currency && item.currency} {item.price}
          </div>
        )}

        {/* Action buttons */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {item.url && (
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 rounded-lg bg-background/90 backdrop-blur-sm shadow-sm hover:bg-background"
              asChild
            >
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          )}
          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 rounded-lg bg-background/90 backdrop-blur-sm shadow-sm hover:bg-background"
                  disabled={isDeleting}
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleTogglePurchased}>
                  <Check className="w-4 h-4 mr-2" />
                  {item.is_purchased ? "Mark as not purchased" : "Mark as purchased"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="relative p-4">
        <h3
          className={`font-semibold line-clamp-2 group-hover:text-primary transition-colors ${
            item.is_purchased ? "line-through text-muted-foreground" : ""
          }`}
        >
          {item.title}
        </h3>

        {item.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1.5">
            {item.description}
          </p>
        )}

        {item.notes && isOwner && (
          <p className="text-xs text-muted-foreground/70 mt-2 italic line-clamp-1">
            Note: {item.notes}
          </p>
        )}

        {/* Claim button for non-owners */}
        {!isOwner && showClaimStatus && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <Button
              variant={isClaimed ? "secondary" : "outline"}
              size="sm"
              onClick={isClaimed ? onUnclaim : onClaim}
              className="w-full rounded-lg"
            >
              {isClaimed ? "Unclaim" : "I'll get this"}
            </Button>
          </div>
        )}
      </div>

      {/* Ownership flag action card for owner */}
      {isOwner && ownershipFlag?.status === "pending" && (
        <div className="mx-4 mb-4 p-2.5 rounded-lg bg-muted/20 border border-border/40">
          <p className="text-[11px] text-muted-foreground/80 mb-2 leading-snug">
            {ownershipFlag.flagger?.display_name || "A friend"} asked: do you already own this?
          </p>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirmDialogOpen(true)}
              disabled={isDeleting}
              className="flex-1 h-7 text-[11px] rounded-md hover:bg-muted/50 text-muted-foreground"
            >
              <Check className="w-3 h-3 mr-1" />
              Yes
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDenyDialogOpen(true)}
              disabled={isDeleting}
              className="flex-1 h-7 text-[11px] rounded-md hover:bg-muted/50 text-muted-foreground"
            >
              <X className="w-3 h-3 mr-1" />
              No
            </Button>
          </div>
        </div>
      )}

      {/* Edit dialog */}
      {isOwner && (
        <EditItemDialog
          item={item}
          wishlistId={wishlistId}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      )}

      {/* Confirm ownership dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Confirm you own this?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              The item will be archived and hidden from friends. Any claims will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-sm">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmOwnership} className="text-sm">
              Archive it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deny ownership dialog */}
      <AlertDialog open={denyDialogOpen} onOpenChange={setDenyDialogOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Keep on wishlist?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Your friend will be notified that you still want this item.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-sm">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDenyOwnership} className="text-sm">
              Keep it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
