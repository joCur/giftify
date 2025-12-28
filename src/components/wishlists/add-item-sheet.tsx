"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchLinkMetadata, addItem } from "@/lib/actions/items";
import { toast } from "sonner";
import {
  Loader2,
  Link as LinkIcon,
  Sparkles,
  Package,
  PenLine,
} from "lucide-react";
import { ItemFormFields, type ItemFormValues } from "./item-form-fields";
import { useDialogForm } from "@/lib/hooks/use-dialog-form";

type AddItemMode = "url-entry" | "url-fetched" | "manual-entry";

interface LinkMetadata {
  title: string;
  description: string | null;
  image_url: string | null;
  price: string | null;
  currency: string | null;
  url: string;
}

interface AddItemState {
  url: string;
  isFetching: boolean;
  isAdding: boolean;
  metadata: LinkMetadata | null;
  mode: AddItemMode;
}

const DEFAULT_STATE: AddItemState = {
  url: "",
  isFetching: false,
  isAdding: false,
  metadata: null,
  mode: "url-entry",
};

export function AddItemSheet({
  wishlistId,
  children,
}: {
  wishlistId: string;
  children: React.ReactNode;
}) {
  const [formKey, setFormKey] = useState(0);

  const dialog = useDialogForm<AddItemState>({
    defaultState: DEFAULT_STATE,
    onReset: () => {
      // Increment formKey to force remount of form fields
      setFormKey((prev) => prev + 1);
    },
  });

  async function handleFetchMetadata() {
    if (!dialog.state.url.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    // Auto-add https:// if scheme is missing
    let normalizedUrl = dialog.state.url.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
      dialog.setState((prev) => ({ ...prev, url: normalizedUrl }));
    }

    // Basic URL validation
    try {
      new URL(normalizedUrl);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }

    dialog.setState((prev) => ({ ...prev, isFetching: true }));
    const result = await fetchLinkMetadata(normalizedUrl);

    if ("error" in result) {
      toast.error(result.error);
      dialog.setState((prev) => ({ ...prev, isFetching: false }));
      return;
    }

    dialog.setState((prev) => ({
      ...prev,
      metadata: result,
      mode: "url-fetched",
      isFetching: false,
    }));
  }

  async function handleAddItem(formData: FormData) {
    dialog.setState((prev) => ({ ...prev, isAdding: true }));

    const result = await addItem(wishlistId, formData);

    if (result.error) {
      toast.error(result.error);
      dialog.setState((prev) => ({ ...prev, isAdding: false }));
      return;
    }

    toast.success("Item added to wishlist!");
    dialog.closeDialog();
  }

  function handleManualEntry() {
    dialog.setState((prev) => ({
      ...prev,
      mode: "manual-entry",
      metadata: null,
    }));
  }

  function handleReset() {
    dialog.setState((prev) => ({
      ...prev,
      url: "",
      metadata: null,
      mode: "url-entry",
    }));
  }

  // Prepare default values for form fields
  const formDefaults: Partial<ItemFormValues> =
    dialog.state.mode === "url-fetched" && dialog.state.metadata
      ? {
          url: dialog.state.metadata.url,
          title: dialog.state.metadata.title,
          description: dialog.state.metadata.description,
          image_url: dialog.state.metadata.image_url,
          price: dialog.state.metadata.price,
          currency: dialog.state.metadata.currency,
        }
      : {};

  return (
    <Dialog open={dialog.open} onOpenChange={dialog.setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-6">
          <DialogTitle className="font-[family-name:var(--font-outfit)]">
            Add Item
          </DialogTitle>
          <DialogDescription>
            {dialog.state.mode === "url-entry"
              ? "Paste a link to automatically fetch product details, or enter manually."
              : dialog.state.mode === "url-fetched"
                ? "Review and edit the details below."
                : "Enter the item details manually."}
          </DialogDescription>
        </DialogHeader>

        {dialog.state.mode === "url-entry" ? (
          <div className="px-6 pb-6 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400/20 to-indigo-500/10 flex items-center justify-center">
                  <LinkIcon className="w-4 h-4 text-blue-500" />
                </div>
                <Label htmlFor="url" className="text-sm font-medium">
                  Product URL
                </Label>
              </div>
              <div className="flex gap-2">
                <Input
                  id="url"
                  value={dialog.state.url}
                  onChange={(e) =>
                    dialog.setState((prev) => ({ ...prev, url: e.target.value }))
                  }
                  placeholder="https://example.com/product"
                  className="h-11 rounded-xl bg-muted/50 border-border/50 focus:bg-background transition-colors"
                  disabled={dialog.state.isFetching}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleFetchMetadata();
                    }
                  }}
                />
                <Button
                  onClick={handleFetchMetadata}
                  disabled={dialog.state.isFetching}
                  className="rounded-xl shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 transition-all"
                >
                  {dialog.state.isFetching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Fetch
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground pl-1">
                We&apos;ll automatically extract the product name, image, and
                price.
              </p>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or
                </span>
              </div>
            </div>

            {/* Manual entry button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleManualEntry}
              disabled={dialog.state.isFetching}
              className="w-full rounded-xl"
            >
              <PenLine className="w-4 h-4 mr-2" />
              Enter manually
            </Button>
          </div>
        ) : (
          <form key={formKey} action={handleAddItem} className="px-6 pb-6 space-y-5">
            {/* Preview card - only show when we have fetched metadata with an image */}
            {dialog.state.mode === "url-fetched" && dialog.state.metadata && (
              <div className="flex gap-4 p-4 rounded-xl bg-muted/50 border border-border/50">
                <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gradient-to-br from-muted to-muted/50 shrink-0">
                  {dialog.state.metadata.image_url ? (
                    <Image
                      src={dialog.state.metadata.image_url}
                      alt={dialog.state.metadata.title}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Package className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium line-clamp-2">{dialog.state.metadata.title}</p>
                  {dialog.state.metadata.price && (
                    <p className="text-sm text-primary font-medium mt-1">
                      {dialog.state.metadata.currency} {dialog.state.metadata.price}
                    </p>
                  )}
                  {dialog.state.metadata.url && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {new URL(dialog.state.metadata.url).hostname}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Shared form fields */}
            <ItemFormFields
              defaultValues={formDefaults}
              disabled={dialog.state.isAdding}
              showUrlField={dialog.state.mode === "manual-entry"}
              wishlistId={wishlistId}
            />

            <DialogFooter className="gap-2 sm:gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={dialog.state.isAdding}
                className="rounded-xl"
              >
                {dialog.state.mode === "manual-entry" ? "Back" : "Change URL"}
              </Button>
              <Button
                type="submit"
                disabled={dialog.state.isAdding}
                className="rounded-xl shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 transition-all"
              >
                {dialog.state.isAdding ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add to Wishlist"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
