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
import { updateItem } from "@/lib/actions/items";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";
import type { WishlistItem } from "@/lib/supabase/types.custom";
import { ItemFormFields } from "./item-form-fields";
import { useDialogReset } from "@/lib/hooks/use-dialog-reset";

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
  const [formKey, setFormKey] = useState(0);

  // Automatically reset state when dialog closes
  useDialogReset({
    open,
    onReset: () => {
      setIsUpdating(false);
      setFormKey((prev) => prev + 1);
    },
  });

  async function handleUpdate(formData: FormData) {
    setIsUpdating(true);

    const result = await updateItem(item.id, wishlistId, formData);

    if (result.error) {
      toast.error(result.error);
      setIsUpdating(false);
    } else {
      toast.success("Item updated");
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-6">
          <DialogTitle className="font-[family-name:var(--font-outfit)] flex items-center gap-2">
            <Pencil className="w-5 h-5" />
            Edit Item
          </DialogTitle>
          <DialogDescription>Update the item details.</DialogDescription>
        </DialogHeader>

        <form key={formKey} action={handleUpdate} className="px-6 pb-6 space-y-5">
          <ItemFormFields
            defaultValues={{
              title: item.title,
              description: item.description,
              image_url: item.image_url,
              custom_image_url: item.custom_image_url,
              price: item.price,
              currency: item.currency,
              notes: item.notes,
            }}
            disabled={isUpdating}
            showUrlField={false}
            itemId={item.id}
            wishlistId={wishlistId}
          />

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
