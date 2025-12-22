"use client";

import { useState } from "react";
import Image from "next/image";
import { ExternalLink, Trash2, Check, MoreVertical, Package, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteItem, markItemPurchased } from "@/lib/actions/items";
import { toast } from "sonner";
import type { WishlistItem } from "@/lib/supabase/types";
import { EditItemDialog } from "./edit-item-dialog";

interface WishlistItemCardProps {
  item: WishlistItem;
  wishlistId: string;
  isOwner: boolean;
  showClaimStatus?: boolean;
  isClaimed?: boolean;
  onClaim?: () => void;
  onUnclaim?: () => void;
}

export function WishlistItemCard({
  item,
  wishlistId,
  isOwner,
  showClaimStatus = false,
  isClaimed = false,
  onClaim,
  onUnclaim,
}: WishlistItemCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

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

  return (
    <div
      className={`group relative h-full bg-card border border-border/50 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-primary/5 transition-all duration-200 hover:-translate-y-1 ${
        item.is_purchased ? "opacity-60" : ""
      }`}
    >
      {/* Hover gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10" />

      {/* Image */}
      <div className="relative aspect-square bg-gradient-to-br from-muted to-muted/50 overflow-hidden">
        {item.image_url ? (
          <Image
            src={item.image_url}
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

        {/* Price badge */}
        {item.price && (
          <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-background/90 backdrop-blur-sm text-sm font-medium shadow-sm">
            {item.currency && item.currency} {item.price}
          </div>
        )}

        {/* Action buttons */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
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

      {/* Edit dialog */}
      {isOwner && (
        <EditItemDialog
          item={item}
          wishlistId={wishlistId}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      )}
    </div>
  );
}
