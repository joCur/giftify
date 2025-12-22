"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateItem } from "@/lib/actions/items";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";
import type { WishlistItem } from "@/lib/supabase/types";

interface EditItemDialogProps {
  item: WishlistItem;
  wishlistId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditItemDialog({
  item,
  wishlistId,
  open,
  onOpenChange,
}: EditItemDialogProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  async function handleUpdate(formData: FormData) {
    setIsUpdating(true);

    const result = await updateItem(item.id, wishlistId, formData);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Item updated");
      onOpenChange(false);
    }
    setIsUpdating(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="px-6">
          <DialogTitle className="font-[family-name:var(--font-outfit)] flex items-center gap-2">
            <Pencil className="w-5 h-5" />
            Edit Item
          </DialogTitle>
          <DialogDescription>Update the item details.</DialogDescription>
        </DialogHeader>

        <form action={handleUpdate} className="px-6 pb-6 space-y-5">
          {/* Title field */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Title
            </Label>
            <Input
              id="title"
              name="title"
              defaultValue={item.title}
              required
              disabled={isUpdating}
              className="h-11 rounded-xl bg-muted/50 border-border/50 focus:bg-background transition-colors"
            />
          </div>

          {/* Price field */}
          <div className="space-y-2">
            <Label htmlFor="price" className="text-sm font-medium">
              Price <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="currency"
                name="currency"
                defaultValue={item.currency || ""}
                placeholder="$"
                disabled={isUpdating}
                className="h-11 w-20 rounded-xl bg-muted/50 border-border/50 focus:bg-background transition-colors"
              />
              <Input
                id="price"
                name="price"
                defaultValue={item.price || ""}
                placeholder="0.00"
                disabled={isUpdating}
                className="h-11 flex-1 rounded-xl bg-muted/50 border-border/50 focus:bg-background transition-colors"
              />
            </div>
          </div>

          {/* Notes field */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Personal Notes <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="notes"
              name="notes"
              defaultValue={item.notes || ""}
              placeholder="Size, color preference, etc."
              disabled={isUpdating}
              className="h-11 rounded-xl bg-muted/50 border-border/50 focus:bg-background transition-colors"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUpdating}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isUpdating}
              className="rounded-xl shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 transition-all"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
