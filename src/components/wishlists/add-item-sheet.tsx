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

type AddItemMode = "url-entry" | "url-fetched" | "manual-entry";

interface LinkMetadata {
  title: string;
  description: string | null;
  image_url: string | null;
  price: string | null;
  currency: string | null;
  url: string;
}

export function AddItemSheet({
  wishlistId,
  children,
}: {
  wishlistId: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
  const [mode, setMode] = useState<AddItemMode>("url-entry");

  async function handleFetchMetadata() {
    if (!url.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    // Auto-add https:// if scheme is missing
    let normalizedUrl = url.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
      setUrl(normalizedUrl);
    }

    // Basic URL validation
    try {
      new URL(normalizedUrl);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }

    setIsFetching(true);
    const result = await fetchLinkMetadata(normalizedUrl);

    if ("error" in result) {
      toast.error(result.error);
      setIsFetching(false);
      return;
    }

    setMetadata(result);
    setMode("url-fetched");
    setIsFetching(false);
  }

  async function handleAddItem(formData: FormData) {
    setIsAdding(true);

    const result = await addItem(wishlistId, formData);

    if (result.error) {
      toast.error(result.error);
      setIsAdding(false);
      return;
    }

    toast.success("Item added to wishlist!");
    handleClose();
  }

  function handleManualEntry() {
    setMode("manual-entry");
    setMetadata(null);
  }

  function handleReset() {
    setUrl("");
    setMetadata(null);
    setMode("url-entry");
  }

  function handleClose() {
    setOpen(false);
    setUrl("");
    setMetadata(null);
    setMode("url-entry");
    setIsAdding(false);
  }

  // Prepare default values for form fields
  const formDefaults: Partial<ItemFormValues> =
    mode === "url-fetched" && metadata
      ? {
          url: metadata.url,
          title: metadata.title,
          description: metadata.description,
          image_url: metadata.image_url,
          price: metadata.price,
          currency: metadata.currency,
        }
      : {};

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-6">
          <DialogTitle className="font-[family-name:var(--font-outfit)]">
            Add Item
          </DialogTitle>
          <DialogDescription>
            {mode === "url-entry"
              ? "Paste a link to automatically fetch product details, or enter manually."
              : mode === "url-fetched"
                ? "Review and edit the details below."
                : "Enter the item details manually."}
          </DialogDescription>
        </DialogHeader>

        {mode === "url-entry" ? (
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
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/product"
                  className="h-11 rounded-xl bg-muted/50 border-border/50 focus:bg-background transition-colors"
                  disabled={isFetching}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleFetchMetadata();
                    }
                  }}
                />
                <Button
                  onClick={handleFetchMetadata}
                  disabled={isFetching}
                  className="rounded-xl shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 transition-all"
                >
                  {isFetching ? (
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
              disabled={isFetching}
              className="w-full rounded-xl"
            >
              <PenLine className="w-4 h-4 mr-2" />
              Enter manually
            </Button>
          </div>
        ) : (
          <form action={handleAddItem} className="px-6 pb-6 space-y-5">
            {/* Preview card - only show when we have fetched metadata with an image */}
            {mode === "url-fetched" && metadata && (
              <div className="flex gap-4 p-4 rounded-xl bg-muted/50 border border-border/50">
                <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gradient-to-br from-muted to-muted/50 shrink-0">
                  {metadata.image_url ? (
                    <Image
                      src={metadata.image_url}
                      alt={metadata.title}
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
                  <p className="font-medium line-clamp-2">{metadata.title}</p>
                  {metadata.price && (
                    <p className="text-sm text-primary font-medium mt-1">
                      {metadata.currency} {metadata.price}
                    </p>
                  )}
                  {metadata.url && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {new URL(metadata.url).hostname}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Shared form fields */}
            <ItemFormFields
              defaultValues={formDefaults}
              disabled={isAdding}
              showUrlField={mode === "manual-entry"}
            />

            <DialogFooter className="gap-2 sm:gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={isAdding}
                className="rounded-xl"
              >
                {mode === "manual-entry" ? "Back" : "Change URL"}
              </Button>
              <Button
                type="submit"
                disabled={isAdding}
                className="rounded-xl shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 transition-all"
              >
                {isAdding ? (
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
